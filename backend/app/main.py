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


# ── Models ──────────────────────────────────────

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


# ── Session Store ────────────────────────────────

sessions: dict[str, dict] = {}


def get_or_create_session(session_id: str, website_profile: dict) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "website_profile": website_profile,
            "enriched_profile": {},
            "signals": {"liked": [], "rejected": [], "explored": [], "keywords_mentioned": []},
            "chat_history": [],
            "current_graph": {},
            "question_count": 0,
            "phase": "chat",
        }
    return sessions[session_id]


# ── Lifespan ─────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    store = get_platform_store()
    print(f"RAG ready: {store.count()} entities")
    profile_path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(profile_path, encoding="utf-8") as f:
        app.state.website_profile = json.load(f)
    print(f"Backend ready. Student: {app.state.website_profile['name']}")
    yield


# ── App ──────────────────────────────────────────

app = FastAPI(title="Studyond Thesis Journey", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pipeline ─────────────────────────────────────

async def run_welcome(session: dict) -> dict:
    state = {
        "session_id": "api", "node_results": [], "output": {},
        "message": "", "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"], "intent": "welcome",
        "chat_history": [], "response": "", "question_count": 0,
    }
    return await WelcomeNode.run(state)


async def run_chat_turn(session: dict, message: str) -> dict:
    session["question_count"] += 1
    qc = session["question_count"]

    state = {
        "session_id": "api", "node_results": [], "output": {},
        "message": message,
        "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"], "intent": "",
        "chat_history": session["chat_history"], "response": "",
        "question_count": qc, "search_query": "",
        "candidates": {}, "filtered_candidates": {}, "graph_output": {},
        "current_graph": session.get("current_graph", {}),
    }

    try:
        result = await ProfileParserNode.run(state)
        session["enriched_profile"] = result.get("enriched_profile", session["enriched_profile"])
    except Exception as e:
        print(f"  [ProfileParser ERROR: {e}]")
        result = state

    result["enriched_profile"] = session["enriched_profile"]
    result["question_count"] = qc
    result = await IntentRouterNode.run(result)
    intent = result["intent"]
    print(f"  [Message {qc}/3 | Intent: {intent}]")

    if intent == "generate":
        result = await run_generate_pipeline(result, session)
    else:
        result["enriched_profile"] = session["enriched_profile"]
        result["question_count"] = qc
        result = await AdvisorNode.run(result)

    result["intent"] = intent
    result["question_count"] = qc
    return result


async def run_generate_pipeline(state: dict, session: dict) -> dict:
    print("  [Generating paths...]")
    state.update({
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"],
        "website_profile": session["website_profile"],
    })
    result = await QueryBuilderNode.run(state)
    result = await CandidateSearchNode.run(result)
    result.update({
        "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"],
    })
    result = await CompatibilityFilterNode.run(result)
    result = await PathComposerNode.run(result)
    graph = result.get("graph_output", {})
    print(f"  [Result] {len(graph.get('paths', []))} paths, {len(graph.get('nodes', []))} nodes")
    return result


# ── Post-Graph Chat ───────────────────────────────

def _is_proposal_mode(message: str) -> bool:
    return message.strip().startswith("[Proposal draft context:")


def _build_node_context(selected_nodes: list[str], graph: dict) -> str:
    if not selected_nodes:
        return ""
    lines = ["SELECTED NODES (user is asking about these):"]
    for node_id in selected_nodes:
        node = next((n for n in graph.get("nodes", []) if n["id"] == node_id), None)
        if node:
            lines.append(
                f"  [{node['type'].upper()}] {node['label']}"
                f" | {node.get('subtitle', '')}"
                f" | confidence: {int(node.get('confidence', 0) * 100)}%"
                f" | reasoning: {node.get('reasoning', '')}"
                f" | tags: {', '.join(node.get('tags', []))}"
            )
            if node.get("data"):
                d = node["data"]
                extras = []
                for k in ("researchInterests", "domains", "about", "description", "degrees"):
                    if k in d:
                        val = d[k]
                        if isinstance(val, list):
                            extras.append(f"{k}: {', '.join(str(v) for v in val[:4])}")
                        else:
                            extras.append(f"{k}: {str(val)[:120]}")
                if extras:
                    lines.append(f"    Entity details: {' | '.join(extras)}")
    return "\n".join(lines)


async def run_post_graph_turn(
    session: dict, message: str, selected_nodes: list[str]
) -> dict:
    """
    Handles chat after graph is generated.
    - If intent is 'refine': update enriched profile and regenerate graph
    - Otherwise: contextual LLM chat with node context
    """
    graph = session.get("current_graph", {})
    website = session.get("website_profile", {})
    enriched = session.get("enriched_profile", {})

    # ── Always run profile parser to capture new topic preferences ──
    try:
        parser_state = {
            "session_id": "api", "node_results": [], "output": {},
            "message": message,
            "website_profile": website,
            "enriched_profile": enriched,
            "signals": session["signals"],
            "intent": "", "chat_history": session.get("chat_history", []),
            "response": "", "question_count": session.get("question_count", 3),
        }
        parsed = await ProfileParserNode.run(parser_state)
        session["enriched_profile"] = parsed.get("enriched_profile", enriched)
        enriched = session["enriched_profile"]
    except Exception as e:
        print(f"  [PostGraph ProfileParser ERROR: {e}]")

    # ── Check intent via router ──
    router_state = {
        "session_id": "api", "node_results": [], "output": {},
        "message": message,
        "website_profile": website,
        "enriched_profile": enriched,
        "signals": session["signals"],
        "intent": "", "chat_history": session.get("chat_history", []),
        "response": "", "question_count": session.get("question_count", 3),
        "current_graph": graph,
    }
    router_result = await IntentRouterNode.run(router_state)
    intent = router_result["intent"]
    print(f"  [PostGraph Intent: {intent}]")

    # ── REFINE: regenerate graph with updated profile ──
    if intent == "refine":
        print("  [Refining — regenerating graph with new preferences...]")
        gen_state = {
            "session_id": "api", "node_results": [], "output": {},
            "message": message,
            "website_profile": website,
            "enriched_profile": enriched,
            "signals": session["signals"],
            "intent": "generate",
            "chat_history": session.get("chat_history", []),
            "response": "", "question_count": session.get("question_count", 3),
            "search_query": "", "candidates": {}, "filtered_candidates": {},
            "graph_output": {}, "current_graph": graph,
        }
        result = await run_generate_pipeline(gen_state, session)
        new_graph = result.get("graph_output", {})

        if new_graph.get("paths"):
            session["current_graph"] = new_graph
            response = "I've updated your paths based on your new preferences. Here are your refined options."
        else:
            response = "I tried to refine your paths but couldn't find better matches. Try being more specific about your new direction."

        return {"response": response, "intent": "refine", "graph_output": new_graph}

    # ── GENERATE: explicit re-generation request ──
    if intent == "generate":
        print("  [Re-generating graph on request...]")
        gen_state = {
            "session_id": "api", "node_results": [], "output": {},
            "message": message,
            "website_profile": website,
            "enriched_profile": enriched,
            "signals": session["signals"],
            "intent": "generate",
            "chat_history": session.get("chat_history", []),
            "response": "", "question_count": session.get("question_count", 3),
            "search_query": "", "candidates": {}, "filtered_candidates": {},
            "graph_output": {}, "current_graph": graph,
        }
        result = await run_generate_pipeline(gen_state, session)
        new_graph = result.get("graph_output", {})
        if new_graph.get("paths"):
            session["current_graph"] = new_graph
        return {
            "response": "Here are your updated paths.",
            "intent": "generate",
            "graph_output": new_graph,
        }

    # ── DEFAULT: contextual LLM chat ──
    node_context = _build_node_context(selected_nodes, graph)
    is_proposal = _is_proposal_mode(message)

    path_summary = ""
    if graph.get("paths"):
        path_summary = "GRAPH PATHS:\n" + "\n".join(
            f"  - {p['label']} ({p['type']}, {int(p['confidence']*100)}%): {p.get('reasoning','')}"
            for p in graph["paths"]
        )

    if is_proposal:
        system_prompt = """You are a research proposal writing assistant helping a thesis student.
Give specific, concrete suggestions for the section they're asking about.
Always tie advice to the student's specific profile, skills, and selected entities.
Keep responses focused and practical — under 200 words unless writing a full draft section.
Do not use markdown headers or bullet points excessively — write in clear plain prose."""
    else:
        system_prompt = """You are a thesis advisor helping a student explore their academic and career options.
Be specific and reference the actual entities in the graph. Keep responses focused and under 200 words.
Do not use markdown formatting — write in clear plain prose."""

    user_content = f"""Student profile: {json.dumps(website, ensure_ascii=False)}
Enriched profile: {json.dumps(enriched, ensure_ascii=False)}

{path_summary}

{node_context}

Recent chat:
{chr(10).join(f"{m['role']}: {m['content']}" for m in session.get('chat_history', [])[-6:])}

User message: {message}"""

    try:
        response = await llm_call(system_prompt, user_content, temperature=0.4)
    except Exception as e:
        print(f"  [PostGraph LLM ERROR: {e}]")
        response = "I'm having trouble responding right now. Please try again."

    intent_out = "proposal_assist" if is_proposal else ("node_detail" if node_context else "explore")
    return {"response": response, "intent": intent_out}


# ── Endpoints ─────────────────────────────────────

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

            # Update graph if pipeline returned a new one
            if result.get("graph_output") and result["graph_output"].get("paths"):
                session["current_graph"] = result["graph_output"]
                session["phase"] = "exploring"

        else:
            return ChatResponse(
                response="", intent="none",
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


@app.get("/api/profile/{session_id}")
async def get_profile(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = sessions[session_id]
    return {"website_profile": s["website_profile"], "enriched_profile": s["enriched_profile"], "signals": s["signals"]}


@app.get("/api/graph/{session_id}")
async def get_graph(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id].get("current_graph", {})


@app.get("/api/health")
async def health():
    return {"status": "ok", "sessions": len(sessions)}