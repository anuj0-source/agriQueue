from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BookingCreateRequest(BaseModel):
    procurement_center_id: int
    produce: str
    quantity_kg: Optional[int] = 1000
    slot_id: Optional[int] = 1
    produce_type: Optional[str] = "Standard"
    booking_date: Optional[str] = None
    slot_time: Optional[str] = "10:00 - 11:00 AM"

class BookingResponse(BaseModel):
    id: int
    farmer_id: int
    procurement_center_id: int
    center_name: Optional[str] = None
    center_address: Optional[str] = None
    status: str
    produce: str
    quantity_kg: int
    total_price: int
    slot_id: int
    slot_time: Optional[str] = "10:00 - 11:00 AM"
    produce_type: str
    estimated_wait_time: int
    booked_at: datetime
    formatted_date: Optional[str] = None
    token_number: int
    formatted_token: Optional[str] = None

    class Config:
        from_attributes = True
