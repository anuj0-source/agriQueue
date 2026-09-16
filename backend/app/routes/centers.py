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
    produces_result = await db.scalars(select(Produce))
    all_produces = produces_result.all()
    
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
            "available_slots": c.daily_capacity - c.current_capacity
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

    # Count existing bookings per slot
    query = select(Booking.slot_id).where(
        Booking.procurement_center_id == center_id,
        Booking.status != "Cancelled"
    )
    res = await db.scalars(query)
    booked_slots = res.all()
    slot_counts = {}
    for sid in booked_slots:
        slot_counts[sid] = slot_counts.get(sid, 0) + 1

    slots_data = []

    slots = (await db.scalars(select(Slot).where(Slot.center_id == center_id).order_by(Slot.start_time))).all()
    for s in slots:
        available = max(0, s.capacity - s.booked_count)
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