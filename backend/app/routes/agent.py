from fastapi import APIRouter, Depends, HTTPException, Cookie, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from database import get_db
from isAuthenticated import isAuthenticated
from services.agent_service import AgentService
from models.agent_audit import AgentAuditLog

router = APIRouter(
    prefix="/agent",
    tags=["agent"]
)

class AgentCommandRequest(BaseModel):
    command: str
    language: Optional[str] = None  # 'en', 'hi', 'hinglish' or None for auto-detect
    action_id: Optional[str] = None
    action_confirm: Optional[bool] = None
    conversation_history: Optional[List[Dict[str, str]]] = None  # [{role, text}, ...]

@router.post("/command")
async def execute_agent_command(
    data: AgentCommandRequest,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    """
    Execute a natural language command (text or voice-transcribed).
    Supports Hindi, English, and Hinglish.
    """
    user_payload = None
    if access_token:
        user_payload = isAuthenticated(access_token)

    result = await AgentService.process_command(
        db=db,
        query=data.command,
        user_payload=user_payload,
        action_id=data.action_id,
        action_confirm=data.action_confirm,
        preferred_lang=data.language,
        client_history=data.conversation_history or [],
    )
    return result


@router.get("/suggestions")
async def get_agent_suggestions(
    access_token: Optional[str] = Cookie(default=None)
):
    """
    Returns role-aware command chips in English, Hindi, and Hinglish.
    """
    role = "farmer"
    if access_token:
        payload = isAuthenticated(access_token)
        if payload and payload.get("role"):
            role = payload["role"].lower()

    if role == "staff":
        return {
            "role": "staff",
            "suggestions": [
                {"text": "Who is next in the queue?", "label": "Who is next?", "lang": "en"},
                {"text": "Serve the next farmer.", "label": "Serve next farmer", "lang": "en"},
                {"text": "How many farmers are waiting in the queue?", "label": "Queue wait count", "lang": "en"},
                {"text": "Show today’s bookings.", "label": "Today's bookings", "lang": "en"},
                {"text": "Which farmers have completed procurement?", "label": "Completed procurements", "lang": "en"},
                {"text": "Show pending payments.", "label": "Pending payments", "lang": "en"},
                {"text": "अगले किसान को बुलाओ।", "label": "अगला किसान बुलाओ", "lang": "hi"},
                {"text": "कतार में कितने किसान प्रतीक्षा कर रहे हैं?", "label": "प्रतीक्षा सूची", "lang": "hi"},
                {"text": "आज की बुकिंग्स दिखाओ।", "label": "आज की बुकिंग", "lang": "hi"},
            ]
        }
    else:
        return {
            "role": "farmer",
            "suggestions": [
                {"text": "Book a slot for tomorrow at 10 AM.", "label": "Book slot tomorrow", "lang": "en"},
                {"text": "What is my token number?", "label": "My token number", "lang": "en"},
                {"text": "What is my queue position?", "label": "Queue position", "lang": "en"},
                {"text": "Show my procurement status.", "label": "Procurement status", "lang": "en"},
                {"text": "Show my payment status.", "label": "Payment status", "lang": "en"},
                {"text": "Cancel my slot.", "label": "Cancel slot", "lang": "en"},
                {"text": "कल 10 बजे का स्लॉट बुक करो।", "label": "कल का स्लॉट बुक करो", "lang": "hi"},
                {"text": "Mera token number kya hai?", "label": "Mera token number", "lang": "hinglish"},
                {"text": "मेरा payment status बताओ।", "label": "Payment स्थिति", "lang": "hi"},
                {"text": "Gehun ka sarkari MSP rate kya hai?", "label": "🌾 MSP दर (Gemini)", "lang": "hinglish"},
                {"text": "What are the center timings and rules?", "label": "⏰ Center Timings & Rules", "lang": "en"},
            ]
        }


@router.get("/audit-logs")
async def get_agent_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    """
    Retrieve security audit trail of agent interactions.
    """
    payload = isAuthenticated(access_token) if access_token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")

    role = payload.get("role", "farmer").lower()
    user_id = payload.get("user_id")

    query = select(AgentAuditLog).order_by(desc(AgentAuditLog.created_at)).limit(limit)
    if role != "admin":
        query = query.where(AgentAuditLog.user_id == user_id)

    logs = (await db.scalars(query)).all()

    return [
        {
            "id": log.id,
            "raw_query": log.raw_query,
            "language": log.language,
            "intent": log.intent,
            "action_type": log.action_type,
            "status": log.status,
            "response_text": log.response_text,
            "created_at": log.created_at.strftime("%d %b %Y, %I:%M %p") if log.created_at else None,
        }
        for log in logs
    ]
