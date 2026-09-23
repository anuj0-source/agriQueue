from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
from isAuthenticated import isAuthenticated
from models.booking import Booking
from models.procurement_center import ProcurementCenter
from schemas.booking import BookingCreateRequest, BookingResponse

router = APIRouter(
    prefix="/bookings",
    tags=["bookings"]
)


from models.produce import Produce
from models.slot import Slot
from ml.predictor import predict_queue_wait_time

SLOT_TIME_MAP = {
    1: "09:00 AM - 10:00 AM",
    2: "10:00 AM - 11:00 AM",
    3: "11:00 AM - 12:00 PM",
    4: "12:00 PM - 01:00 PM",
    5: "01:00 PM - 02:00 PM",
}

def format_token(center_name: str, token_num: int) -> str:
    # Take last character or word (e.g. Center A -> A)
    parts = center_name.split()
    prefix = parts[-1][0].upper() if parts else "A"
    return f"{prefix}-{token_num:03d}"

@router.post("", response_model=BookingResponse)
async def create_booking(
    data: BookingCreateRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized: Please log in to book a slot")

    user_id = payload.get("user_id")

    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == data.procurement_center_id))
    if not center:
        raise HTTPException(status_code=404, detail="Procurement center not found")

    # Generate sequential token number for this center
    count_today = await db.scalar(
        select(func.count(Booking.id)).where(Booking.procurement_center_id == data.procurement_center_id)
    )
    token_number = (count_today or 0) + 40  # Start around 40 for realistic demo queue numbers

    # Fetch Produce to get exact price
    produce_record = await db.scalar(
        select(Produce).where(
            Produce.center_id == data.procurement_center_id,
            Produce.produce_name == data.produce
        )
    )
    price_per_kg = produce_record.price_per_kg if produce_record else 20
    quantity_kg = data.quantity_kg or 1000
    total_price = price_per_kg * quantity_kg

    from datetime import date
    from time_utils import is_slot_expired

    booked_dt = datetime.now()
    if data.booking_date:
        try:
            parsed = datetime.fromisoformat(data.booking_date.replace("Z", "+00:00"))
            booked_dt = parsed.replace(tzinfo=None)
        except Exception:
            pass

    target_date = booked_dt.date()
    today_date = date.today()

    if target_date < today_date:
        raise HTTPException(
            status_code=400,
            detail="Cannot book a slot for a past date. Please select an upcoming date."
        )

    # Capacity & Expiration Enforcement
    if data.slot_id:
        slot = await db.scalar(select(Slot).where(Slot.id == data.slot_id))
        if not slot:
            raise HTTPException(status_code=404, detail="Selected slot not found")

        if is_slot_expired(target_date, slot.end_time):
            raise HTTPException(
                status_code=400,
                detail="This time slot has already expired. Please choose an upcoming time slot."
            )

        if slot.capacity:
            # Sum quantity already booked in this slot on target date (excluding cancelled)
            booked_target_qty = await db.scalar(
                select(func.coalesce(func.sum(Booking.quantity_kg), 0)).where(
                    Booking.slot_id == data.slot_id,
                    Booking.procurement_center_id == data.procurement_center_id,
                    func.date(Booking.booked_at) == target_date,
                    Booking.status.notin_(["Cancelled"])
                )
            ) or 0
            available = slot.capacity - booked_target_qty
            if quantity_kg > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Requested quantity exceeds slot capacity. Available: {max(0, available)} kg"
                )
            # Update running count if booking is for today
            if target_date == today_date:
                slot.booked_count = booked_target_qty + quantity_kg

    # Active queue ahead calculation for target date
    ahead_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.procurement_center_id == data.procurement_center_id,
            func.date(Booking.booked_at) == target_date,
            Booking.status.in_(["Waiting", "Confirmed"])
        )
    ) or 0

    # ML-driven queue wait time prediction
    ml_prediction = predict_queue_wait_time(
        center_name=center.name,
        daily_capacity=center.daily_capacity,
        slot_time=data.slot_time or (SLOT_TIME_MAP.get(data.slot_id) if data.slot_id else "10:00 AM - 11:00 AM"),
        booking_date=data.booking_date,
        produce=data.produce,
        quantity_kg=quantity_kg,
        produce_type=data.produce_type,
        farmers_ahead=ahead_count
    )
    estimated_wait = ml_prediction["estimated_wait_minutes"]

    booking = Booking(
        farmer_id=user_id,
        procurement_center_id=data.procurement_center_id,
        status="Confirmed",
        produce=data.produce,
        quantity_kg=quantity_kg,
        total_price=total_price,
        slot_id=data.slot_id or 1,
        produce_type=data.produce_type or "Standard Grade",
        estimated_wait_time=estimated_wait,
        booked_at=booked_dt,
        token_number=token_number,
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    formatted_tok = format_token(center.name, booking.token_number)
    slot_label = data.slot_time or SLOT_TIME_MAP.get(booking.slot_id, "10:00 - 11:00 AM")
    date_str = booking.booked_at.strftime("%d %b %Y")

    return BookingResponse(
        id=booking.id,
        farmer_id=booking.farmer_id,
        procurement_center_id=booking.procurement_center_id,
        center_name=center.name,
        center_address=center.address,
        status=booking.status,
        produce=booking.produce,
        quantity_kg=booking.quantity_kg,
        total_price=booking.total_price,
        slot_id=booking.slot_id,
        slot_time=slot_label,
        produce_type=booking.produce_type,
        estimated_wait_time=booking.estimated_wait_time,
        booked_at=booking.booked_at,
        formatted_date=date_str,
        token_number=booking.token_number,
        formatted_token=formatted_tok,
    )

@router.get("/my", response_model=List[BookingResponse])
async def get_my_bookings(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = payload.get("user_id")

    query = (
        select(Booking, ProcurementCenter, Slot)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .outerjoin(Slot, Booking.slot_id == Slot.id)
        .where(Booking.farmer_id == user_id)
        .order_by(Booking.booked_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    bookings_list = []
    for booking, center, slot in rows:
        formatted_tok = format_token(center.name, booking.token_number)
        if slot:
            slot_label = f"{slot.start_time} - {slot.end_time}"
        else:
            slot_label = "Time not available"
        date_str = booking.booked_at.strftime("%d %b %Y")
        bookings_list.append(
            BookingResponse(
                id=booking.id,
                farmer_id=booking.farmer_id,
                procurement_center_id=booking.procurement_center_id,
                center_name=center.name,
                center_address=center.address,
                status=booking.status,
                produce=booking.produce,
                quantity_kg=booking.quantity_kg,
                total_price=booking.total_price,
                slot_id=booking.slot_id,
                slot_time=slot_label,
                produce_type=booking.produce_type,
                estimated_wait_time=booking.estimated_wait_time,
                booked_at=booking.booked_at,
                formatted_date=date_str,
                token_number=booking.token_number,
                formatted_token=formatted_tok,
            )
        )
    return bookings_list

@router.patch("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = payload.get("user_id")

    booking = await db.scalar(select(Booking).where(Booking.id == booking_id, Booking.farmer_id == user_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not owned by you")

    if booking.status in ["Completed", "Cancelled", "Serving"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a booking that is currently {booking.status}")

    booking.status = "Cancelled"
    await db.commit()

    return {"success": True, "message": "Booking cancelled successfully"}
