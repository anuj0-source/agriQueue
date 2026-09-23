import json
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, START, END

from services.agent_graph.state import AgentGraphState
from services.agent_graph.classifier import classify_intent_node
from services.agent_graph.tools import (
    STAGED_ACTIONS,
    validate_rbac,
    tool_book_slot,
    tool_cancel_slot,
    tool_center_slots_info,
    tool_farmer_token_check,
    tool_farmer_queue_check,
    tool_farmer_procurement_status,
    tool_farmer_payment_status,
    tool_staff_waiting_queue,
    tool_staff_today_bookings,
    tool_staff_completed_procurements,
    tool_staff_pending_payments,
    tool_staff_who_is_next,
    tool_staff_serve_next,
    tool_execute_staged_action,
    tool_handle_rejection,
    tool_general_qa,
)

# ── Guardrails Node ──────────────────────────────────────────────────────────
async def guardrails_node(state: AgentGraphState) -> AgentGraphState:
    role = state.get("role", "farmer")
    intent = state.get("intent", "unknown")
    lang = state.get("language", "en")

    # Check RBAC
    rbac_error = validate_rbac(role, intent)
    if rbac_error:
        response_text = rbac_error.get(lang, rbac_error["en"])
        return {
            **state,
            "status": "unauthorized",
            "message": response_text,
            "speech_text": response_text,
            "card": None
        }

    # Check verbal confirmation intent with pending staged action
    user_id = state.get("user_id")
    if intent in ["confirm_action", "reject_action"]:
        user_staged_id = next(
            (act_id for act_id, item in STAGED_ACTIONS.items() if item.get("user_id") == user_id),
            None
        )
        if user_staged_id:
            staged = STAGED_ACTIONS.pop(user_staged_id)
            return {
                **state,
                "staged_action": staged,
                "action_confirm": (intent == "confirm_action")
            }

    return state

# ── Router Function ──────────────────────────────────────────────────────────
def route_next_node(state: AgentGraphState) -> str:
    # 1. Blocked by RBAC
    if state.get("status") == "unauthorized":
        return "format_response"

    # 2. Explicit or verbal confirmation of a staged action
    staged = state.get("staged_action")
    confirm = state.get("action_confirm")
    if staged is not None:
        return "execute_staged" if confirm is True else "reject_staged"

    # 3. Intent-based dispatch
    intent = state.get("intent", "unknown")
    query = (state.get("query") or "").lower()

    # Extra safety net: if query asks about centers or locations, route to center slots tool
    center_words = ["center", "centre", "kendra", "mandi", "simiti", "samiti"]
    loc_words = ["kha par", "kaha par", "kahan", "kaha", "kha", "kidhar", "where", "location", "address", "pata", "timing", "open", "slot", "slots"]
    if intent in ["unknown", "general_qa"] and any(w in query for w in center_words) and any(w in query for w in loc_words):
        intent = "farmer_center_slots_info"

    mapping = {
        "farmer_book_slot": "node_book_slot",
        "farmer_cancel_slot": "node_cancel_slot",
        "farmer_center_slots_info": "node_center_slots",
        "farmer_check_token": "node_check_token",
        "farmer_check_queue": "node_check_queue",
        "farmer_procurement_status": "node_procurement_status",
        "farmer_payment_status": "node_payment_status",
        "staff_waiting_queue": "node_staff_waiting",
        "staff_today_bookings": "node_staff_today",
        "staff_completed_procurements": "node_staff_completed",
        "staff_pending_payments": "node_staff_pending",
        "staff_who_is_next": "node_staff_next",
        "staff_serve_next": "node_staff_serve",
    }
    return mapping.get(intent, "node_general_qa")

# ── Node Wrappers Passing DB Context ─────────────────────────────────────────
def _get_db(config) -> AsyncSession:
    return config["configurable"]["db"]

async def wrap_book_slot(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_book_slot(db, state)

async def wrap_cancel_slot(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_cancel_slot(db, state)

async def wrap_center_slots(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_center_slots_info(db, state)

async def wrap_check_token(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_farmer_token_check(db, state)

async def wrap_check_queue(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_farmer_queue_check(db, state)

async def wrap_procurement_status(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_farmer_procurement_status(db, state)

async def wrap_payment_status(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_farmer_payment_status(db, state)

async def wrap_staff_waiting(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_waiting_queue(db, state)

async def wrap_staff_today(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_today_bookings(db, state)

async def wrap_staff_completed(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_completed_procurements(db, state)

async def wrap_staff_pending(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_pending_payments(db, state)

async def wrap_staff_next(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_who_is_next(db, state)

async def wrap_staff_serve(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_staff_serve_next(db, state)

async def wrap_execute_staged(state: AgentGraphState, config) -> AgentGraphState:
    db = _get_db(config)
    return await tool_execute_staged_action(db, state)

async def wrap_reject_staged(state: AgentGraphState) -> AgentGraphState:
    return tool_handle_rejection(state)

async def wrap_general_qa(state: AgentGraphState) -> AgentGraphState:
    return tool_general_qa(state)

async def format_response_node(state: AgentGraphState) -> AgentGraphState:
    """Ensures consistent return contract for API and UI consumers."""
    msg = state.get("message") or state.get("speech_text") or "Request processed."
    speech = state.get("speech_text") or msg
    status = state.get("status") or "success"
    return {
        **state,
        "message": msg,
        "speech_text": speech,
        "status": status,
    }

# ── Build & Compile the StateGraph ───────────────────────────────────────────
def build_agent_graph():
    builder = StateGraph(AgentGraphState)

    # 1. Register Nodes
    builder.add_node("classify", classify_intent_node)
    builder.add_node("guardrails", guardrails_node)

    builder.add_node("node_book_slot", wrap_book_slot)
    builder.add_node("node_cancel_slot", wrap_cancel_slot)
    builder.add_node("node_center_slots", wrap_center_slots)
    builder.add_node("node_check_token", wrap_check_token)
    builder.add_node("node_check_queue", wrap_check_queue)
    builder.add_node("node_procurement_status", wrap_procurement_status)
    builder.add_node("node_payment_status", wrap_payment_status)

    builder.add_node("node_staff_waiting", wrap_staff_waiting)
    builder.add_node("node_staff_today", wrap_staff_today)
    builder.add_node("node_staff_completed", wrap_staff_completed)
    builder.add_node("node_staff_pending", wrap_staff_pending)
    builder.add_node("node_staff_next", wrap_staff_next)
    builder.add_node("node_staff_serve", wrap_staff_serve)

    builder.add_node("execute_staged", wrap_execute_staged)
    builder.add_node("reject_staged", wrap_reject_staged)
    builder.add_node("node_general_qa", wrap_general_qa)
    builder.add_node("format_response", format_response_node)

    # 2. Connect Edges
    builder.add_edge(START, "classify")
    builder.add_edge("classify", "guardrails")

    builder.add_conditional_edges(
        "guardrails",
        route_next_node,
        {
            "format_response": "format_response",
            "execute_staged": "execute_staged",
            "reject_staged": "reject_staged",
            "node_book_slot": "node_book_slot",
            "node_cancel_slot": "node_cancel_slot",
            "node_center_slots": "node_center_slots",
            "node_check_token": "node_check_token",
            "node_check_queue": "node_check_queue",
            "node_procurement_status": "node_procurement_status",
            "node_payment_status": "node_payment_status",
            "node_staff_waiting": "node_staff_waiting",
            "node_staff_today": "node_staff_today",
            "node_staff_completed": "node_staff_completed",
            "node_staff_pending": "node_staff_pending",
            "node_staff_next": "node_staff_next",
            "node_staff_serve": "node_staff_serve",
            "node_general_qa": "node_general_qa",
        }
    )

    # Connect all tool outputs to format_response
    for node_name in [
        "node_book_slot", "node_cancel_slot", "node_center_slots", "node_check_token",
        "node_check_queue", "node_procurement_status", "node_payment_status",
        "node_staff_waiting", "node_staff_today", "node_staff_completed",
        "node_staff_pending", "node_staff_next", "node_staff_serve",
        "execute_staged", "reject_staged", "node_general_qa"
    ]:
        builder.add_edge(node_name, "format_response")

    builder.add_edge("format_response", END)

    return builder.compile()

# Singleton compiled graph instance
AGENT_GRAPH = build_agent_graph()

def get_agent_graph():
    return AGENT_GRAPH
