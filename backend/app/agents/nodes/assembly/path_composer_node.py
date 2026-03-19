"""
path_composer_node.py — LLM baut Graph-JSON aus gefilterten Candidates.
Bekommt: filtered_candidates + profile.
Gibt: graph_output nach dem Frontend-Schema.
"""
import json
from typing import ClassVar
from app.agents.state import BaseNodeOutput
from app.llm.client import load_prompt, call_json
from app.rag.search import get_entity


class PathComposerOutput(BaseNodeOutput):
    graph_output: dict
    path_count: int


class PathComposerNode:
    name: ClassVar[str] = "PathComposerNode"

    @staticmethod
    def _build_candidate_context(filtered: dict, website: dict, enriched: dict) -> str:
        """Kompakter Kontext-String für das LLM."""
        lines = []

        lines.append(f"STUDENT: {website.get('name', '?')}, {website.get('degree_level', '?')} {website.get('study_program', '?')} at {website.get('university', '?')} (ID: {website.get('university_id', '?')})")
        if enriched.get("topic_idea"):
            lines.append(f"Topic idea: {enriched['topic_idea']}")
        if enriched.get("career_goal"):
            lines.append(f"Career goal: {enriched['career_goal']}")

        # Topics (compact)
        lines.append(f"\nTOPICS ({len(filtered.get('topics', []))}):")
        for t in filtered.get("topics", [])[:6]:
            d = t["data"]
            emp = "[job]" if d.get("employment") in ("yes", "open") else ""
            lines.append(f"  {t['id']} ({t['similarity']:.2f}): {d.get('title', '?')} | degrees:{d.get('degrees',[])} | company:{d.get('companyId','uni')} | supervisors:{d.get('supervisorIds',[])} | experts:{d.get('expertIds',[])} | employment:{d.get('employment','no')} {emp}")

        # Supervisors (compact)
        lines.append(f"\nSUPERVISORS ({len(filtered.get('supervisors', []))}):")
        for s in filtered.get("supervisors", [])[:5]:
            d = s["data"]
            lines.append(f"  {s['id']} ({s['similarity']:.2f}): {d.get('title','')} {d.get('firstName','')} {d.get('lastName','')} | uni:{d.get('universityId','')} | research:{d.get('researchInterests',[])} | fields:{d.get('fieldIds',[])}")

        # Companies (compact)
        lines.append(f"\nCOMPANIES ({len(filtered.get('companies', []))}):")
        for c in filtered.get("companies", [])[:4]:
            d = c["data"]
            lines.append(f"  {c['id']} ({c['similarity']:.2f}): {d.get('name','?')} | domains:{d.get('domains',[])} | size:{d.get('size','?')}")

        # Experts (compact)
        lines.append(f"\nEXPERTS ({len(filtered.get('experts', []))}):")
        for e in filtered.get("experts", [])[:6]:
            d = e["data"]
            lines.append(f"  {e['id']} ({e['similarity']:.2f}): {d.get('firstName','')} {d.get('lastName','')} ({d.get('title','')}) | company:{d.get('companyId','')} | interviews:{d.get('offerInterviews',False)}")

        return "\n".join(lines)

    @staticmethod
    def _validate_graph(graph: dict) -> list[str]:
        """Basis-Validierung des Graph-Outputs."""
        warnings = []

        paths = graph.get("paths", [])
        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        edges = graph.get("edges", [])

        if not paths:
            warnings.append("No paths generated")
            return warnings

        # Check: alle node_ids referenzieren existierende Nodes
        for path in paths:
            for nid in path.get("node_ids", []):
                if nid not in nodes:
                    warnings.append(f"Path {path['id']} references unknown node {nid}")

        # Check: alle Edges referenzieren existierende Nodes
        for edge in edges:
            if edge["from"] not in nodes:
                warnings.append(f"Edge from unknown node {edge['from']}")
            if edge["to"] not in nodes:
                warnings.append(f"Edge to unknown node {edge['to']}")

        # Check: keine verbotenen Edge-Typen
        allowed_edges = {
            ("topic", "company", "belongs_to"),
            ("topic", "supervisor", "posted_by"),
            ("topic", "supervisor", "supervised_by"),
            ("company", "expert", "has_expert"),
        }
        for edge in edges:
            from_type = nodes.get(edge["from"], {}).get("type", "?")
            to_type = nodes.get(edge["to"], {}).get("type", "?")
            if (from_type, to_type, edge["type"]) not in allowed_edges:
                warnings.append(f"Invalid edge: {from_type}→{to_type} ({edge['type']})")

        return warnings

    @staticmethod
    async def run(state: dict) -> dict:
        filtered = state.get("filtered_candidates", {})
        website = state.get("website_profile", {})
        enriched = state.get("enriched_profile", {})

        prompt = load_prompt("path_composer.md")
        context = PathComposerNode._build_candidate_context(filtered, website, enriched)

        try:
            graph_output = await call_json(prompt, context, temperature=0.3)
        except Exception as e:
            # Fallback: leerer Graph mit Warning
            graph_output = {
                "student_summary": f"{website.get('name', '?')}, {website.get('degree_level', '?')} {website.get('study_program', '?')}",
                "paths": [],
                "nodes": [],
                "edges": [],
                "warnings": [f"Path composition failed: {str(e)}"],
            }

        # Validierung
        validation_warnings = PathComposerNode._validate_graph(graph_output)
        existing_warnings = graph_output.get("warnings", [])
        graph_output["warnings"] = existing_warnings + validation_warnings

        node_output = PathComposerOutput(
            node=PathComposerNode.name,
            graph_output=graph_output,
            path_count=len(graph_output.get("paths", [])),
        )

        return {
            **state,
            "graph_output": graph_output,
            "current_graph": graph_output,
            "response": f"I found {len(graph_output.get('paths', []))} paths for you.",
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }