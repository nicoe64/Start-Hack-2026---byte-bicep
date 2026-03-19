"""
query_builder_node.py — Baut den RAG-Query aus allen drei Info-Schichten.
Kein LLM. Kombiniert website_profile + enriched_profile + signals.
"""
from typing import ClassVar
from app.agents.state import BaseNodeOutput


class QueryBuilderOutput(BaseNodeOutput):
    query: str


class QueryBuilderNode:
    name: ClassVar[str] = "QueryBuilderNode"

    @staticmethod
    async def run(state: dict) -> dict:
        website = state.get("website_profile", {})
        enriched = state.get("enriched_profile", {})
        signals = state.get("signals", {})

        parts = []

        # Schicht 1: Website-Profil
        if website.get("study_program"):
            parts.append(f"Student studying {website['study_program']}")
        if website.get("university"):
            parts.append(f"at {website['university']}")
        if website.get("degree_level"):
            parts.append(f"Degree level: {website['degree_level']}")
        if website.get("field_interests"):
            parts.append(f"Field interests: {', '.join(website['field_interests'])}")
        if website.get("skills"):
            parts.append(f"Skills: {', '.join(website['skills'])}")

        # Schicht 2: Enriched Profile (gewichtet stärker — das ist was der User aktiv gesagt hat)
        if enriched.get("topic_idea"):
            parts.append(f"Thesis topic interest: {enriched['topic_idea']}")
        if enriched.get("industry_interests"):
            parts.append(f"Industry preference: {', '.join(enriched['industry_interests'])}")
        if enriched.get("methodology_preference"):
            parts.append(f"Methodology: {enriched['methodology_preference']}")
        if enriched.get("career_goal"):
            parts.append(f"Career goal: {enriched['career_goal']}")

        # Schicht 3: Signale (Keywords aus dem Chat)
        keywords = signals.get("keywords_mentioned", [])
        if keywords:
            parts.append(f"Keywords: {', '.join(keywords[-10:])}")  # letzte 10

        query = ". ".join(parts) if parts else "thesis topic search"

        node_output = QueryBuilderOutput(
            node=QueryBuilderNode.name,
            query=query,
        )

        return {
            **state,
            "search_query": query,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }