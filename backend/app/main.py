"""
main.py — FastAPI App.
Calls nodes directly (same logic as test_full_flow.py).
No LangGraph overhead — simpler, faster, works.
"""
import json
import os
from contextlib import asynccontextmanager

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
    """First turn: personalized welcome."""
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
    result = await WelcomeNode.run(state)
    return result


async def run_chat_turn(session: dict, message: str) -> dict:
    """Normal chat: profile_parser → intent_router → advisor OR generate pipeline."""

    # Count BEFORE building state
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

    # 1. Profile Parser (always)
    try:
        result = await ProfileParserNode.run(state)
        session["enriched_profile"] = result.get("enriched_profile", session["enriched_profile"])
    except Exception as e:
        print(f"  [ProfileParser ERROR: {e}]")
        result = state

    # 2. Intent Router
    result["enriched_profile"] = session["enriched_profile"]
    result["question_count"] = question_count
    result = await IntentRouterNode.run(result)
    intent = result["intent"]

    print(f"  [Message {question_count}/3 | Intent: {intent}]")

    if intent == "generate":
        # 3a. Generate Pipeline
        result = await run_generate_pipeline(result, session)
    else:
        # 3b. Advisor
        result["enriched_profile"] = session["enriched_profile"]
        result["question_count"] = question_count
        result = await AdvisorNode.run(result)

    result["intent"] = intent
    result["question_count"] = question_count
    return result


async def run_generate_pipeline(state: dict, session: dict) -> dict:
    """RAG → Filter → Compose paths."""
    print("  [Generating paths...]")

    state["enriched_profile"] = session["enriched_profile"]
    state["signals"] = session["signals"]
    state["website_profile"] = session["website_profile"]

    # Query Builder
    result = await QueryBuilderNode.run(state)
    print(f"  [Query: {result.get('search_query', '')[:80]}]")

    # Candidate Search
    result = await CandidateSearchNode.run(result)
    for typ, items in result.get("candidates", {}).items():
        print(f"  [Search] {typ}: {len(items)} found")

    # Compatibility Filter
    result["website_profile"] = session["website_profile"]
    result["enriched_profile"] = session["enriched_profile"]
    result["signals"] = session["signals"]
    result = await CompatibilityFilterNode.run(result)

    for typ, items in result.get("filtered_candidates", {}).items():
        print(f"  [Filter] {typ}: {len(items)} remaining")

    # Path Composer
    print("  [Composing paths...]")
    result = await PathComposerNode.run(result)

    graph = result.get("graph_output", {})
    print(f"  [Result] {len(graph.get('paths', []))} paths, {len(graph.get('nodes', []))} nodes")

    return result


# ── POST /api/chat ──────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request):
    try:
        session = get_or_create_session(
            request.session_id,
            req.app.state.website_profile,
        )

        is_user_message = bool(request.message.strip())

        if not is_user_message and len(session["chat_history"]) == 0:
            # Welcome
            result = await run_welcome(session)
            intent = "welcome"
            session["chat_history"].append({"role": "assistant", "content": result.get("response", "")})

        elif is_user_message:
            # Chat turn
            session["chat_history"].append({"role": "user", "content": request.message})
            result = await run_chat_turn(session, request.message)
            intent = result.get("intent", "answer")

            # Save assistant response to history
            if result.get("response"):
                session["chat_history"].append({"role": "assistant", "content": result["response"]})

            # Save graph if generated
            if result.get("graph_output") and result["graph_output"].get("paths"):
                session["current_graph"] = result["graph_output"]

        else:
            # Empty message, not first turn
            return ChatResponse(
                response="",
                intent="none",
                enriched_profile=session["enriched_profile"],
                question_count=session["question_count"],
            )

        # Build response
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


# ── GET endpoints ───────────────────────────────

@app.get("/api/profile/{session_id}")
async def get_profile(session_id: str, req: Request):
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