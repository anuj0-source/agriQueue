from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from database import get_db
from models.procurement_center import ProcurementCenter
from models.booking import Booking
from schemas.procurement_center import ProcurementCenterResponse, SlotAvailability
from models.slot import Slot

router = APIRouter(
    prefix="/centers",
    tags=["procurement_centers"]
)

@router.get("", response_model=List[ProcurementCenterResponse])
async def list_centers(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProcurementCenter)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            ProcurementCenter.name.ilike(search_pattern) |
            ProcurementCenter.district.ilike(search_pattern) |
            ProcurementCenter.address.ilike(search_pattern)
        )
    result = await db.scalars(query)
    centers = result.all()
    
    from models.produce import Produce
    from sqlalchemy import func
    from datetime import datetime, date

    produces_result = await db.scalars(select(Produce))
    all_produces = produces_result.all()
    
    # Calculate available capacity for today (only counting non-expired slots)
    today_date = date.today()
    now_time = datetime.now().time()
    
    # 1. Get all bookings for today grouped by slot
    bookings_query = select(
        Booking.slot_id, 
        Booking.procurement_center_id,
        func.sum(Booking.quantity_kg).label('total_kg')
    ).where(
        func.date(Booking.booked_at) == today_date,
        Booking.status != "Cancelled"
    ).group_by(Booking.slot_id, Booking.procurement_center_id)
    
    res_bookings = await db.execute(bookings_query)
    today_slot_bookings = {row.slot_id: row.total_kg or 0 for row in res_bookings.all()}
    
    # 2. Get all slots and sum capacity of non-expired ones
    slots_result = await db.scalars(select(Slot))
    all_slots = slots_result.all()
    
    center_available_today = {}
    for s in all_slots:
        try:
            slot_end = datetime.strptime(s.end_time, "%H:%M").time()
            if slot_end > now_time:
                booked_kg = today_slot_bookings.get(s.id, 0)
                avail = max(0, s.capacity - booked_kg)
                center_available_today[s.center_id] = center_available_today.get(s.center_id, 0) + avail
        except Exception:
            pass

    response = []
    for c in centers:
        c_dict = {
            "id": c.id,
            "name": c.name,
            "state": c.state,
            "district": c.district,
            "village": c.village,
            "longitude": c.longitude,
            "latitude": c.latitude,
            "opening_time": c.opening_time,
            "closing_time": c.closing_time,
            "address": c.address,
            "pincode": c.pincode,
            "daily_capacity": c.daily_capacity,
            "current_capacity": c.current_capacity,
            "status": c.status,
            "crops": [
                {"id": p.id, "name": p.produce_name, "price_per_kg": p.price_per_kg} 
                for p in all_produces if p.center_id == c.id
            ],
            "available_slots": int(center_available_today.get(c.id, 0))
        }
        response.append(c_dict)
        
    return response

@router.get("/{center_id}", response_model=ProcurementCenterResponse)
async def get_center(
    center_id: int,
    db: AsyncSession = Depends(get_db)
):
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    if not center:
        raise HTTPException(status_code=404, detail="Procurement center not found")
    return center

@router.get("/{center_id}/slots", response_model=List[SlotAvailability])
async def get_center_slots(
    center_id: int,
    date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    center = await db.scalar(select(ProcurementCenter).where(ProcurementCenter.id == center_id))
    if not center:
        raise HTTPException(status_code=404, detail="Procurement center not found")

    # Count existing bookings per slot for the specific date
    from sqlalchemy import func
    from datetime import datetime
    
    query = select(Booking.slot_id, func.sum(Booking.quantity_kg).label('total_kg')).where(
        Booking.procurement_center_id == center_id,
        Booking.status != "Cancelled"
    )
    
    if date:
        try:
            target_date = datetime.fromisoformat(date.replace("Z", "+00:00")).date()
            query = query.where(func.date(Booking.booked_at) == target_date)
        except Exception:
            pass
            
    query = query.group_by(Booking.slot_id)
    res = await db.execute(query)
    booked_slots = res.all()
    slot_booked_kg = {row.slot_id: row.total_kg or 0 for row in booked_slots}

    slots_data = []
    slots = (await db.scalars(select(Slot).where(Slot.center_id == center_id).order_by(Slot.start_time))).all()
    for s in slots:
        booked_kg = slot_booked_kg.get(s.id, 0)
        available = max(0, s.capacity - booked_kg)
        available_quintals = int(available / 100)
        slots_data.append(
            SlotAvailability(
                id=str(s.id),
                time=f"{s.start_time} - {s.end_time}",
                available=available_quintals,
                status="available" if available_quintals > 0 else "full"
            )
        )
    return slots_data