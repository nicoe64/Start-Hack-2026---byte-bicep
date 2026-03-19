from typing import TypedDict, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class BaseNodeOutput(BaseModel):
    node:      str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata:  Dict[str, Any] = {}


class MainState(TypedDict):
    # Session
    session_id:    str
    node_results:  List[Dict[str, Any]]
    output:        Dict[str, Any]

    # Input
    message:       str

    # Schicht 1: fest (vom Frontend)
    website_profile: Dict[str, Any]

    # Schicht 2: weich (LLM-erfragt)
    enriched_profile: Dict[str, Any]

    # Schicht 3: Signale
    signals:       Dict[str, List]

    # Routing
    intent:        str

    # Chat
    chat_history:  List[Dict[str, Any]]
    response:      str


# Node Outputs

class ProfileParserOutput(BaseNodeOutput):
    enriched_profile: Dict[str, Any]
    changed_fields:   List[str]


class IntentRouterOutput(BaseNodeOutput):
    intent: str


class AdvisorOutput(BaseNodeOutput):
    response: str
