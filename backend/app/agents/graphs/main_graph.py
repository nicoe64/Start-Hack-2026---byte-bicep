"""
main_graph.py — Main workflow graph.
First turn: welcome_node (personalized greeting).
All other turns: profile_parser → intent_router → advisor.
"""
from langgraph.graph import StateGraph

from app.agents.state import MainState
from app.agents.nodes.chat.welcome_node import WelcomeNode
from app.agents.nodes.profile.profile_parser_node import ProfileParserNode
from app.agents.nodes.routing.intent_router_node import IntentRouterNode
from app.agents.nodes.chat.advisor_node import AdvisorNode


def build_main_graph():

    async def welcome(state: MainState) -> MainState:
        return await WelcomeNode.run(state)

    async def parse_profile(state: MainState) -> MainState:
        return await ProfileParserNode.run(state)

    async def route_intent(state: MainState) -> MainState:
        return await IntentRouterNode.run(state)

    async def advise(state: MainState) -> MainState:
        return await AdvisorNode.run(state)

    def is_first_turn(state: MainState) -> str:
        history = state.get("chat_history", [])
        if len(history) == 0:
            return "welcome"
        return "parse_profile"

    def pick_route(state: MainState) -> str:
        intent = state.get("intent", "answer")
        if intent in ("generate", "explore"):
            return "advise"  # TODO: exploration pipeline
        elif intent == "confirm":
            return "advise"  # TODO: journey graph
        else:
            return "advise"

    graph = StateGraph(MainState)

    graph.add_node("welcome",       welcome)
    graph.add_node("parse_profile", parse_profile)
    graph.add_node("route_intent",  route_intent)
    graph.add_node("advise",        advise)

    graph.set_entry_point("route_first")

    # Router node that checks if first turn
    async def route_first(state: MainState) -> MainState:
        return state

    graph.add_node("route_first", route_first)
    graph.add_conditional_edges("route_first", is_first_turn)
    graph.add_edge("parse_profile", "route_intent")
    graph.add_conditional_edges("route_intent", pick_route)
    graph.set_finish_point("welcome")
    graph.set_finish_point("advise")

    return graph.compile()