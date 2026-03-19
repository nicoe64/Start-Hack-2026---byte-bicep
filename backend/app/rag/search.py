"""
search.py — Suchfunktionen über den Platform Store.
Wird von den Retrieval-Nodes importiert.
"""
from app.rag.platform import get_platform_store


async def search_by_query(
    query: str,
    top_k: dict[str, int] = None,
) -> dict[str, list[dict]]:
    """
    Semantische Suche über Platform-Daten.

    Args:
        query: Such-Text (z.B. "AI machine learning sustainability")
        top_k: Wie viele pro Typ, z.B. {"topics": 10, "supervisors": 5}

    Returns:
        {"topics": [{"id", "similarity", "data"}, ...], ...}
    """
    if top_k is None:
        top_k = {
            "topics": 10,
            "supervisors": 8,
            "companies": 6,
            "experts": 8,
        }

    store = get_platform_store()
    return store.search(query, top_k)


def get_entity(entity_id: str):
    """Einzelne Entity nach ID."""
    store = get_platform_store()
    return store.get(entity_id)