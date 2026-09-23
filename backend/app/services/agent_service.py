from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from models.agent_audit import AgentAuditLog
from services.agent_graph import get_agent_graph
from services.agent_graph.tools import STAGED_ACTIONS


class AgentService:

    @classmethod
    async def process_command(
        cls,
        db: AsyncSession,
        query: str,
        user_payload: Optional[Dict[str, Any]] = None,
        action_id: Optional[str] = None,
        action_confirm: Optional[bool] = None,
        preferred_lang: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for processing a text or voice command via the LangGraph StateGraph engine.
        """
        user_id = user_payload.get("user_id") if user_payload else None
        role = (user_payload.get("role") or "anonymous").lower() if user_payload else "anonymous"

        staged = None
        if action_id and action_id in STAGED_ACTIONS:
            staged = STAGED_ACTIONS.pop(action_id)

        initial_state = {
            "query": query,
            "user_id": user_id,
            "role": role,
            "preferred_lang": preferred_lang,
            "action_id": action_id,
            "action_confirm": action_confirm,
            "staged_action": staged,
        }

        # Execute the compiled LangGraph workflow asynchronously
        graph = get_agent_graph()
        final_state = await graph.ainvoke(
            initial_state,
            config={"configurable": {"db": db}}
        )

        msg = final_state.get("message") or final_state.get("speech_text") or "Request processed."
        speech = final_state.get("speech_text") or msg
        intent = final_state.get("intent", "unknown")
        status = final_state.get("status", "success")
        is_success = status not in ["error", "unauthorized", "failed"]

        # Audit logging into PostgreSQL
        await cls._log_audit(
            db,
            user_id,
            role,
            query,
            final_state.get("language", "en"),
            intent,
            action_type=intent,
            status=status,
            response_text=msg
        )

        return {
            "success": is_success,
            "status": status,
            "action_id": final_state.get("action_id"),
            "message": msg,
            "speech_text": speech,
            "language": final_state.get("language", "en"),
            "intent": intent,
            "card": final_state.get("card"),
            "model": final_state.get("model", "langgraph-agent"),
        }

    # ── Audit Logger ─────────────────────────────────────────────────────────────
    @classmethod
    async def _log_audit(
        cls,
        db: AsyncSession,
        user_id: Optional[int],
        role: Optional[str],
        query: str,
        lang: str,
        intent: Optional[str],
        action_type: str,
        status: str,
        response_text: str,
        parameters: Optional[str] = None
    ):
        try:
            log_entry = AgentAuditLog(
                user_id=user_id,
                role=role,
                raw_query=query,
                language=lang,
                intent=intent,
                action_type=action_type,
                parameters=parameters,
                status=status,
                response_text=response_text,
                created_at=datetime.now(),
            )
            db.add(log_entry)
            await db.commit()
        except Exception as e:
            print("Failed to write agent audit log:", e)
