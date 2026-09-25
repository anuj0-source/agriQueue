from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Union
from pydantic import BaseModel
from datetime import datetime, date
import asyncio
import json
from database import get_db, AsyncSessionLocal
from isAuthenticated import isAuthenticated
from models.staff import Staff
from models.booking import Booking
from models.procurement_center import ProcurementCenter
from models.farmer import Farmer
from models.push_subscription import PushSubscription
from models.procurement import ProcurementRecord
from models.payment import Payment
from models.payment_profile import PaymentProfile
from models.slot import Slot
from payment_utils import create_or_update_payment, mask_destination, payment_status_label
from routes.notifications import send_push_notification
from time_utils import parse_time_str

router = APIRouter(
    prefix="/staff",
    tags=["staff"]
)

SLOT_TIME_MAP = {
    1: "09:00 AM - 10:00 AM",
    2: "10:00 AM - 11:00 AM",
    3: "11:00 AM - 12:00 PM",
    4: "12:00 PM - 01:00 PM",
    5: "01:00 PM - 02:00 PM",
}


def get_staff_from_token(access_token: Optional[str]) -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "staff":
        raise HTTPException(status_code=403, detail="Staff access required")
    return payload


def format_token(center_name: str, token_num: int) -> str:
    parts = center_name.split()
    prefix = parts[-1][0].upper() if parts else "A"
    return f"{prefix}-{token_num:03d}"


def format_currency(value):
    if value >= 10_000_000:
        return f"₹{value / 10_000_000:.1f} Cr"
    elif value >= 100_000:
        return f"₹{value / 100_000:.1f} Lakh"
    else:
        return f"₹{value:,}"


# ── GET /staff/me ──────────────────────────────────────────────────────────────
@router.get("/me")
async def get_staff_me(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]
    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    return {
        "id": staff.id,
        "full_name": staff.full_name,
        "mobile_number": staff.mobile_number,
        "staff_id": staff.staff_id or f"ST-{staff.id:04d}",
        "center_id": staff.center_id,
        "center_name": center.name if center else "Unknown Center",
        "center_address": center.address if center else "",
        "created_at": staff.created_at.strftime("%d %b %Y") if staff.created_at else "",
        "role": "staff",
    }


# ── GET /staff/dashboard ───────────────────────────────────────────────────────
@router.get("/dashboard")
async def get_staff_dashboard(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    today = date.today()

    # Today's bookings for this center
    today_bookings = (await db.scalars(
        select(Booking).where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
    )).all()

    total_farmers = len(today_bookings)
    completed = sum(1 for b in today_bookings if b.status == "Completed")
    waiting = sum(1 for b in today_bookings if b.status in ["Confirmed", "Waiting"])
    serving = sum(1 for b in today_bookings if b.status == "Serving")
    cancelled = sum(1 for b in today_bookings if b.status == "Cancelled")

    today_qty = sum(b.quantity_kg for b in today_bookings if b.status != "Cancelled")
    pending_payments = sum(
        b.total_price for b in today_bookings if b.status in ["Confirmed", "Waiting", "Serving"]
    )

    # Average wait time (use estimated_wait_time)
    avg_wait_vals = [b.estimated_wait_time for b in today_bookings if b.estimated_wait_time]
    avg_wait = int(sum(avg_wait_vals) / len(avg_wait_vals)) if avg_wait_vals else 17

    # Current token being served
    serving_booking = next(
        (b for b in sorted(today_bookings, key=lambda x: x.token_number)
         if b.status in ["Serving", "Confirmed", "Waiting"]),
        None
    )
    current_token = format_token(center.name, serving_booking.token_number) if serving_booking else "-"

    # Top produce breakdown
    produce_counts: dict = {}
    for b in today_bookings:
        if b.status != "Cancelled":
            produce_counts[b.produce] = produce_counts.get(b.produce, 0) + b.quantity_kg
    total_produce_kg = sum(produce_counts.values()) or 1
    top_produce = [
        {"name": k, "percent": round((v / total_produce_kg) * 100)}
        for k, v in sorted(produce_counts.items(), key=lambda x: -x[1])
    ]

    # Farmers per day of week for chart (last 7 days)
    from sqlalchemy import extract
    weekly_stats = await db.execute(
        select(extract('dow', Booking.booked_at), func.count(Booking.id))
        .where(Booking.procurement_center_id == staff.center_id)
        .group_by(extract('dow', Booking.booked_at))
        .order_by(extract('dow', Booking.booked_at))
    )
    day_names = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
    farmers_chart = [{"day": day_names.get(int(d), "?"), "count": c} for d, c in weekly_stats]
    if not farmers_chart:
        farmers_chart = [{"day": d, "count": 0} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]

    return {
        "staff": {
            "full_name": staff.full_name,
            "staff_id": staff.staff_id or f"ST-{staff.id:04d}",
            "center_name": center.name,
        },
        "metrics": {
            "total_farmers": total_farmers,
            "completed": completed,
            "waiting": waiting + serving,
            "cancelled": cancelled,
            "current_token": current_token,
            "avg_wait_min": avg_wait,
            "today_qty_tons": round(today_qty / 1000, 1),
            "pending_payments": format_currency(pending_payments),
        },
        "top_produce": top_produce,
        "farmers_chart": farmers_chart,
    }


# ── Helper: Build Staff Queue Payload ──────────────────────────────────────────
async def _build_staff_queue_payload(staff_user_id: int, db: AsyncSession) -> dict:
    staff = await db.scalar(select(Staff).where(Staff.id == staff_user_id))
    if not staff:
        return None

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    today = date.today()

    bookings = (await db.scalars(
        select(Booking)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
        .order_by(Booking.token_number.asc())
    )).all()

    # Fetch all staff at this center to map staff names to counters
    center_staff_list = (await db.scalars(
        select(Staff).where(Staff.center_id == staff.center_id)
    )).all()
    staff_map = {s.id: s.full_name for s in center_staff_list}

    prefix = center.name.split()[-1][0].upper() if center else "A"

    # 1. This staff member's currently serving booking
    my_serving = next(
        (b for b in bookings if b.status == "Serving" and b.served_by_staff_id == staff.id),
        None
    )

    # 2. All serving bookings at this center (active counters)
    all_serving = [b for b in bookings if b.status == "Serving"]

    # 3. Waiting bookings (unassigned, available for ANY available staff to call)
    waiting_bookings = sorted(
        [b for b in bookings if b.status in ["Confirmed", "Waiting"]],
        key=lambda x: x.token_number
    )
    next_booking = waiting_bookings[0] if waiting_bookings else None

    # 4. Completed bookings today
    completed_bookings = [b for b in bookings if b.status == "Completed"]

    queue_list = []
    for b in bookings:
        tok = f"{prefix}-{b.token_number:03d}"
        queue_list.append({
            "id": b.id,
            "token": tok,
            "token_number": b.token_number,
            "status": b.status,
            "farmer_id": b.farmer_id,
            "produce": b.produce,
            "quantity_kg": b.quantity_kg,
            "total_price": b.total_price,
            "produce_type": b.produce_type,
            "served_by_staff_id": b.served_by_staff_id,
            "served_by_name": staff_map.get(b.served_by_staff_id) if b.served_by_staff_id else None,
            "is_my_counter": b.served_by_staff_id == staff.id,
        })

    active_counters = []
    for b in all_serving:
        active_counters.append({
            "booking_id": b.id,
            "token": f"{prefix}-{b.token_number:03d}",
            "token_number": b.token_number,
            "produce": b.produce,
            "quantity_kg": b.quantity_kg,
            "staff_id": b.served_by_staff_id,
            "staff_name": staff_map.get(b.served_by_staff_id) or "Staff",
            "is_you": b.served_by_staff_id == staff.id,
        })

    return {
        "center_name": center.name if center else "Center",
        "staff_id": staff.id,
        "staff_name": staff.full_name,
        # This staff member's currently active counter:
        "current_token": f"{prefix}-{my_serving.token_number:03d}" if my_serving else None,
        "current_booking_id": my_serving.id if my_serving else None,
        "current_produce": my_serving.produce if my_serving else None,
        "current_quantity_kg": my_serving.quantity_kg if my_serving else None,
        # Next token waiting in line to be called:
        "next_token": f"{prefix}-{next_booking.token_number:03d}" if next_booking else None,
        "next_booking_id": next_booking.id if next_booking else None,
        "next_produce": next_booking.produce if next_booking else None,
        "active_counters": active_counters,
        "queue": queue_list,
        "total_today": len(bookings),
        "waiting_count": len(waiting_bookings),
        "serving_count": len(all_serving),
        "completed_count": len(completed_bookings),
    }


# ── GET /staff/queue ───────────────────────────────────────────────────────────
@router.get("/queue")
async def get_staff_queue(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]
    data = await _build_staff_queue_payload(user_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Staff not found")
    return data


# ── POST /staff/queue/call-next ────────────────────────────────────────────────
@router.post("/queue/call-next")
async def call_next_farmer(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    prefix = center.name.split()[-1][0].upper() if center else "A"
    today = date.today()

    # 1. Check if THIS staff member is already serving someone
    my_serving = await db.scalar(
        select(Booking)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today,
            Booking.status == "Serving",
            Booking.served_by_staff_id == staff.id
        )
    )

    # 2. Find next waiting farmer using with_for_update to prevent race conditions between staff
    next_up = await db.scalar(
        select(Booking)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today,
            Booking.status.in_(["Confirmed", "Waiting"])
        )
        .order_by(Booking.token_number.asc())
        .with_for_update()
        .limit(1)
    )

    if not next_up and not my_serving:
        return {"success": False, "message": "No active tokens waiting in queue"}

    if my_serving:
        raise HTTPException(
            status_code=409,
            detail="Complete the active procurement with weight and quality details before calling the next farmer"
        )

    if next_up:
        # ── Slot timing window enforcement ──────────────────────────────────
        slot = await db.scalar(select(Slot).where(Slot.id == next_up.slot_id))
        if slot:
            now_time = datetime.now().time()
            slot_start = parse_time_str(slot.start_time)
            slot_end   = parse_time_str(slot.end_time)

            if slot_start and now_time < slot_start:
                # Current time is before the slot window opens
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Cannot call this farmer yet. Their slot window opens at "
                        f"{slot.start_time}. Please wait until then."
                    )
                )

            if slot_end and now_time >= slot_end:
                # Slot window has already closed
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"This farmer's slot window ({slot.start_time} – {slot.end_time}) "
                        f"has already closed. The booking can no longer be called."
                    )
                )
        # ── End slot window check ────────────────────────────────────────────

        next_up.status = "Serving"
        next_up.served_by_staff_id = staff.id
        await db.commit()

        # Trigger push notification to the called farmer
        try:
            subs = (await db.scalars(select(PushSubscription).where(
                PushSubscription.user_id == next_up.farmer_id,
                PushSubscription.role == "farmer"
            ))).all()
            for sub in subs:
                send_push_notification(sub, {
                    "title": "It's your turn!",
                    "body": f"Token {prefix}-{next_up.token_number:03d} is now being served by {staff.full_name} at {center.name}. Please proceed to the counter.",
                    "icon": "/logo.png",
                    "url": "/live-queue",
                    "type": "alert",
                })
        except Exception as e:
            print(f"[notify] Failed to send call-next push for farmer {next_up.farmer_id}: {e}")

        return {
            "success": True,
            "completed_token": None,
            "now_serving": f"{prefix}-{next_up.token_number:03d}",
            "message": f"Now serving: {prefix}-{next_up.token_number:03d}",
        }

    return {
        "success": False,
        "completed_token": None,
        "now_serving": None,
        "message": "No active tokens waiting in queue",
    }


# ── GET /staff/queue/stream  (SSE) ─────────────────────────────────────────

@router.get("/queue/stream")
async def stream_staff_queue(
    request: Request,
    access_token: Optional[str] = Cookie(default=None)
):
    try:
        payload = get_staff_from_token(access_token)
        staff_user_id = payload["user_id"]
    except HTTPException:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    async with AsyncSessionLocal() as db:
                        data = await _build_staff_queue_payload(staff_user_id, db)
                    if data:
                        yield f"data: {json.dumps(data)}\n\n"
                    else:
                        yield ": keep-alive\n\n"
                except Exception:
                    yield ": keep-alive\n\n"
                await asyncio.sleep(2)
        except (asyncio.CancelledError, GeneratorExit):
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── POST /staff/queue/skip/{booking_id} ────────────────────────────────────────
@router.post("/queue/skip/{booking_id}")
async def skip_token(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    booking = await db.scalar(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.procurement_center_id == staff.center_id
        )
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "Cancelled"
    await db.commit()

    return {"success": True, "message": f"Token skipped/cancelled for booking {booking_id}"}


# ── GET /staff/procurement ─────────────────────────────────────────────────────
@router.get("/procurement")
async def get_staff_procurement(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    today = date.today()
    rows = (await db.execute(
        select(Booking, Farmer, ProcurementRecord, Staff, Payment)
        .join(Farmer, Booking.farmer_id == Farmer.id)
        .outerjoin(ProcurementRecord, ProcurementRecord.booking_id == Booking.id)
        .outerjoin(Staff, Staff.id == ProcurementRecord.verified_by_staff_id)
        .outerjoin(Payment, Payment.booking_id == Booking.id)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
        .order_by(desc(Booking.booked_at))
    )).all()

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    prefix = center.name.split()[-1][0].upper() if center else "A"

    result = []
    for b, f, procurement, verifier, payment in rows:
        result.append({
            "id": b.id,
            "token": f"{prefix}-{b.token_number:03d}",
            "farmer_name": f.full_name,
            "farmer_id": f.farmer_id or f"FK{100000 + f.id}",
            "produce": b.produce,
            "produce_type": b.produce_type or "Standard Grade",
            "quantity_kg": b.quantity_kg,
            "total_price": b.total_price,
            "status": b.status,
            "slot_time": SLOT_TIME_MAP.get(b.slot_id, "10:00 AM - 11:00 AM"),
            "date": b.booked_at.strftime("%d %b %Y"),
            "actual_weight_kg": procurement.actual_weight_kg if procurement else None,
            "deductions_kg": procurement.deductions_kg if procurement else 0,
            "net_weight_kg": procurement.net_weight_kg if procurement else None,
            "moisture_percent": procurement.moisture_percent if procurement else None,
            "impurity_percent": procurement.impurity_percent if procurement else None,
            "rate_per_kg": procurement.rate_per_kg if procurement else None,
            "quality_notes": procurement.notes if procurement else None,
            "completed_at": procurement.completed_at.strftime("%d %b %Y, %I:%M %p") if procurement else None,
            "verified_by_name": verifier.full_name if verifier else None,
            "payment_id": payment.id if payment else None,
            "payment_status": payment_status_label(payment) if payment else None,
            "receipt_number": payment.receipt_number if payment else None,
        })
    return result


# ── PUT /staff/procurement/{booking_id} ───────────────────────────────────────
@router.put("/procurement/{booking_id}")
async def update_procurement(
    booking_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    booking = await db.scalar(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.procurement_center_id == staff.center_id
        )
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_status = booking.status
    requested_status = data.get("status", booking.status)
    allowed_statuses = {"Confirmed", "Waiting", "Serving", "Completed", "Cancelled"}
    if requested_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid procurement status")

    def read_non_negative_int(name: str, default: int = 0) -> int:
        raw_value = data.get(name, default)
        if raw_value is None or raw_value == "":
            return default
        try:
            value = int(float(raw_value))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"{name.replace('_', ' ')} must be a whole number")
        if value < 0:
            raise HTTPException(status_code=400, detail=f"{name.replace('_', ' ')} cannot be negative")
        return value

    def read_percentage(name: str, default: float = 0) -> float:
        raw_value = data.get(name, default)
        if raw_value is None or raw_value == "":
            return default
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"{name.replace('_', ' ')} must be a number")
        if value < 0 or value > 100:
            raise HTTPException(status_code=400, detail=f"{name.replace('_', ' ')} must be between 0 and 100")
        return round(value, 2)

    procurement = await db.scalar(
        select(ProcurementRecord).where(ProcurementRecord.booking_id == booking.id)
    )

    # Completed procurements are calculated from the verified, accepted weight.
    # The amount is intentionally calculated server-side to keep the receipt,
    # payment instruction, and procurement record in agreement.
    if requested_status == "Completed":
        actual_weight = read_non_negative_int(
            "actual_weight_kg",
            procurement.actual_weight_kg if procurement else booking.quantity_kg,
        )
        deductions = read_non_negative_int(
            "deductions_kg",
            procurement.deductions_kg if procurement else 0,
        )
        moisture = read_percentage(
            "moisture_percent",
            procurement.moisture_percent if procurement else 0,
        )
        impurity = read_percentage(
            "impurity_percent",
            procurement.impurity_percent if procurement else 0,
        )
        default_rate = (
            procurement.rate_per_kg if procurement else
            round(booking.total_price / booking.quantity_kg) if booking.quantity_kg else 0
        )
        rate_per_kg = read_non_negative_int("rate_per_kg", default_rate)
        quality_grade = (data.get("quality_grade") or data.get("produce_type") or
                         (procurement.quality_grade if procurement else booking.produce_type) or "Standard Grade").strip()

        if actual_weight <= 0:
            raise HTTPException(status_code=400, detail="Actual weight must be greater than zero")
        if deductions > actual_weight:
            raise HTTPException(status_code=400, detail="Deductions cannot exceed actual weight")
        if rate_per_kg <= 0:
            raise HTTPException(status_code=400, detail="Final rate per kg must be greater than zero")

        net_weight = actual_weight - deductions
        net_payable = net_weight * rate_per_kg
        notes = (data.get("quality_notes") or data.get("notes") or "").strip() or None

        if not procurement:
            procurement = ProcurementRecord(
                booking_id=booking.id,
                actual_weight_kg=actual_weight,
                deductions_kg=deductions,
                net_weight_kg=net_weight,
                quality_grade=quality_grade,
                moisture_percent=moisture,
                impurity_percent=impurity,
                rate_per_kg=rate_per_kg,
                net_payable=net_payable,
                notes=notes,
                verified_by_staff_id=staff.id,
                completed_at=datetime.now(),
            )
            db.add(procurement)
        else:
            procurement.actual_weight_kg = actual_weight
            procurement.deductions_kg = deductions
            procurement.net_weight_kg = net_weight
            procurement.quality_grade = quality_grade
            procurement.moisture_percent = moisture
            procurement.impurity_percent = impurity
            procurement.rate_per_kg = rate_per_kg
            procurement.net_payable = net_payable
            procurement.notes = notes
            procurement.verified_by_staff_id = staff.id
            procurement.completed_at = datetime.now()

        auto_credit = bool(data.get("auto_credit", True))
        payment_status = "Credited" if auto_credit else "Scheduled"
        tx_ref = f"DBT-{booking.id:05d}-{int(datetime.now().timestamp())}" if auto_credit else None
        batch_ref = f"AUTO-DBT-{date.today().strftime('%d%b').upper()}" if auto_credit else None

        booking.quantity_kg = net_weight
        booking.total_price = net_payable
        booking.produce_type = quality_grade
        booking.status = "Completed"
        payment = await create_or_update_payment(
            db,
            booking_id=booking.id,
            farmer_id=booking.farmer_id,
            center_id=booking.procurement_center_id,
            amount=net_payable,
            status=payment_status,
            transaction_reference=tx_ref,
            payment_batch=batch_ref,
        )
    else:
        # Retain lightweight editing for bookings that have not been verified yet.
        if "quantity_kg" in data:
            quantity = read_non_negative_int("quantity_kg")
            if quantity <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
            booking.quantity_kg = quantity
        if "produce_type" in data:
            booking.produce_type = str(data["produce_type"]).strip() or booking.produce_type
        if "total_price" in data:
            total_price = read_non_negative_int("total_price")
            if total_price <= 0:
                raise HTTPException(status_code=400, detail="Total price must be greater than zero")
            booking.total_price = total_price
        booking.status = requested_status

    await db.commit()

    # ── Notify farmer when procurement is marked Completed ──────────────────
    if requested_status == "Completed" and old_status != "Completed":
        try:
            farmer = await db.scalar(select(Farmer).where(Farmer.id == booking.farmer_id))
            center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == booking.procurement_center_id))
            # Filter by role="farmer" to avoid sending to staff subscriptions
            subs = (await db.scalars(
                select(PushSubscription).where(
                    PushSubscription.user_id == booking.farmer_id,
                    PushSubscription.role == "farmer",
                )
            )).all()

            if not subs:
                print(f"[notify] No push subscriptions found for farmer {booking.farmer_id} — skipping push")
            else:
                prefix = center.name.split()[-1][0].upper() if center and center.name else "A"
                token_label = f"{prefix}-{booking.token_number:03d}" if booking.token_number else str(booking.id)
                produce_label = booking.produce or "produce"
                qty = procurement.net_weight_kg if procurement else booking.quantity_kg or 0
                amount = booking.total_price or 0
                center_name = center.name if center else "the center"
                farmer_name = farmer.full_name if farmer else "Farmer"
                # Guard: expected_settlement_date may be None on edge cases
                settle_dt = getattr(payment, "expected_settlement_date", None)
                settlement_date = settle_dt.strftime("%d %b") if settle_dt else "soon"

                if auto_credit:
                    notif_payload = {
                        "title": "💰 Payment Credited!",
                        "body": (
                            f"Hi {farmer_name}, procurement for token {token_label} "
                            f"({qty} kg of {produce_label}) is complete. "
                            f"₹{amount:,} has been credited to your account! Ref: {tx_ref}."
                        ),
                        "icon": "/logo.png",
                        "badge": "/logo.png",
                        "url": "/payments",
                        "type": "payment",
                    }
                else:
                    notif_payload = {
                        "title": "✅ Procurement Complete!",
                        "body": (
                            f"Hi {farmer_name}, your procurement for token {token_label} "
                            f"({qty} kg of {produce_label}) has been completed at {center_name}. "
                            f"Total: ₹{amount:,}; settlement is expected by {settlement_date}."
                        ),
                        "icon": "/logo.png",
                        "badge": "/logo.png",
                        "url": "/payments",
                        "type": "success",
                    }

                sent = 0
                for sub in subs:
                    if send_push_notification(sub, notif_payload):
                        sent += 1
                print(f"[notify] Procurement-complete push sent to {sent}/{len(subs)} device(s) for farmer {booking.farmer_id}")
        except Exception as notify_err:
            print(f"[notify] Failed to push procurement-complete notification for booking {booking_id}: {notify_err}")

    return {
        "success": True,
        "message": f"Procurement verified & ₹{booking.total_price:,} credited immediately" if auto_credit else "Procurement verified and payment scheduled",
        "net_payable": booking.total_price,
        "payment_id": payment.id if requested_status == "Completed" else None,
        "receipt_number": payment.receipt_number if requested_status == "Completed" else None,
        "payment_status": payment.status if requested_status == "Completed" else None,
    }



# ── GET /staff/payments ────────────────────────────────────────────────────────
@router.get("/payments")
async def get_staff_payments(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    rows = (await db.execute(
        select(Payment, Booking, Farmer, PaymentProfile)
        .join(Booking, Payment.booking_id == Booking.id)
        .join(Farmer, Payment.farmer_id == Farmer.id)
        .outerjoin(PaymentProfile, PaymentProfile.farmer_id == Farmer.id)
        .where(Payment.procurement_center_id == staff.center_id)
        .order_by(desc(Payment.updated_at))
        .limit(50)
    )).all()

    total_disbursed = sum(p.amount for p, _, _, _ in rows if p.status == "Credited")
    pending_total = sum(
        p.amount for p, _, _, _ in rows
        if payment_status_label(p) in {"Scheduled", "Processing", "On Hold"}
    )

    transactions = []
    for payment, booking, farmer, profile in rows:
        status = payment_status_label(payment)
        transactions.append({
            "payment_id": payment.id,
            "id": f"PAY-{payment.id:05d}",
            "receipt_number": payment.receipt_number,
            "farmer_name": farmer.full_name,
            "farmer_id": farmer.farmer_id or f"FK{100000 + farmer.id}",
            "produce": booking.produce,
            "quantity_kg": booking.quantity_kg,
            "amount": payment.amount,
            "status": status,
            "date": booking.booked_at.strftime("%d %b %Y"),
            "expected_settlement_date": payment.expected_settlement_date.strftime("%d %b %Y"),
            "expected_settlement_iso": payment.expected_settlement_date.date().isoformat(),
            "settled_at": payment.settled_at.strftime("%d %b %Y") if payment.settled_at else None,
            "payment_batch": payment.payment_batch,
            "transaction_reference": payment.transaction_reference,
            "dispute_status": payment.dispute_status,
            "dispute_reason": payment.dispute_reason,
            "dispute_resolution": payment.dispute_resolution,
            "payment_destination": mask_destination(profile.method, profile.destination_last4, profile.ifsc) if profile else "Not configured",
        })

    return {
        "summary": {
            "total_disbursed": format_currency(total_disbursed),
            "pending_total": format_currency(pending_total),
            "completed_count": sum(1 for p, _, _, _ in rows if p.status == "Credited"),
            "pending_count": sum(1 for p, _, _, _ in rows if payment_status_label(p) in {"Scheduled", "Processing", "On Hold"}),
        },
        "transactions": transactions,
    }


# ── PUT /staff/payments/{payment_id} ──────────────────────────────────────────
@router.put("/payments/{payment_id}")
async def update_staff_payment(
    payment_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    staff = await db.scalar(select(Staff).where(Staff.id == payload["user_id"]))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    payment = await db.scalar(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.procurement_center_id == staff.center_id,
        )
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    old_status = payment.status
    requested_status = data.get("status", payment.status)
    allowed_statuses = {"Scheduled", "Processing", "On Hold", "Credited", "Failed"}
    if requested_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    if "payment_batch" in data:
        payment.payment_batch = str(data["payment_batch"]).strip() or None
    if "transaction_reference" in data:
        payment.transaction_reference = str(data["transaction_reference"]).strip() or None
    if "expected_settlement_date" in data and data["expected_settlement_date"]:
        try:
            payment.expected_settlement_date = datetime.fromisoformat(
                str(data["expected_settlement_date"]).replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=400, detail="Expected settlement date must be a valid ISO date")
    if "dispute_resolution" in data and str(data["dispute_resolution"]).strip():
        if payment.dispute_status != "Open":
            raise HTTPException(status_code=400, detail="There is no open dispute to resolve")
        payment.dispute_resolution = str(data["dispute_resolution"]).strip()
        payment.dispute_status = "Resolved"

    if payment.dispute_status == "Open" and requested_status == "Credited":
        raise HTTPException(status_code=409, detail="Resolve the open dispute before crediting this payment")

    payment.status = requested_status
    if requested_status == "Credited" and not payment.settled_at:
        payment.settled_at = datetime.now()
    elif requested_status != "Credited":
        payment.settled_at = None

    await db.commit()

    if requested_status == "Credited" and old_status != "Credited":
        try:
            farmer = await db.scalar(select(Farmer).where(Farmer.id == payment.farmer_id))
            subs = (await db.scalars(select(PushSubscription).where(
                PushSubscription.user_id == payment.farmer_id,
                PushSubscription.role == "farmer",
            ))).all()
            for sub in subs:
                send_push_notification(sub, {
                    "title": "Payment credited",
                    "body": f"₹{payment.amount:,} has been credited for {farmer.full_name if farmer else 'your'} procurement. Ref: {payment.transaction_reference or payment.receipt_number}.",
                    "icon": "/logo.png",
                })
        except Exception as notify_err:
            print(f"[notify] Failed to send payment notification: {notify_err}")

    return {
        "success": True,
        "message": "Payment settlement updated",
        "status": payment_status_label(payment),
    }


# ── POST /staff/payments/batch-settle ─────────────────────────────────────────
class BatchSettlePayload(BaseModel):
    payment_ids: List[Union[int, str]]
    payment_batch: Optional[str] = None
    transaction_reference: Optional[str] = None
    status: str = "Credited"


@router.post("/payments/batch-settle")
async def batch_settle_payments(
    data: BatchSettlePayload,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    staff = await db.scalar(select(Staff).where(Staff.id == payload["user_id"]))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if not data.payment_ids:
        raise HTTPException(status_code=400, detail="No payments selected for settlement")

    parsed_ids = []
    for raw_id in data.payment_ids:
        if isinstance(raw_id, int):
            parsed_ids.append(raw_id)
        elif isinstance(raw_id, str):
            cleaned = raw_id.upper().replace("PAY-", "").lstrip("0")
            if cleaned.isdigit():
                parsed_ids.append(int(cleaned))
            elif raw_id.isdigit():
                parsed_ids.append(int(raw_id))

    if not parsed_ids:
        raise HTTPException(status_code=400, detail="Invalid payment IDs provided")

    query = (
        select(Payment, Booking, Farmer)
        .join(Booking, Payment.booking_id == Booking.id)
        .join(Farmer, Payment.farmer_id == Farmer.id)
        .where(
            Payment.id.in_(parsed_ids),
            Payment.procurement_center_id == staff.center_id,
        )
    )
    rows = (await db.execute(query)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No matching payments found for this center")

    batch_id = (data.payment_batch or "").strip() or f"DBT-{datetime.now().strftime('%Y%m%d')}-B1"
    base_ref = (data.transaction_reference or "").strip() or f"DBT/{datetime.now().strftime('%Y%m%d')}"
    target_status = data.status if data.status in {"Credited", "Processing", "Scheduled", "On Hold", "Failed"} else "Credited"

    now = datetime.now()
    settled_farmers = []
    total_amount = 0

    for payment, booking, farmer in rows:
        if payment.dispute_status == "Open" and target_status == "Credited":
            continue  # Skip disputed payments from auto-credit
        payment.status = target_status
        payment.payment_batch = batch_id
        payment.transaction_reference = f"{base_ref}-{payment.id:04d}" if not (data.transaction_reference and len(data.payment_ids) == 1) else data.transaction_reference
        if target_status == "Credited":
            payment.settled_at = now
            total_amount += payment.amount
            settled_farmers.append((payment, farmer))
        else:
            payment.settled_at = None

    await db.commit()

    # Bulk push notifications to farmers
    if target_status == "Credited":
        for payment, farmer in settled_farmers:
            try:
                subs = (await db.scalars(
                    select(PushSubscription).where(
                        PushSubscription.user_id == farmer.id,
                        PushSubscription.role == "farmer",
                    )
                )).all()
                for sub in subs:
                    send_push_notification(sub, {
                        "title": "💰 Payment Credited",
                        "body": f"₹{payment.amount:,} has been credited for your procurement. Batch: {batch_id}, Ref: {payment.transaction_reference}.",
                        "icon": "/logo.png",
                    })
            except Exception as e:
                print(f"[notify] Batch push error for farmer {farmer.id}: {e}")

    return {
        "success": True,
        "message": f"Successfully disbursed {len(settled_farmers)} payments (Total ₹{total_amount:,})",
        "settled_count": len(settled_farmers),
        "total_amount": total_amount,
        "batch_id": batch_id,
    }


# ── GET /staff/profile ─────────────────────────────────────────────────────────
@router.get("/profile")
async def get_staff_profile(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    staff = await db.scalar(select(Staff).where(Staff.id == user_id))
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))

    today = date.today()
    today_completed = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today,
            Booking.status == "Completed"
        )
    ) or 0

    return {
        "id": staff.id,
        "full_name": staff.full_name,
        "mobile_number": staff.mobile_number,
        "staff_id": staff.staff_id or f"ST-{staff.id:04d}",
        "center_id": staff.center_id,
        "center_name": center.name if center else "Unknown Center",
        "center_address": center.address if center else "",
        "center_district": center.district if center else "",
        "center_state": center.state if center else "",
        "created_at": staff.created_at.strftime("%d %b %Y") if staff.created_at else "",
        "today_completed": today_completed,
        "role": "Procurement Staff",
    }
