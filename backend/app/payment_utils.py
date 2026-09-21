"""Shared payment helpers and display-safe serializers."""

import base64
import hashlib
import os
from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import Payment


def _fernet() -> Fernet:
    """Use a dedicated key when configured, otherwise derive a stable dev key.

    Deployments should set PAYMENT_PROFILE_ENCRYPTION_KEY to a Fernet key. The
    fallback keeps local development functional while ensuring a destination is
    never persisted in plain text.
    """
    configured_key = os.getenv("PAYMENT_PROFILE_ENCRYPTION_KEY")
    if configured_key:
        return Fernet(configured_key.encode())
    seed = os.getenv("SECRET_KEY", "agriqueue-local-payment-profile-key").encode()
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(seed).digest()))


def encrypt_destination(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def mask_destination(method: str, last4: str, ifsc: str | None = None) -> str:
    if method == "UPI":
        return f"UPI ••••{last4}"
    if ifsc:
        return f"Bank account ••••{last4} · {ifsc}"
    return f"Bank account ••••{last4}"


async def create_or_update_payment(
    db: AsyncSession,
    *,
    booking_id: int,
    farmer_id: int,
    center_id: int,
    amount: int,
    status: str = "Scheduled",
    transaction_reference: str | None = None,
    payment_batch: str | None = None,
    preserve_settlement: bool = True,
) -> Payment:
    """Create the settlement record associated with a verified procurement."""
    payment = await db.scalar(select(Payment).where(Payment.booking_id == booking_id))
    settled_at = datetime.now() if status == "Credited" else None
    if not payment:
        payment = Payment(
            booking_id=booking_id,
            farmer_id=farmer_id,
            procurement_center_id=center_id,
            amount=amount,
            status=status,
            expected_settlement_date=datetime.now() if status == "Credited" else (datetime.now() + timedelta(days=2)),
            settled_at=settled_at,
            transaction_reference=transaction_reference,
            payment_batch=payment_batch,
            receipt_number=f"RCP-{booking_id:06d}",
        )
        db.add(payment)
        await db.flush()
    else:
        if payment.status not in {"Credited", "Processing"} or not preserve_settlement:
            payment.amount = amount
        if status == "Credited":
            payment.status = "Credited"
            payment.settled_at = settled_at
            if transaction_reference:
                payment.transaction_reference = transaction_reference
            if payment_batch:
                payment.payment_batch = payment_batch
    return payment


def payment_status_label(payment: Payment) -> str:
    if payment.dispute_status == "Open":
        return "On Hold"
    return payment.status
