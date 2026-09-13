from datetime import datetime
from database import Base
from sqlalchemy import Column, Integer, String, DateTime, Sequence, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

class Produce(Base):
    __tablename__ = "produces"
    id = Column(Integer,primary_key=True,index=True)
    center_id = Column(Integer,ForeignKey("procurement_centers.id"),nullable=False)
    produce_name = Column(String,nullable=False)
    price_per_kg = Column(Integer,nullable=False)
    