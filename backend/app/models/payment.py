from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from database import Base


class Payment(Base):
    """A settlement instruction created after a procurement is verified."""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    procurement_center_id = Column(Integer, ForeignKey("procurement_centers.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="Scheduled")
    expected_settlement_date = Column(DateTime, nullable=False)
    payment_batch = Column(String, nullable=True)
    transaction_reference = Column(String, nullable=True)
    receipt_number = Column(String, nullable=False, unique=True)
    settled_at = Column(DateTime, nullable=True)
    dispute_status = Column(String, nullable=False, default="None")
    dispute_reason = Column(String, nullable=True)
    dispute_created_at = Column(DateTime, nullable=True)
    dispute_resolution = Column(String, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
