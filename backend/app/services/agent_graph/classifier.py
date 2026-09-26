import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from services.agent_nlu import AgentNLU
from services.agent_graph.llm_factory import get_configured_llm

class IntentSchema(BaseModel):
    intent: str = Field(description="Target intent classified from the user command")
    language: str = Field(description="'en', 'hi', or 'hinglish'")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities like produce, qty, slot, date")
    llm_reply: Optional[str] = Field(None, description="Natural language response or guidance")

SYSTEM_PROMPT = """You are AgriBot AI, the multilingual natural-language intelligence engine of AgriQueue — India's digital agricultural procurement queue management platform.
You understand commands and questions in Hindi (Devanagari), English, and Hinglish (Romanized Hindi).

Target Intents:
Farmer Intents:
- farmer_book_slot: Booking/scheduling slot (e.g. 'Book a slot for tomorrow at 10 AM', 'कल 10 बजे का स्लॉट बुक करो', 'Kal 10 baje ka slot book karo')
- farmer_cancel_slot: Cancelling slot (e.g. 'Cancel my slot', 'मेरा स्लॉट रद्द करो', 'Mera slot cancel kar do')
- farmer_check_token: Checking token number (e.g. 'Mera token number kya hai?', 'What is my token number?', 'मेरा टोकन नंबर क्या है?')
- farmer_check_queue: Tracking queue position/wait time (e.g. 'What is my queue position?', 'Kitne log aage hain?', 'कतार में मेरी स्थिति क्या है?')
- farmer_procurement_status: Checking procurement record/weight/quality (e.g. 'Show my procurement status', 'मेरी खरीद की स्थिति बताओ')
- farmer_payment_status: Checking payout/DBT/payment status (e.g. 'मेरा payment status बताओ', 'Show my payment status', 'Mera payment status batao')
- farmer_center_slots_info: Inquiring about procurement centers, center location, center address, where is a center, center timings, and slot availability (e.g. 'kisan simiti center kha par hai', 'kisan samiti center kahan hai', 'center kahan hai', 'center kidhar hai', 'where is the center', 'procurement center address', 'is there any slot for today in any center?', 'any slot available today?', 'are slots open today?', 'kya aaj koi slot khali hai?', 'kisi center me slot bacha hai kya?', 'center timing kya hai?', 'show available slots')

Staff Intents:
- staff_waiting_queue: Asking waiting count in queue (e.g. 'How many farmers are waiting in the queue?', 'कतार में कितने किसान प्रतीक्षा कर रहे हैं?')
- staff_today_bookings: Asking for today's bookings list (e.g. 'Show today's bookings', 'आज की बुकिंग्स दिखाओ')
- staff_completed_procurements: Asking who completed procurement (e.g. 'Which farmers have completed procurement?', 'किन किसानों की खरीद पूरी हो चुकी है?')
- staff_pending_payments: Inquiring about pending disbursements (e.g. 'Show pending payments', 'लंबित भुगतान दिखाओ')
- staff_who_is_next: Asking who is next in line (e.g. 'Who is next in the queue?', 'कतार में अगला कौन है?')
- staff_serve_next: Calling/serving the next farmer (e.g. 'Serve the next farmer', 'अगले किसान को बुलाओ', 'Next farmer ko bulao')

Admin Intents:
- admin_center_summary: Admin asking for overall center performance or summary (e.g. 'Show all centers summary', 'Sab centers ka report do')
- admin_pending_payments_all: Admin asking for all pending payments across all centers (e.g. 'Show all pending payments', 'Total pending payment kitna hai?')
- admin_farmer_search: Admin searching for a specific farmer (e.g. 'Find farmer Ramesh Kumar', 'Kisan Ramesh ka record dikhao')

Confirmation Intents:
- confirm_action: Affirmative confirmation (e.g. 'Yes', 'Confirm', 'हाँ', 'Haan', 'Theek hai', 'बुक कर दो', 'Ok', 'Sure', 'Bilkul')
- reject_action: Negative rejection (e.g. 'No', 'Cancel', 'नहीं', 'Nahi', 'Mat karo', 'रद्द करो', 'Band karo')

General:
- greeting: Greetings (e.g. 'Hello', 'Namaste', 'नमस्ते', 'Hi', 'Hey')
- help: Asking what AgriQueue can do (e.g. 'What can you do?', 'Help', 'Kya kar sakte ho?')
- general_qa: General agricultural advice or crop MSP queries (ONLY when query does NOT relate to booking, slot, token, or center)
- unknown: Unrecognized queries

CRITICAL GROUNDING RULES:
1. NEVER invent or hallucinate fake telephone numbers (e.g. DO NOT mention 1800-xxx-xxxx numbers), fake URLs, or hypothetical addresses.
2. If the user asks where a center is, center address, center timings, or slot availability, ALWAYS classify as 'farmer_center_slots_info' so AgriQueue database tools fetch the live verified records.
3. Use the conversation history (if provided) to resolve pronouns and context (e.g. 'book it' after discussing a slot → farmer_book_slot).
4. You MUST respond strictly with a valid JSON adhering to IntentSchema.
5. If the user's intent matches a confirmation or rejection AND there is a previous conversation turn that required confirmation, prefer 'confirm_action' or 'reject_action'.
"""

async def classify_intent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph Node: Classifies intent and extracts entities using the vendor-free LLM Factory
    with an automatic resilient fallback to the local Multilingual NLU engine.
    Supports multi-turn conversation history for context-aware classification.
    """
    query = state.get("query", "").strip()
    role = state.get("role", "farmer")
    preferred_lang = state.get("preferred_lang")
    conversation_history: list = state.get("conversation_history", [])

    parsed_result = None
    llm, model_identifier = get_configured_llm()
    active_model = model_identifier

    # Try vendor-free LLM if configured and available
    if llm:
        try:
            now = datetime.now()
            today_str = now.date().isoformat()
            tomorrow_str = (now.date() + timedelta(days=1)).isoformat()
            current_time = now.strftime("%I:%M %p")

            # Build conversation history context string (last 6 turns max)
            history_ctx = ""
            if conversation_history:
                recent = conversation_history[-6:]
                history_lines = [f"  [{h['role'].upper()}]: {h['text']}" for h in recent]
                history_ctx = "\nConversation History (most recent last):\n" + "\n".join(history_lines) + "\n"

            user_prompt = f"""
Today's Date: {today_str}
Current Time: {current_time}
Tomorrow's Date: {tomorrow_str}
User Role: {role}{history_ctx}
Current Command: "{query}"

JSON Schema:
{{
  "intent": "<intent_name>",
  "language": "<'en', 'hi', or 'hinglish'>",
  "entities": {{
    "center_name": "<name of center if mentioned, e.g. 'Kisan simiti center', 'Kheti procurement center'>",
    "date": "<YYYY-MM-DD>",
    "formatted_date": "<e.g. 23 Sep 2026>",
    "slot_id": <int>,
    "slot_time": "<e.g. 10:00 AM - 11:00 AM>",
    "produce": "<Wheat/Rice/Paddy/Soyabean/Mustard/Cotton/Gram>",
    "quantity_kg": <int>,
    "farmer_name": "<farmer name if mentioned>",
    "mobile_number": "<mobile number if mentioned>"
  }},
  "llm_reply": "<friendly reply in user's language without fake phone numbers>"
}}
"""
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_prompt)
            ]
            response = await llm.ainvoke(messages)
            content = response.content
            if isinstance(content, list):
                content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])

            # Clean JSON markdown fences if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            # Try to extract JSON even if LLM added extra prose
            if "{" in content and "}" in content:
                content = content[content.index("{"):content.rindex("}") + 1]

            parsed = json.loads(content)
            if parsed.get("intent") and parsed["intent"] != "unknown":
                parsed_result = parsed
                active_model = model_identifier
        except Exception as e:
            # Fallback quietly to local rule-based NLU on quota, timeout, or parsing error
            print(f"[Classifier Node] Fallback to Local NLU ({model_identifier} returned: {e})")
            pass

    # Resilient fallback to deterministic multilingual NLU
    if not parsed_result:
        parsed_result = AgentNLU.parse_command(query, user_role=role)
        active_model = "local-nlu"

    detected_lang = preferred_lang or parsed_result.get("language", "en")
    intent = parsed_result.get("intent", "unknown")
    entities = parsed_result.get("entities", {})
    llm_reply = parsed_result.get("llm_reply")

    return {
        **state,
        "language": detected_lang,
        "intent": intent,
        "entities": entities,
        "llm_reply": llm_reply,
        "model": active_model
    }
