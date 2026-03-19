"""
test_rag.py — Testet die RAG-Pipeline.
Initialisiert Platform Store, sucht mit verschiedenen Queries.

Usage: python -m scripts.test_rag
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.platform import get_platform_store
from app.rag.search import search_by_query


async def main():
    print("=" * 60)
    print("RAG Pipeline Test")
    print("=" * 60)

    # Schritt 1: Store initialisieren
    store = get_platform_store()
    print(f"\nStore ready: {store.count()} entities")

    # Schritt 2: Queries testen
    queries = [
        "AI machine learning deep learning",
        "sustainable supply chain management",
        "GANs diffusion generative models",
        "cybersecurity privacy data protection",
        "robotics digital twin manufacturing",
    ]

    for query in queries:
        print(f"\n{'=' * 60}")
        print(f"QUERY: {query}")
        print("=" * 60)

        results = await search_by_query(query, {
            "topics": 5,
            "supervisors": 3,
            "companies": 3,
            "experts": 3,
        })

        for entity_type, candidates in results.items():
            print(f"\n  {entity_type.upper()} (top {len(candidates)}):")
            for c in candidates:
                data = c["data"]
                if entity_type == "topics":
                    name = data.get("title", "?")
                    extra = f"[{', '.join(data.get('degrees', []))}]"
                elif entity_type == "supervisors":
                    name = f"{data.get('title', '')} {data.get('firstName', '')} {data.get('lastName', '')}"
                    extra = f"[{data.get('universityId', '')}]"
                elif entity_type == "companies":
                    name = data.get("name", "?")
                    extra = f"[{', '.join(data.get('domains', []))}]"
                elif entity_type == "experts":
                    name = f"{data.get('firstName', '')} {data.get('lastName', '')}"
                    extra = f"[{data.get('title', '')}]"
                else:
                    name = c["id"]
                    extra = ""

                print(f"    {c['similarity']:.3f}  {c['id']:15s}  {name[:50]}  {extra}")

    # Schritt 3: Einzelne Entity holen
    print(f"\n{'=' * 60}")
    print("GET ENTITY TEST")
    print("=" * 60)
    from app.rag.search import get_entity
    topic = get_entity("topic-01")
    if topic:
        print(f"  topic-01: {topic['title']}")
    else:
        print("  topic-01: NOT FOUND")


if __name__ == "__main__":
    asyncio.run(main())