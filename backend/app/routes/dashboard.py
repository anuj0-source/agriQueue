from fastapi import APIRouter, Request, Response, Depends, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from isAuthenticated import isAuthenticated
from models.farmer import Farmer
from models.booking import Booking
from models.procurement_center import ProcurementCenter

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

SLOT_TIME_MAP = {
    1: "09:00 AM - 10:00 AM",
    2: "10:00 AM - 11:00 AM",
    3: "11:00 AM - 12:00 PM",
    4: "12:00 PM - 01:00 PM",
    5: "01:00 PM - 02:00 PM",
}

def format_token(center_name: str, token_num: int) -> str:
    parts = center_name.split()
    prefix = parts[-1][0].upper() if parts else "A"
    return f"{prefix}-{token_num:03d}"

@router.get("/farmer")
async def farmer_dashboard(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)

    if not payload:
        response.status_code = 401
        return {"success": False, "message": "Unauthorized"}

    if payload.get("role") and payload.get("role") != "farmer":
        response.status_code = 403
        return {"success": False, "message": "Access forbidden: farmer role required"}

    user_id = payload["user_id"]

    user = await db.scalar(
        select(Farmer).where(Farmer.id == user_id)
    )
    if not user:
        response.status_code = 404
        return {"success": False, "message": "User not found"}

    # Compute live metrics
    upcoming_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.farmer_id == user_id,
            Booking.status.in_(["Confirmed", "Waiting"])
        )
    ) or 0

    completed_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.farmer_id == user_id,
            Booking.status == "Completed"
        )
    ) or 0

    earnings_sum = await db.scalar(
        select(func.sum(Booking.total_price)).where(
            Booking.farmer_id == user_id,
            Booking.status == "Completed"
        )
    ) or 0

    # Fetch next upcoming booking
    upcoming_q = (
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(
            Booking.farmer_id == user_id,
            Booking.status.in_(["Confirmed", "Waiting"])
        )
        .order_by(Booking.booked_at.asc())
        .limit(1)
    )
    upcoming_res = (await db.execute(upcoming_q)).first()

    upcoming_booking_data = None
    if upcoming_res:
        b, c = upcoming_res
        upcoming_booking_data = {
            "id": f"UB-{b.id}",
            "produce": b.produce,
            "quantity_kg": b.quantity_kg,
            "total_price": b.total_price,
            "produce_type": b.produce_type or "Standard",
            "estimated_wait_time": b.estimated_wait_time or 15,
            "center": c.name,
            "center_address": c.address,
            "fullCenter": f"{c.name}, {c.village}",
            "date": b.booked_at.strftime("%d %b %Y"),
            "time": SLOT_TIME_MAP.get(b.slot_id, "10:00 AM - 11:00 AM"),
            "token": format_token(c.name, b.token_number),
            "status": b.status,
            "center_id": c.id,
        }

    return {
        "success": True,
        "message": "Dashboard",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "mobile_number": user.mobile_number,
            "farmer_id": user.farmer_id,
            "state": user.state,
            "district": user.district,
            "village": user.village,
        },
        "metrics": {
            "upcomingBookings": upcoming_count,
            "totalProcurements": completed_count,
            "totalEarnings": f"₹{earnings_sum:,.0f}" if earnings_sum else "₹0",
        },
        "upcoming_booking": upcoming_booking_data,
    }

@router.get("/procurement-history")
async def get_procurement_history(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        return []

    user_id = payload["user_id"]
    query = (
        select(Booking, ProcurementCenter)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .where(Booking.farmer_id == user_id)
        .order_by(Booking.booked_at.desc())
    )
    res = (await db.execute(query)).all()
    history = []
    for b, c in res:
        history.append({
            "id": f"PH-{b.id}",
            "date": b.booked_at.strftime("%d %b %Y"),
            "center": c.name,
            "produce": b.produce,
            "quantity": f"{b.quantity_kg:,} kg",
            "amount": f"₹{b.total_price:,}",
            "status": b.status
        })
    return history

@router.get("/payments")
async def get_payment_records(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        return []

    user_id = payload["user_id"]
    query = (
        select(Booking)
        .where(Booking.farmer_id == user_id)
        .order_by(Booking.booked_at.desc())
    )
    bookings = (await db.scalars(query)).all()
    payments = []
    for b in bookings:
        is_paid = b.status == "Completed"
        payments.append({
            "id": f"PAY-{b.id}",
            "date": b.booked_at.strftime("%d %b %Y"),
            "produce": b.produce,
            "amount": f"₹{b.total_price:,}",
            "status": "Paid" if is_paid else "Pending",
            "transactionId": f"TXN{b.id:06d}" if is_paid else "-"
        })
    return payments