from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from database import Base


class PaymentProfile(Base):
    """Masked payout metadata plus an encrypted payment destination."""

    __tablename__ = "payment_profiles"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, unique=True, index=True)
    method = Column(String, nullable=False)  # UPI or Bank Account
    account_holder = Column(String, nullable=False)
    destination_last4 = Column(String, nullable=False)
    encrypted_destination = Column(String, nullable=False)
    ifsc = Column(String, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
