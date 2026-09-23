import uuid
import json
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.agent_audit import AgentAuditLog
from models.farmer import Farmer
from models.staff import Staff
from models.admin import Admin
from models.booking import Booking
from models.procurement_center import ProcurementCenter
from models.slot import Slot
from models.produce import Produce
from models.procurement import ProcurementRecord
from models.payment import Payment
from models.push_subscription import PushSubscription
from routes.notifications import send_push_notification
from ml.predictor import predict_queue_wait_time
from services.agent_nlu import AgentNLU
from time_utils import is_slot_expired, parse_time_str, format_time_12h

# In-memory staging storage for pending user confirmations (expires after 10 mins)
STAGED_ACTIONS: Dict[str, Dict[str, Any]] = {}

def format_token(center_name: str, token_num: int) -> str:
    parts = center_name.split() if center_name else []
    prefix = parts[-1][0].upper() if parts else "A"
    return f"{prefix}-{token_num:03d}"

def format_currency(value: float) -> str:
    if value >= 10_000_000:
        return f"₹{value / 10_000_000:.1f} Cr"
    elif value >= 100_000:
        return f"₹{value / 100_000:.1f} Lakh"
    else:
        return f"₹{value:,.0f}"

# ── RBAC Validation ──────────────────────────────────────────────────────────
FARMER_INTENTS = {
    "farmer_book_slot", "farmer_cancel_slot", "farmer_check_token",
    "farmer_check_queue", "farmer_procurement_status", "farmer_payment_status",
    "farmer_center_slots_info"
}
STAFF_INTENTS = {
    "staff_waiting_queue", "staff_today_bookings", "staff_completed_procurements",
    "staff_pending_payments", "staff_who_is_next", "staff_serve_next"
}
UNIVERSAL_INTENTS = {"confirm_action", "reject_action", "greeting", "help", "general_qa", "unknown"}

def validate_rbac(role: str, intent: str) -> Optional[Dict[str, str]]:
    if intent in UNIVERSAL_INTENTS:
        return None
    if role == "staff" and intent in FARMER_INTENTS:
        return {
            "en": "This operation is for registered farmers. As a staff member, you can manage the queue or call farmers.",
            "hi": "यह सुविधा केवल पंजीकृत किसानों के लिए है। कर्मचारी के रूप में आप कतार प्रबंधन कर सकते हैं।",
            "hinglish": "Yeh action registered farmers ke liye hai. Staff members queue manage kar sakte hain."
        }
    if role == "farmer" and intent in STAFF_INTENTS:
        return {
            "en": "Staff actions (like serving the next farmer) require staff credentials.",
            "hi": "कतार सेवा कमांड केवल केंद्र कर्मचारियों के लिए उपलब्ध हैं।",
            "hinglish": "Yeh action sirf mandi staff ke liye allowed hai."
        }
    return None

# ── 1. Farmer Book Slot Tool ──────────────────────────────────────────────────
async def tool_book_slot(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    role = state.get("role", "farmer")
    lang = state.get("language", "en")
    entities = state.get("entities") or {}
    raw_query = state.get("query", "").strip()

    # Look for most recent staged booking for this user to carry over context (produce, quantity, center)
    prev_staged = None
    if user_id:
        for aid, sdata in reversed(list(STAGED_ACTIONS.items())):
            if sdata.get("user_id") == user_id and sdata.get("type") == "book_slot":
                prev_staged = sdata
                break

    target_date_str = entities.get("date") or (prev_staged.get("date") if prev_staged else None)
    produce = entities.get("produce") or (prev_staged.get("produce") if prev_staged else None) or "Wheat"
    
    raw_qty = entities.get("quantity_kg") or (prev_staged.get("quantity_kg") if prev_staged else None) or 1000
    try:
        quantity_kg = int(float(raw_qty))
    except (ValueError, TypeError):
        quantity_kg = 1000

    produce_type = entities.get("produce_type") or (prev_staged.get("produce_type") if prev_staged else None) or "Standard Grade"
    rolled_from_expired_today = entities.get("rolled_from_expired_today", False)
    slot_adjusted_from_expired = entities.get("slot_adjusted_from_expired", False)

    # 1. Fetch active centers
    center_id = entities.get("center_id") or (prev_staged.get("center_id") if prev_staged else None)
    center = None
    if center_id:
        center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    if not center:
        centers = (await db.scalars(select(ProcurementCenter).where(ProcurementCenter.status == "Active"))).all()
        if not centers:
            centers = (await db.scalars(select(ProcurementCenter).limit(5))).all()
        if centers:
            center = centers[0]

    if not center:
        msg = "No procurement center found."
        return {**state, "status": "error", "message": msg, "speech_text": msg, "card": None}

    center_id = center.id
    center_name = center.name

    # 2. Fetch center slots
    slots = (await db.scalars(select(Slot).where(Slot.center_id == center_id).order_by(Slot.start_time))).all()

    now = datetime.now()
    today = now.date()
    target_date = today

    if target_date_str:
        try:
            target_date = datetime.fromisoformat(target_date_str).date()
        except Exception:
            target_date = today

    # Validate target date is not in past
    if target_date < today:
        target_date = today + timedelta(days=1)
        rolled_from_expired_today = True

    # Parse requested time or hour (e.g. from slot_time, slot_id, or raw query "3 bje ka", "15:00", "3 pm")
    requested_slot_time = entities.get("slot_time")
    requested_slot_id = entities.get("slot_id")
    requested_hour = None

    if requested_slot_time:
        start_t = parse_time_str(requested_slot_time.split("-")[0].strip())
        if start_t:
            requested_hour = start_t.hour

    if requested_hour is None and raw_query:
        norm_q = raw_query.lower()
        m_bje = re.search(r"\b(\d{1,2})\s*(bje|baje|baje ka|bje ka)\b", norm_q)
        if m_bje:
            h = int(m_bje.group(1))
            # In Mandi hours, 1 to 6 implies afternoon (1 PM to 6 PM)
            requested_hour = h + 12 if 1 <= h <= 6 else h
        else:
            m_pm = re.search(r"\b(\d{1,2})\s*(pm|am)\b", norm_q)
            if m_pm:
                h = int(m_pm.group(1))
                p = m_pm.group(2).upper()
                if p == "PM" and h != 12:
                    requested_hour = h + 12
                elif p == "AM" and h == 12:
                    requested_hour = 0
                else:
                    requested_hour = h

    chosen_slot = None
    if requested_slot_id:
        chosen_slot = next((s for s in slots if s.id == requested_slot_id), None)

    if not chosen_slot and requested_hour is not None:
        for s in slots:
            s_start = parse_time_str(s.start_time)
            s_end = parse_time_str(s.end_time)
            if s_start and s_end:
                if s_start.hour == requested_hour or (s_start.hour <= requested_hour < s_end.hour):
                    chosen_slot = s
                    break
                if (s_start.hour == requested_hour - 12) or (s_start.hour == requested_hour + 12):
                    chosen_slot = s
                    break

    if not chosen_slot:
        if target_date == today:
            future_slots = [s for s in slots if not is_slot_expired(today, s.end_time, now) and (s.booked_count < s.capacity)]
            if future_slots:
                chosen_slot = future_slots[0]
            else:
                target_date = today + timedelta(days=1)
                rolled_from_expired_today = True
                if slots:
                    chosen_slot = slots[0]
        else:
            if slots:
                chosen_slot = slots[0]

    slot_id = chosen_slot.id if chosen_slot else 1
    slot_time = (
        f"{format_time_12h(chosen_slot.start_time)} - {format_time_12h(chosen_slot.end_time)}"
        if chosen_slot else "10:00 AM - 11:00 AM"
    )
    formatted_date = target_date.strftime("%d %b %Y")

    produce_rec = await db.scalar(select(Produce).where(Produce.produce_name.ilike(f"%{produce}%")))
    rate_per_kg = float(produce_rec.price_per_kg) if produce_rec and produce_rec.price_per_kg else 22.0
    estimated_price = int(rate_per_kg * quantity_kg)

    act_id = f"act_{uuid.uuid4().hex[:8]}"
    action_data = {
        "type": "book_slot",
        "user_id": user_id,
        "center_id": center_id,
        "center_name": center_name,
        "produce": produce,
        "produce_type": produce_type,
        "quantity_kg": quantity_kg,
        "rate_per_kg": rate_per_kg,
        "estimated_price": estimated_price,
        "date": target_date.isoformat(),
        "formatted_date": formatted_date,
        "slot_id": slot_id,
        "slot_time": slot_time,
        "lang": lang,
        "created_at": datetime.now(),
        "rolled_from_expired_today": rolled_from_expired_today,
        "slot_adjusted_from_expired": slot_adjusted_from_expired,
    }
    STAGED_ACTIONS[act_id] = action_data

    speech = AgentNLU.generate_multilingual_response(
        "farmer_book_slot", lang,
        {"stage": "confirmation_required", **action_data}
    )

    card = {
        "card_type": "booking_confirmation",
        "action_id": act_id,
        "title": "Confirm Slot Booking",
        "center_name": center_name,
        "produce": produce,
        "quantity": f"{quantity_kg:,} kg ({quantity_kg/100:.1f} Quintal)",
        "date": formatted_date,
        "slot_time": slot_time,
        "estimated_value": f"₹{estimated_price:,}",
        "actions": [
            {"label": "Confirm Booking", "confirm": True, "style": "primary"},
            {"label": "Cancel", "confirm": False, "style": "secondary"}
        ]
    }

    return {
        **state,
        "status": "requires_confirmation",
        "action_id": act_id,
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 2. Farmer Cancel Slot Tool ────────────────────────────────────────────────
async def tool_cancel_slot(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    booking_row = (await db.execute(
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(Booking.farmer_id == user_id, Booking.status.in_(["Confirmed", "Waiting"]))
        .order_by(Booking.booked_at.asc())
        .limit(1)
    )).first()

    if not booking_row:
        speech = (
            "आपके पास रद्द करने के लिए कोई सक्रिय बुकिंग नहीं है।" if lang == "hi" else
            "Aapke paas cancel karne ke liye koi active booking nahi mili." if lang == "hinglish" else
            "You do not have any active bookings eligible for cancellation."
        )
        return {**state, "status": "no_active_booking", "message": speech, "speech_text": speech, "card": None}

    booking, center = booking_row
    formatted_tok = format_token(center.name, booking.token_number)
    formatted_date = booking.booked_at.strftime("%d %b %Y")

    act_id = f"act_{uuid.uuid4().hex[:8]}"
    action_data = {
        "type": "cancel_slot",
        "user_id": user_id,
        "booking_id": booking.id,
        "formatted_token": formatted_tok,
        "formatted_date": formatted_date,
        "center_name": center.name,
        "produce": booking.produce,
        "lang": lang,
    }
    STAGED_ACTIONS[act_id] = action_data

    speech = AgentNLU.generate_multilingual_response(
        "farmer_cancel_slot", lang,
        {"stage": "confirmation_required", **action_data}
    )

    card = {
        "card_type": "cancel_confirmation",
        "action_id": act_id,
        "title": "Cancel Booking Slot",
        "token": formatted_tok,
        "center_name": center.name,
        "produce": booking.produce,
        "date": formatted_date,
        "actions": [
            {"label": "Yes, Cancel Slot", "confirm": True, "style": "danger"},
            {"label": "Keep Booking", "confirm": False, "style": "secondary"}
        ]
    }

    return {
        **state,
        "status": "requires_confirmation",
        "action_id": act_id,
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 3. Farmer Center & Slots Info Tool ────────────────────────────────────────
async def tool_center_slots_info(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    query = state.get("query", "")
    lang = state.get("language", "en")

    centers = (await db.scalars(
        select(ProcurementCenter).where(ProcurementCenter.status == "Active").order_by(ProcurementCenter.name)
    )).all()
    if not centers:
        centers = (await db.scalars(select(ProcurementCenter).limit(5))).all()

    center_ids = [c.id for c in centers]
    slots_records = (await db.scalars(
        select(Slot).where(Slot.center_id.in_(center_ids)).order_by(Slot.start_time)
    )).all() if center_ids else []

    slots_by_center: Dict[int, List[Slot]] = {}
    for s in slots_records:
        slots_by_center.setdefault(s.center_id, []).append(s)

    q_lower = query.lower()
    is_today_query = any(w in q_lower for w in ["today", "aaj", "आज"])
    is_tomorrow_query = any(w in q_lower for w in ["tomorrow", "kal", "कल"])
    is_location_query = any(w in q_lower for w in [
        "kha par", "kaha par", "kahan", "kaha", "kha", "kidhar", "where", "location", "address", "pata", "kaunse", "konsa", "place"
    ])

    today = date.today()
    now = datetime.now()

    center_card_list = []
    total_available_today = 0
    centers_with_available_slots = []

    # Check if a specific center was mentioned in the query
    matched_center = None
    for c in centers:
        c_name_norm = c.name.lower().replace("procurement", "").replace("center", "").replace("centre", "").strip()
        significant_words = [w for w in c_name_norm.split() if len(w) >= 4]
        if c_name_norm in q_lower or (significant_words and any(w in q_lower for w in significant_words)):
            matched_center = c
            break
        if c.village and c.village.lower() in q_lower:
            matched_center = c
            break
        if c.district and c.district.lower() in q_lower:
            matched_center = c
            break

    for c in centers:
        c_slots = slots_by_center.get(c.id, [])
        unexpired_today = [
            s for s in c_slots
            if not is_slot_expired(today, s.end_time, now) and (s.booked_count < s.capacity)
        ]
        total_available_today += len(unexpired_today)

        all_slot_labels = [
            f"{format_time_12h(s.start_time)} - {format_time_12h(s.end_time)}"
            for s in c_slots
        ] or ["08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 05:00 PM"]

        unexpired_labels = [
            f"{format_time_12h(s.start_time)} - {format_time_12h(s.end_time)}"
            for s in unexpired_today
        ]

        if unexpired_today:
            centers_with_available_slots.append(c.name)

        center_card_list.append({
            "id": c.id,
            "name": c.name,
            "address": c.address,
            "village": c.village or "District Mandi",
            "district": c.district,
            "state": c.state,
            "pincode": c.pincode,
            "timing": f"{format_time_12h(c.opening_time) or '08:00 AM'} - {format_time_12h(c.closing_time) or '05:00 PM'}",
            "status": "Open Today" if len(unexpired_today) > 0 else "Closed for Today",
            "available_today": len(unexpired_today),
            "unexpired_slots_today": unexpired_labels,
            "all_slots": all_slot_labels,
            "next_opening": "Tomorrow 08:00 AM" if len(unexpired_today) == 0 else "Open Now",
        })

    center_names = [c.name for c in centers]
    center_names_str = ", ".join(center_names) if center_names else "Mandi Centres"

    # Prioritize matched center in card list if found
    if matched_center:
        center_card_list = sorted(center_card_list, key=lambda item: 0 if item["id"] == matched_center.id else 1)

    # 1. Location / Address queries ("kisan simiti center kha par hai", "where is center")
    if is_location_query and matched_center:
        c_open = format_time_12h(matched_center.opening_time) or "08:00 AM"
        c_close = format_time_12h(matched_center.closing_time) or "05:00 PM"
        speech = (
            f"{matched_center.name} का पता '{matched_center.address}' (ग्राम: {matched_center.village}, जिला: {matched_center.district}, {matched_center.state}) है। यह केंद्र प्रतिदिन {c_open} से {c_close} तक खुला रहता है।"
            if lang == "hi" else
            f"{matched_center.name} ka address '{matched_center.address}' (Gaon: {matched_center.village}, Zila: {matched_center.district}, {matched_center.state}) hai. Yeh center daily {c_open} se {c_close} tak open rehta hai."
            if lang == "hinglish" else
            f"{matched_center.name} is located at '{matched_center.address}', Village: {matched_center.village}, District: {matched_center.district}, {matched_center.state}. Daily operating hours are {c_open} to {c_close}."
        )
    elif is_location_query:
        loc_details = [f"{c.name}: '{c.address}' ({c.village}, {c.district})" for c in centers]
        loc_str = "; ".join(loc_details) if loc_details else center_names_str
        speech = (
            f"उपलब्ध खरीद केंद्र और पते: {loc_str}। केंद्र प्रतिदिन 08:00 AM से 05:00 PM तक खुले रहते हैं।"
            if lang == "hi" else
            f"Active procurement centers: {loc_str}. Sabhi centers subah 08:00 AM se sham 05:00 PM tak open rehte hain."
            if lang == "hinglish" else
            f"Active procurement centers and locations: {loc_str}. Daily operating hours are 08:00 AM to 05:00 PM."
        )
    # 2. Slot availability queries
    elif is_today_query or (not is_tomorrow_query and total_available_today == 0):
        if total_available_today == 0:
            speech = (
                f"नहीं, आज के लिए किसी भी केंद्र में कोई स्लॉट उपलब्ध नहीं है। उपलब्ध केंद्र ({center_names_str}) पर आज के स्लॉट समाप्त हो चुके हैं। कल सुबह 08:00 AM से स्लॉट फिर से उपलब्ध होंगे।"
                if lang == "hi" else
                f"Nahi, aaj ke liye kisi bhi center me koi slot available nahi hai. {center_names_str} par aaj ke sabhi slots close ho chuke hain. Kal subah 08:00 AM se naye slots open honge."
                if lang == "hinglish" else
                f"No, there are no slots available for today in any center. All procurement slots have ended for the day across centers ({center_names_str}). Centers will reopen tomorrow starting at 08:00 AM."
            )
        else:
            slots_summary = ", ".join(centers_with_available_slots)
            speech = (
                f"हाँ! आज {total_available_today} स्लॉट उपलब्ध हैं: {slots_summary}। क्या आप स्लॉट बुक करना चाहते हैं?"
                if lang == "hi" else
                f"Haan! Aaj {total_available_today} slots available hain in: {slots_summary}. Kya aap slot book karna chahte hain?"
                if lang == "hinglish" else
                f"Yes! There are {total_available_today} open slot(s) available today across: {slots_summary}. Would you like to book one?"
            )
    elif is_tomorrow_query:
        speech = (
            f"हाँ, कल के लिए सभी सक्रिय केंद्रों ({center_names_str}) में सुबह 08:00 AM से स्लॉट उपलब्ध हैं। क्या आप कल का स्लॉट बुक करना चाहते हैं?"
            if lang == "hi" else
            f"Haan, kal ke liye sabhi active centers ({center_names_str}) me subah 08:00 AM se slots open hain. Kya aap kal ka slot book karna chahte hain?"
            if lang == "hinglish" else
            f"Yes, slots are available tomorrow across all active centers ({center_names_str}) starting at 08:00 AM. Would you like to book a slot for tomorrow?"
        )
    else:
        if total_available_today == 0:
            speech = (
                f"उपलब्ध खरीद केंद्र: {center_names_str}। आज के सभी स्लॉट समाप्त हो चुके हैं (समय 08:00 AM से 05:00 PM)। कल सुबह 08:00 AM से स्लॉट बुक कर सकते हैं।"
                if lang == "hi" else
                f"Available centres: {center_names_str}. Aaj ke slots close ho chuke hain (Daily timings: 08:00 AM - 05:00 PM). Kal subah 08:00 AM se slots open hain."
                if lang == "hinglish" else
                f"Active procurement centers: {center_names_str}. Today's slots have concluded for the day. Centers operate daily 08:00 AM to 05:00 PM, and slots are open for tomorrow."
            )
        else:
            speech = (
                f"उपलब्ध खरीद केंद्र: {center_names_str}। आज {total_available_today} स्लॉट खुले हैं। आप आज या कल का स्लॉट बुक कर सकते हैं।"
                if lang == "hi" else
                f"Available centres: {center_names_str}. Aaj {total_available_today} slots open hain. Aap aaj ya kal ka slot book kar sakte hain."
                if lang == "hinglish" else
                f"Active procurement centers: {center_names_str}. Currently {total_available_today} slot(s) are available today. Slots are also open for tomorrow."
            )

    card = {
        "card_type": "center_info",
        "title": f"{matched_center.name} Location & Details" if (is_location_query and matched_center) else "Procurement Centers & Slots",
        "target_date": "Tomorrow" if (is_tomorrow_query or total_available_today == 0) else "Today",
        "is_today_closed": total_available_today == 0,
        "total_available_today": total_available_today,
        "centers": center_card_list,
        "quick_action": {
            "label": f"Book Slot at {matched_center.name}" if matched_center else ("Book Slot Tomorrow" if total_available_today == 0 else "Book a Slot"),
            "command": f"Book a slot tomorrow at {matched_center.name}" if matched_center else ("Book a slot for tomorrow at 10 AM" if total_available_today == 0 else "Book a slot today")
        }
    }

    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 4. Farmer Token Status Tool ───────────────────────────────────────────────
async def tool_farmer_token_check(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    booking_row = (await db.execute(
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(
            Booking.farmer_id == user_id,
            Booking.status.in_(["Confirmed", "Waiting", "Serving"])
        )
        .order_by(Booking.booked_at.asc())
        .limit(1)
    )).first()

    if not booking_row:
        speech = (
            "आज के लिए आपका कोई सक्रिय टोकन नहीं मिला।" if lang == "hi" else
            "Aaj ke liye aapka koi active token nahi mila." if lang == "hinglish" else
            "You do not have an active token for today."
        )
        return {**state, "status": "not_found", "message": speech, "speech_text": speech, "card": None}

    booking, center = booking_row
    formatted_tok = format_token(center.name, booking.token_number)
    token_data = {
        "your_token": formatted_tok,
        "center_name": center.name,
        "status": booking.status,
    }
    speech = AgentNLU.generate_multilingual_response("farmer_check_token", lang, token_data)
    card = {
        "card_type": "token_status",
        "title": "Your Active Token",
        "token": formatted_tok,
        "center_name": center.name,
        "status": booking.status,
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 5. Farmer Queue Check Tool ────────────────────────────────────────────────
async def tool_farmer_queue_check(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    from routes.queue import _build_farmer_queue
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    booking_row = (await db.execute(
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(
            Booking.farmer_id == user_id,
            Booking.status.in_(["Confirmed", "Waiting", "Serving"])
        )
        .order_by(Booking.booked_at.asc())
        .limit(1)
    )).first()

    center_id = booking_row[1].id if booking_row else 1
    queue_data = await _build_farmer_queue(center_id, user_id, db) or {}
    speech = AgentNLU.generate_multilingual_response("farmer_check_queue", lang, queue_data)

    card = {
        "card_type": "queue_gauge",
        "title": "Live Queue Status",
        "your_token": queue_data.get("yourToken", "-"),
        "now_serving": queue_data.get("nowServing", "-"),
        "farmers_ahead": queue_data.get("farmersAhead", 0),
        "estimated_wait": queue_data.get("estimatedWait", "0 mins"),
        "center_name": queue_data.get("center", "Procurement Centre"),
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 6. Farmer Procurement Status Tool ─────────────────────────────────────────
async def tool_farmer_procurement_status(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    rec = await db.scalar(
        select(ProcurementRecord)
        .where(ProcurementRecord.farmer_id == user_id)
        .order_by(desc(ProcurementRecord.created_at))
    )
    if not rec:
        speech = (
            "आपकी कोई पिछली खरीद रिकॉर्ड नहीं मिली।" if lang == "hi" else
            "Aapka koi procurement record nahi mila." if lang == "hinglish" else
            "No procurement records found for your account."
        )
        return {**state, "status": "not_found", "message": speech, "speech_text": speech, "card": None}

    data = {
        "latest_record": {
            "produce": rec.produce_type or "Wheat",
            "quantity": f"{rec.total_weight:,} kg",
            "amount": format_currency(rec.total_amount),
            "status": rec.status,
            "date": rec.created_at.strftime("%d %b %Y"),
        }
    }
    speech = AgentNLU.generate_multilingual_response("farmer_procurement_status", lang, data)
    card = {
        "card_type": "status_badge",
        "title": "Latest Procurement Record",
        "produce": data["latest_record"]["produce"],
        "weight": data["latest_record"]["quantity"],
        "amount": data["latest_record"]["amount"],
        "status": rec.status,
        "date": data["latest_record"]["date"],
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 7. Farmer Payment Status Tool ─────────────────────────────────────────────
async def tool_farmer_payment_status(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    payment = await db.scalar(
        select(Payment)
        .where(Payment.farmer_id == user_id)
        .order_by(desc(Payment.created_at))
    )
    if not payment:
        speech = (
            "आपके खाते के लिए कोई भुगतान रिकॉर्ड नहीं मिला।" if lang == "hi" else
            "Aapka koi payment record nahi mila." if lang == "hinglish" else
            "No payment records found for your account."
        )
        return {**state, "status": "not_found", "message": speech, "speech_text": speech, "card": None}

    data = {
        "latest_payment": {
            "amount": format_currency(payment.amount),
            "status": payment.status,
            "receipt_number": payment.receipt_number or "REC-001",
            "expected_settlement_date": payment.expected_settlement_date.strftime("%d %b %Y") if payment.expected_settlement_date else "Within 48h",
        }
    }
    speech = AgentNLU.generate_multilingual_response("farmer_payment_status", lang, data)
    card = {
        "card_type": "payment_status",
        "title": "Payment Settlement Status",
        "amount": data["latest_payment"]["amount"],
        "status": payment.status,
        "receipt_number": data["latest_payment"]["receipt_number"],
        "expected_date": data["latest_payment"]["expected_settlement_date"],
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 8. Staff Tools ────────────────────────────────────────────────────────────
async def tool_staff_waiting_queue(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    from routes.staff import _build_staff_queue_payload
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff_data = await _build_staff_queue_payload(user_id, db) or {}
    speech = AgentNLU.generate_multilingual_response("staff_waiting_queue", lang, staff_data)
    card = {
        "card_type": "staff_queue_summary",
        "title": "Live Queue Overview",
        "waiting_count": staff_data.get("waiting_count", 0),
        "serving_count": staff_data.get("serving_count", 0),
        "total_today": staff_data.get("total_today", 0),
        "center_name": staff_data.get("center_name", ""),
        "next_token": staff_data.get("next_token", "-"),
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

async def tool_staff_today_bookings(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    from routes.staff import _build_staff_queue_payload
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff_data = await _build_staff_queue_payload(user_id, db) or {}
    speech = AgentNLU.generate_multilingual_response("staff_today_bookings", lang, staff_data)
    card = {
        "card_type": "staff_bookings_summary",
        "title": "Today's Bookings",
        "total": staff_data.get("total_today", 0),
        "waiting": staff_data.get("waiting_count", 0),
        "completed": staff_data.get("completed_count", 0),
        "center_name": staff_data.get("center_name", ""),
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

async def tool_staff_completed_procurements(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    center_id = staff.center_id if staff else 1
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))

    today = date.today()
    completed = (await db.scalars(
        select(Booking).where(
            Booking.procurement_center_id == center_id,
            func.date(Booking.booked_at) == today,
            Booking.status == "Completed"
        )
    )).all()

    total_qty = sum(b.quantity_kg for b in completed)
    data = {
        "completed_count": len(completed),
        "completed_qty_kg": total_qty,
        "center_name": center.name if center else "Centre"
    }
    speech = AgentNLU.generate_multilingual_response("staff_completed_procurements", lang, data)
    card = {
        "card_type": "status_badge",
        "title": "Completed Procurements",
        "count": len(completed),
        "total_weight": f"{total_qty:,} kg",
        "center_name": center.name if center else "Centre",
        "status": "Completed"
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

async def tool_staff_pending_payments(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    center_id = staff.center_id if staff else 1
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))

    pending_payments = (await db.scalars(
        select(Payment).where(
            Payment.procurement_center_id == center_id,
            Payment.status.in_(["Scheduled", "Processing", "On Hold"])
        )
    )).all()

    total_pending = sum(p.amount for p in pending_payments)
    data = {
        "pending_count": len(pending_payments),
        "pending_total": format_currency(total_pending),
        "center_name": center.name if center else "Centre"
    }
    speech = AgentNLU.generate_multilingual_response("staff_pending_payments", lang, data)
    card = {
        "card_type": "status_badge",
        "title": "Pending Payments",
        "count": len(pending_payments),
        "total_pending": format_currency(total_pending),
        "center_name": center.name if center else "Centre",
        "status": "Pending"
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

async def tool_staff_who_is_next(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    center_id = staff.center_id if staff else 1

    next_booking = await db.scalar(
        select(Booking)
        .where(Booking.procurement_center_id == center_id, Booking.status == "Waiting")
        .order_by(Booking.token_number.asc())
        .limit(1)
    )
    if not next_booking:
        speech = (
            "वर्तमान में कतार में कोई प्रतीक्षारत किसान नहीं है।" if lang == "hi" else
            "Filhal queue me koi waiting farmer nahi hai." if lang == "hinglish" else
            "There are currently no waiting farmers in the queue."
        )
        return {**state, "status": "success", "message": speech, "speech_text": speech, "card": None}

    farmer = await db.scalar(select(Farmer).where(Farmer.id == next_booking.farmer_id))
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    center_name = center.name if center else "Centre"
    formatted_tok = format_token(center_name, next_booking.token_number)

    data = {
        "next_token": formatted_tok,
        "next_farmer_name": farmer.full_name if farmer else "Farmer",
        "next_produce": next_booking.produce,
        "next_quantity_kg": next_booking.quantity_kg,
    }
    speech = AgentNLU.generate_multilingual_response("staff_who_is_next", lang, data)
    card = {
        "card_type": "staff_call_next",
        "title": "Next Farmer in Line",
        "token": formatted_tok,
        "farmer_name": data["next_farmer_name"],
        "produce": f"{next_booking.quantity_kg:,} kg {next_booking.produce}",
        "center_name": center_name,
    }
    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

async def tool_staff_serve_next(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    user_id = state.get("user_id")
    lang = state.get("language", "en")

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    center_id = staff.center_id if staff else 1

    next_up = await db.scalar(
        select(Booking)
        .where(Booking.procurement_center_id == center_id, Booking.status == "Waiting")
        .order_by(Booking.token_number.asc())
        .limit(1)
    )
    if not next_up:
        speech = (
            "कतार में कोई प्रतीक्षारत किसान नहीं है जिसे बुलाया जा सके।" if lang == "hi" else
            "Queue me koi waiting farmer nahi hai jise bulaya ja sake." if lang == "hinglish" else
            "There are no waiting farmers in the queue to call."
        )
        return {**state, "status": "no_waiting", "message": speech, "speech_text": speech, "card": None}

    farmer = await db.scalar(select(Farmer).where(Farmer.id == next_up.farmer_id))
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    center_name = center.name if center else "Centre"
    formatted_tok = format_token(center_name, next_up.token_number)

    act_id = f"act_{uuid.uuid4().hex[:8]}"
    action_data = {
        "type": "serve_next_farmer",
        "staff_id": user_id,
        "booking_id": next_up.id,
        "center_id": center_id,
        "token": formatted_tok,
        "farmer_name": farmer.full_name if farmer else "Farmer",
        "lang": lang,
    }
    STAGED_ACTIONS[act_id] = action_data

    speech = (
        f"अगला टोकन {formatted_tok} है ({farmer.full_name}, {next_up.quantity_kg} किग्रा {next_up.produce})। क्या आप उन्हें काउंटर पर बुलाना चाहते हैं?"
        if lang == "hi" else
        f"Queue me agla token {formatted_tok} hai ({farmer.full_name}, {next_up.quantity_kg} kg {next_up.produce}). Kya aap inhein counter par bulana chahte hain?"
        if lang == "hinglish" else
        f"Next farmer is Token {formatted_tok} ({farmer.full_name}, {next_up.quantity_kg} kg {next_up.produce}). Would you like to call them to your counter now?"
    )

    card = {
        "card_type": "staff_call_next",
        "action_id": act_id,
        "title": "Call Next Farmer",
        "token": formatted_tok,
        "farmer_name": farmer.full_name if farmer else "Farmer",
        "produce": f"{next_up.quantity_kg:,} kg {next_up.produce}",
        "center_name": center_name,
        "actions": [
            {"label": "Call to Counter", "confirm": True, "style": "primary"},
            {"label": "Cancel", "confirm": False, "style": "secondary"}
        ]
    }
    return {
        **state,
        "status": "requires_confirmation",
        "action_id": act_id,
        "message": speech,
        "speech_text": speech,
        "card": card,
    }

# ── 9. Execute Staged Action ──────────────────────────────────────────────────
async def tool_execute_staged_action(db: AsyncSession, state: Dict[str, Any]) -> Dict[str, Any]:
    staged = state.get("staged_action")
    user_id = state.get("user_id")
    role = state.get("role", "farmer")
    lang = state.get("language") or staged.get("lang", "en")
    action_type = staged["type"]

    if action_type == "book_slot":
        center_id = staged["center_id"]
        center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
        center_name = center.name if center else staged["center_name"]

        count_today = await db.scalar(
            select(func.count(Booking.id)).where(Booking.procurement_center_id == center_id)
        )
        token_number = (count_today or 0) + 40

        quantity_kg = staged["quantity_kg"]
        rate = staged.get("rate_per_kg", 22)
        total_price = staged.get("estimated_price", rate * quantity_kg)

        target_date_str = staged.get("date")
        booked_dt = datetime.now()
        slot_id = staged.get("slot_id", 1)
        slot_record = await db.scalar(select(Slot).where(Slot.id == slot_id))

        if target_date_str:
            try:
                parsed = datetime.fromisoformat(target_date_str)
                sh, sm = 10, 0
                if slot_record:
                    st = parse_time_str(slot_record.start_time)
                    if st:
                        sh, sm = st.hour, st.minute
                booked_dt = parsed.replace(hour=sh, minute=sm, second=0)
            except Exception:
                pass

        if booked_dt.date() < date.today() or (slot_record and is_slot_expired(booked_dt.date(), slot_record.end_time)):
            err_msg = (
                "यह स्लॉट समाप्त हो चुका है। कृपया नया स्लॉट चुनें।" if lang == "hi" else
                "Yeh slot expire ho chuka hai. Please naya slot select karein." if lang == "hinglish" else
                "This slot has already expired. Please choose an upcoming time slot."
            )
            return {**state, "status": "expired", "message": err_msg, "speech_text": err_msg, "card": None}

        ahead_count = await db.scalar(
            select(func.count(Booking.id)).where(
                Booking.procurement_center_id == center_id,
                func.date(Booking.booked_at) == booked_dt.date(),
                Booking.status.in_(["Waiting", "Confirmed"])
            )
        ) or 0

        ml_pred = predict_queue_wait_time(
            center_name=center_name,
            daily_capacity=center.daily_capacity if center else 2000,
            slot_time=staged.get("slot_time", "10:00 AM - 11:00 AM"),
            booking_date=target_date_str,
            produce=staged.get("produce", "Wheat"),
            quantity_kg=quantity_kg,
            farmers_ahead=ahead_count
        )
        est_wait = ml_pred.get("estimated_wait_minutes", 15)

        new_booking = Booking(
            farmer_id=user_id,
            procurement_center_id=center_id,
            status="Confirmed",
            produce=staged["produce"],
            quantity_kg=quantity_kg,
            total_price=total_price,
            slot_id=slot_id,
            produce_type=staged.get("produce_type", "Standard Grade"),
            estimated_wait_time=est_wait,
            booked_at=booked_dt,
            token_number=token_number,
        )
        db.add(new_booking)
        await db.commit()
        await db.refresh(new_booking)

        formatted_tok = format_token(center_name, new_booking.token_number)
        staged_result = {
            **staged,
            "formatted_token": formatted_tok,
            "token_number": new_booking.token_number,
            "estimated_wait_time": est_wait,
        }
        speech = AgentNLU.generate_multilingual_response("farmer_book_slot", lang, staged_result, is_success=True)

        card = {
            "card_type": "token_status",
            "title": "Booking Confirmed",
            "token": formatted_tok,
            "center_name": center_name,
            "date": staged["formatted_date"],
            "slot_time": staged["slot_time"],
            "produce": f"{quantity_kg:,} kg {staged['produce']}",
            "estimated_wait": f"~{est_wait} mins",
            "status": "Confirmed",
        }
        return {**state, "status": "confirmed", "message": speech, "speech_text": speech, "card": card}

    elif action_type == "cancel_slot":
        booking_id = staged["booking_id"]
        booking = await db.scalar(select(Booking).where(Booking.id == booking_id, Booking.farmer_id == user_id))
        if not booking:
            msg = "Booking not found"
            return {**state, "status": "error", "message": msg, "speech_text": msg, "card": None}

        booking.status = "Cancelled"
        await db.commit()

        speech = AgentNLU.generate_multilingual_response("farmer_cancel_slot", lang, staged, is_success=True)
        card = {
            "card_type": "status_badge",
            "title": "Booking Cancelled",
            "token": staged["formatted_token"],
            "message": "Your slot has been cancelled.",
            "status": "Cancelled"
        }
        return {**state, "status": "confirmed", "message": speech, "speech_text": speech, "card": card}

    elif action_type == "serve_next_farmer":
        booking_id = staged["booking_id"]
        staff_id = staged["staff_id"]

        booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
        if not booking:
            msg = "Booking not found"
            return {**state, "status": "error", "message": msg, "speech_text": msg, "card": None}

        staff = await db.scalar(select(Staff).where(Staff.id == staff_id))
        center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staged["center_id"]))
        center_name = center.name if center else "Centre"
        counter_name = staff.counter_number if staff and staff.counter_number else "Counter 1"

        booking.status = "Serving"
        booking.served_by = staff_id
        await db.commit()

        formatted_tok = staged.get("token", f"T-{booking.token_number}")
        p_sub = await db.scalar(select(PushSubscription).where(PushSubscription.user_id == booking.farmer_id))
        if p_sub:
            await send_push_notification(
                p_sub,
                title="It's Your Turn! 🌾",
                body=f"Token {formatted_tok}: Please proceed immediately to {counter_name} at {center_name}."
            )

        data = {"now_serving": formatted_tok, "center_name": center_name}
        speech = AgentNLU.generate_multilingual_response("staff_serve_next", lang, data, is_success=True)
        card = {
            "card_type": "status_badge",
            "title": "Calling to Counter",
            "token": formatted_tok,
            "status": "Serving",
            "message": f"Farmer notified to report to {counter_name}."
        }
        return {**state, "status": "confirmed", "message": speech, "speech_text": speech, "card": card}

    return {**state, "status": "error", "message": "Unknown action type"}

# ── 10. Rejection Tool ────────────────────────────────────────────────────────
def tool_handle_rejection(state: Dict[str, Any]) -> Dict[str, Any]:
    staged = state.get("staged_action") or {}
    act_lang = state.get("language") or staged.get("lang", "en")
    speech = (
        "कार्रवाई रद्द कर दी गई। कोई बदलाव नहीं किया गया।" if act_lang == "hi" else
        "Action cancel kar diya gaya. Koi changes nahi kiye gaye." if act_lang == "hinglish" else
        "Action cancelled. No changes were made to your account."
    )
    return {**state, "status": "cancelled", "message": speech, "speech_text": speech, "card": None}

# ── 11. Conversational / General QA Tool ──────────────────────────────────────
def tool_general_qa(state: Dict[str, Any]) -> Dict[str, Any]:
    intent = state.get("intent", "general_qa")
    lang = state.get("language", "en")
    llm_reply = state.get("llm_reply")

    # Anti-hallucination sanitization: discard responses containing fabricated 1800 numbers
    if llm_reply and ("1800" in llm_reply or "1800-" in llm_reply):
        llm_reply = None

    if intent == "greeting":
        speech = llm_reply or (
            "नमस्ते! मैं एग्रीक्यू सहायक हूँ। मैं स्लॉट बुकिंग, टोकन स्थिति, या कतार प्रबंधन में आपकी मदद कर सकता हूँ।"
            if lang == "hi" else
            "Namaste! Main AgriQueue Assistant hoon. Aap slot booking, token check karne, ya queue status janne ke liye bol sakte hain."
            if lang == "hinglish" else
            "Hello! I am your AgriQueue AI Assistant. How can I help you manage slots, check tokens, or track the queue today?"
        )
    elif intent == "help":
        speech = llm_reply or (
            "आप बोल सकते हैं: 'कल 10 बजे का स्लॉट बुक करो', 'मेरा टोकन नंबर क्या है?', 'पेमेंट स्टेटस बताओ', या 'स्लॉट रद्द करो'।"
            if lang == "hi" else
            "Aap pooch sakte hain: 'Mera token kya hai?', 'Kal 10 baje slot book karo', 'Payment status batao', ya staff hain toh 'Next farmer ko bulao'."
            if lang == "hinglish" else
            "Try commands like: 'Book a slot for tomorrow at 10 AM', 'What is my token number?', 'Show my payment status', or 'How many farmers are waiting?'."
        )
    elif intent == "general_qa":
        speech = llm_reply or (
            "कृषि न्यूनतम समर्थन मूल्य (MSP), स्लॉट समय और केंद्र नियमों की जानकारी के लिए आप सीधे पूछ सकते हैं।"
            if lang == "hi" else
            "Fasal MSP rate, slot timings, ya centers ke baare me poochne ke liye sawal pooch sakte hain."
            if lang == "hinglish" else
            "I can answer questions regarding crop MSP support prices, operational slot timings, quality guidelines, or government mandi procedures."
        )
    else:
        speech = llm_reply or (
            "माफ़ कीजिये, मैं इस कमांड को पूरी तरह समझ नहीं पाया। आप स्लॉट बुक करने, टोकन देखने या कतार की स्थिति जानने के लिए कह सकते हैं।"
            if lang == "hi" else
            "Maaf kijiye, main yeh command samajh nahi paya. Aap slot book karne, token check karne ya queue dekhne ke liye keh sakte hain."
            if lang == "hinglish" else
            "I did not quite understand that command. You can ask to book a slot, check your token, track queue position, or view payment status."
        )

    return {
        **state,
        "status": "success",
        "message": speech,
        "speech_text": speech,
        "card": None,
    }
