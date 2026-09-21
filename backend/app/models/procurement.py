from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from database import Base


class ProcurementRecord(Base):
    """The verified, on-site outcome of a farmer's booking."""

    __tablename__ = "procurement_records"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    actual_weight_kg = Column(Integer, nullable=False)
    deductions_kg = Column(Integer, nullable=False, default=0)
    net_weight_kg = Column(Integer, nullable=False)
    quality_grade = Column(String, nullable=False)
    moisture_percent = Column(Float, nullable=False, default=0)
    impurity_percent = Column(Float, nullable=False, default=0)
    rate_per_kg = Column(Integer, nullable=False)
    net_payable = Column(Integer, nullable=False)
    notes = Column(String, nullable=True)
    verified_by_staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    completed_at = Column(DateTime, nullable=False, default=datetime.now)
