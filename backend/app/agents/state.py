from typing import TypedDict, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class BaseNodeOutput(BaseModel):
    node: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Dict[str, Any] = {}

class MainState(TypedDict):
    session_id: str
    node_results: List[Dict[str, Any]]
    output: Dict[str, Any]
    message: str
    website_profile: Dict[str, Any]
    enriched_profile: Dict[str, Any]
    signals: Dict[str, List]
    intent: str
    chat_history: List[Dict[str, Any]]
    response: str

class ProfileParserOutput(BaseNodeOutput):
    enriched_profile: Dict[str, Any]
    changed_fields: List[str]

class IntentRouterOutput(BaseNodeOutput):
    intent: str

class AdvisorOutput(BaseNodeOutput):
    response: str