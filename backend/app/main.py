"""
main.py — FastAPI App.
Endpoints: POST /api/chat, GET /api/profile, GET /api/graph
RAG wird beim Start initialisiert.
"""
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.graphs.main_graph import build_main_graph
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
    # Initialize RAG
    store = get_platform_store()
    print(f"RAG ready: {store.count()} entities")

    # Load test profile
    profile_path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(profile_path, encoding="utf-8") as f:
        app.state.website_profile = json.load(f)

    # Compile graph
    app.state.graph = build_main_graph()

    print(f"Backend ready. Student: {app.state.website_profile['name']}")
    yield


# ── App ─────────────────────────────────────────

app = FastAPI(title="Studyond Thesis Journey", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:3000",   # Alternative
        "http://localhost:4173",   # Vite preview
        "*",                       # Allow all for hackathon
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── POST /api/chat ──────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request):
    try:
        session = get_or_create_session(
            request.session_id,
            req.app.state.website_profile,
        )

        # Question count hochzählen wenn User eine Nachricht schickt
        if request.message.strip():
            session["question_count"] += 1

        state = {
            "session_id":           request.session_id,
            "node_results":         [],
            "output":               {},
            "message":              request.message,
            "website_profile":      session["website_profile"],
            "enriched_profile":     session["enriched_profile"],
            "signals":              session["signals"],
            "intent":               "",
            "completeness":         {},
            "chat_history":         session["chat_history"],
            "response":             "",
            "question_count":       session["question_count"],
            "search_query":         "",
            "candidates":           {},
            "filtered_candidates":  {},
            "graph_output":         {},
            "current_graph":        session.get("current_graph", {}),
            "selected_nodes":       request.selected_nodes,
        }

        result = await req.app.state.graph.ainvoke(state)

        # Session updaten
        session["enriched_profile"] = result.get("enriched_profile", session["enriched_profile"])
        session["question_count"] = result.get("question_count", session["question_count"])

        if request.message.strip():
            session["chat_history"].append({"role": "user", "content": request.message})
        if result.get("response"):
            session["chat_history"].append({"role": "assistant", "content": result["response"]})

        if result.get("graph_output") and result["graph_output"].get("paths"):
            session["current_graph"] = result["graph_output"]

        # Graph nur senden wenn es Pfade gibt
        graph_data = session.get("current_graph")
        if not graph_data or not graph_data.get("paths"):
            graph_data = None

        return ChatResponse(
            response=result.get("response", ""),
            intent=result.get("intent", "welcome"),
            enriched_profile=session["enriched_profile"],
            graph=graph_data,
            question_count=session["question_count"],
            max_questions=3,
            suggestions=result.get("suggestions", []),
            follow_up_questions=result.get("follow_up_questions", []),
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/profile ────────────────────────────

@app.get("/api/profile/{session_id}")
async def get_profile(session_id: str, req: Request):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    return {
        "website_profile": session["website_profile"],
        "enriched_profile": session["enriched_profile"],
        "signals": session["signals"],
    }


# ── GET /api/graph/{session_id} ─────────────────

@app.get("/api/graph/{session_id}")
async def get_graph(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id].get("current_graph", {})


# ── GET /api/health ─────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "sessions": len(sessions)}