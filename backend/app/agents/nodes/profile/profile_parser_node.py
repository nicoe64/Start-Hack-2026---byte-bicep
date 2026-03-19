import json
from typing import ClassVar
from app.agents.state import ProfileParserOutput
from app.llm.client import load_prompt, call_json


class ProfileParserNode:
    name: ClassVar[str] = "ProfileParserNode"

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "")
        website = state.get("website_profile", {})
        current = state.get("enriched_profile", {})

        prompt = load_prompt("profile_parser.md")
        user_input = json.dumps({
            "website_profile": website,
            "current_enriched_profile": current,
            "user_message": message,
        }, ensure_ascii=False)

        result = await call_json(prompt, user_input, temperature=0.1)

        # Merge: nur Felder übernehmen die nicht None sind und sich geändert haben
        updated = {**current}
        changed = []
        for key, value in result.items():
            if value is not None:
                if current.get(key) != value:
                    changed.append(key)
                updated[key] = value

        node_output = ProfileParserOutput(
            node=ProfileParserNode.name,
            enriched_profile=updated,
            changed_fields=changed,
        )

        return {
            **state,
            "enriched_profile": updated,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }
