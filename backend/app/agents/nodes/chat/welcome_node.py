import json
from typing import ClassVar
from app.agents.state import AdvisorOutput
from app.llm.client import load_prompt, call


class WelcomeNode:
    name: ClassVar[str] = "WelcomeNode"

    @staticmethod
    async def run(state: dict) -> dict:
        website = state.get("website_profile", {})

        prompt = load_prompt("welcome.md")
        user_input = json.dumps(website, ensure_ascii=False)

        response = await call(prompt, user_input, temperature=0.5)

        node_output = AdvisorOutput(
            node=WelcomeNode.name,
            response=response,
        )

        return {
            **state,
            "response": response,
            "intent": "welcome",
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }