"""
advisor_node.py — Thesis-Berater mit RAG-informierten Fragen.
Vor dem LLM-Call: stille RAG-Vorsuche um zu wissen welche Themencluster
für diesen Studenten überhaupt realistisch sind.
Das LLM fragt dann nur nach Richtungen wo es echte Matches gibt.
"""
import json
from typing import ClassVar
from app.agents.state import AdvisorOutput
from app.llm.client import load_prompt, call
from app.rag.search import search_by_query


class AdvisorNode:
    name: ClassVar[str] = "AdvisorNode"

    @staticmethod
    async def _build_availability_context(website: dict, enriched: dict) -> str:
        """Stille RAG-Vorsuche: Was gibt es überhaupt für diesen Studenten?"""
        degree = website.get("degree_level", "").lower()
        interests = website.get("field_interests", [])
        topic_idea = enriched.get("topic_idea", "")

        # Query aus dem was wir wissen
        query_parts = []
        if interests:
            query_parts.append(" ".join(interests))
        if topic_idea:
            query_parts.append(topic_idea)
        if not query_parts:
            query_parts.append(website.get("study_program", "thesis"))

        query = " ".join(query_parts)
        results = await search_by_query(query, {"topics": 15, "supervisors": 5})

        # Topics filtern nach Degree
        matching_topics = []
        other_degree_topics = []
        for t in results.get("topics", []):
            degrees = [d.lower() for d in t["data"].get("degrees", [])]
            if degree in degrees:
                matching_topics.append(t)
            else:
                other_degree_topics.append(t)

        # Themencluster erkennen
        from collections import Counter
        field_counter = Counter()
        for t in matching_topics:
            for fid in t["data"].get("fieldIds", []):
                field_counter[fid] += 1

        # Context-String bauen
        lines = []
        lines.append(f"AVAILABLE FOR {degree.upper()} STUDENTS ({len(matching_topics)} topics found):")
        if matching_topics:
            for t in matching_topics[:8]:
                company = t["data"].get("companyId", "university")
                emp = " [job possible]" if t["data"].get("employment") in ("yes", "open") else ""
                lines.append(f"  - {t['data']['title'][:60]} ({company}){emp}")
        else:
            lines.append("  NO TOPICS FOUND for this degree level.")
            if other_degree_topics:
                lines.append(f"  But {len(other_degree_topics)} topics exist for other degree levels (MSc/PhD).")
                lines.append("  The student could ask their supervisor about exceptions.")

        if results.get("supervisors"):
            uni_id = website.get("university_id", "")
            local = [s for s in results["supervisors"] if s["data"].get("universityId") == uni_id]
            lines.append(f"\nSUPERVISORS AT STUDENT'S UNIVERSITY: {len(local)}")
            for s in local[:3]:
                interests = ", ".join(s["data"].get("researchInterests", [])[:3])
                lines.append(f"  - {s['data'].get('title','')} {s['data'].get('firstName','')} {s['data'].get('lastName','')} ({interests})")

        return "\n".join(lines)

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "")
        website = state.get("website_profile", {})
        enriched = state.get("enriched_profile", {})
        history = state.get("chat_history", [])[-10:]
        question_count = state.get("question_count", 0)

        prompt = load_prompt("advisor.md")

        # Stille RAG-Vorsuche
        availability = await AdvisorNode._build_availability_context(website, enriched)

        user_input = f"""Website profile: {json.dumps(website, ensure_ascii=False)}

Enriched profile: {json.dumps(enriched, ensure_ascii=False)}

Question count so far: {question_count} of 3 maximum

WHAT IS ACTUALLY AVAILABLE ON THE PLATFORM FOR THIS STUDENT:
{availability}

IMPORTANT: Only suggest directions where topics actually exist. Do not ask about areas with zero matches. If few topics match, be honest about it and suggest alternatives.

Chat history:
{chr(10).join(f"{m['role']}: {m['content']}" for m in history[-6:])}

Current message: {message}"""

        response = await call(prompt, user_input, temperature=0.4)

        node_output = AdvisorOutput(
            node=AdvisorNode.name,
            response=response,
            metadata={
                "question_count": question_count,
                "topics_available": availability.count("  - "),
            },
        )

        return {
            **state,
            "response": response,
            "question_count": question_count,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }