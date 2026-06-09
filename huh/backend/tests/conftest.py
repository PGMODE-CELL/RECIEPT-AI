import asyncio
import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key")
# Force sqlite for the test run regardless of any DATABASE_URL the CI exports,
# so the app engine created at import never needs a Postgres driver. The request
# DB dependency is overridden below to the dedicated sqlite test engine anyway.
os.environ["DATABASE_URL"] = "sqlite:///./test_receipt_ai.db"
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.pool import NullPool  # noqa: E402

from app.database import Base  # noqa: E402
from app.database_async import get_async_db  # noqa: E402
from main import app  # noqa: E402

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_receipt_ai.db"

# NullPool ensures every request opens (and closes) its own aiosqlite connection
# in whatever event loop the sync TestClient is currently using. Reusing a pooled
# connection across the per-request loops that TestClient spins up is what caused
# the suite to hang.
_test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)

_TestSessionLocal = async_sessionmaker(
    _test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with _TestSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()


app.dependency_overrides[get_async_db] = override_get_db


async def _recreate_tables():
    # A throwaway engine confined to this call's event loop, so DDL never shares
    # a connection with the request-handling loops.
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(_recreate_tables())
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def org_id(client, auth_headers):
    res = client.post(
        "/api/setup/create",
        headers=auth_headers,
        json={"name": "Test Org", "country": "US"},
    )
    return res.json()["org_id"]
