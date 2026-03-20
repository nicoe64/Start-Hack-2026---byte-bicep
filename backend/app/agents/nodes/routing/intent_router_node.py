from typing import ClassVar
from app.agents.state import IntentRouterOutput
from app.llm.client import call as llm_call

GENERATE_KEYWORDS = [
    "generier", "zeig mir pfade", "zeig mir optionen", "pfade",
    "generate", "show me paths", "show options", "find paths",
]

CONFIRM_KEYWORDS = [
    "ich nehme", "bestätigen", "diesen pfad",
    "i'll take", "confirm", "this path", "select",
]

MAX_QUESTIONS = 3

# Used only when no graph exists yet
REFINE_KEYWORDS_SIMPLE = [
    "doch lieber", "stattdessen", "ändere", "wechsel",
    "rather", "instead", "change", "switch",
]

INTENT_CLASSIFIER_PROMPT = """You are an intent classifier for a thesis advisor chatbot.
The student has already received a graph of thesis path recommendations.

Classify the student's message into exactly one of these intents:

- "refine": The student wants DIFFERENT thesis topics, a different research area, or wants to change their direction entirely. Examples: "I want something with NLP instead", "Can we explore healthcare AI?", "I'd rather focus on robotics", "Show me different options"
- "explore": The student is asking a question ABOUT the current graph, nodes, supervisors, companies, or topics shown. Examples: "Why is this a good match?", "Tell me more about BMW", "What does this supervisor research?", "Refine this sentence for me", "Why these paths?"
- "proposal": The student wants help writing a research proposal. Examples: "Help me write a proposal", "Draft something for this supervisor"
- "confirm": The student wants to select or confirm a path. Examples: "I'll take path 1", "This looks good, confirm"

IMPORTANT:
- "refine the sentences" → "explore" (they want text help, not graph change)
- "refine my options" → "refine" (they want new graph)
- Questions about why something matches → "explore"
- Requests for completely new topics/areas → "refine"

Respond with ONLY the intent word, nothing else: refine, explore, proposal, or confirm"""


class IntentRouterNode:
    name: ClassVar[str] = "IntentRouterNode"

    @staticmethod
    async def _classify_with_llm(message: str, graph_summary: str) -> str:
        """Use LLM to classify intent when graph exists — much more accurate than keywords."""
        user_content = f"""Current graph paths: {graph_summary}

Student message: "{message}"

Classify the intent:"""
        try:
            result = await llm_call(
                INTENT_CLASSIFIER_PROMPT,
                user_content,
                temperature=0.0,
                max_tokens=10,
            )
            intent = result.strip().lower().split()[0]
            if intent in ("refine", "explore", "proposal", "confirm"):
                return intent
            return "explore"
        except Exception:
            return "explore"

    @staticmethod
    async def run(state: dict) -> dict:
        message = state.get("message", "").lower()
        question_count = state.get("question_count", 0)
        current_graph = state.get("current_graph", {})
        has_graph = bool(current_graph and current_graph.get("paths"))

        if has_graph:
            # ── Graph exists: use LLM classifier for accurate intent ──
            graph_summary = ", ".join(
                p.get("label", "") for p in current_graph.get("paths", [])
            )
            raw_message = state.get("message", "")
            intent = await IntentRouterNode._classify_with_llm(raw_message, graph_summary)
            print(f"  [LLM Intent: {intent}]")
        else:
            # ── No graph yet: keyword-based is fine ──
            if any(kw in message for kw in CONFIRM_KEYWORDS):
                intent = "confirm"
            elif any(kw in message for kw in REFINE_KEYWORDS_SIMPLE):
                intent = "refine"
            elif any(kw in message for kw in GENERATE_KEYWORDS):
                intent = "generate"
            elif question_count >= MAX_QUESTIONS:
                intent = "generate"
            else:
                intent = "answer"

        node_output = IntentRouterOutput(
            node=IntentRouterNode.name,
            intent=intent,
            metadata={
                "question_count": question_count,
                "max_questions": MAX_QUESTIONS,
                "used_llm": has_graph,
                "auto_generated": question_count >= MAX_QUESTIONS and intent == "generate",
            },
        )

        return {
            **state,
            "intent": intent,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }