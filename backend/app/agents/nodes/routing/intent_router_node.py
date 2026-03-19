from typing import ClassVar
from app.agents.state import IntentRouterOutput


GENERATE_KEYWORDS = ["generier", "zeig mir pfade", "was gibt es", "zeig mir was", "pfade", "vorschläge"]
CONFIRM_KEYWORDS  = ["ich nehme", "bestätigen", "pfad wählen", "diesen pfad", "das will ich"]
REFINE_KEYWORDS   = ["doch lieber", "stattdessen", "nicht mehr", "lieber", "ändere", "eigentlich"]


class IntentRouterNode:
    name: ClassVar[str] = "IntentRouterNode"

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "").lower()
        current_graph = state.get("current_graph", {})

        # Reihenfolge: spezifischste Intents zuerst
        if any(kw in message for kw in CONFIRM_KEYWORDS):
            intent = "confirm"
        elif any(kw in message for kw in GENERATE_KEYWORDS):
            intent = "generate"
        elif any(kw in message for kw in REFINE_KEYWORDS) and current_graph:
            intent = "refine"
        else:
            # Default: answer (User beantwortet was / stellt Frage)
            intent = "answer"

        node_output = IntentRouterOutput(
            node=IntentRouterNode.name,
            intent=intent,
        )

        return {
            **state,
            "intent": intent,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }
