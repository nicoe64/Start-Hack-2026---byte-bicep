# Studyond Backend — Projekt-Kontext Prompt

Kopiere diesen Prompt in jede neue AI-Session damit der Assistent den vollen Kontext hat.

---

## Was ist das Projekt?

Ein Backend für die START Hack 2026 Challenge von Studyond. Studyond ist eine Schweizer Plattform die Studenten, Firmen und Unis für Thesis-Projekte verbindet. Wir bauen eine AI-powered Thesis Journey: ein Student chattet, das System baut einen interaktiven Graphen mit möglichen Karrierepfaden (Topic + Supervisor + Company + Expert Kombinationen), bewertet mit Confidence-Scores und Reasoning-Steps.

## Architektur

LangGraph-basierte Agent Pipeline mit 3 Graphs und 11 Nodes.

### 3 Graphs

- **exploration_graph**: Hauptpipeline. Profil parsen → validieren → RAG-Suche → Constraints filtern → Pfade komponieren. Erzeugt den Exploration-Graph mit 2-4 bewerteten Pfaden.
- **chat_graph**: Chat-Interaktion. Kontext laden → Frage beantworten → Suggestions prüfen → Graph-Update entscheiden. Bidirektional: Chat liest Graph, Graph reagiert auf Chat.
- **journey_graph**: Timeline generieren. Wird getriggert wenn Student einen Pfad bestätigt. Transformiert Pfad in Milestones.

### 11 Nodes

```
routing/
  intent_router_node.py      — Kein LLM. Erkennt ob exploration/chat/journey.

profile/
  profile_parser_node.py     — LLM-Call. Freitext → StudentProfile JSON.
  profile_validator_node.py  — Kein LLM. Profil reicht? Fehlende Felder → Rückfragen.

retrieval/
  query_builder_node.py      — Kein LLM. Profil → Such-Query String.
  candidate_search_node.py   — Embedding API. Cosine Similarity → Top-K Candidates.
  compatibility_filter_node.py — Kein LLM. Hard Constraints: Uni-Match, Degree-Match, rejected_ids.

assembly/
  path_composer_node.py      — LLM-Call. Candidates → 2-4 scored Pfade mit Reasoning.

chat/
  context_loader_node.py     — Kein LLM. Selektierte Nodes → Entity-Daten laden.
  advisor_node.py            — LLM-Call. Thesis-Berater, beantwortet Fragen.
  suggestion_node.py         — Kein LLM. Phasenbasiert: was fehlt dem Student?
  graph_updater_node.py      — Kein LLM. Entscheidet ob Graph sich ändern muss.

journey/
  timeline_composer_node.py  — LLM/Mock. Bestätigter Pfad → Milestone-Timeline.
```

### Node-Pattern (einheitlich für alle)

Jeder Node ist eine statische Klasse mit:
- `name: ClassVar[str]` — Eindeutiger Name
- `Output(BaseNodeOutput)` — Typisierter Output mit Pydantic
- `async def run(state: dict) -> dict` — Nimmt State, gibt erweiterten State zurück
- Jeder Node hängt seinen Output an `state["node_results"]` an (Audit-Trail)

### State-Pattern

```python
BaseWorkflowState          # user_id, session_id, node_results, output
├── ExplorationState       # + message, profile, candidates, filtered_candidates, graph_output
├── ChatState              # + message, selected_nodes, current_graph, chat_history, response, suggestions
└── JourneyState           # + chosen_path, timeline_nodes
```

## Datenfluss

```
User-Nachricht → IntentRouter
  ├── "exploration" → ProfileParser → ProfileValidator
  │     ├── valid → QueryBuilder → CandidateSearch → CompatibilityFilter → PathComposer
  │     └── invalid → Rückfragen ans Frontend
  ├── "chat" → ContextLoader → Advisor → SuggestionNode → GraphUpdater
  │     ├── action "regenerate" → exploration_graph erneut
  │     └── action "none" → Response direkt
  └── "journey" → TimelineComposer
```

## Key Models

```python
StudentProfile   # degree_level, university_id, field_interests, phase, rejected_ids, ...
GraphOutput      # mode (exploration/journey), paths[], timeline_nodes[]
Path             # id, label, type, overall_confidence, confidence_breakdown, nodes[], edges[]
PathNode         # id, type (NodeType enum), entity_id, label, subtitle, confidence, reasoning_steps, children[]
CompatibilityEdge # from_node, to_node, type (compatible/partial/incompatible), reason
ChatRequest      # session_id, message, selected_nodes[], question_answers[]
ChatResponse     # response, graph, profile, suggestions[], follow_up_questions[], graph_action
```

## NodeType Regeln (für den Graph-Output)

| NodeType | Limit pro Pfad | Hard Constraint |
|---|---|---|
| direction | Exakt 1, immer erster | — |
| topic | 1 | degree_level muss matchen |
| supervisor | 1 | MUSS gleiche Uni wie Student |
| company | 0-1 | — |
| expert | 0-2 | MUSS zur Company gehören |
| methodology | 0-1 (ab MSc) | — |
| data_access | 0-1 | — |
| timeline | 0-1 | — |
| literature | 0-1 (nur PhD) | — |
| milestone | unbegrenzt (nur Journey) | — |
| action | unbegrenzt (nur Journey) | — |

Pfad-Längen: Min 3, Max 7, Sweet Spot 4-5.

## Graph-Modi

- **Exploration**: 2-4 Pfade mit Scores vergleichen. Student erkundet.
- **Journey**: Gewählter Pfad wird Timeline mit Milestones. Student hat sich entschieden.

## RAG

Mock-Daten (~130 Entities) werden beim Start einmal über OpenAI Embedding API eingebettet und in-memory gehalten. Suche per Cosine Similarity, danach Hard Constraint Filtering (Uni-Match, Degree-Match, rejected_ids).

## Mock-Daten (in app/data/)

- topics.json (60) — Thesis-Topics, je entweder Company oder Supervisor owned
- supervisors.json (25) — Akademische Betreuer an Unis
- companies.json (15) — Schweizer Firmen (Nestlé, Roche, ABB, etc.)
- experts.json (30) — Industrie-Experten bei den Firmen
- fields.json (20) — Akademische Felder
- universities.json (10) — Schweizer Unis
- study-programs.json (30) — Studiengänge (BSc/MSc/PhD)

Entity-Beziehungen:
- Student → StudyProgram → University (immer konsistent)
- Topic owned by Company (via companyId) ODER University (via universityId), nie beides
- Expert gehört zu Company (via companyId)
- Supervisor gehört zu University (via universityId)

## LLM

Einheitlicher Client in `app/llm/client.py`. Unterstützt OpenAI und Anthropic. Zwei Methoden: `call()` für Freitext, `call_json()` für strukturierten Output. Prompts liegen als Markdown in `app/prompts/`.

## API

Ein Haupt-Endpoint: `POST /api/chat` — nimmt alles (Message, selected_nodes, question_answers), gibt alles zurück (response, graph, suggestions, follow_up_questions, graph_action).

## Tech Stack

Python, FastAPI, LangGraph, Pydantic v2, OpenAI API (LLM + Embeddings), NumPy (Cosine Similarity), In-memory State.

## Noch nicht implementiert

- [ ] `app/agents/graphs/exploration_graph.py` — LangGraph Kompilierung
- [ ] `app/agents/graphs/chat_graph.py` — LangGraph Kompilierung
- [ ] `app/agents/graphs/journey_graph.py` — LangGraph Kompilierung
- [ ] `app/agents/nodes/chat/graph_updater_node.py` — Graph-Update Logik
- [ ] `app/agents/nodes/journey/timeline_composer_node.py` — Timeline generieren
- [ ] `app/rag/embeddings.py` — Mock-Daten embedden
- [ ] `app/rag/search.py` — Cosine Similarity Suche
- [ ] `app/main.py` — FastAPI App
- [ ] `app/prompts/*.md` — System Prompts
- [ ] `scripts/test_cli.py` — CLI Test
- [ ] Alle `__init__.py` Dateien
