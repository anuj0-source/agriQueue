from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from database import get_db
from models.procurement_center import ProcurementCenter
from models.booking import Booking
from schemas.procurement_center import ProcurementCenterResponse, SlotAvailability

router = APIRouter(
    prefix="/centers",
    tags=["procurement_centers"]
)

DEFAULT_SLOTS = [
    {"id": "slot-1", "slot_id": 1, "time": "09:00 - 10:00 AM", "capacity": 10},
    {"id": "slot-2", "slot_id": 2, "time": "10:00 - 11:00 AM", "capacity": 10},
    {"id": "slot-3", "slot_id": 3, "time": "11:00 - 12:00 PM", "capacity": 10},
    {"id": "slot-4", "slot_id": 4, "time": "12:00 - 01:00 PM", "capacity": 10},
    {"id": "slot-5", "slot_id": 5, "time": "01:00 - 02:00 PM", "capacity": 10},
]

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
    return centers

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
    for s in DEFAULT_SLOTS:
        booked = slot_counts.get(s["slot_id"], 0)
        available = max(0, s["capacity"] - booked)
        slots_data.append(
            SlotAvailability(
                id=s["id"],
                time=s["time"],
                available=available,
                status="available" if available > 0 else "full"
            )
        )
    return slots_data
