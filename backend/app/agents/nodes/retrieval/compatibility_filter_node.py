"""
compatibility_filter_node.py — Hard Constraints auf Candidates anwenden.
Kein LLM. Filtert: Uni-Match, Degree-Match, rejected_ids.
"""
from typing import ClassVar
from app.agents.state import BaseNodeOutput


class CompatibilityFilterOutput(BaseNodeOutput):
    filtered_candidates: dict
    removed_count: int
    filter_log: list


class CompatibilityFilterNode:
    name: ClassVar[str] = "CompatibilityFilterNode"

    @staticmethod
    async def run(state: dict) -> dict:
        candidates = state.get("candidates", {})
        website = state.get("website_profile", {})
        enriched = state.get("enriched_profile", {})
        signals = state.get("signals", {})

        student_uni = website.get("university_id", "")
        student_degree = website.get("degree_level", "").lower()
        rejected = set(signals.get("rejected", []) + enriched.get("rejected_ids", []))

        total_removed = 0
        filter_log = []
        filtered = {}

        # Topics: Degree muss matchen + rejected raus
        filtered_topics = []
        for t in candidates.get("topics", []):
            tid = t["id"]
            data = t["data"]

            if tid in rejected:
                total_removed += 1
                filter_log.append(f"Removed {tid}: rejected by user")
                continue

            degrees = [d.lower() for d in data.get("degrees", [])]
            if student_degree and student_degree not in degrees:
                total_removed += 1
                filter_log.append(f"Removed {tid}: degree {student_degree} not in {degrees}")
                continue

            filtered_topics.append(t)
        filtered["topics"] = filtered_topics

        # Supervisors: Uni muss matchen + rejected raus. Fallback wenn 0.
        filtered_supervisors = []
        fallback_supervisors = []
        for s in candidates.get("supervisors", []):
            sid = s["id"]
            data = s["data"]

            if sid in rejected:
                total_removed += 1
                filter_log.append(f"Removed {sid}: rejected by user")
                continue

            sup_uni = data.get("universityId", "")
            if student_uni and sup_uni != student_uni:
                fallback_supervisors.append(s)
                continue

            filtered_supervisors.append(s)

        # Fallback: wenn keine Supervisors an der Student-Uni, beste 3 von anderen Unis
        if not filtered_supervisors and fallback_supervisors:
            filtered_supervisors = fallback_supervisors[:3]
            filter_log.append(f"No supervisors at student's university ({student_uni}). Using top {len(filtered_supervisors)} from other universities.")
        filtered["supervisors"] = filtered_supervisors

        # Companies: rejected raus
        filtered["companies"] = [
            c for c in candidates.get("companies", [])
            if c["id"] not in rejected
        ]
        removed_companies = len(candidates.get("companies", [])) - len(filtered["companies"])
        total_removed += removed_companies

        # Experts: rejected raus + flag ob company zu einem Topic passt
        topic_company_ids = {
            t["data"].get("companyId")
            for t in filtered_topics
            if t["data"].get("companyId")
        }
        filtered_experts = []
        for e in candidates.get("experts", []):
            if e["id"] in rejected:
                total_removed += 1
                continue
            e["company_matches_topic"] = e["data"].get("companyId") in topic_company_ids
            filtered_experts.append(e)
        filtered["experts"] = filtered_experts

        node_output = CompatibilityFilterOutput(
            node=CompatibilityFilterNode.name,
            filtered_candidates=filtered,
            removed_count=total_removed,
            filter_log=filter_log,
            metadata={
                "counts_before": {k: len(v) for k, v in candidates.items()},
                "counts_after": {k: len(v) for k, v in filtered.items()},
            },
        )

        return {
            **state,
            "filtered_candidates": filtered,
            "node_results": state.get("node_results", []) + [node_output.model_dump()],
            "output": node_output.model_dump(),
        }