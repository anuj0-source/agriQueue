from fastapi import APIRouter, Depends, HTTPException, Cookie, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
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
from routes.notifications import send_push_notification

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


# ── GET /staff/queue ───────────────────────────────────────────────────────────
@router.get("/queue")
async def get_staff_queue(
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
    bookings = (await db.scalars(
        select(Booking)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
        .order_by(Booking.token_number.asc())
    )).all()

    prefix = center.name.split()[-1][0].upper() if center else "A"

    # "Serving" booking = the one explicitly set to Serving status by call-next.
    # "next" = first Confirmed/Waiting booking after the serving one.
    serving_booking = next((b for b in bookings if b.status == "Serving"), None)
    waiting_bookings = sorted(
        [b for b in bookings if b.status in ["Confirmed", "Waiting"]],
        key=lambda x: x.token_number
    )
    next_booking = waiting_bookings[0] if waiting_bookings else None

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
        })

    return {
        "center_name": center.name if center else "Center",
        "current_token": f"{prefix}-{serving_booking.token_number:03d}" if serving_booking else "-",
        "current_booking_id": serving_booking.id if serving_booking else None,
        "next_token": f"{prefix}-{next_booking.token_number:03d}" if next_booking else "-",
        "next_booking_id": next_booking.id if next_booking else None,
        "queue": queue_list,
        "total_today": len(bookings),
        "waiting_count": len(waiting_bookings),
    }


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

    today = date.today()
    bookings = (await db.scalars(
        select(Booking)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
        .order_by(Booking.token_number.asc())
    )).all()

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    prefix = center.name.split()[-1][0].upper() if center else "A"

    # Find the currently serving booking
    serving = next((b for b in bookings if b.status == "Serving"), None)
    # Find waiting bookings (Confirmed or Waiting), sorted by token
    waiting = sorted(
        [b for b in bookings if b.status in ["Confirmed", "Waiting"]],
        key=lambda x: x.token_number
    )

    if serving is None and not waiting:
        return {"success": False, "message": "No active tokens in queue"}

    if serving is None:
        # No one is being served yet — start serving the first waiting farmer
        next_up = waiting[0]
        next_up.status = "Serving"
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
                    "body": f"Token {prefix}-{next_up.token_number:03d} is now being served at {center.name}. Please proceed to the counter.",
                    "icon": "/logo.png"
                })
        except Exception as e:
            print("Failed to send push notification:", e)
            
        return {
            "success": True,
            "completed_token": None,
            "now_serving": f"{prefix}-{next_up.token_number:03d}",
            "message": f"Now serving: {prefix}-{next_up.token_number:03d}",
        }
    else:
        # Complete the currently serving farmer
        serving.status = "Completed"
        called = None
        if waiting:
            called = waiting[0]
            called.status = "Serving"
        await db.commit()
        
        # Trigger push notification to the called farmer
        if called:
            try:
                subs = (await db.scalars(select(PushSubscription).where(
                    PushSubscription.user_id == called.farmer_id,
                    PushSubscription.role == "farmer"
                ))).all()
                for sub in subs:
                    send_push_notification(sub, {
                        "title": "It's your turn!",
                        "body": f"Token {prefix}-{called.token_number:03d} is now being served at {center.name}. Please proceed to the counter.",
                        "icon": "/logo.png"
                    })
            except Exception as e:
                print("Failed to send push notification:", e)
                
        return {
            "success": True,
            "completed_token": f"{prefix}-{serving.token_number:03d}",
            "now_serving": f"{prefix}-{called.token_number:03d}" if called else "-",
            "message": f"Called next: {prefix}-{called.token_number:03d}" if called else "Queue is now empty",
        }


# ── GET /staff/queue/stream  (SSE) ─────────────────────────────────────────
@router.get("/queue/stream")
async def stream_staff_queue(
    access_token: Optional[str] = Cookie(default=None)
):
    # Resolve staff identity once at connection time
    try:
        payload = get_staff_from_token(access_token)
        staff_user_id = payload["user_id"]
    except HTTPException:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    async def _build_payload(db: AsyncSession) -> dict:
        staff = await db.scalar(select(Staff).where(Staff.id == staff_user_id))
        if not staff:
            return None
        center = await db.scalar(
            select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id)
        )
        today = date.today()
        bookings = (await db.scalars(
            select(Booking)
            .where(
                Booking.procurement_center_id == staff.center_id,
                func.date(Booking.booked_at) == today
            )
            .order_by(Booking.token_number.asc())
        )).all()

        prefix = center.name.split()[-1][0].upper() if center else "A"
        serving_booking = next((b for b in bookings if b.status == "Serving"), None)
        waiting_bookings = sorted(
            [b for b in bookings if b.status in ["Confirmed", "Waiting"]],
            key=lambda x: x.token_number
        )
        next_booking = waiting_bookings[0] if waiting_bookings else None

        queue_list = [
            {
                "id": b.id,
                "token": f"{prefix}-{b.token_number:03d}",
                "token_number": b.token_number,
                "status": b.status,
                "farmer_id": b.farmer_id,
                "produce": b.produce,
                "quantity_kg": b.quantity_kg,
            }
            for b in bookings
        ]

        return {
            "center_name": center.name if center else "Center",
            "current_token": f"{prefix}-{serving_booking.token_number:03d}" if serving_booking else "-",
            "current_booking_id": serving_booking.id if serving_booking else None,
            "next_token": f"{prefix}-{next_booking.token_number:03d}" if next_booking else "-",
            "next_booking_id": next_booking.id if next_booking else None,
            "queue": queue_list,
            "total_today": len(bookings),
            "waiting_count": len(waiting_bookings),
        }

    async def event_generator():
        try:
            while True:
                try:
                    async with AsyncSessionLocal() as db:
                        data = await _build_payload(db)
                    if data:
                        yield f"data: {json.dumps(data)}\n\n"
                    else:
                        yield ": keep-alive\n\n"
                except Exception:
                    yield ": keep-alive\n\n"
                await asyncio.sleep(5)
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
        select(Booking, Farmer)
        .join(Farmer, Booking.farmer_id == Farmer.id)
        .where(
            Booking.procurement_center_id == staff.center_id,
            func.date(Booking.booked_at) == today
        )
        .order_by(desc(Booking.booked_at))
    )).all()

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))
    prefix = center.name.split()[-1][0].upper() if center else "A"

    result = []
    for b, f in rows:
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

    if "quantity_kg" in data:
        booking.quantity_kg = int(data["quantity_kg"])
    if "produce_type" in data:
        booking.produce_type = data["produce_type"]
    if "total_price" in data:
        booking.total_price = int(data["total_price"])
    if "status" in data:
        booking.status = data["status"]

    await db.commit()

    # ── Notify farmer when procurement is marked Completed ──────────────────
    if data.get("status") == "Completed" and old_status != "Completed":
        try:
            farmer = await db.get(Farmer, booking.farmer_id)
            center = await db.get(ProcurementCenter, booking.procurement_center_id)
            subs = (await db.scalars(
                select(PushSubscription).where(PushSubscription.user_id == booking.farmer_id)
            )).all()

            token_label = f"A-{booking.token_number:03d}" if booking.token_number else str(booking.id)
            produce_label = booking.produce or "produce"
            qty = booking.quantity_kg or 0
            amount = booking.total_price or 0
            center_name = center.name if center else "the center"
            farmer_name = farmer.full_name if farmer else "Farmer"

            notif_payload = {
                "title": "✅ Procurement Complete!",
                "body": (
                    f"Hi {farmer_name}, your procurement for token {token_label} "
                    f"({qty} kg of {produce_label}) has been completed at {center_name}. "
                    f"Total: ₹{amount:,}."
                ),
                "icon": "/vite.svg",
                "badge": "/vite.svg",
            }

            for sub in subs:
                send_push_notification(sub, notif_payload)
        except Exception as notify_err:
            print(f"[notify] Failed to push farmer notification: {notify_err}")

    return {"success": True, "message": "Procurement updated"}



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
        select(Booking, Farmer)
        .join(Farmer, Booking.farmer_id == Farmer.id)
        .where(Booking.procurement_center_id == staff.center_id)
        .order_by(desc(Booking.booked_at))
        .limit(50)
    )).all()

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff.center_id))

    total_disbursed = sum(b.total_price for b, _ in rows if b.status == "Completed")
    pending_total = sum(b.total_price for b, _ in rows if b.status in ["Confirmed", "Waiting", "Serving"])

    transactions = []
    for b, f in rows:
        is_paid = b.status == "Completed"
        transactions.append({
            "id": f"TXN-{b.id:05d}",
            "farmer_name": f.full_name,
            "farmer_id": f.farmer_id or f"FK{100000 + f.id}",
            "produce": b.produce,
            "quantity_kg": b.quantity_kg,
            "amount": b.total_price,
            "status": "Credited" if is_paid else ("In Transit" if b.status != "Cancelled" else "Cancelled"),
            "date": b.booked_at.strftime("%d %b %Y"),
        })

    return {
        "summary": {
            "total_disbursed": format_currency(total_disbursed),
            "pending_total": format_currency(pending_total),
            "completed_count": sum(1 for b, _ in rows if b.status == "Completed"),
            "pending_count": sum(1 for b, _ in rows if b.status in ["Confirmed", "Waiting", "Serving"]),
        },
        "transactions": transactions,
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


# ── GET /staff/queue/stream  (SSE) ────────────────────────────────────────────
async def _build_staff_queue_payload(staff_center_id: int) -> dict:
    """Build staff queue snapshot using a fresh DB session."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == staff_center_id))
        today = date.today()
        bookings = (await db.scalars(
            select(Booking)
            .where(
                Booking.procurement_center_id == staff_center_id,
                func.date(Booking.booked_at) == today
            )
            .order_by(Booking.token_number.asc())
        )).all()

        prefix = center.name.split()[-1][0].upper() if center else "A"
        active = [b for b in bookings if b.status in ["Serving", "Confirmed", "Waiting"]]
        serving_booking = next((b for b in bookings if b.status == "Serving"), None)
        if not serving_booking and active:
            serving_booking = min(active, key=lambda x: x.token_number)
        next_booking = None
        if serving_booking:
            remaining = [b for b in active if b.id != serving_booking.id]
            next_booking = min(remaining, key=lambda x: x.token_number) if remaining else None

        queue_list = []
        for b in bookings:
            tok = f"{prefix}-{b.token_number:03d}"
            is_serving = serving_booking and b.id == serving_booking.id
            status = "Serving" if is_serving else b.status
            queue_list.append({
                "id": b.id, "token": tok, "token_number": b.token_number,
                "status": status, "farmer_id": b.farmer_id,
                "produce": b.produce, "quantity_kg": b.quantity_kg,
            })

        return {
            "center_name": center.name if center else "Center",
            "current_token": f"{prefix}-{serving_booking.token_number:03d}" if serving_booking else "-",
            "current_booking_id": serving_booking.id if serving_booking else None,
            "next_token": f"{prefix}-{next_booking.token_number:03d}" if next_booking else "-",
            "next_booking_id": next_booking.id if next_booking else None,
            "queue": queue_list,
            "total_today": len(bookings),
            "waiting_count": len([b for b in bookings if b.status in ["Confirmed", "Waiting", "Serving"]]),
        }


@router.get("/queue/stream")
async def stream_staff_queue(
    access_token: Optional[str] = Cookie(default=None)
):
    payload = get_staff_from_token(access_token)
    user_id = payload["user_id"]

    # Get center_id once (outside the generator)
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        staff = await db.scalar(select(Staff).where(Staff.id == user_id))
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
        staff_center_id = staff.center_id

    async def event_generator():
        try:
            while True:
                try:
                    data = await _build_staff_queue_payload(staff_center_id)
                    yield f"data: {json.dumps(data)}\n\n"
                except Exception:
                    yield ": keep-alive\n\n"
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )
