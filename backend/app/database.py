import os
from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path)
load_dotenv()
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from os import getenv

DATABASE_URL = getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is missing or empty. "
        "Please check your backend/app/.env file or deployment environment variables."
    )

# Normalize localhost to 127.0.0.1 for asyncpg compatibility
if "localhost" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("localhost", "127.0.0.1")

# Standardize dialect and async driver for PostgreSQL (Render, Supabase, Neon, etc.)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgres+asyncpg://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session