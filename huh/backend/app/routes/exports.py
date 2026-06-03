from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/api/exports", tags=["Exports"])


@router.get("/{org_id}/transactions")
async def export_transactions(
    org_id: int,
    format: str = Query("csv"),
    date_from: str = Query(None),
    date_to: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "data": [],
        "format": format,
        "filename": f"transactions_{org_id}.csv",
    }


@router.get("/{org_id}/invoices")
async def export_invoices(
    org_id: int,
    format: str = Query("csv"),
    date_from: str = Query(None),
    date_to: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "data": [],
        "format": format,
        "filename": f"invoices_{org_id}.csv",
    }


@router.get("/{org_id}/bills")
async def export_bills(
    org_id: int,
    format: str = Query("csv"),
    date_from: str = Query(None),
    date_to: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "data": [],
        "format": format,
        "filename": f"bills_{org_id}.csv",
    }
