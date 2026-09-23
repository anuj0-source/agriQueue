from fastapi import APIRouter, Request, Response, Depends, Cookie
from typing import Optional
from database import get_db
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.login import LoginForm
from schemas.register import CreateAccountForm
from models.farmer import Farmer
from pwdlib import PasswordHash
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
from models.admin import Admin
from models.staff import Staff

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

def create_token(user_id : int,role:str):
    payload={
        "user_id":user_id,
        "role":role,
        "exp": datetime.now(timezone.utc)+timedelta(days=7)
    }

    token=jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)
    return token
    
def verify_token(token:str):
    try:
        payload=jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
        
@router.post("/login")
async def login(
    data: LoginForm,
    role: str = "farmer",
    request: Request = None,
    response: Response = None,
    db: AsyncSession = Depends(get_db)
):
    user = None
    role_lower = (role or "farmer").lower()

    if role_lower == "admin":
        user = await db.scalar(
            select(Admin).where(Admin.mobile_number == data.mobile_number)
        )
    elif role_lower == "staff":
        user = await db.scalar(
            select(Staff).where(Staff.mobile_number == data.mobile_number)
        )
    else:
        user = await db.scalar(
            select(Farmer).where(Farmer.mobile_number == data.mobile_number)
        )
    
    if not user:
        response.status_code = 400
        return {"success": False, "message": f"{role_lower} not found or Invalid password"}

    hashed_pass = user.hashed_password
    entered_pass = data.password

    password_hasher = PasswordHash.recommended()

    is_pass_correct = password_hasher.verify(entered_pass, hashed_pass)
    
    if not is_pass_correct:
        response.status_code = 400
        return {"success": False, "message": "User not found or Invalid password"}
    
    token = create_token(user.id, role_lower)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=7 * 24 * 60 * 60,
    )

    return {
        "success": True,
        "message": "Login successful",
        "role": role,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "mobile_number": user.mobile_number,
            "farmer_id": getattr(user, "farmer_id", None),
            "state": getattr(user, "state", None),
            "district": getattr(user, "district", None),
            "village": getattr(user, "village", None),
            "role": role_lower,
        }
    }

@router.post("/create-account")
async def create_account(data: CreateAccountForm, request: Request, response: Response, db: AsyncSession = Depends(get_db)):

    existing_user = await db.scalar(
        select(Farmer).where(Farmer.mobile_number == data.mobile_number)
    )
    if existing_user:
        response.status_code = 400
        return {"success": False, "message": "Mobile number is already registered"}

    ph = PasswordHash.recommended()
    hashed_pass = ph.hash(data.password)
    
    user = Farmer(
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        farmer_id=data.farmer_id if data.farmer_id else None,
        state=data.state,
        district=data.district,
        village=data.village,
        hashed_password=hashed_pass
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "success": True,
        "message": "Account created successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "mobile_number": user.mobile_number,
            "farmer_id": user.farmer_id,
            "state": user.state,
            "district": user.district,
            "village": user.village,
        }
    }

@router.get("/me")
async def get_me(
    response: Response,
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None)
):
    payload = verify_token(access_token) if access_token else None
    if not payload:
        response.status_code = 401
        return {"authenticated": False, "message": "Not authenticated"}

    user_id = payload.get("user_id")
    role = payload.get("role", "farmer")
    if role == "admin":
        user = await db.scalar(select(Admin).where(Admin.id == user_id))
    elif role == "staff":
        user = await db.scalar(select(Staff).where(Staff.id == user_id))
    else:
        user = await db.scalar(select(Farmer).where(Farmer.id == user_id))

    if not user:
        response.status_code = 401
        return {"authenticated": False, "message": "User not found"}

    return {
        "authenticated": True,
        "role": role,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "mobile_number": user.mobile_number,
            "farmer_id": getattr(user, "farmer_id", None),
            "staff_id": getattr(user, "staff_id", None),
            "center_id": getattr(user, "center_id", None),
            "state": getattr(user, "state", None),
            "district": getattr(user, "district", None),
            "village": getattr(user, "village", None),
            "role": role,
        }
    }

@router.post("/logout")
async def logout(request: Request, response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="none",
        secure=True
    )
    return {
        "success": True,
        "message": "Logout successful"
    }