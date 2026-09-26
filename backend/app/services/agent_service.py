import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from models.agent_audit import AgentAuditLog
from services.agent_graph import get_agent_graph
from services.agent_graph.tools import STAGED_ACTIONS

# In-process per-user conversation memory (last 10 turns, keyed by user_id or session)
_CONVERSATION_HISTORY: Dict[str, List[Dict[str, str]]] = {}
HISTORY_MAX_TURNS = 10


def _get_history(user_id: Optional[int]) -> List[Dict[str, str]]:
    """Return the last HISTORY_MAX_TURNS messages for the given user."""
    if not user_id:
        return []
    key = str(user_id)
    return list(_CONVERSATION_HISTORY.get(key, []))


def _append_history(user_id: Optional[int], user_text: str, agent_text: str):
    """Append a user→agent exchange to the per-user conversation history."""
    if not user_id:
        return
    key = str(user_id)
    history = _CONVERSATION_HISTORY.setdefault(key, [])
    history.append({"role": "user", "text": user_text})
    history.append({"role": "agent", "text": agent_text})
    # Keep only the last HISTORY_MAX_TURNS * 2 messages
    if len(history) > HISTORY_MAX_TURNS * 2:
        _CONVERSATION_HISTORY[key] = history[-(HISTORY_MAX_TURNS * 2):]


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
        client_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for processing a text or voice command via the LangGraph StateGraph engine.
        Supports multi-turn memory, TTL-aware staged actions, and automatic retry on transient failures.
        """
        user_id = user_payload.get("user_id") if user_payload else None
        role = (user_payload.get("role") or "anonymous").lower() if user_payload else "anonymous"

        staged = None
        if action_id and action_id in STAGED_ACTIONS:
            staged = STAGED_ACTIONS.pop(action_id)

        # Merge client-sent history with server-side stored history
        # Prefer client history as it is the most up-to-date, then fall back to server store
        server_history = _get_history(user_id)
        if client_history:
            # Use client history as the base; server history fills any gaps for older context
            merged = {tuple(h.items()): h for h in server_history}
            merged.update({tuple(h.items()): h for h in client_history})
            history = list(merged.values())[-HISTORY_MAX_TURNS * 2:]
        else:
            history = server_history

        initial_state = {
            "query": query,
            "user_id": user_id,
            "role": role,
            "preferred_lang": preferred_lang,
            "action_id": action_id,
            "action_confirm": action_confirm,
            "staged_action": staged,
            "conversation_history": history,
            "retry_count": 0,
        }

        # Execute the compiled LangGraph workflow — retry once on transient errors
        graph = get_agent_graph()
        final_state = None
        last_exc = None

        for attempt in range(2):
            try:
                final_state = await graph.ainvoke(
                    {**initial_state, "retry_count": attempt},
                    config={"configurable": {"db": db}}
                )
                last_exc = None
                break
            except Exception as exc:
                last_exc = exc
                print(f"[AgentService] Attempt {attempt + 1} failed: {exc}")
                if attempt == 0:
                    await asyncio.sleep(0.5)  # brief back-off before retry

        if final_state is None:
            err_msg = "I encountered a temporary issue. Please try again in a moment."
            final_state = {
                **initial_state,
                "status": "error",
                "message": err_msg,
                "speech_text": err_msg,
                "card": None,
                "intent": "unknown",
                "language": preferred_lang or "en",
                "model": "error",
            }

        msg = final_state.get("message") or final_state.get("speech_text") or "Request processed."
        speech = final_state.get("speech_text") or msg
        intent = final_state.get("intent", "unknown")
        status = final_state.get("status", "success")
        is_success = status not in ["error", "unauthorized", "failed"]

        # Update per-user conversation memory
        if is_success and user_id:
            _append_history(user_id, query, msg)

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
