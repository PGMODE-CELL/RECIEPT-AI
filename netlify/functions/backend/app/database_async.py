import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.exc import OperationalError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.config import settings
from app.database import Base

logger = logging.getLogger("receipt_ai")

def _get_async_url(url: str) -> str:
    if url.startswith("sqlite"):
        return url.replace("sqlite://", "sqlite+aiosqlite://")
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

ASYNC_DATABASE_URL = _get_async_url(settings.DATABASE_URL)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20 if "postgresql" in ASYNC_DATABASE_URL else 5,
    max_overflow=40 if "postgresql" in ASYNC_DATABASE_URL else 10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(OperationalError),
    before_sleep=lambda retry_state: logger.warning(f"DB connection retry {retry_state.attempt_number}...")
)
async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_async_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()
