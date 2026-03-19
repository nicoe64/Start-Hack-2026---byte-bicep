"""
main_graph.py — Main workflow graph with full pipeline.
Routes: welcome → chat (3 questions) → generate (RAG → filter → compose).
"""
from langgraph.graph import StateGraph

from app.agents.state import MainState
from app.agents.nodes.chat.welcome_node import WelcomeNode
from app.agents.nodes.profile.profile_parser_node import ProfileParserNode
from app.agents.nodes.routing.intent_router_node import IntentRouterNode
from app.agents.nodes.chat.advisor_node import AdvisorNode
from app.agents.nodes.retrieval.query_builder_node import QueryBuilderNode
from app.agents.nodes.retrieval.candidate_search_node import CandidateSearchNode
from app.agents.nodes.retrieval.compatibility_filter_node import CompatibilityFilterNode
from app.agents.nodes.assembly.path_composer_node import PathComposerNode


def build_main_graph():

    # Node wrappers
    async def welcome(state: MainState) -> MainState:
        return await WelcomeNode.run(state)

    async def parse_profile(state: MainState) -> MainState:
        return await ProfileParserNode.run(state)

    async def route_intent(state: MainState) -> MainState:
        return await IntentRouterNode.run(state)

    async def advise(state: MainState) -> MainState:
        return await AdvisorNode.run(state)

    async def build_query(state: MainState) -> MainState:
        return await QueryBuilderNode.run(state)

    async def search_candidates(state: MainState) -> MainState:
        return await CandidateSearchNode.run(state)

    async def filter_candidates(state: MainState) -> MainState:
        return await CompatibilityFilterNode.run(state)

    async def compose_paths(state: MainState) -> MainState:
        return await PathComposerNode.run(state)

    # Routing functions
    def is_first_turn(state: MainState) -> str:
        history = state.get("chat_history", [])
        if len(history) == 0:
            return "welcome"
        return "parse_profile"

    def pick_route(state: MainState) -> str:
        intent = state.get("intent", "answer")
        if intent == "generate":
            return "build_query"
        elif intent == "confirm":
            return "advise"  # TODO: journey graph
        else:
            return "advise"

    # Build graph
    graph = StateGraph(MainState)

    # Register all nodes
    graph.add_node("route_first",       lambda state: state)
    graph.add_node("welcome",           welcome)
    graph.add_node("parse_profile",     parse_profile)
    graph.add_node("route_intent",      route_intent)
    graph.add_node("advise",            advise)
    graph.add_node("build_query",       build_query)
    graph.add_node("search_candidates", search_candidates)
    graph.add_node("filter_candidates", filter_candidates)
    graph.add_node("compose_paths",     compose_paths)

    # Entry point
    graph.set_entry_point("route_first")

    # First turn check
    graph.add_conditional_edges("route_first", is_first_turn)

    # Chat flow
    graph.add_edge("parse_profile", "route_intent")
    graph.add_conditional_edges("route_intent", pick_route)

    # Generate pipeline
    graph.add_edge("build_query", "search_candidates")
    graph.add_edge("search_candidates", "filter_candidates")
    graph.add_edge("filter_candidates", "compose_paths")

    # Finish points
    graph.set_finish_point("welcome")
    graph.set_finish_point("advise")
    graph.set_finish_point("compose_paths")

    return graph.compile()