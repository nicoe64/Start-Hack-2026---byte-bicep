"""
candidate_search_node.py — Semantische Suche über Platform Store.
Ruft search_by_query auf, gibt Top-K Candidates pro Typ zurück.
"""
from typing import ClassVar
from app.agents.state import BaseNodeOutput
from app.rag.search import search_by_query


class CandidateSearchOutput(BaseNodeOutput):
    candidates: dict
    counts: dict


class CandidateSearchNode:
    name: ClassVar[str] = "CandidateSearchNode"

    TOP_K = {
        "topics": 10,
        "supervisors": 8,
        "companies": 6,
        "experts": 8,
    }

    @staticmethod
    async def run(state: dict) -> dict:
        query = state.get("search_query", "")

        candidates = await search_by_query(query, CandidateSearchNode.TOP_K)
        counts = {k: len(v) for k, v in candidates.items()}

        node_output = CandidateSearchOutput(
            node=CandidateSearchNode.name,
            candidates=candidates,
            counts=counts,
            metadata={"query": query[:100]},
        )

        return {
            **state,
            "candidates": candidates,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }