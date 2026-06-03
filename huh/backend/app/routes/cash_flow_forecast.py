from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.cash_flow_forecast import CashFlowForecast
from app.auth import get_current_user

router = APIRouter(prefix="/api/cash-flow-forecast", tags=["Cash Flow Forecast"])


@router.get("/{org_id}")
async def list_forecasts(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(CashFlowForecast).filter(CashFlowForecast.org_id == org_id))).scalar()
    result = await db.execute(
        select(CashFlowForecast)
        .filter(CashFlowForecast.org_id == org_id)
        .order_by(CashFlowForecast.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": f.id, "org_id": f.org_id, "type": f.type,
            "category": f.category, "description": f.description,
            "amount": float(f.amount), "frequency": f.frequency,
            "start_date": f.start_date.isoformat() if f.start_date else None,
            "created_at": f.created_at.isoformat(),
        } for f in items],
    }


@router.post("/{org_id}")
async def create_forecast(
    org_id: int,
    type: str = Form(...),
    category: str = Form(None),
    description: str = Form(None),
    amount: float = Form(0),
    frequency: str = Form("one-time"),
    start_date: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    forecast = CashFlowForecast(
        org_id=org_id, type=type, category=category,
        description=description, amount=amount, frequency=frequency,
        start_date=date.fromisoformat(start_date),
    )
    db.add(forecast)
    await db.commit()
    await db.refresh(forecast)
    return {"id": forecast.id, "message": "Forecast entry created"}


@router.delete("/{org_id}/{forecast_id}")
async def delete_forecast(
    org_id: int,
    forecast_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    forecast = (await db.execute(
        select(CashFlowForecast)
        .filter(CashFlowForecast.id == forecast_id, CashFlowForecast.org_id == org_id)
    )).scalar_one_or_none()
    if not forecast:
        raise HTTPException(404, "Forecast entry not found")
    await db.delete(forecast)
    await db.commit()
    return {"message": "Forecast entry deleted"}
