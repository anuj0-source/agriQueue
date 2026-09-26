import re
from datetime import datetime

from fastapi import APIRouter, Request, Response, Depends, Cookie, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from isAuthenticated import isAuthenticated
from models.farmer import Farmer
from models.booking import Booking
from models.procurement_center import ProcurementCenter
from models.procurement import ProcurementRecord
from models.payment import Payment
from models.payment_profile import PaymentProfile
from models.slot import Slot
from payment_utils import encrypt_destination, mask_destination, payment_status_label

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
        select(Booking, ProcurementCenter, ProcurementRecord)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .outerjoin(ProcurementRecord, ProcurementRecord.booking_id == Booking.id)
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
        b, c, procurement = upcoming_res
        # Look up actual slot times from DB instead of using hardcoded map
        slot_obj = await db.scalar(select(Slot).where(Slot.id == b.slot_id)) if b.slot_id else None
        slot_time_str = f"{slot_obj.start_time} - {slot_obj.end_time}" if slot_obj else "Time not set"
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
            "time": slot_time_str,
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
        select(Booking, ProcurementCenter, ProcurementRecord)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
        .outerjoin(ProcurementRecord, ProcurementRecord.booking_id == Booking.id)
        .where(Booking.farmer_id == user_id)
        .order_by(Booking.booked_at.desc())
    )
    res = (await db.execute(query)).all()
    history = []
    for b, c, procurement in res:
        history.append({
            "id": f"PH-{b.id}",
            "date": b.booked_at.strftime("%d %b %Y"),
            "center": c.name,
            "produce": b.produce,
            "quantity": f"{b.quantity_kg:,} kg",
            "amount": f"₹{b.total_price:,}",
            "status": b.status,
            "actual_weight_kg": procurement.actual_weight_kg if procurement else None,
            "deductions_kg": procurement.deductions_kg if procurement else None,
            "net_weight_kg": procurement.net_weight_kg if procurement else None,
            "quality_grade": procurement.quality_grade if procurement else None,
            "moisture_percent": procurement.moisture_percent if procurement else None,
            "impurity_percent": procurement.impurity_percent if procurement else None,
            "rate_per_kg": procurement.rate_per_kg if procurement else None,
            "verified_at": procurement.completed_at.strftime("%d %b %Y, %I:%M %p") if procurement else None,
        })
    return history


@router.get("/payment-profile")
async def get_payment_profile(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None),
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")

    profile = await db.scalar(
        select(PaymentProfile).where(PaymentProfile.farmer_id == payload["user_id"])
    )
    if not profile:
        return {"is_configured": False}
    return {
        "is_configured": True,
        "method": profile.method,
        "account_holder": profile.account_holder,
        "masked_destination": mask_destination(profile.method, profile.destination_last4, profile.ifsc),
        "updated_at": profile.updated_at.strftime("%d %b %Y") if profile.updated_at else None,
    }


@router.put("/payment-profile")
async def save_payment_profile(
    data: dict,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None),
):
    """Store the payout destination encrypted; APIs only expose its masked form."""
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")

    method = str(data.get("method", "")).strip()
    account_holder = str(data.get("account_holder", "")).strip()
    if method not in {"UPI", "Bank Account"}:
        raise HTTPException(status_code=400, detail="Choose UPI or Bank Account")
    if len(account_holder) < 2 or len(account_holder) > 100:
        raise HTTPException(status_code=400, detail="Enter the account holder name")

    if method == "UPI":
        destination = str(data.get("upi_id", "")).strip().lower()
        if not re.fullmatch(r"[a-z0-9._-]{2,128}@[a-z][a-z0-9.-]{1,63}", destination):
            raise HTTPException(status_code=400, detail="Enter a valid UPI ID")
        ifsc = None
        last4 = destination.replace("@", "")[-4:]
    else:
        destination = re.sub(r"\s+", "", str(data.get("account_number", "")))
        ifsc = str(data.get("ifsc", "")).strip().upper()
        if not re.fullmatch(r"\d{9,18}", destination):
            raise HTTPException(status_code=400, detail="Enter a valid bank account number")
        if not re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", ifsc):
            raise HTTPException(status_code=400, detail="Enter a valid IFSC code")
        last4 = destination[-4:]

    profile = await db.scalar(
        select(PaymentProfile).where(PaymentProfile.farmer_id == payload["user_id"])
    )
    encrypted_destination = encrypt_destination(destination)
    if not profile:
        profile = PaymentProfile(
            farmer_id=payload["user_id"],
            method=method,
            account_holder=account_holder,
            destination_last4=last4,
            encrypted_destination=encrypted_destination,
            ifsc=ifsc,
            updated_at=datetime.now(),
        )
        db.add(profile)
    else:
        profile.method = method
        profile.account_holder = account_holder
        profile.destination_last4 = last4
        profile.encrypted_destination = encrypted_destination
        profile.ifsc = ifsc
        profile.updated_at = datetime.now()
    await db.commit()
    return {
        "success": True,
        "method": method,
        "account_holder": account_holder,
        "masked_destination": mask_destination(method, last4, ifsc),
    }


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
        select(Payment, Booking, ProcurementRecord, ProcurementCenter)
        .join(Booking, Payment.booking_id == Booking.id)
        .outerjoin(ProcurementRecord, ProcurementRecord.booking_id == Booking.id)
        .join(ProcurementCenter, Payment.procurement_center_id == ProcurementCenter.id)
        .where(Payment.farmer_id == user_id)
        .order_by(Payment.updated_at.desc())
    )
    rows = (await db.execute(query)).all()
    payments = []
    for payment, booking, procurement, center in rows:
        payments.append({
            "id": payment.id,
            "receipt_number": payment.receipt_number,
            "date": booking.booked_at.strftime("%d %b %Y"),
            "produce": booking.produce,
            "amount": f"₹{payment.amount:,}",
            "amount_value": payment.amount,
            "status": payment_status_label(payment),
            "transactionId": payment.transaction_reference or "Pending",
            "expected_settlement_date": payment.expected_settlement_date.strftime("%d %b %Y"),
            "settled_at": payment.settled_at.strftime("%d %b %Y") if payment.settled_at else None,
            "payment_batch": payment.payment_batch,
            "dispute_status": payment.dispute_status,
            "dispute_reason": payment.dispute_reason,
            "center_name": center.name,
            "quality_grade": procurement.quality_grade if procurement else booking.produce_type,
            "net_weight_kg": procurement.net_weight_kg if procurement else booking.quantity_kg,
        })
    return payments


@router.post("/payments/{payment_id}/dispute")
async def raise_payment_dispute(
    payment_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None),
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    reason = str(data.get("reason", "")).strip()
    if len(reason) < 10 or len(reason) > 500:
        raise HTTPException(status_code=400, detail="Describe the issue in 10 to 500 characters")
    payment = await db.scalar(
        select(Payment).where(Payment.id == payment_id, Payment.farmer_id == payload["user_id"])
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.dispute_status == "Open":
        raise HTTPException(status_code=409, detail="A dispute is already open for this payment")
    payment.dispute_status = "Open"
    payment.dispute_reason = reason
    payment.dispute_created_at = datetime.now()
    payment.dispute_resolution = None
    if payment.status != "Credited":
        payment.status = "On Hold"
    await db.commit()
    return {"success": True, "message": "Dispute raised. Settlement has been placed on hold."}


@router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None),
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    row = (await db.execute(
        select(Payment, Booking, ProcurementRecord, ProcurementCenter, Farmer)
        .join(Booking, Payment.booking_id == Booking.id)
        .outerjoin(ProcurementRecord, ProcurementRecord.booking_id == Booking.id)
        .join(ProcurementCenter, Payment.procurement_center_id == ProcurementCenter.id)
        .join(Farmer, Payment.farmer_id == Farmer.id)
        .where(Payment.id == payment_id, Payment.farmer_id == payload["user_id"])
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment receipt not found")
    payment, booking, procurement, center, farmer = row
    return {
        "receipt_number": payment.receipt_number,
        "status": payment_status_label(payment),
        "farmer_name": farmer.full_name,
        "farmer_id": farmer.farmer_id or f"FK{100000 + farmer.id}",
        "center_name": center.name,
        "center_address": center.address,
        "produce": booking.produce,
        "quality_grade": procurement.quality_grade if procurement else booking.produce_type,
        "actual_weight_kg": procurement.actual_weight_kg if procurement else booking.quantity_kg,
        "deductions_kg": procurement.deductions_kg if procurement else 0,
        "net_weight_kg": procurement.net_weight_kg if procurement else booking.quantity_kg,
        "rate_per_kg": procurement.rate_per_kg if procurement else 0,
        "amount": payment.amount,
        "expected_settlement_date": payment.expected_settlement_date.strftime("%d %b %Y"),
        "settled_at": payment.settled_at.strftime("%d %b %Y") if payment.settled_at else None,
        "transaction_reference": payment.transaction_reference,
        "generated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
    }
