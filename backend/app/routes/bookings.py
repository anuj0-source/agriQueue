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

SLOT_TIME_MAP = {
    1: "09:00 - 10:00 AM",
    2: "10:00 - 11:00 AM",
    3: "11:00 - 12:00 PM",
    4: "12:00 - 01:00 PM",
    5: "01:00 - 02:00 PM",
}

CROP_PRICE_PER_KG = {
    "Wheat": 23,
    "Rice": 19,
    "Maize": 20,
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

    price_per_kg = CROP_PRICE_PER_KG.get(data.produce, 22)
    total_price = price_per_kg * (data.quantity_kg or 1000)

    # Active queue ahead calculation
    ahead_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.procurement_center_id == data.procurement_center_id,
            Booking.status.in_(["Waiting", "Confirmed"])
        )
    ) or 0
    estimated_wait = max(10, (ahead_count + 1) * 12)

    booked_dt = datetime.now()
    if data.booking_date:
        try:
            parsed = datetime.fromisoformat(data.booking_date.replace("Z", "+00:00"))
            booked_dt = parsed.replace(tzinfo=None)
        except Exception:
            pass

    booking = Booking(
        farmer_id=user_id,
        procurement_center_id=data.procurement_center_id,
        status="Confirmed",
        produce=data.produce,
        quantity_kg=data.quantity_kg or 1000,
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
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(Booking.farmer_id == user_id)
        .order_by(Booking.booked_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    bookings_list = []
    for booking, center in rows:
        formatted_tok = format_token(center.name, booking.token_number)
        slot_label = SLOT_TIME_MAP.get(booking.slot_id, "10:00 - 11:00 AM")
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
