from typing import TypedDict, Optional, Dict, Any, List

class AgentGraphState(TypedDict, total=False):
    """
    Comprehensive State dictionary tracked throughout the LangGraph workflow.
    """
    query: str
    user_id: Optional[int]
    role: str  # "farmer", "staff", "admin", "anonymous"
    preferred_lang: Optional[str]
    action_id: Optional[str]
    action_confirm: Optional[bool]

    # Reasoning / Classification outputs
    language: str  # "en", "hi", "hinglish"
    intent: str
    entities: Dict[str, Any]
    llm_reply: Optional[str]
    model: str

    # Workflow branching & Staging
    staged_action: Optional[Dict[str, Any]]
    status: str  # "success", "requires_confirmation", "unauthorized", "expired", "cancelled", "error"

    # Execution outputs
    message: str
    speech_text: str
    card: Optional[Dict[str, Any]]
    error: Optional[str]
