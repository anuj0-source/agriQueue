from database import Base
from sqlalchemy import Column,Integer,String, DateTime, Sequence
from sqlalchemy.orm import Mapped, mapped_column

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer,primary_key=True,index=True)
    farmer_id = Column(Integer,nullable=False)
    procurement_center_id = Column(Integer,nullable=False)
    status = Column(String,nullable=False)
    produce = Column(String,nullable=False)
    quantity_kg = Column(Integer,nullable=False)
    total_price = Column(Integer,nullable=False)
    slot_id = Column(Integer,nullable=False)
    produce_type = Column(String,nullable=False)
    estimated_wait_time = Column(Integer,nullable=False)
    booked_at = Column(DateTime,nullable=False)
    token_number = Column(Integer, nullable=False)
    served_by_staff_id = Column(Integer, nullable=True)