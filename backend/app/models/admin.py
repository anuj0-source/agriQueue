from database import Base
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column

class Admin(Base):
    __tablename__ = "admins"
    id=Column(Integer,primary_key=True)
    mobile_number=Column(String(50),unique=True,nullable=False)
    full_name=Column(String(100),nullable=False)
    hashed_password=Column(String(255),nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
