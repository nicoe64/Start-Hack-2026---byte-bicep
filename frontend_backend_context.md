# Studyond — Projekt-Kontext Prompt (aktuell)

---

## Was ist das Projekt?

Ein AI-powered Thesis Journey für die START Hack 2026 Challenge von Studyond. Studenten chatten mit einem AI-Advisor, das System sammelt Infos in 3 Fragen, dann generiert es einen interaktiven Graphen mit passenden Thesis-Pfaden (Topic + Supervisor + Company + Expert Kombinationen), bewertet mit Confidence-Scores.

---

## Architektur Übersicht

```
Frontend (Vite + React + TypeScript)     Backend (FastAPI + Python)
├── Chat UI (AIConciergeDrawer)          ├── POST /api/chat
├── Graph Renderer (ReactFlow)    ←───── │   ├── Welcome (1. Call)
├── Path Tabs                            │   ├── Chat (Frage 1-3)
└── Node Detail Dialog                   │   └── Generate (ab Frage 3)
                                         ├── GET /api/graph/{session_id}
                                         ├── GET /api/profile/{session_id}
                                         └── GET /api/health
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:8000`

---

## Backend

### Tech Stack
Python 3.11, FastAPI, Anthropic Claude (Haiku), sentence-transformers (lokal CPU), Pydantic v2, NumPy

### Ablauf (direkte Node-Aufrufe, kein LangGraph)

```
POST /api/chat {session_id, message}

message == "" und chat_history leer?
  → welcome_node (LLM) → personalisierte Begrüssung

message hat Text?
  → question_count++ (vor allem anderen)
  → profile_parser_node (LLM, IMMER) → enriched_profile updaten
  → intent_router_node (kein LLM) → checkt question_count
      │
      ├── count < 3 → advisor_node (LLM)
      │   RAG-Vorsuche: welche Topics gibt es für diesen Studenten?
      │   Fragt präzise mit echten Daten aus der Plattform
      │
      └── count >= 3 → Generate Pipeline:
          → query_builder_node (kein LLM) → Profil → Query String
          → candidate_search_node (Embedding) → Cosine Similarity → Top-K
          → compatibility_filter_node (kein LLM) → Degree-Match, Uni-Match
          → path_composer_node (LLM) → Graph JSON nach Frontend-Schema
```

### Drei Info-Schichten

| Schicht | Quelle | Verwendung |
|---|---|---|
| Website-Profil | Frontend, fix | Harte RAG-Constraints (Uni, Degree) |
| Enriched Profile | LLM-erfragt | Weiche RAG-Query (topic_idea, career_goal) |
| Signale | Chat-Verlauf | Re-Ranking (liked, rejected) |

### Node Status

| Node | Datei | LLM? | Status |
|---|---|---|---|
| welcome_node | app/agents/nodes/chat/ | Ja | ✅ |
| profile_parser_node | app/agents/nodes/profile/ | Ja | ✅ |
| intent_router_node | app/agents/nodes/routing/ | Nein | ✅ |
| advisor_node | app/agents/nodes/chat/ | Ja | ✅ (RAG-Vorsuche) |
| query_builder_node | app/agents/nodes/retrieval/ | Nein | ✅ |
| candidate_search_node | app/agents/nodes/retrieval/ | Nein | ✅ |
| compatibility_filter_node | app/agents/nodes/retrieval/ | Nein | ✅ |
| path_composer_node | app/agents/nodes/assembly/ | Ja | ✅ |
| context_loader_node | app/agents/nodes/chat/ | Nein | ❌ Nicht implementiert |
| graph_updater_node | app/agents/nodes/chat/ | Nein | ❌ Nicht implementiert |
| timeline_composer_node | app/agents/nodes/journey/ | Nein | ❌ Nicht implementiert |

### RAG

| Datei | Zweck |
|---|---|
| app/rag/store.py | Abstrakte EmbeddingStore Klasse (wiederverwendbar) |
| app/rag/platform.py | Lädt alle Mock-Daten, embeddet mit sentence-transformers, Disk-Cache |
| app/rag/search.py | search_by_query() → Top-K pro Entity-Typ |

Embedding: `all-MiniLM-L6-v2` lokal auf CPU. ~140 Entities. Cache in `app/data/cache/`.

### Prompts (alle Englisch, in app/prompts/)

| Datei | Zweck |
|---|---|
| welcome.md | Personalisierte Begrüssung mit Profil-Daten |
| profile_parser.md | Extrahiert enriched_profile aus User-Nachricht |
| advisor.md | 3 präzise Fragen mit echten Plattform-Daten |
| path_composer.md | Graph-JSON generieren nach Frontend-Schema |

### LLM Client (app/llm/client.py)

```python
call(system_prompt, message, temperature, max_tokens) → str
call_json(system_prompt, message, temperature, max_tokens) → dict
```
Provider: Anthropic Claude (claude-3-5-haiku-latest). Konfiguriert via `.env`.

### API Endpoints

```
POST /api/chat
  Request:  { session_id, message, selected_nodes[] }
  Response: { response, intent, enriched_profile, graph, question_count, max_questions }

GET /api/graph/{session_id}   → aktueller Graph
GET /api/profile/{session_id} → Profil + Signale
GET /api/health               → { status: "ok" }
```

### Mock-Daten (app/data/)

| Datei | Einträge | Beschreibung |
|---|---|---|
| topics.json | 68 | Thesis-Topics (30 Company, 30 Uni, 8 neue Robotics) |
| supervisors.json | 28 | Professoren (inkl. 3 neue an THI) |
| companies.json | 18 | Firmen (inkl. Airbus, BMW, IDSIA) |
| experts.json | 33 | Industrie-Experten |
| fields.json | 20 | Akademische Felder |
| universities.json | 11 | Unis (inkl. TUM) |
| study-programs.json | 31 | Studiengänge |
| test_website_profile.json | 1 | Felix Boyke, BSc KI, THI |

Entity-Beziehungen:
- Topic owned by Company (companyId) ODER University (universityId), nie beides
- Company Topics haben expertIds[], University Topics haben supervisorIds[]
- Expert.companyId → Company
- Supervisor.universityId → University

### Backend Ordnerstruktur

```
backend/
├── .env                          # ANTHROPIC_API_KEY, LLM_MODEL
├── requirements.txt              # anthropic, pydantic, numpy, sentence-transformers, fastapi, uvicorn
├── app/
│   ├── config.py
│   ├── main.py                   # FastAPI — direkte Node-Aufrufe
│   ├── agents/
│   │   ├── state.py              # MainState TypedDict + Node Outputs
│   │   ├── graphs/
│   │   │   └── main_graph.py     # LangGraph (existiert, wird aktuell nicht genutzt)
│   │   └── nodes/
│   │       ├── routing/intent_router_node.py
│   │       ├── profile/profile_parser_node.py
│   │       ├── retrieval/query_builder_node.py, candidate_search_node.py, compatibility_filter_node.py
│   │       ├── assembly/path_composer_node.py
│   │       └── chat/welcome_node.py, advisor_node.py
│   ├── llm/client.py             # Anthropic Claude
│   ├── rag/store.py, platform.py, search.py
│   ├── prompts/welcome.md, profile_parser.md, advisor.md, path_composer.md
│   └── data/                     # Alle Mock-JSONs + cache/
└── scripts/
    ├── test_cli.py               # Chat-Test via LangGraph
    ├── test_rag.py               # RAG-Test (5 Queries)
    └── test_full_flow.py         # Interaktiver Test: Chat → Generate (funktioniert!)
```

---

## Frontend

### Tech Stack
Vite, React, TypeScript, TailwindCSS, React Flow (@xyflow/react), Framer Motion, shadcn/ui, dagre (Graph-Layout)

### Komponenten

| Datei | Zweck |
|---|---|
| src/pages/Index.tsx | Hauptseite: Sidebar + Graph + Chat Drawer |
| src/components/AIConciergeDrawer.tsx | Chat-Panel rechts: Nachrichten, Input, Send |
| src/components/graph/GraphView.tsx | React Flow Graph-Renderer |
| src/components/graph/EntityNode.tsx | Node-Komponente (Topic, Company, Supervisor, Expert) |
| src/components/graph/ProfileNode.tsx | Student-Profil Node (oben im Graph) |
| src/components/graph/parseGraphToFlow.ts | Backend JSON → React Flow Nodes + Edges + Dagre Layout |
| src/components/graph/mockGraphData.ts | TypeScript Interfaces + Mock-Daten (werden durch API ersetzt) |
| src/components/graph/NodeDetailDialog.tsx | Popup wenn Node angeklickt wird |
| src/components/StudyondSidebar.tsx | Navigation links |
| src/lib/api.ts | API-Client: sendMessage(), getGraph(), healthCheck() |

### Frontend Ablauf

```
1. App lädt → sendMessage(SESSION_ID, "") → Welcome-Nachricht
2. User tippt → sendMessage(SESSION_ID, text) → Advisor antwortet
3. Nach 3 Nachrichten → Backend gibt graph zurück
4. Index.tsx setzt graphData → GraphView rendert
5. Path Tabs erscheinen oben → User kann zwischen Pfaden wechseln
6. Nodes sind klickbar → NodeDetailDialog öffnet sich
```

### Graph JSON Schema (Backend → Frontend, identisch)

```typescript
interface BackendGraphResponse {
  student_summary: string;
  paths: BackendPath[];     // 1-4 Pfade
  nodes: BackendNode[];     // Flache Liste aller Nodes
  edges: BackendEdge[];     // Alle Verbindungen
  warnings: string[];
}

interface BackendPath {
  id: string;               // "path-1"
  label: string;            // "AI at Nestlé"
  type: "industry" | "academic" | "custom";
  confidence: number;       // 0.0 - 1.0
  reasoning: string;
  node_ids: string[];       // ["n1", "n2", "n3"]
}

interface BackendNode {
  id: string;               // "n1"
  type: "topic" | "company" | "supervisor" | "expert";
  entity_id: string | null;
  label: string;
  subtitle: string;
  confidence: number;
  reasoning: string;
  tags: string[];           // ["can_lead_to_job", "same_university"]
  data: Record<string, unknown>;
}

interface BackendEdge {
  from: string;
  to: string;
  type: "belongs_to" | "posted_by" | "supervised_by" | "has_expert";
}
```

### Erlaubte Edges

| Edge | Von → Zu | Wann |
|---|---|---|
| belongs_to | topic → company | Topic hat companyId |
| posted_by | topic → supervisor | Supervisor in Topic.supervisorIds |
| supervised_by | topic → supervisor | System-Vorschlag |
| has_expert | company → expert | Expert.companyId == Company.id |

Verboten: supervisor→company, expert→supervisor, topic→topic

### Drei Pfad-Muster

1. **Industry:** topic → company + expert + supervisor (3-4 Nodes)
2. **Academic:** topic → supervisor (2 Nodes)
3. **Custom:** topic(null) → supervisor (2-3 Nodes)

### Frontend Ordnerstruktur

```
FrontEnd/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── App.tsx                   # Router
│   ├── main.tsx                  # Entry
│   ├── pages/
│   │   └── Index.tsx             # Hauptseite
│   ├── components/
│   │   ├── StudyondSidebar.tsx
│   │   ├── AIConciergeDrawer.tsx # Chat
│   │   ├── TopicCard.tsx
│   │   ├── graph/
│   │   │   ├── GraphView.tsx
│   │   │   ├── EntityNode.tsx
│   │   │   ├── ProfileNode.tsx
│   │   │   ├── parseGraphToFlow.ts
│   │   │   ├── mockGraphData.ts  # Interfaces (bleibt, Mock-Daten optional)
│   │   │   └── NodeDetailDialog.tsx
│   │   └── ui/                   # shadcn components
│   ├── lib/
│   │   └── api.ts                # Backend API Client
│   ├── hooks/
│   └── data/                     # Lokale JSON Kopien (nicht genutzt bei API)
```

---

## Was noch fehlt

### Prio 1 — Für den Hackathon-Pitch
- [ ] Backend + Frontend zusammen testen (main.py → api.ts → Graph rendern)
- [ ] 3 geskriptete Pitch-Antworten die immer gute Ergebnisse liefern
- [ ] Graph-Darstellung im Frontend mit echten Backend-Daten

### Prio 2 — Nice-to-have
- [ ] Node-Klick → Chat-Nachricht ans Backend → Details anzeigen
- [ ] Pfad-Wechsel → Graph re-rendert mit anderem Pfad
- [ ] "Refine" — User ändert Meinung → Graph regeneriert
- [ ] Progress-Bar im Frontend (question_count / max_questions)

### Prio 3 — Später
- [ ] Journey Graph (User bestätigt Pfad → Timeline mit Milestones)
- [ ] Session-Persistenz (JSON pro Session)
- [ ] User-spezifischer RAG Store

---

## Starten

Terminal 1 (Backend):
```bash
cd backend
pip install -r requirements.txt
# .env: ANTHROPIC_API_KEY=sk-ant-... und LLM_MODEL=claude-3-5-haiku-latest
uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend):
```bash
cd FrontEnd
npm install
npm run dev
```

Öffne http://localhost:5173

---

## Node-Pattern (für alle Nodes einheitlich)

```python
class ExampleNode:
    name: ClassVar[str] = "ExampleNode"
    @staticmethod
    async def run(state: dict) -> dict:
        # ... Logik ...
        node_output = SomeOutput(node=ExampleNode.name, ...)
        return {
            **state,
            "field": result,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }
```

## Test-Profil

```json
{
  "name": "Felix Boyke",
  "university": "Technische Hochschule Ingolstadt",
  "university_id": "uni-10",
  "degree_level": "BSc",
  "study_program": "Künstliche Intelligenz",
  "field_interests": ["Artificial Intelligence", "Computer Science", "Mechanical Engineering"],
  "skills": ["Python", "PyTorch", "Deep Learning", "Reinforcement Learning"]
}
```
