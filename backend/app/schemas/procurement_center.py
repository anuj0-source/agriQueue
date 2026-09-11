from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProcurementCenterResponse(BaseModel):
    id: int
    name: str
    state: str
    district: str
    village: str
    longitude: Optional[str] = None
    latitude: Optional[str] = None
    opening_time: str
    closing_time: str
    address: str
    pincode: int
    daily_capacity: int
    current_capacity: int
    status: str
    crops: Optional[str] = "Wheat, Rice, Maize"
    available_slots: Optional[int] = 20

    class Config:
        from_attributes = True

class SlotAvailability(BaseModel):
    id: str
    time: str
    available: int
    status: str  # "available" | "full"
