"""
platform.py — Platform-Daten Store.
Löst Field-IDs und Company-IDs zu echten Namen auf für bessere Embeddings.
"""
import json
import os
from app.rag.store import EmbeddingStore
from app.config import DATA_DIR

_store: EmbeddingStore | None = None

# Lookup-Tables (werden beim Laden befüllt)
_fields: dict[str, str] = {}       # field-01 → "Computer Science"
_companies: dict[str, str] = {}    # company-01 → "Nestlé"
_universities: dict[str, str] = {} # uni-01 → "ETH Zurich"


def _load_json(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _resolve_fields(field_ids: list[str]) -> str:
    return ", ".join(_fields.get(fid, fid) for fid in field_ids)


def _resolve_company(company_id: str | None) -> str:
    if not company_id:
        return "university topic"
    return _companies.get(company_id, company_id)


def _resolve_university(uni_id: str | None) -> str:
    if not uni_id:
        return ""
    return _universities.get(uni_id, uni_id)


def _topic_to_text(t: dict) -> str:
    fields = _resolve_fields(t.get("fieldIds", []))
    degrees = ", ".join(t.get("degrees", []))
    company = _resolve_company(t.get("companyId"))
    return (
        f"{t.get('title', '')}. "
        f"{t.get('description', '')} "
        f"Fields: {fields}. Degrees: {degrees}. "
        f"Company: {company}. Employment: {t.get('employment', 'no')}"
    )


def _supervisor_to_text(s: dict) -> str:
    interests = ", ".join(s.get("researchInterests", []))
    fields = _resolve_fields(s.get("fieldIds", []))
    uni = _resolve_university(s.get("universityId"))
    return (
        f"{s.get('title', '')} {s.get('firstName', '')} {s.get('lastName', '')}. "
        f"{s.get('about', '') or ''} "
        f"Research: {interests}. Fields: {fields}. "
        f"University: {uni}"
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
    fields = _resolve_fields(e.get("fieldIds", []))
    company = _resolve_company(e.get("companyId"))
    return (
        f"{e.get('firstName', '')} {e.get('lastName', '')}, "
        f"{e.get('title', '')} at {company}. "
        f"{e.get('about', '') or ''} "
        f"Fields: {fields}"
    )


def get_platform_store() -> EmbeddingStore:
    global _store, _fields, _companies, _universities

    if _store is not None:
        return _store

    print("Initializing platform store...")

    # Lookup-Tables laden
    for f in _load_json("fields.json"):
        _fields[f["id"]] = f["name"]
    for c in _load_json("companies.json"):
        _companies[c["id"]] = c["name"]
    for u in _load_json("universities.json"):
        _universities[u["id"]] = u["name"]

    print(f"  Lookups: {len(_fields)} fields, {len(_companies)} companies, {len(_universities)} universities")

    # Store bauen
    cache_dir = os.path.join(DATA_DIR, "cache")
    _store = EmbeddingStore(name="platform", cache_dir=cache_dir)

    builders = {
        "topics": ("topics.json", _topic_to_text),
        "supervisors": ("supervisors.json", _supervisor_to_text),
        "companies": ("companies.json", _company_to_text),
        "experts": ("experts.json", _expert_to_text),
    }

    for entity_type, (filename, to_text) in builders.items():
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