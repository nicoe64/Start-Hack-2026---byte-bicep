"""
test_cli.py — Interaktiver Konsolen-Test.
Chattet mit dem Main-Graph, zeigt nach jeder Nachricht
das enriched_profile und die Response.

Usage: python -m scripts.test_cli
"""
import asyncio
import json
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.graphs.main_graph import build_main_graph
from app.config import DATA_DIR


def load_test_profile() -> dict:
    path = os.path.join(DATA_DIR, "test_website_profile.json")
    with open(path) as f:
        return json.load(f)


async def main():
    print("=" * 60)
    print("Studyond Thesis Journey — CLI Test")
    print("=" * 60)

    # Load website profile
    website_profile = load_test_profile()
    print(f"\nStudent: {website_profile['name']}")
    print(f"Uni:     {website_profile['university']}")
    print(f"Degree:  {website_profile['degree_level']} {website_profile['study_program']}")
    print(f"Fields:  {', '.join(website_profile['field_interests'])}")
    print("-" * 60)

    # Build graph
    graph = build_main_graph()

    # Session state (persists across messages)
    enriched_profile = {}
    signals = {"liked": [], "rejected": [], "explored": [], "keywords_mentioned": []}
    chat_history = []

    # Welcome: first turn via graph (welcome_node)
    state = {
        "session_id":       "test-session",
        "node_results":     [],
        "output":           {},
        "message":          "",
        "website_profile":  website_profile,
        "enriched_profile": enriched_profile,
        "signals":          signals,
        "intent":           "",
        "chat_history":     [],
        "response":         "",
    }
    try:
        result = await graph.ainvoke(state)
        response = result.get("response", "")
        chat_history.append({"role": "assistant", "content": response})
        print(f"\nAdvisor: {response}")
        print("-" * 60)
    except Exception as e:
        print(f"[ERROR] Welcome: {e}")

    while True:
        try:
            message = input("\nDu: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not message or message.lower() in ("quit", "exit", "q"):
            break

        # Build state for this turn
        state = {
            "session_id":       "test-session",
            "node_results":     [],
            "output":           {},
            "message":          message,
            "website_profile":  website_profile,
            "enriched_profile": enriched_profile,
            "signals":          signals,
            "intent":           "",
            "chat_history":     chat_history,
            "response":         "",
        }

        # Run graph
        try:
            result = await graph.ainvoke(state)
        except Exception as e:
            print(f"\n[ERROR] {e}\n")
            continue

        # Update persistent state
        enriched_profile = result.get("enriched_profile", enriched_profile)
        response = result.get("response", "")
        intent = result.get("intent", "")

        # Update chat history
        chat_history.append({"role": "user", "content": message})
        chat_history.append({"role": "assistant", "content": response})

        # Display
        print(f"\n[Intent: {intent}]")
        print(f"\nAdvisor: {response}")
        print(f"\n[Enriched Profile: {json.dumps(enriched_profile, ensure_ascii=False, indent=2)}]")
        print("-" * 60)


if __name__ == "__main__":
    asyncio.run(main())