from fastapi import APIRouter, Request, Response, Depends
from database import get_db
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.login import LoginForm
from schemas.register import CreateAccountForm
from models.farmer import Farmer
from pwdlib import PasswordHash

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login")
async def login(data: LoginForm, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    
    user = await db.scalar(
        select(Farmer).where(Farmer.mobile_number == data.mobile_number)
    )
    
    if not user:
        response.status_code = 400
        return {"success": False, "message": "User not found"}

    hashed_pass = user.hashed_password
    entered_pass = data.password

    password_hasher = PasswordHash.recommended()

    is_pass_correct = password_hasher.verify(entered_pass, hashed_pass)
    
    if not is_pass_correct:
        response.status_code = 400
        return {"success": False, "message": "Invalid password"}
    
    return {
        "success": True,
        "message": "Login successful",
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
