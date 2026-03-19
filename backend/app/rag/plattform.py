"""
platform.py — Platform-Daten Store.
Lädt Topics, Supervisors, Companies, Experts aus den Mock-Daten
und stellt sie als durchsuchbaren EmbeddingStore bereit.

Später kann ein zweiter Store für User-Daten daneben existieren.
"""
import json
import os
from app.rag.store import EmbeddingStore
from app.config import DATA_DIR

# Singleton
_store: EmbeddingStore | None = None


def _load_json(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"  WARN: {filename} not found")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _topic_to_text(t: dict) -> str:
    fields = ", ".join(t.get("fieldIds", []))
    degrees = ", ".join(t.get("degrees", []))
    company = t.get("companyId", "university topic")
    return (
        f"{t.get('title', '')}. "
        f"{t.get('description', '')} "
        f"Fields: {fields}. Degrees: {degrees}. "
        f"Company: {company}. Employment: {t.get('employment', 'no')}"
    )


def _supervisor_to_text(s: dict) -> str:
    interests = ", ".join(s.get("researchInterests", []))
    fields = ", ".join(s.get("fieldIds", []))
    return (
        f"{s.get('title', '')} {s.get('firstName', '')} {s.get('lastName', '')}. "
        f"{s.get('about', '') or ''} "
        f"Research: {interests}. Fields: {fields}. "
        f"University: {s.get('universityId', '')}"
    )


def _company_to_text(c: dict) -> str:
    domains = ", ".join(c.get("domains", []))
    return (
        f"{c.get('name', '')}. "
        f"{c.get('description', '')} "
        f"{c.get('about', '') or ''} "
        f"Domains: {domains}. Size: {c.get('size', '')}"
    )


def _expert_to_text(e: dict) -> str:
    fields = ", ".join(e.get("fieldIds", []))
    return (
        f"{e.get('firstName', '')} {e.get('lastName', '')}, "
        f"{e.get('title', '')}. "
        f"{e.get('about', '') or ''} "
        f"Fields: {fields}. Company: {e.get('companyId', '')}"
    )


TEXT_BUILDERS = {
    "topics": ("topics.json", _topic_to_text),
    "supervisors": ("supervisors.json", _supervisor_to_text),
    "companies": ("companies.json", _company_to_text),
    "experts": ("experts.json", _expert_to_text),
}


def get_platform_store() -> EmbeddingStore:
    """Gibt den Platform-Store zurück. Initialisiert beim ersten Aufruf."""
    global _store
    if _store is not None:
        return _store

    print("Initializing platform store...")
    cache_dir = os.path.join(DATA_DIR, "cache")
    _store = EmbeddingStore(name="platform", cache_dir=cache_dir)

    for entity_type, (filename, to_text) in TEXT_BUILDERS.items():
        entities = _load_json(filename)
        print(f"  Loaded {len(entities)} {entity_type}")
        for entity in entities:
            _store.add(
                entity_id=entity["id"],
                data=entity,
                entity_type=entity_type,
                text=to_text(entity),
            )

    _store.build()
    print(f"  Platform store ready. {_store.count()} entities.")
    return _store