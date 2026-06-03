from fastapi import APIRouter
from sqlalchemy import select, text
from app.database_async import AsyncSessionLocal
from app.cache import redis_client
from datetime import datetime, timezone

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("")
async def health_check():
    db_status = "unknown"
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(select(text("1")))
            db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "ok" if redis_client else "not_configured"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception as e:
            redis_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "redis": redis_status,
    }
