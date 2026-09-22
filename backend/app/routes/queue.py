from fastapi import APIRouter, Depends, HTTPException, Cookie, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, date
import asyncio
import json
from database import get_db, AsyncSessionLocal
from isAuthenticated import isAuthenticated
from models.procurement_center import ProcurementCenter
from models.booking import Booking

from pydantic import BaseModel
from ml.predictor import predict_queue_wait_time

router = APIRouter(
    prefix="/queue",
    tags=["queue"]
)


class PredictWaitRequest(BaseModel):
    procurement_center_id: int
    slot_id: Optional[int] = None
    slot_time: Optional[str] = "10:00 AM - 11:00 AM"
    booking_date: Optional[str] = None
    produce: Optional[str] = "Wheat"
    quantity_kg: Optional[int] = 1000
    produce_type: Optional[str] = "Standard Grade"



async def _build_farmer_queue(center_id: int, user_id: Optional[int], db: AsyncSession) -> dict:
    """
    Build the complete queue snapshot for a center.
    Only today's bookings are shown. Farmer-specific token is identified by user_id.
    """
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    if not center:
        center = await db.scalar(select(ProcurementCenter).limit(1))
        if not center:
            return None

    today = date.today()
    bookings = (await db.scalars(
        select(Booking)
        .where(
            Booking.procurement_center_id == center.id,
            func.date(Booking.booked_at) == today
        )
        .order_by(Booking.token_number.asc())
    )).all()

    prefix = center.name.split()[-1][0].upper() if center.name else "A"
    now_time_str = datetime.now().strftime("%I:%M %p")

    empty_base = {
        "center": center.name, "center_id": center.id,
        "lastUpdated": now_time_str, "nowServing": "-",
        "yourToken": "No Active Token", "yourTokenNumber": None,
        "yourStatus": None, "farmersAhead": 0,
        "estimatedWait": "-", "queue": [],
    }

    if not bookings:
        return empty_base

    # The farmer's own active booking for today
    user_booking = None
    if user_id:
        user_booking = next(
            (b for b in bookings if b.farmer_id == user_id
             and b.status in ["Confirmed", "Waiting", "Serving"]),
            None
        )

    # "Now Serving" = all bookings currently in "Serving" status (across active counters)
    serving_bookings = [b for b in bookings if b.status == "Serving"]
    serving_token_str = (
        ", ".join([f"{prefix}-{b.token_number:03d}" for b in serving_bookings])
        if serving_bookings
        else "-"
    )
    your_token_str = (
        f"{prefix}-{user_booking.token_number:03d}" if user_booking else "No Active Token"
    )

    # Farmers ahead = active bookings with a lower token number (not cancelled/completed)
    ahead_count = 0
    if user_booking:
        ahead_count = sum(
            1 for b in bookings
            if b.token_number < user_booking.token_number
            and b.status in ["Confirmed", "Waiting"]
        )

    # Show bookings in the queue table (so farmer can see their position)
    relevant = [b for b in bookings if b.status != "Cancelled"][-20:]
    queue_list = []
    for b in relevant:
        tok_str = f"{prefix}-{b.token_number:03d}"
        is_curr = user_booking and (b.id == user_booking.id)
        is_serving_item = (b.status == "Serving") and not is_curr
        display_status = "You" if is_curr else ("Serving" if is_serving_item else b.status)
        queue_list.append({
            "token": tok_str,
            "status": display_status,
            "isCurrent": bool(is_curr),
        })

    wait_str = "-"
    if user_booking:
        if user_booking.status == "Serving":
            wait_str = "Your turn now!"
        else:
            pred = predict_queue_wait_time(
                center_name=center.name,
                daily_capacity=center.daily_capacity,
                produce=user_booking.produce,
                quantity_kg=user_booking.quantity_kg,
                produce_type=user_booking.produce_type,
                farmers_ahead=ahead_count
            )
            w_min = pred["estimated_wait_minutes"]
            wait_str = f"~{w_min} min (you're next)" if ahead_count == 0 else f"~{w_min} min"

    return {
        "center": center.name,
        "center_id": center.id,
        "lastUpdated": now_time_str,
        "nowServing": serving_token_str,
        "yourToken": your_token_str,
        "yourTokenNumber": user_booking.token_number if user_booking else None,
        "yourStatus": user_booking.status if user_booking else None,
        "farmersAhead": ahead_count,
        "estimatedWait": wait_str,
        "queue": queue_list,
    }


# ── POST /queue/predict-wait  (AI Wait Time Estimation) ───────────────────────
@router.post("/predict-wait")
async def predict_wait(
    payload: PredictWaitRequest,
    db: AsyncSession = Depends(get_db)
):
    center = await db.scalar(
        select(ProcurementCenter).where(ProcurementCenter.id == payload.procurement_center_id)
    )
    if not center:
        center = await db.scalar(select(ProcurementCenter).limit(1))
    
    center_name = center.name if center else "Procurement Center"
    daily_cap = center.daily_capacity if center else 2000

    # Target date
    target_date = date.today()
    if payload.booking_date:
        try:
            target_date = datetime.strptime(payload.booking_date.split("T")[0], "%Y-%m-%d").date()
        except Exception:
            pass

    ahead_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.procurement_center_id == payload.procurement_center_id,
            func.date(Booking.booked_at) == target_date,
            Booking.status.in_(["Waiting", "Confirmed"])
        )
    ) or 0

    prediction = predict_queue_wait_time(
        center_name=center_name,
        daily_capacity=daily_cap,
        slot_time=payload.slot_time,
        booking_date=payload.booking_date,
        produce=payload.produce,
        quantity_kg=payload.quantity_kg,
        produce_type=payload.produce_type,
        farmers_ahead=ahead_count
    )
    return prediction


# ── GET /queue/{center_id}  (regular HTTP) ─────────────────────────────────────
@router.get("/{center_id}")
async def get_live_queue(
    center_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    user_id = None
    if access_token:
        payload = isAuthenticated(access_token)
        if payload:
            user_id = payload.get("user_id")

    data = await _build_farmer_queue(center_id, user_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Center not found")
    return data


# ── GET /queue/{center_id}/stream  (SSE) ───────────────────────────────────────
@router.get("/{center_id}/stream")
async def stream_live_queue(
    center_id: int,
    request: Request,
    access_token: Optional[str] = Cookie(default=None)
):
    # Resolve user_id once at connection time
    user_id = None
    if access_token:
        payload = isAuthenticated(access_token)
        if payload:
            user_id = payload.get("user_id")

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                # Use a FRESH session each tick so reads are never stale
                try:
                    async with AsyncSessionLocal() as db:
                        data = await _build_farmer_queue(center_id, user_id, db)
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
        }
    )
