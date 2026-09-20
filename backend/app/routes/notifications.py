from fastapi import APIRouter, Depends, HTTPException, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from database import get_db
from models.push_subscription import PushSubscription
from isAuthenticated import isAuthenticated
from typing import Optional
import os
import json
from pywebpush import webpush, WebPushException

router = APIRouter(tags=["notifications"])

class PushSubscriptionSchema(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

async def _handle_subscribe(sub: PushSubscriptionSchema, access_token: Optional[str], db: AsyncSession):
    user = isAuthenticated(access_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = user.get("user_id") or user.get("id")
    role = user.get("role", "farmer")

    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid user identification in token")

    try:
        # Check if subscription already exists for this endpoint
        result = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == sub.endpoint))
        existing = result.scalars().first()

        if existing:
            existing.user_id = user_id
            existing.role = role
            existing.p256dh = sub.p256dh
            existing.auth = sub.auth
        else:
            new_sub = PushSubscription(
                user_id=user_id,
                role=role,
                endpoint=sub.endpoint,
                p256dh=sub.p256dh,
                auth=sub.auth
            )
            db.add(new_sub)

        await db.commit()
        print(f"[push] Subscribed user {user_id} ({role}) successfully")
        return {"success": True, "message": "Subscribed successfully"}
    except Exception as e:
        await db.rollback()
        print(f"[push] Failed to save subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notifications/subscribe")
async def subscribe_push_direct(
    sub: PushSubscriptionSchema,
    access_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db)
):
    return await _handle_subscribe(sub, access_token, db)

@router.post("/api/notifications/subscribe")
async def subscribe_push_api(
    sub: PushSubscriptionSchema,
    access_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db)
):
    return await _handle_subscribe(sub, access_token, db)


def send_push_notification(subscription: PushSubscription, payload_data: dict):
    vapid_key = os.getenv("VAPID_PRIVATE_KEY")
    if not vapid_key:
        print("[push] VAPID_PRIVATE_KEY is not set in environment!")
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=json.dumps(payload_data),
            vapid_private_key=vapid_key,
            vapid_claims={"sub": "mailto:admin@agriqueue.com"}
        )
        print(f"[push] Notification sent successfully to user {subscription.user_id}: {payload_data.get('title')}")
        return True
    except WebPushException as ex:
        print(f"[push] WebPushException for user {subscription.user_id}: {repr(ex)}")
        return False
    except Exception as e:
        print(f"[push] Push error for user {subscription.user_id}: {e}")
        return False
