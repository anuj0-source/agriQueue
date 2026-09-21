from fastapi import APIRouter, Depends, HTTPException, Query, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, extract
from database import get_db
from models.procurement_center import ProcurementCenter
from models.farmer import Farmer
from models.booking import Booking
from models.slot import Slot
from models.produce import Produce
from models.payment import Payment
from models.payment_profile import PaymentProfile
from payment_utils import mask_destination, payment_status_label
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta
from isAuthenticated import isAuthenticated
router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)
import jwt
from dotenv import load_dotenv
import os
load_dotenv()
SECRET=os.getenv("SECRET_KEY")
ALGORITHM=os.getenv("ALGORITHM")
def format_currency(value):
    if value >= 10_000_000:
        return f"₹{value / 10_000_000:.1f} Cr"
    elif value >= 100_000:
        return f"₹{value / 100_000:.1f} Lakh"
    else:
        return f"₹{value:,}"

@router.get("/dashboard")
async def get_admin_dashboard(
    timeframe: str = Query(default="Last 30 Days"),
    db: AsyncSession = Depends(get_db),
    access_token: str = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if payload["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    today = date.today()

    # 1. Build Timeframe Date Boundaries
    booking_filters = []
    if timeframe == "Today":
        booking_filters.append(func.date(Booking.booked_at) == today)
    elif timeframe == "Last 7 Days":
        start_day = today - timedelta(days=6)
        booking_filters.append(func.date(Booking.booked_at) >= start_day)
        booking_filters.append(func.date(Booking.booked_at) <= today)
    elif timeframe == "Last 30 Days":
        start_day = today - timedelta(days=29)
        booking_filters.append(func.date(Booking.booked_at) >= start_day)
        booking_filters.append(func.date(Booking.booked_at) <= today)
    elif timeframe == "This Year":
        start_day = date(today.year, 1, 1)
        booking_filters.append(func.date(Booking.booked_at) >= start_day)
        booking_filters.append(func.date(Booking.booked_at) <= today)

    # 2. Key Metrics
    # Total distinct farmers active in timeframe (or total registered if no filter)
    if booking_filters:
        farmers_count = await db.scalar(
            select(func.count(func.distinct(Booking.farmer_id))).where(*booking_filters)
        ) or 0
    else:
        farmers_count = await db.scalar(select(func.count(Farmer.id))) or 0

    centers_count = await db.scalar(select(func.count(ProcurementCenter.id))) or 0

    # Total procurements in timeframe
    bookings_query = select(func.count(Booking.id))
    if booking_filters:
        bookings_query = bookings_query.where(*booking_filters)
    bookings_count = await db.scalar(bookings_query) or 0

    # Total payments for non-cancelled bookings in timeframe
    payments_query = select(func.coalesce(func.sum(Booking.total_price), 0))
    payments_filters = list(booking_filters) + [Booking.status != "Cancelled"]
    payments_query = payments_query.where(*payments_filters)
    total_val_sum = await db.scalar(payments_query) or 0

    display_farmers = f"{farmers_count:,}"
    display_centers = f"{centers_count:,}"
    display_procurements = f"{bookings_count:,}"
    display_payments = format_currency(total_val_sum)

    # 3. Crop Distribution
    crop_query = select(Booking.produce, func.count(Booking.id))
    if booking_filters:
        crop_query = crop_query.where(*booking_filters)
    crop_query = crop_query.group_by(Booking.produce)
    crop_stats = (await db.execute(crop_query)).all()

    raw_crops = dict(crop_stats)
    total_c = sum(raw_crops.values()) or 0

    colors = {
        "wheat": "#3b82f6", "Wheat": "#3b82f6",
        "rice": "#f59e0b", "Rice": "#f59e0b",
        "maize": "#10b981", "Maize": "#10b981",
        "pulses": "#8b5cf6", "Pulses": "#8b5cf6"
    }

    crop_distribution = []
    if total_c > 0:
        for produce, count in raw_crops.items():
            percent = round((count / total_c) * 100)
            crop_distribution.append({
                "crop": produce.capitalize() if produce else "Other",
                "percent": percent,
                "color": colors.get(produce.lower() if produce else "", "#8b5cf6")
            })
    else:
        crop_distribution = [
            {"crop": "Wheat", "percent": 0, "color": "#3b82f6"},
            {"crop": "Rice", "percent": 0, "color": "#f59e0b"},
            {"crop": "Maize", "percent": 0, "color": "#10b981"},
            {"crop": "Pulses", "percent": 0, "color": "#8b5cf6"},
        ]

    # 4. Procurements Trend (Multi-point trend tailored to selected timeframe)
    procurements_trend = []
    if timeframe == "Today":
        today_bookings = (await db.scalars(
            select(Booking).where(func.date(Booking.booked_at) == today)
        )).all()
        slot_counts = {}
        for b in today_bookings:
            slot_counts[b.slot_id] = slot_counts.get(b.slot_id, 0) + 1
        procurements_trend = [
            {"month": "08:00 AM", "value": slot_counts.get(3, 0) + slot_counts.get(7, 0)},
            {"month": "10:00 AM", "value": slot_counts.get(4, 0)},
            {"month": "12:00 PM", "value": slot_counts.get(5, 0) + slot_counts.get(8, 0)},
            {"month": "02:00 PM", "value": slot_counts.get(6, 0)},
            {"month": "04:00 PM", "value": slot_counts.get(9, 0)},
        ]
    elif timeframe == "Last 7 Days":
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        day_stats = await db.execute(
            select(func.date(Booking.booked_at), func.count(Booking.id))
            .where(func.date(Booking.booked_at) >= days[0], func.date(Booking.booked_at) <= today)
            .group_by(func.date(Booking.booked_at))
        )
        counts_by_day = {d: c for d, c in day_stats.all()}
        for d in days:
            procurements_trend.append({
                "month": d.strftime("%d %b"),
                "value": counts_by_day.get(d, 0)
            })
    elif timeframe == "Last 30 Days":
        intervals = []
        for i in range(4, -1, -1):
            d_start = today - timedelta(days=(i + 1) * 6 - 1)
            d_end = today - timedelta(days=i * 6)
            intervals.append((d_start, d_end, f"{d_start.strftime('%d %b')}-{d_end.strftime('%d %b')}"))
        all_30d = (await db.execute(
            select(func.date(Booking.booked_at), func.count(Booking.id))
            .where(func.date(Booking.booked_at) >= today - timedelta(days=29), func.date(Booking.booked_at) <= today)
            .group_by(func.date(Booking.booked_at))
        )).all()
        counts_by_date = {d: c for d, c in all_30d}
        for d_start, d_end, label in intervals:
            val = 0
            curr = d_start
            while curr <= d_end:
                val += counts_by_date.get(curr, 0)
                curr += timedelta(days=1)
            procurements_trend.append({"month": label, "value": val})
    else:  # "This Year"
        month_names = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
                       7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
        all_year = (await db.execute(
            select(extract('month', Booking.booked_at), func.count(Booking.id))
            .where(extract('year', Booking.booked_at) == today.year)
            .group_by(extract('month', Booking.booked_at))
        )).all()
        month_counts = {int(m): c for m, c in all_year}
        for m in range(1, 13):
            procurements_trend.append({
                "month": month_names.get(m, "?"),
                "value": month_counts.get(m, 0)
            })

    # 5. Recent Activities
    activities_query = (
        select(Booking, Farmer, ProcurementCenter)
        .join(Farmer, Booking.farmer_id == Farmer.id)
        .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
    )
    if booking_filters:
        activities_query = activities_query.where(*booking_filters)
    activities_query = activities_query.order_by(desc(Booking.id)).limit(6)
    recent_bookings = (await db.execute(activities_query)).all()

    slot_time_display = {
        1: "09:00 AM", 2: "10:00 AM", 3: "08:00 AM", 4: "10:00 AM",
        5: "12:00 PM", 6: "02:00 PM", 7: "08:00 AM", 8: "11:00 AM", 9: "03:00 PM"
    }

    recent_activities = []
    if recent_bookings:
        for b, f, c in recent_bookings:
            b_date = b.booked_at.date() if hasattr(b.booked_at, 'date') else today
            slot_str = slot_time_display.get(b.slot_id, "")
            if b_date == today:
                time_str = f"Today, {slot_str}" if slot_str else "Today"
            else:
                time_str = f"{b_date.strftime('%d %b')}{', ' + slot_str if slot_str else ''}"

            recent_activities.append({
                "id": b.id,
                "text": f"{b.produce.capitalize()} ({b.quantity_kg} kg) token generated for {f.full_name}",
                "center": c.name,
                "time": time_str,
                "status": b.status,
            })

    # 6. Center Performance (Real Booked Quantity in Timeframe)
    centers_db = (await db.scalars(select(ProcurementCenter))).all()
    center_performance = []
    for c in centers_db:
        center_booking_filters = list(booking_filters) + [
            Booking.procurement_center_id == c.id,
            Booking.status != "Cancelled"
        ]
        actual_booked = (await db.scalar(
            select(func.coalesce(func.sum(Booking.quantity_kg), 0)).where(*center_booking_filters)
        )) or 0

        cap = c.daily_capacity or 1000
        perf = round((actual_booked / max(cap, 1)) * 100)
        center_performance.append({
            "name": c.name,
            "performance": min(perf, 100),
            "total_slots": cap,
            "booked": actual_booked
        })

    center_performance.sort(key=lambda x: x["performance"], reverse=True)
    center_performance = center_performance[:4]

    return {
        "metrics": {
            "total_farmers": display_farmers,
            "procurement_centers": display_centers,
            "total_procurements": display_procurements,
            "total_payments": display_payments,
        },
        "procurements_trend": procurements_trend,
        "crop_distribution": crop_distribution,
        "recent_activities": recent_activities,
        "center_performance": center_performance,
        "timeframe": timeframe,
    }

@router.get("/centers")
async def get_admin_centers(db: AsyncSession = Depends(get_db)):
    centers = (await db.scalars(select(ProcurementCenter).order_by(ProcurementCenter.id))).all()
    result = []
    for c in centers:
        utilization = round((c.current_capacity / max(c.daily_capacity, 1)) * 100)
        result.append({
            "id": c.id,
            "name": c.name,
            "state": c.state,
            "district": c.district,
            "village": c.village,
            "address": c.address,
            "daily_capacity": c.daily_capacity,
            "current_capacity": c.current_capacity,
            "utilization": utilization,
            "opening_time": c.opening_time,
            "closing_time": c.closing_time,
            "status": c.status,
            "pincode": c.pincode,
        })
    return result

@router.get("/centers/{center_id}")
async def get_admin_center_details(center_id: int, db: AsyncSession = Depends(get_db)):
    center = await db.get(ProcurementCenter, center_id)
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
        
    from models.slot import Slot
    slots = (await db.scalars(select(Slot).where(Slot.center_id == center_id).order_by(Slot.start_time))).all()
    
    from models.produce import Produce
    produces = (await db.scalars(select(Produce).where(Produce.center_id == center_id))).all()
    
    utilization = round((center.current_capacity / max(center.daily_capacity, 1)) * 100)
    
    return {
        "id": center.id,
        "name": center.name,
        "state": center.state,
        "district": center.district,
        "village": center.village,
        "address": center.address,
        "daily_capacity": center.daily_capacity / 100,
        "current_capacity": center.current_capacity / 100,
        "utilization": utilization,
        "opening_time": center.opening_time,
        "closing_time": center.closing_time,
        "status": center.status,
        "pincode": center.pincode,
        "latitude": center.latitude,
        "longitude": center.longitude,
        "slots": [{
            "id": s.id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "capacity": s.capacity,
            "booked_count": s.booked_count,
            "status": s.status,
        } for s in slots],
        "crops": [{
            "id": p.id,
            "name": p.produce_name,
            "price_per_kg": p.price_per_kg
        } for p in produces]
    }

@router.post("/centers")
async def create_admin_center(data: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    new_center = ProcurementCenter(
        name=data.get("name", "New Procurement Center"),
        state=data.get("state", "Uttar Pradesh"),
        district=data.get("district", "Central District"),
        village=data.get("village", "Mandi Village"),
        address=data.get("address", "Main Market Yard"),
        pincode=int(data.get("pincode", 201301)),
        daily_capacity=int(data.get("daily_capacity", 150)) * 100,
        current_capacity=0,
        opening_time=data.get("opening_time", "08:00 AM"),
        closing_time=data.get("closing_time", "06:00 PM"),
        latitude=data.get("latitude", None),
        longitude=data.get("longitude", None),
        status=data.get("status", "Active"),
        created_by=1,
        created_at=datetime.now(),
    )
    produces = data.get("crops", [])
    db.add(new_center)
    await db.flush()

    for p in produces:
        produce_name=p.get("name")
        price=p.get("price_per_kg")

        produce = Produce(
            center_id=new_center.id,
            produce_name=produce_name,
            price_per_kg=price,
        )
        db.add(produce)
        
    await db.commit()
    await db.refresh(new_center)
    return {"success": True, "center_id": new_center.id}

@router.post("/slots")
async def create_admin_slot(data: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    from models.slot import Slot
    new_slot = Slot(
        center_id=int(data["center_id"]),
        start_time=data["start_time"],
        end_time=data["end_time"],
        capacity=int(data.get("capacity", 30)),
        booked_count=0,
        status=data.get("status", "Available"),
        created_at=datetime.now(),
    )
    db.add(new_slot)
    await db.commit()
    await db.refresh(new_slot)
    return {"success": True, "slot_id": new_slot.id}

@router.put("/slots/{slot_id}")
async def update_admin_slot(slot_id: int, data: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    from models.slot import Slot
    slot = await db.get(Slot, slot_id)
    if not slot:
        return {"success": False, "message": "Slot not found"}
    if "start_time" in data: slot.start_time = data["start_time"]
    if "end_time" in data: slot.end_time = data["end_time"]
    if "capacity" in data: slot.capacity = int(data["capacity"])
    if "status" in data: slot.status = data["status"]
    await db.commit()
    return {"success": True, "message": "Slot updated"}

@router.delete("/slots/{slot_id}")
async def delete_admin_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
    from models.slot import Slot
    from sqlalchemy import delete
    slot = await db.get(Slot, slot_id)
    if not slot:
        return {"success": False, "message": "Slot not found"}
    await db.execute(delete(Slot).where(Slot.id == slot_id))
    await db.commit()
    return {"success": True, "message": "Slot deleted"}


@router.get("/users")
async def get_admin_users(db: AsyncSession = Depends(get_db)):
    farmers = (await db.scalars(select(Farmer).order_by(Farmer.id))).all()
    result = []
    for f in farmers:
        booking_count = await db.scalar(
            select(func.count(Booking.id)).where(Booking.farmer_id == f.id)
        ) or 0
        result.append({
            "id": f.id,
            "name": f.full_name,
            "farmer_id": f.farmer_id or "N/A",
            "mobile": f.mobile_number,
            "location": f"{f.village}, {f.district} • {f.state}",
            "role": "Farmer",
            "total_bookings": booking_count,
            "status": "Verified",
        })
    return result

@router.get("/slots")
async def get_admin_slots(
    center_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Slot, ProcurementCenter).join(
        ProcurementCenter, Slot.center_id == ProcurementCenter.id
    ).order_by(Slot.id)
    if center_id:
        query = query.where(Slot.center_id == center_id)

    rows = (await db.execute(query)).all()
    
    # Fetch the latest booking date for each slot
    booking_dates = (await db.execute(
        select(Booking.slot_id, func.max(Booking.booked_at))
        .group_by(Booking.slot_id)
    )).all()
    date_map = {row[0]: row[1] for row in booking_dates}

    result = []
    for s, c in rows:
        b_date = date_map.get(s.id)
        if b_date:
            display_date = b_date.strftime("%b %d, %Y")
        elif s.created_at:
            display_date = s.created_at.strftime("%b %d, %Y")
        else:
            display_date = "-"

        result.append({
            "id": s.id,
            "center_id": c.id,
            "center_name": c.name,
            "date": display_date,
            "time": f"{s.start_time} - {s.end_time}",
            "capacity": s.capacity,
            "booked_count": s.booked_count,
            "available": max(0, s.capacity - s.booked_count),
            "status": s.status,
        })
    return result

@router.get("/procurements")
async def get_admin_procurements(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Booking, Farmer, ProcurementCenter)
            .join(Farmer, Booking.farmer_id == Farmer.id)
            .join(ProcurementCenter, Booking.procurement_center_id == ProcurementCenter.id)
            .order_by(desc(Booking.booked_at))
        )
    ).all()

    result = []
    for b, f, c in rows:
        result.append({
            "id": b.id,
            "token": f"A-{b.token_number:03d}",
            "farmer_name": f.full_name,
            "farmer_id": f.farmer_id or f"FK{100000 + f.id}",
            "center_name": c.name,
            "produce": b.produce,
            "produce_type": b.produce_type or "Standard Grade",
            "quantity_kg": b.quantity_kg,
            "total_price": b.total_price,
            "status": b.status,
            "date": b.booked_at.strftime("%d %b %Y"),
        })
    return result

@router.get("/payments")
async def get_admin_payments(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Payment, Booking, Farmer, PaymentProfile)
            .join(Booking, Payment.booking_id == Booking.id)
            .join(Farmer, Payment.farmer_id == Farmer.id)
            .outerjoin(PaymentProfile, PaymentProfile.farmer_id == Farmer.id)
            .order_by(desc(Payment.updated_at))
            .limit(20)
        )
    ).all()

    total_disbursed = sum(payment.amount for payment, _, _, _ in rows if payment.status == "Credited")
    pending_approvals = sum(
        payment.amount for payment, _, _, _ in rows
        if payment_status_label(payment) in {"Scheduled", "Processing", "On Hold"}
    )
    successful_tx = sum(1 for payment, _, _, _ in rows if payment.status == "Credited")
    processing_tx = sum(
        1 for payment, _, _, _ in rows
        if payment_status_label(payment) in {"Scheduled", "Processing", "On Hold"}
    )

    items = []
    for payment, booking, farmer, profile in rows:
        items.append({
            "id": payment.transaction_reference or f"PAY-{payment.id:05d}",
            "farmer_name": farmer.full_name,
            "farmer_id": farmer.farmer_id or f"FK{100000 + farmer.id}",
            "produce": booking.produce,
            "quantity_kg": booking.quantity_kg,
            "amount": payment.amount,
            "bank_account": mask_destination(profile.method, profile.destination_last4, profile.ifsc) if profile else "Not configured",
            "status": payment_status_label(payment),
            "date": payment.expected_settlement_date.strftime("%d %b %Y"),
        })

    return {
        "summary": {
            "total_disbursed": format_currency(total_disbursed),
            "pending_approvals": format_currency(pending_approvals),
            "successful_transactions": successful_tx,
            "processing": processing_tx,
        },
        "transactions": items,
    }
@router.delete("/delete-center/{center_id}")
async def delete_procurement_center(center_id: int, db: AsyncSession = Depends(get_db),access_token : str = Cookie(default=None)):

    if not access_token:
        return{"success": False,"message": "You are not logged in."}

    payload = jwt.decode(access_token,SECRET,algorithms=[ALGORITHM])

    if payload["role"] != "admin":
        return{"success": False,"message": "You are not authorized to perform this action."}
    
    center = await db.get(ProcurementCenter, center_id)

    if not center:
        return {"success": False, "message": "Center not found"}
        
    # Delete associated slots first
    from models.slot import Slot
    from sqlalchemy import delete
    await db.execute(delete(Slot).where(Slot.center_id == center_id))
    await db.execute(delete(Booking).where(Booking.procurement_center_id == center_id))
    await db.execute(delete(ProcurementCenter).where(ProcurementCenter.id == center_id))
    
    await db.commit()
    return {"success": True, "message": "Center deleted successfully"}

@router.put("/centers/{center_id}")
async def update_admin_center(center_id: int, data: Dict[str, Any], db: AsyncSession = Depends(get_db), access_token: str = Cookie(default=None)):
    if not access_token:
        return {"success": False, "message": "You are not logged in."}
    try:
        payload = jwt.decode(access_token, SECRET, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            return {"success": False, "message": "Unauthorized"}
    except:
        return {"success": False, "message": "Invalid token"}

    center = await db.get(ProcurementCenter, center_id)
    if not center:
        return {"success": False, "message": "Center not found"}

    # Update fields
    if "daily_capacity" in data:
        center.daily_capacity = int(data["daily_capacity"])
    if "status" in data:
        center.status = data["status"]
    if "opening_time" in data:
        center.opening_time = data["opening_time"]
    if "closing_time" in data:
        center.closing_time = data["closing_time"]
    
    await db.commit()
    return {"success": True, "message": "Center updated successfully"}


# ── GET /admin/centers/{center_id}/staff ──────────────────────────────────────
@router.get("/centers/{center_id}/staff")
async def get_center_staff(
    center_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: str = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    from models.staff import Staff
    staff_list = (await db.scalars(
        select(Staff).where(Staff.center_id == center_id).order_by(Staff.id)
    )).all()

    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "mobile_number": s.mobile_number,
            "staff_id": s.staff_id or f"ST-{s.id:04d}",
            "created_at": s.created_at.strftime("%d %b %Y") if s.created_at else "N/A",
        }
        for s in staff_list
    ]


# ── POST /admin/centers/{center_id}/staff ─────────────────────────────────────
@router.post("/centers/{center_id}/staff")
async def create_center_staff(
    center_id: int,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    access_token: str = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    center = await db.get(ProcurementCenter, center_id)
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    mobile = data.get("mobile_number", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()

    if not mobile or not password or not full_name:
        raise HTTPException(status_code=400, detail="full_name, mobile_number and password are required")

    from models.staff import Staff
    existing = await db.scalar(select(Staff).where(Staff.mobile_number == mobile))
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered as staff")

    from pwdlib import PasswordHash
    ph = PasswordHash.recommended()
    hashed = ph.hash(password)

    # Generate a staff_id like SC{center_id}-{serial}
    count = await db.scalar(select(func.count(Staff.id)).where(Staff.center_id == center_id)) or 0
    staff_id = f"SC{center_id}-{count + 1:03d}"

    new_staff = Staff(
        full_name=full_name,
        mobile_number=mobile,
        center_id=center_id,
        staff_id=staff_id,
        hashed_password=hashed,
        created_at=datetime.now(),
    )
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)

    return {
        "success": True,
        "staff": {
            "id": new_staff.id,
            "full_name": new_staff.full_name,
            "mobile_number": new_staff.mobile_number,
            "staff_id": new_staff.staff_id,
            "created_at": new_staff.created_at.strftime("%d %b %Y"),
        }
    }


# ── DELETE /admin/staff/{staff_id} ────────────────────────────────────────────
@router.delete("/staff/{staff_id}")
async def delete_staff(
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    access_token: str = Cookie(default=None)
):
    payload = isAuthenticated(access_token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    from models.staff import Staff
    staff = await db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    await db.delete(staff)
    await db.commit()
    return {"success": True, "message": "Staff removed successfully"}
