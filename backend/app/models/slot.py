from datetime import datetime
from database import Base
from sqlalchemy import Column, Integer, String, DateTime, Sequence, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

class Slot(Base):
    __tablename__ = 'slots'

    id : Mapped[int]=mapped_column(Integer,autoincrement=True,primary_key=True)

    center_id : Mapped[int]=mapped_column(ForeignKey("procurement_centers.id"), nullable=False)
    start_time : Mapped[str]=mapped_column(String,nullable=False)
    end_time : Mapped[str]=mapped_column(String,nullable=False)
    capacity : Mapped[int]=mapped_column(Integer,nullable=False)
    booked_count : Mapped[int]=mapped_column(Integer,nullable=False)
    status : Mapped[str]=mapped_column(String,nullable=False)
    created_at : Mapped[datetime]=mapped_column(DateTime,nullable=False)