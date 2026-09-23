from contextlib import asynccontextmanager
from datetime import timedelta
from fastapi import FastAPI
from sqlalchemy import select
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.centers import router as centers_router
from routes.bookings import router as bookings_router
from routes.queue import router as queue_router
from routes.admin import router as admin_router
from routes.staff import router as staff_router
from routes.notifications import router as notifications_router
from routes.agent import router as agent_router
from database import Base, engine, AsyncSessionLocal
import models.farmer
import models.procurement_center
import models.booking
import models.slot
import models.produce
import models.admin
import models.staff
import models.push_subscription
import models.procurement
import models.payment
import models.payment_profile
import models.agent_audit
from models.booking import Booking
from models.payment import Payment


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # The app predates explicit payment records. Create safe, editable payment
    # instructions for legacy completed bookings the first time this version runs.
    async with AsyncSessionLocal() as session:
        completed_bookings = (await session.scalars(
            select(Booking).where(Booking.status == "Completed")
        )).all()
        existing_booking_ids = set((await session.scalars(select(Payment.booking_id))).all())
        for booking in completed_bookings:
            if booking.id not in existing_booking_ids:
                session.add(Payment(
                    booking_id=booking.id,
                    farmer_id=booking.farmer_id,
                    procurement_center_id=booking.procurement_center_id,
                    amount=booking.total_price,
                    status="Processing",
                    expected_settlement_date=booking.booked_at + timedelta(days=2),
                    receipt_number=f"RCP-{booking.id:06d}",
                ))
        await session.commit()
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://agri-queue-blond.vercel.app",
        "http://agri-queue-blond.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(centers_router)
app.include_router(bookings_router)
app.include_router(queue_router)
app.include_router(admin_router)
app.include_router(staff_router)
app.include_router(notifications_router)
app.include_router(agent_router)

@app.api_route("/", methods=["GET", "HEAD"])
async def read_root():
    return {"status": "ok", "message": "This is AgriQueue backend"}


@app.api_route("/health", methods=["GET", "HEAD"])
async def get_health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
