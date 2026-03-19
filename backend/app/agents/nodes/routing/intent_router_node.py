from typing import ClassVar
from app.agents.state import IntentRouterOutput

GENERATE_KEYWORDS = [
    "generier", "zeig mir pfade", "zeig mir optionen", "pfade",
    "generate", "show me paths", "show options", "find paths",
]
CONFIRM_KEYWORDS = [
    "ich nehme", "bestätigen", "diesen pfad",
    "i'll take", "confirm", "this path", "select",
]
REFINE_KEYWORDS = [
    "doch lieber", "stattdessen", "ändere",
    "rather", "instead", "change", "switch",
]

MAX_QUESTIONS = 3

class IntentRouterNode:
    name: ClassVar[str] = "IntentRouterNode"

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "").lower()
        question_count = state.get("question_count", 0)
        current_graph = state.get("current_graph", {})

        if any(kw in message for kw in CONFIRM_KEYWORDS):
            intent = "confirm"
        elif any(kw in message for kw in GENERATE_KEYWORDS):
            intent = "generate"
        elif question_count >= MAX_QUESTIONS:
            intent = "generate"
        elif any(kw in message for kw in REFINE_KEYWORDS) and current_graph:
            intent = "refine"
        else:
            intent = "answer"

        node_output = IntentRouterOutput(
            node=IntentRouterNode.name,
            intent=intent,
            metadata={
                "question_count": question_count,
                "max_questions": MAX_QUESTIONS,
                "auto_generated": question_count >= MAX_QUESTIONS and intent == "generate",
            },
        )

        return {
            **state,
            "intent": intent,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }