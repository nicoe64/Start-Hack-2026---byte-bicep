"""
test_full_flow.py — Interaktiver Test: Chat + RAG Pipeline.

1. RAG initialisieren
2. Welcome Message
3. Chat-Loop (du tippst, Advisor antwortet mit RAG-Vorsuche)
4. Wenn du "generier" sagst → Retrieval Pipeline läuft

Usage: python -m scripts.test_full_flow
"""
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.platform import get_platform_store
from app.agents.nodes.chat.welcome_node import WelcomeNode
from app.agents.nodes.profile.profile_parser_node import ProfileParserNode
from app.agents.nodes.routing.intent_router_node import IntentRouterNode
from app.agents.nodes.chat.advisor_node import AdvisorNode
from app.agents.nodes.retrieval.query_builder_node import QueryBuilderNode
from app.agents.nodes.retrieval.candidate_search_node import CandidateSearchNode
from app.agents.nodes.retrieval.compatibility_filter_node import CompatibilityFilterNode
from app.agents.nodes.assembly.path_composer_node import PathComposerNode
from app.config import DATA_DIR


def load_test_profile() -> dict:
    path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


async def run_retrieval(state: dict):
    """Full pipeline: query → search → filter → compose paths"""
    print(f"\n  [Generating paths...]")

    result = await QueryBuilderNode.run(state)
    print(f"  [Query: {result['search_query'][:80]}...]")

    result = await CandidateSearchNode.run(result)
    candidates = result["candidates"]
    for typ, items in candidates.items():
        print(f"  [Search] {typ}: {len(items)} found")

    result["website_profile"] = state["website_profile"]
    result["enriched_profile"] = state["enriched_profile"]
    result["signals"] = state["signals"]
    result = await CompatibilityFilterNode.run(result)
    filtered = result["filtered_candidates"]

    print(f"\n  After filtering:")
    for typ, items in filtered.items():
        print(f"    {typ}: {len(items)} remaining")

    # Path Composer
    print(f"\n  [Composing paths...]")
    result = await PathComposerNode.run(result)
    graph = result.get("graph_output", {})

    paths = graph.get("paths", [])
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    warnings = graph.get("warnings", [])

    print(f"\n  === GRAPH OUTPUT ===")
    print(f"  Student: {graph.get('student_summary', '?')}")
    print(f"  Paths: {len(paths)} | Nodes: {len(nodes)} | Edges: {len(edges)}")

    for p in paths:
        print(f"\n  [{p['type'].upper()}] {p['label']} (confidence: {p['confidence']})")
        print(f"    Reasoning: {p['reasoning'][:80]}")
        for nid in p["node_ids"]:
            node = next((n for n in nodes if n["id"] == nid), None)
            if node:
                tags = " ".join(f"[{t}]" for t in node.get("tags", []))
                print(f"    {node['id']:4s} [{node['type']:10s}] {node['label'][:45]:45s} {node['confidence']:.0%} {tags}")

    if warnings:
        print(f"\n  WARNINGS:")
        for w in warnings:
            print(f"    ⚠ {w}")

    # Full JSON für Debug
    print(f"\n  [Full JSON saved to graph_output in state]")

    return result


async def main():
    print("=" * 60)
    print("Studyond Full Flow Test (Interactive)")
    print("=" * 60)

    # RAG starten
    store = get_platform_store()
    print(f"RAG ready: {store.count()} entities")

    # Profil laden
    website_profile = load_test_profile()
    print(f"\nStudent: {website_profile['name']}")
    print(f"Uni:     {website_profile['university']}")
    print(f"Degree:  {website_profile['degree_level']} {website_profile['study_program']}")
    print("-" * 60)

    # Session State
    enriched_profile = {}
    signals = {"liked": [], "rejected": [], "explored": [], "keywords_mentioned": []}
    chat_history = []
    question_count = 0

    # Welcome
    state = {
        "session_id": "test",
        "node_results": [],
        "output": {},
        "message": "",
        "website_profile": website_profile,
        "enriched_profile": enriched_profile,
        "signals": signals,
        "intent": "",
        "chat_history": [],
        "response": "",
        "question_count": 0,
    }

    result = await WelcomeNode.run(state)
    welcome = result["response"]
    chat_history.append({"role": "assistant", "content": welcome})
    print(f"\nAdvisor: {welcome}")
    print("-" * 60)

    # Chat Loop
    while True:
        try:
            message = input("\nDu: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not message or message.lower() in ("quit", "exit", "q"):
            break

        state = {
            "session_id": "test",
            "node_results": [],
            "output": {},
            "message": message,
            "website_profile": website_profile,
            "enriched_profile": enriched_profile,
            "signals": signals,
            "intent": "",
            "completeness": {},
            "chat_history": chat_history,
            "response": "",
            "question_count": question_count,
            "search_query": "",
            "candidates": {},
            "filtered_candidates": {},
            "graph_output": {},
            "current_graph": {},
        }

        # User-Nachricht zählen (nicht Fragezeichen vom Advisor)
        question_count += 1

        # Profile Parser (immer)
        try:
            result = await ProfileParserNode.run(state)
            enriched_profile = result["enriched_profile"]
        except Exception as e:
            print(f"  [Profile Parser ERROR: {e}]")
            result = state

        # Intent Router (bekommt aktuellen question_count)
        result["enriched_profile"] = enriched_profile
        result["question_count"] = question_count
        result = await IntentRouterNode.run(result)
        intent = result["intent"]

        print(f"\n[Message {question_count}/3 | Intent: {intent}]")

        if intent == "generate":
            # Retrieval Pipeline
            result["enriched_profile"] = enriched_profile
            result["signals"] = signals
            retrieval_result = await run_retrieval(result)

            chat_history.append({"role": "user", "content": message})

        else:
            # Advisor
            result["enriched_profile"] = enriched_profile
            result["question_count"] = question_count
            try:
                result = await AdvisorNode.run(result)
                response = result["response"]
            except Exception as e:
                response = f"[Advisor ERROR: {e}]"

            chat_history.append({"role": "user", "content": message})
            chat_history.append({"role": "assistant", "content": response})

            print(f"\nAdvisor: {response}")

        print("-" * 60)


if __name__ == "__main__":
    asyncio.run(main())