import asyncio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database_async import get_async_db
from main import app

# Debug: verify the function identity
import app.routes.auth as auth_mod
print(f"[CONFTEST] get_async_db id = {id(get_async_db)}")
print(f"[CONFTEST] auth.get_db id = {id(auth_mod.get_db)}")
print(f"[CONFTEST] Same? {get_async_db is auth_mod.get_db}")

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_receipt_ai.db"

_test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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


# Register override
app.dependency_overrides[get_async_db] = override_get_db
print(f"[CONFTEST] Override registered for {get_async_db}")
print(f"[CONFTEST] Override count: {len(app.dependency_overrides)}")


@pytest.fixture(autouse=True)
def setup_db():
    engine = _test_engine
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_create_tables(engine))
    yield
    loop.run_until_complete(_drop_tables(engine))
    loop.close()


async def _create_tables(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _drop_tables(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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