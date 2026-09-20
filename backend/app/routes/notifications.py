from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from database import get_db
from models.push_subscription import PushSubscription
from isAuthenticated import isAuthenticated
from typing import Optional
from fastapi import Cookie

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class PushSubscriptionSchema(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

@router.post("/subscribe")
async def subscribe_push(
    sub: PushSubscriptionSchema,
    access_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db)
):
    user = isAuthenticated(access_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        # Check if already exists
        result = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == sub.endpoint))
        existing = result.scalars().first()
        
        if existing:
            existing.user_id = user["id"]
            existing.role = user["role"]
            existing.p256dh = sub.p256dh
            existing.auth = sub.auth
        else:
            new_sub = PushSubscription(
                user_id=user["id"],
                role=user["role"],
                endpoint=sub.endpoint,
                p256dh=sub.p256dh,
                auth=sub.auth
            )
            db.add(new_sub)
        
        await db.commit()
        return {"success": True, "message": "Subscribed successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

import os
import json
from pywebpush import webpush, WebPushException

def send_push_notification(subscription: PushSubscription, payload_data: dict):
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
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={"sub": "mailto:admin@agriqueue.com"}
        )
        return True
    except WebPushException as ex:
        print("Web Push Error:", repr(ex))
        return False
    except Exception as e:
        print("Push error:", str(e))
        return False

