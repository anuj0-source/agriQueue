from database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime

class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, nullable=False)
    mobile_number = Column(String(15), unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    center_id = Column(Integer, ForeignKey("procurement_centers.id"), nullable=False)
    staff_id = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)