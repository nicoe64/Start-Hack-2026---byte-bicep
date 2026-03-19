"""
main.py — FastAPI App.
Ein Haupt-Endpoint der alles handelt: Chat, Graph-Generierung, Profil-Updates.
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

load_dotenv()


# ── Request/Response Models ─────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str
    selected_nodes: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    intent: str
    enriched_profile: dict
    graph: dict | None = None
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
        }
    return sessions[session_id]


# ── Lifespan ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load test profile (später: vom Frontend pro User)
    profile_path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(profile_path) as f:
        app.state.website_profile = json.load(f)

    # Compile graph once
    app.state.graph = build_main_graph()

    print(f"Studyond Backend ready. Student: {app.state.website_profile['name']}")
    yield


# ── App ─────────────────────────────────────────

app = FastAPI(title="Studyond Thesis Journey", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── POST /api/chat ──────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, req: Request):
    try:
        # Session laden oder erstellen
        session = get_or_create_session(
            request.session_id,
            req.app.state.website_profile,
        )

        # State für diesen Turn bauen
        state = {
            "session_id":       request.session_id,
            "node_results":     [],
            "output":           {},
            "message":          request.message,
            "website_profile":  session["website_profile"],
            "enriched_profile": session["enriched_profile"],
            "signals":          session["signals"],
            "intent":           "",
            "chat_history":     session["chat_history"],
            "response":         "",
            "current_graph":    session.get("current_graph", {}),
            "selected_nodes":   request.selected_nodes,
        }

        # Graph ausführen
        result = await req.app.state.graph.ainvoke(state)

        # Session updaten
        session["enriched_profile"] = result.get("enriched_profile", session["enriched_profile"])
        session["chat_history"].append({"role": "user", "content": request.message})
        session["chat_history"].append({"role": "assistant", "content": result.get("response", "")})

        if result.get("current_graph"):
            session["current_graph"] = result["current_graph"]

        return ChatResponse(
            response=result.get("response", ""),
            intent=result.get("intent", ""),
            enriched_profile=session["enriched_profile"],
            graph=session.get("current_graph") or None,
            suggestions=result.get("suggestions", []),
            follow_up_questions=result.get("follow_up_questions", []),
        )

    except Exception as e:
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
