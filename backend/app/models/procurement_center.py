from database import Base
from sqlalchemy import Column,Integer,String, DateTime, Sequence
from sqlalchemy.orm import Mapped, mapped_column

class ProcurementCenter(Base):
    __tablename__ = "procurement_centers"
    id: Mapped[int] = mapped_column(
        Integer,
        Sequence("procurement_center_id_seq", start=1000, increment=1),
        primary_key=True
    )

    name = Column(String,nullable=False)
    state = Column(String,nullable=False)
    district = Column(String,nullable=False)
    village = Column(String,nullable=False)
    longitude = Column(String,nullable=True)
    latitude = Column(String,nullable=True)
    created_at = Column(DateTime,nullable=False)
    opening_time = Column(String,nullable=False)
    closing_time = Column(String,nullable=False)
    address=Column(String,nullable=False)
    pincode=Column(Integer,nullable=False)
    daily_capacity=Column(Integer,nullable=False)
    current_capacity=Column(Integer,nullable=False)
    status=Column(String,nullable=False)
    created_by=Column(Integer,nullable=False)