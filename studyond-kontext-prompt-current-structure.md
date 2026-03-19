# Studyond Backend — Projekt-Kontext Prompt (aktuell)

---

## Was ist das Projekt?

Ein Backend für die START Hack 2026 Challenge von Studyond. Studyond ist eine Schweizer Plattform die Studenten, Firmen und Unis für Thesis-Projekte verbindet. Wir bauen eine AI-powered Thesis Journey: ein Student chattet, das System baut einen interaktiven Graphen mit möglichen Karrierepfaden (Topic + Supervisor + Company + Expert Kombinationen), bewertet mit Confidence-Scores und Reasoning-Steps.

---

## Architektur

LangGraph-basierte Agent Pipeline mit intent-basiertem Routing. Ein main_graph handelt alles, ein journey_graph kommt später für Pfad-Bestätigung.

### Intents

| Intent | Beispiel | Was passiert |
|---|---|---|
| `welcome` | Erste Nachricht (chat_history leer) | Personalisierte Begrüssung mit Website-Profil |
| `generate` | "Zeig mir Pfade" | RAG → Filter → Path Composer → Graph JSON |
| `answer` | "Ich interessiere mich für NLP" | Profil updaten + Advisor antwortet |
| `ask` | "Wie läuft eine Thesis ab?" | Advisor antwortet |
| `refine` | "Doch lieber Healthcare" | Profil updaten + Graph neu generieren |
| `confirm` | "Ich nehme Pfad 1" | → journey_graph (noch nicht gebaut) |

### Drei Info-Schichten

**Schicht 1 — Website-Profil (fest, read-only):**
Name, Uni, Abschluss, Studiengang, Themenfelder, Skills, Enddatum. Harte Constraints für RAG.

**Schicht 2 — Enriched Profile (weich, LLM-erfragt, änderbar):**
phase, topic_idea, topic_clarity (vague/rough/specific), wants_company_partner, industry_interests, methodology_preference, career_goal.

**Schicht 3 — Signale (wachsen, nie gelöscht):**
liked[], rejected[], explored[], keywords_mentioned[].

### Datenfluss

```
Nachricht kommt rein
    │
    ├── chat_history leer? → welcome_node (LLM)
    │
    └── chat_history hat Einträge:
        ├── profile_parser (LLM, IMMER)
        ├── intent_router (kein LLM)
        │
        ├── generate → query_builder → candidate_search → compatibility_filter → path_composer → Graph JSON
        ├── answer/ask → advisor (LLM, Max 3 Fragen, Mock-Daten Kontext)
        ├── refine → Profil update → Pipeline re-run
        └── confirm → journey_graph (noch nicht gebaut)
```

---

## Node Status

### ✅ Fertig (gebaut + getestet)

| Node | Pfad | LLM? |
|---|---|---|
| welcome_node.py | app/agents/nodes/chat/ | Ja |
| profile_parser_node.py | app/agents/nodes/profile/ | Ja |
| intent_router_node.py | app/agents/nodes/routing/ | Nein |
| advisor_node.py | app/agents/nodes/chat/ | Ja (Max 3 Fragen, Mock-Daten) |

### ⚠️ Code existiert, nicht getestet/nicht im Graph

| Node | Pfad | Problem |
|---|---|---|
| query_builder_node.py | app/agents/nodes/retrieval/ | Muss gegen RAG verifiziert werden |
| candidate_search_node.py | app/agents/nodes/retrieval/ | Import auf search_by_query muss geprüft werden |
| compatibility_filter_node.py | app/agents/nodes/retrieval/ | Muss gegen echte Candidates getestet werden |
| path_composer_node.py | app/agents/nodes/assembly/ | Prompt fehlt (path_composer.md) |
| context_loader_node.py | app/agents/nodes/chat/ | Import auf get_entity muss geprüft werden |
| suggestion_node.py | app/agents/nodes/chat/ | Logik da, nie durchgelaufen |

### ❌ Fehlt komplett

| Node | Pfad | Wann |
|---|---|---|
| graph_updater_node.py | app/agents/nodes/chat/ | Schritt 5 |
| timeline_composer_node.py | app/agents/nodes/journey/ | Schritt 6 |

---

## RAG (✅ fertig)

| Datei | Pfad | Zweck |
|---|---|---|
| store.py | app/rag/ | Abstrakte EmbeddingStore Klasse (wiederverwendbar für User-Daten später) |
| platform.py | app/rag/ | Platform-Daten Store (Topics, Supervisors, Companies, Experts) |
| search.py | app/rag/ | search_by_query() + get_entity() |

Embedding: sentence-transformers all-MiniLM-L6-v2 (lokal, CPU). Disk-Cache in app/data/cache/.

---

## Infrastruktur (✅ fertig)

| Datei | Zweck |
|---|---|
| app/agents/graphs/main_graph.py | LangGraph (welcome + parser + router + advisor) |
| app/agents/state.py | MainState + Node Outputs |
| app/llm/client.py | Anthropic Claude (call + call_json) |
| app/config.py | Settings |
| app/main.py | FastAPI (POST /api/chat, GET /api/profile, GET /api/graph) |
| scripts/test_cli.py | Konsolen-Chat Test |
| scripts/test_rag.py | RAG Pipeline Test |

### Prompts (app/prompts/)

| Datei | Status |
|---|---|
| welcome.md | ✅ Fertig |
| profile_parser.md | ✅ Fertig |
| advisor.md | ✅ Fertig |
| path_composer.md | ❌ Fehlt |

### Mock-Daten (alle in app/data/)

topics.json (60), supervisors.json (25), companies.json (15), experts.json (30), fields.json (20), universities.json (10), study-programs.json (30), students.json (40), projects.json (15), test_website_profile.json (1)

---

## Was noch gebaut werden muss

### Schritt 2: Retrieval Nodes testen + in Graph einbinden
- query_builder_node.py, candidate_search_node.py, compatibility_filter_node.py TESTEN + FIXEN
- main_graph.py ÄNDERN — generate Route aktivieren
- state.py ÄNDERN — search_query, candidates, filtered_candidates, graph_output Felder
- scripts/test_retrieval.py NEU

### Schritt 3: Path Composer Prompt
- app/prompts/path_composer.md NEU
- path_composer_node.py ÄNDERN
- scripts/test_path_composer.py NEU

### Schritt 4: Main Graph verbinden
- main_graph.py ÄNDERN — generate routet zu voller Pipeline
- test_cli.py ÄNDERN — Graph-Output anzeigen
- RAG Initialize beim Start

### Schritt 5: Chat mit Graph-Interaktion
- context_loader_node.py TESTEN + FIXEN
- suggestion_node.py TESTEN + FIXEN
- graph_updater_node.py NEU
- main_graph.py ÄNDERN

### Schritt 6: Journey Graph
- timeline_composer_node.py NEU
- main_graph.py ÄNDERN

### Schritt 7: Session-Persistenz
- State als JSON speichern/laden

---

## Graph-Output Schema (fix definiert)

```json
{
  "student_summary": "string",
  "paths": [{ "id", "label", "type": "industry|academic|custom", "confidence", "reasoning", "node_ids" }],
  "nodes": [{ "id", "type": "topic|company|supervisor|expert", "entity_id", "label", "subtitle", "confidence", "reasoning", "tags", "data" }],
  "edges": [{ "from", "to", "type": "belongs_to|posted_by|supervised_by|has_expert" }],
  "warnings": []
}
```

Erlaubte Edges: topic→company (belongs_to), topic→supervisor (posted_by/supervised_by), company→expert (has_expert).
Verboten: supervisor→company, expert→supervisor, topic→topic.
Pfad-Muster: Industry (3-4 Nodes), Academic (2 Nodes), Custom (2-3 Nodes).
1-4 Pfade pro Graph.

---

## Entity-Beziehungen

- Topic owned by Company (companyId) ODER University (universityId), nie beides
- Company Topics haben expertIds[], University Topics haben supervisorIds[]
- Expert.companyId → Company
- Supervisor.universityId → University

---

## Node-Pattern

```python
class ExampleNode:
    name: ClassVar[str] = "ExampleNode"
    @staticmethod
    async def run(state: dict) -> dict:
        node_output = SomeOutput(node=ExampleNode.name, ...)
        return {
            **state,
            "field": result,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }
```

## Tech Stack

Python 3.11, FastAPI, LangGraph, Anthropic Claude (Haiku), sentence-transformers (lokal CPU), Pydantic v2, NumPy, In-memory State.

## Ordnerstruktur

```
studyond-backend/
├── .env
├── requirements.txt
├── app/
│   ├── config.py
│   ├── main.py
│   ├── agents/
│   │   ├── state.py
│   │   ├── graphs/
│   │   │   └── main_graph.py
│   │   └── nodes/
│   │       ├── routing/intent_router_node.py
│   │       ├── profile/profile_parser_node.py
│   │       ├── retrieval/query_builder_node.py, candidate_search_node.py, compatibility_filter_node.py
│   │       ├── assembly/path_composer_node.py
│   │       ├── chat/welcome_node.py, advisor_node.py, context_loader_node.py, suggestion_node.py
│   │       └── journey/ (leer)
│   ├── llm/client.py
│   ├── rag/store.py, platform.py, search.py
│   ├── prompts/welcome.md, profile_parser.md, advisor.md
│   └── data/ (alle Mock-JSONs + cache/)
├── scripts/test_cli.py, test_rag.py
└── tests/
```
