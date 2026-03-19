import json
import os
from typing import ClassVar
from app.agents.state import AdvisorOutput
from app.llm.client import load_prompt, call
from app.config import DATA_DIR


def _load_mock_context() -> str:
    """Load companies and projects as context string."""
    parts = []

    companies_path = os.path.join(DATA_DIR, "companies.json")
    if os.path.exists(companies_path):
        with open(companies_path) as f:
            companies = json.load(f)
        company_lines = [f"- {c['name']}: {c.get('about') or c['description']} (Domains: {', '.join(c['domains'])})" for c in companies]
        parts.append("AVAILABLE COMPANIES:\n" + "\n".join(company_lines))

    projects_path = os.path.join(DATA_DIR, "projects.json")
    if os.path.exists(projects_path):
        with open(projects_path) as f:
            projects = json.load(f)
        project_lines = [f"- {p['title']} [{p['state']}]" for p in projects]
        parts.append("EXAMPLE PROJECTS ON THE PLATFORM:\n" + "\n".join(project_lines))

    return "\n\n".join(parts)


_mock_context = None


def get_mock_context() -> str:
    global _mock_context
    if _mock_context is None:
        _mock_context = _load_mock_context()
    return _mock_context


class AdvisorNode:
    name: ClassVar[str] = "AdvisorNode"

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "")
        website = state.get("website_profile", {})
        enriched = state.get("enriched_profile", {})
        history = state.get("chat_history", [])[-10:]
        question_count = state.get("question_count", 0)

        prompt = load_prompt("advisor.md")
        mock_context = get_mock_context()

        user_input = f"""Website profile: {json.dumps(website, ensure_ascii=False)}

Enriched profile: {json.dumps(enriched, ensure_ascii=False)}

Question count so far: {question_count} of 3 maximum

{mock_context}

Chat history:
{chr(10).join(f"{m['role']}: {m['content']}" for m in history[-6:])}

Current message: {message}"""

        response = await call(prompt, user_input, temperature=0.4)

        new_count = question_count
        if "?" in response:
            new_count += 1

        node_output = AdvisorOutput(
            node=AdvisorNode.name,
            response=response,
            metadata={"question_count": new_count},
        )

        return {
            **state,
            "response": response,
            "question_count": new_count,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }