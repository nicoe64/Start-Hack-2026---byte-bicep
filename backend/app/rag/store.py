"""
store.py — Abstrakte EmbeddingStore Klasse.
Wiederverwendbar für Platform-Daten (Topics etc.) und später User-Daten.
Speichert Embeddings als Cache auf Disk.
"""
import json
import os
import numpy as np
from typing import Optional


class EmbeddingStore:
    """
    In-memory Embedding Store mit Disk-Cache.

    Verwendung:
        store = EmbeddingStore(name="platform", cache_dir="app/data/cache")
        store.add("topic-01", {"title": "..."}, "topics", "AI-Driven Demand Forecasting...")
        store.build()           # embeddet alles, speichert Cache
        results = store.search("machine learning", top_k={"topics": 5})
    """

    def __init__(self, name: str, cache_dir: str):
        self.name = name
        self.cache_dir = cache_dir
        self._entries: dict[str, dict] = {}   # { id: { data, type, text, embedding } }
        self._model = None
        self._is_built = False

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        return self._model

    # ── Daten hinzufügen ──────────────────────────────

    def add(self, entity_id: str, data: dict, entity_type: str, text: str):
        """Eine Entity zum Store hinzufügen (vor build() aufrufen)."""
        self._entries[entity_id] = {
            "data": data,
            "type": entity_type,
            "text": text,
            "embedding": None,
        }

    def count(self) -> int:
        return len(self._entries)

    # ── Embeddings bauen ──────────────────────────────

    def build(self):
        """Embeddings berechnen oder aus Cache laden."""
        if self._is_built:
            return

        cache_emb = os.path.join(self.cache_dir, f"{self.name}_embeddings.npy")
        cache_keys = os.path.join(self.cache_dir, f"{self.name}_keys.json")

        keys = list(self._entries.keys())
        texts = [self._entries[k]["text"] for k in keys]

        # Cache vorhanden und aktuell?
        if os.path.exists(cache_emb) and os.path.exists(cache_keys):
            with open(cache_keys, "r") as f:
                cached_keys = json.load(f)
            if cached_keys == keys:
                print(f"  [{self.name}] Loading {len(keys)} embeddings from cache...")
                embeddings = np.load(cache_emb)
                for key, emb in zip(keys, embeddings):
                    self._entries[key]["embedding"] = emb
                self._is_built = True
                return

        # Neu berechnen
        print(f"  [{self.name}] Embedding {len(texts)} entities...")
        model = self._get_model()
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

        for key, emb in zip(keys, embeddings):
            self._entries[key]["embedding"] = emb

        # Cache speichern
        os.makedirs(self.cache_dir, exist_ok=True)
        np.save(cache_emb, embeddings)
        with open(cache_keys, "w") as f:
            json.dump(keys, f)
        print(f"  [{self.name}] Cache saved.")

        self._is_built = True

    # ── Suche ─────────────────────────────────────────

    def search(self, query: str, top_k: dict[str, int]) -> dict[str, list[dict]]:
        """
        Semantische Suche. Gibt Top-K pro Entity-Typ zurück.

        Args:
            query: Such-Text
            top_k: z.B. {"topics": 10, "supervisors": 5}

        Returns:
            {"topics": [{"id", "similarity", "data"}, ...], "supervisors": [...]}
        """
        query_emb = self._get_model().encode(query, normalize_embeddings=True)
        results = {}

        for entity_type, k in top_k.items():
            scored = []
            for eid, entry in self._entries.items():
                if entry["type"] != entity_type:
                    continue
                emb = entry.get("embedding")
                if emb is None:
                    continue
                score = float(np.dot(query_emb, emb))
                scored.append({
                    "id": eid,
                    "similarity": round(score, 4),
                    "data": entry["data"],
                })
            scored.sort(key=lambda x: x["similarity"], reverse=True)
            results[entity_type] = scored[:k]

        return results

    # ── Einzelne Entity holen ─────────────────────────

    def get(self, entity_id: str) -> Optional[dict]:
        entry = self._entries.get(entity_id)
        return entry["data"] if entry else None

    def get_all_by_type(self, entity_type: str) -> list[dict]:
        return [
            {"id": k, "data": v["data"], "embedding": v["embedding"]}
            for k, v in self._entries.items()
            if v["type"] == entity_type
        ]

    # ── Cache Management ──────────────────────────────

    def clear_cache(self):
        cache_emb = os.path.join(self.cache_dir, f"{self.name}_embeddings.npy")
        cache_keys = os.path.join(self.cache_dir, f"{self.name}_keys.json")
        for f in [cache_emb, cache_keys]:
            if os.path.exists(f):
                os.remove(f)
        print(f"  [{self.name}] Cache cleared.")