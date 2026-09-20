from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.centers import router as centers_router
from routes.bookings import router as bookings_router
from routes.queue import router as queue_router
from routes.admin import router as admin_router
from routes.staff import router as staff_router
from routes.notifications import router as notifications_router
from database import Base, engine, AsyncSessionLocal
import models.farmer
import models.procurement_center
import models.booking
import models.slot
import models.produce
import models.admin
import models.staff
import models.push_subscription


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
    ],
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

@app.get("/")
async def read_root():
    return {"message": "This is AgriQueue backend"}


@app.get("/health")
async def get_health():
    return {"status": "ok"}
