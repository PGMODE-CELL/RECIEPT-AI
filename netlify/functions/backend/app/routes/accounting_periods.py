from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, UTC
from app.database_async import get_async_db as get_db
from app.models.accounting_period import AccountingPeriod
from app.auth import get_current_user

router = APIRouter(prefix="/api/accounting-periods", tags=["Accounting Periods"])


@router.post("/{org_id}")
async def create_period(org_id: int, name: str = "", start_date: str = None, end_date: str = None, is_fiscal_year: str = "no", notes: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    sd = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.now(UTC)
    ed = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now(UTC)
    period = AccountingPeriod(org_id=org_id, name=name, start_date=sd, end_date=ed, is_fiscal_year=(is_fiscal_year == "yes"), notes=notes)
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return {"success": True, "period": {"id": period.id, "name": period.name, "start_date": str(period.start_date.date()), "end_date": str(period.end_date.date()), "is_closed": period.is_closed}}


@router.get("/{org_id}")
async def list_periods(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    periods = (await db.execute(select(AccountingPeriod).filter(AccountingPeriod.org_id == org_id).order_by(AccountingPeriod.start_date.desc()))).scalars().all()
    return {"periods": [{"id": p.id, "name": p.name, "start_date": str(p.start_date.date()), "end_date": str(p.end_date.date()), "is_closed": p.is_closed, "is_fiscal_year": p.is_fiscal_year} for p in periods]}


@router.post("/{org_id}/{period_id}/close")
async def close_period(org_id: int, period_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    period = (await db.execute(select(AccountingPeriod).filter(AccountingPeriod.id == period_id, AccountingPeriod.org_id == org_id))).scalar_one_or_none()
    if not period:
        raise HTTPException(404, "Period not found")
    if period.is_closed:
        raise HTTPException(400, "Period already closed")
    period.is_closed = True
    period.closed_by = user.id
    period.closed_at = datetime.now(UTC)
    await db.commit()
    return {"success": True, "period": {"id": period.id, "name": period.name, "is_closed": True}}


@router.post("/{org_id}/{period_id}/open")
async def open_period(org_id: int, period_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    period = (await db.execute(select(AccountingPeriod).filter(AccountingPeriod.id == period_id, AccountingPeriod.org_id == org_id))).scalar_one_or_none()
    if not period:
        raise HTTPException(404, "Period not found")
    period.is_closed = False
    period.closed_by = None
    period.closed_at = None
    await db.commit()
    return {"success": True, "period": {"id": period.id, "name": period.name, "is_closed": False}}
