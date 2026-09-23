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

import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

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

# Clean query params: asyncpg rejects libpq parameters like sslmode/ssl in the query string
parsed_url = urlparse(DATABASE_URL)
query_params = parse_qs(parsed_url.query)
has_ssl_requested = "sslmode" in query_params or "ssl" in query_params or "127.0.0.1" not in DATABASE_URL
query_params.pop("sslmode", None)
query_params.pop("ssl", None)

clean_query = urlencode(query_params, doseq=True)
DATABASE_URL = urlunparse((
    parsed_url.scheme,
    parsed_url.netloc,
    parsed_url.path,
    parsed_url.params,
    clean_query,
    parsed_url.fragment
))

# Configure connect_args with SSLContext for cloud providers (Aiven, Render, Supabase, Neon)
connect_args = {}
if has_ssl_requested:
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
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