from typing import Dict, Any, List
from contextlib import asynccontextmanager
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.nodes.chat.welcome_node import WelcomeNode
from app.agents.nodes.profile.profile_parser_node import ProfileParserNode
from app.agents.nodes.routing.intent_router_node import IntentRouterNode
from app.agents.nodes.chat.advisor_node import AdvisorNode
from app.agents.nodes.retrieval.query_builder_node import QueryBuilderNode
from app.agents.nodes.retrieval.candidate_search_node import CandidateSearchNode
from app.agents.nodes.retrieval.compatibility_filter_node import CompatibilityFilterNode
from app.agents.nodes.assembly.path_composer_node import PathComposerNode
from app.config import DATA_DIR
from app.rag.platform import get_platform_store
from app.llm.client import call as llm_call

load_dotenv()


# ── Request/Response Models ─────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str = ""
    selected_nodes: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    intent: str
    enriched_profile: dict
    graph: dict | None = None
    question_count: int = 0
    max_questions: int = 3
    suggestions: list[dict] = Field(default_factory=list)
    follow_up_questions: list[dict] = Field(default_factory=list)


class ProposeRequest(BaseModel):
    session_id: str
    node_id: str


class ProposeResponse(BaseModel):
    draft: str
    subject: str
    entity_name: str
    entity_type: str


# ── In-Memory Session Store ─────────────────────

sessions: dict[str, dict] = {}

def get_or_create_session(session_id: str, website_profile: dict) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "website_profile": website_profile,
            "enriched_profile": {},
            "signals": {
                "liked": [],
                "rejected": [],
                "explored": [],
                "keywords_mentioned": [],
            },
            "chat_history": [],
            "current_graph": {},
            "question_count": 0,
            "phase": "chat",
        }
    return sessions[session_id]


# ── Lifespan ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    store = get_platform_store()
    print(f"RAG ready: {store.count()} entities")

    profile_path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(profile_path, encoding="utf-8") as f:
        app.state.website_profile = json.load(f)

    print(f"Backend ready. Student: {app.state.website_profile['name']}")
    yield


# ── App ─────────────────────────────────────────

app = FastAPI(title="Studyond Thesis Journey", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pipeline Functions ──────────────────────────

async def run_welcome(session: dict) -> dict:
    state = {
        "session_id": "api",
        "node_results": [],
        "output": {},
        "message": "",
        "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"],
        "intent": "welcome",
        "chat_history": [],
        "response": "",
        "question_count": 0,
    }
    return await WelcomeNode.run(state)


async def run_chat_turn(session: dict, message: str) -> dict:
    session["question_count"] += 1
    question_count = session["question_count"]

    state = {
        "session_id": "api",
        "node_results": [],
        "output": {},
        "message": message,
        "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"],
        "intent": "",
        "chat_history": session["chat_history"],
        "response": "",
        "question_count": question_count,
        "search_query": "",
        "candidates": {},
        "filtered_candidates": {},
        "graph_output": {},
        "current_graph": session.get("current_graph", {}),
    }

    try:
        result = await ProfileParserNode.run(state)
        session["enriched_profile"] = result.get("enriched_profile", session["enriched_profile"])
    except Exception as e:
        print(f"  [ProfileParser ERROR: {e}]")
        result = state

    result["enriched_profile"] = session["enriched_profile"]
    result["question_count"] = question_count
    result = await IntentRouterNode.run(result)
    intent = result["intent"]

    print(f"  [Message {question_count}/3 | Intent: {intent}]")

    if intent == "generate":
        result = await run_generate_pipeline(result, session)
    else:
        result["enriched_profile"] = session["enriched_profile"]
        result["question_count"] = question_count
        result = await AdvisorNode.run(result)

    result["intent"] = intent
    result["question_count"] = question_count
    return result


async def run_generate_pipeline(state: dict, session: dict) -> dict:
    print("  [Generating paths...]")
    state["enriched_profile"] = session["enriched_profile"]
    state["signals"] = session["signals"]
    state["website_profile"] = session["website_profile"]

    result = await QueryBuilderNode.run(state)
    result = await CandidateSearchNode.run(result)
    result["website_profile"] = session["website_profile"]
    result["enriched_profile"] = session["enriched_profile"]
    result["signals"] = session["signals"]
    result = await CompatibilityFilterNode.run(result)
    result = await PathComposerNode.run(result)

    graph = result.get("graph_output", {})
    print(f"  [Result] {len(graph.get('paths', []))} paths, {len(graph.get('nodes', []))} nodes")
    return result


# ── Post-Graph Chat ─────────────────────────────

async def run_post_graph_turn(
    session: dict, message: str, selected_nodes: list[str]
) -> dict:
    """Contextual chat after graph is generated — uses LLM with node context."""
    graph = session.get("current_graph", {})
    website = session.get("website_profile", {})
    enriched = session.get("enriched_profile", {})

    # Resolve selected node data from graph
    selected_node_details = []
    for node_id in selected_nodes:
        node = next((n for n in graph.get("nodes", []) if n["id"] == node_id), None)
        if node:
            selected_node_details.append(node)

    node_context = ""
    if selected_node_details:
        node_context = "SELECTED NODES (user is asking about these specifically):\n"
        for n in selected_node_details:
            node_context += (
                f"  - [{n['type'].upper()}] {n['label']} | {n.get('subtitle', '')} | "
                f"Confidence: {int(n.get('confidence', 0) * 100)}% | "
                f"Reasoning: {n.get('reasoning', '')}\n"
            )

    # Build path summary
    path_summary = ""
    if graph.get("paths"):
        path_summary = "CURRENT GRAPH PATHS:\n"
        for p in graph["paths"]:
            path_summary += f"  - {p['label']} ({p['type']}, {int(p['confidence'] * 100)}%): {p.get('reasoning', '')}\n"

    system_prompt = """You are a thesis advisor helping a student explore their academic and career options.
The student has already received a personalized graph of thesis paths. They may be asking about specific nodes (supervisors, companies, topics, experts) or requesting a research proposal draft.

When asked to draft a proposal:
- Keep it concise, professional, and personalized to the student's profile
- Address it to the specific entity (supervisor/company/expert)
- Mention the student's relevant skills and interests
- Propose a concrete research direction
- End with a clear call to action

When answering questions about nodes:
- Be specific about why this entity fits the student
- Mention concrete details from their profile (degree, skills, interests)
- Suggest next steps

Always be encouraging but honest. Keep responses focused and under 200 words unless drafting a formal proposal."""

    user_content = f"""Student profile: {json.dumps(website, ensure_ascii=False)}
Enriched profile: {json.dumps(enriched, ensure_ascii=False)}

{path_summary}

{node_context}

Recent chat:
{chr(10).join(f"{m['role']}: {m['content']}" for m in session.get('chat_history', [])[-6:])}

Student message: {message}"""

    try:
        response = await llm_call(system_prompt, user_content, temperature=0.4)
    except Exception as e:
        print(f"  [PostGraph LLM ERROR: {e}]")
        response = "I'm having trouble responding right now. Please try again."

    intent = "proposal" if any(w in message.lower() for w in ["proposal", "draft", "write", "send", "propose"]) else "node_detail" if selected_node_details else "explore"

    return {"response": response, "intent": intent}


# ── Proposal Generator ──────────────────────────

async def generate_proposal(session: dict, node_id: str) -> ProposeResponse:
    """Generate a research proposal draft for a specific entity."""
    graph = session.get("current_graph", {})
    website = session.get("website_profile", {})
    enriched = session.get("enriched_profile", {})

    node = next((n for n in graph.get("nodes", []) if n["id"] == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found in current graph")

    entity_type = node.get("type", "")
    entity_name = node.get("label", "Unknown")
    entity_data = node.get("data", {})

    system_prompt = """You are helping a student draft a research proposal or outreach email.
Return a JSON object with exactly these fields:
{
  "subject": "Email subject line (max 10 words)",
  "draft": "Full email draft (150-250 words, professional tone)"
}
Return ONLY the JSON, no preamble or markdown."""

    user_content = f"""Student:
- Name: {website.get('name', 'Student')}
- University: {website.get('university', '')}
- Degree: {website.get('degree_level', '')} in {website.get('study_program', '')}
- Skills: {', '.join(website.get('skills', []))}
- Interests: {', '.join(website.get('field_interests', []))}
- Research idea: {enriched.get('topic_idea', 'To be defined')}
- Career goal: {enriched.get('career_goal', 'Not specified')}

Target entity:
- Type: {entity_type}
- Name: {entity_name}
- AI reasoning for match: {node.get('reasoning', '')}
- Entity details: {json.dumps(entity_data, ensure_ascii=False)[:500]}

Draft a {('thesis supervision request' if entity_type == 'supervisor' else 'research collaboration proposal' if entity_type == 'company' else 'expert collaboration request')} email."""

    try:
        result_str = await llm_call(system_prompt, user_content, temperature=0.3, max_tokens=500)
        # Strip markdown fences if present
        clean = result_str.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        result = json.loads(clean)
        return ProposeResponse(
            draft=result.get("draft", ""),
            subject=result.get("subject", f"Research proposal — {entity_name}"),
            entity_name=entity_name,
            entity_type=entity_type,
        )
    except Exception as e:
        print(f"  [Proposal ERROR: {e}]")
        return ProposeResponse(
            draft=f"Dear {entity_name},\n\nI am {website.get('name', 'a student')} from {website.get('university', 'my university')}, studying {website.get('study_program', 'my field')}. I am reaching out to explore a potential research collaboration aligned with my interests in {', '.join(website.get('field_interests', ['AI']))}.\n\nI would love to discuss this further at your convenience.\n\nBest regards,\n{website.get('name', 'Student')}",
            subject=f"Research collaboration inquiry — {entity_name}",
            entity_name=entity_name,
            entity_type=entity_type,
        )


# ── API Endpoints ───────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request):
    try:
        session = get_or_create_session(request.session_id, req.app.state.website_profile)

        is_user_message = bool(request.message.strip())

        if not is_user_message and len(session["chat_history"]) == 0:
            result = await run_welcome(session)
            intent = "welcome"
            session["chat_history"].append({"role": "assistant", "content": result.get("response", "")})

        elif is_user_message:
            session["chat_history"].append({"role": "user", "content": request.message})

            if session.get("phase") == "exploring" and session.get("current_graph"):
                result = await run_post_graph_turn(
                    session, request.message, request.selected_nodes
                )
            else:
                result = await run_chat_turn(session, request.message)

            intent = result.get("intent", "answer")

            if result.get("response"):
                session["chat_history"].append({"role": "assistant", "content": result["response"]})

            if result.get("graph_output") and result["graph_output"].get("paths"):
                session["current_graph"] = result["graph_output"]
                session["phase"] = "exploring"

        else:
            return ChatResponse(
                response="",
                intent="none",
                enriched_profile=session["enriched_profile"],
                question_count=session["question_count"],
            )

        graph_data = session.get("current_graph")
        if not graph_data or not graph_data.get("paths"):
            graph_data = None

        return ChatResponse(
            response=result.get("response", ""),
            intent=intent,
            enriched_profile=session["enriched_profile"],
            graph=graph_data,
            question_count=session["question_count"],
            max_questions=3,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/propose", response_model=ProposeResponse)
async def propose_endpoint(request: ProposeRequest, req: Request):
    """Generate a research proposal draft for a specific graph node."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[request.session_id]
    return await generate_proposal(session, request.node_id)


@app.get("/api/profile/{session_id}")
async def get_profile(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = sessions[session_id]
    return {
        "website_profile": s["website_profile"],
        "enriched_profile": s["enriched_profile"],
        "signals": s["signals"],
    }


@app.get("/api/graph/{session_id}")
async def get_graph(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id].get("current_graph", {})


@app.get("/api/health")
async def health():
    return {"status": "ok", "sessions": len(sessions)}
