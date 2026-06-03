from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.forex import ForexRate
from app.auth import get_current_user

router = APIRouter(prefix="/api/forex", tags=["Forex"])


@router.get("/rates")
async def list_rates(from_cur: str = "USD", to_cur: str = "INR", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ForexRate).filter(
            ForexRate.from_currency == from_cur.upper(), ForexRate.to_currency == to_cur.upper()
        ).order_by(ForexRate.date.desc()).limit(30)
    )
    rates = result.scalars().all()
    return [{"id": r.id, "from": r.from_currency, "to": r.to_currency, "rate": float(r.rate), "date": r.date.isoformat()} for r in rates]


@router.post("/rates")
async def add_rate(
    from_currency: str = Form(...), to_currency: str = Form(...),
    rate: float = Form(...), rate_date: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    d = datetime.strptime(rate_date, "%Y-%m-%d").date() if rate_date else date.today()
    fr = ForexRate(from_currency=from_currency.upper(), to_currency=to_currency.upper(),
                   rate=Decimal(str(rate)), date=d)
    db.add(fr)
    await db.commit()
    return {"message": f"Rate {from_currency.upper()}/{to_currency.upper()} = {rate}"}


@router.get("/convert")
async def convert(amount: float, from_cur: str = "USD", to_cur: str = "INR",
                  user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rate = (await db.execute(
        select(ForexRate).filter(
            ForexRate.from_currency == from_cur.upper(), ForexRate.to_currency == to_cur.upper()
        ).order_by(ForexRate.date.desc())
    )).scalar_one_or_none()
    if not rate:
        raise HTTPException(404, f"No rate for {from_cur}/{to_cur}")
    converted = Decimal(str(amount)) * rate.rate
    return {"from": from_cur.upper(), "to": to_cur.upper(), "rate": float(rate.rate), "original": amount, "converted": float(converted)}


@router.get("/revalue")
async def revalue(org_currency: str = "INR", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # distinct on columns not directly supported in all async dialects; use query approach
    result = await db.execute(
        select(ForexRate).distinct(ForexRate.from_currency).order_by(ForexRate.from_currency, ForexRate.date.desc())
    )
    rates = result.scalars().all()
    return {"base": org_currency, "rates": [{"currency": r.from_currency, "rate": float(r.rate), "date": r.date.isoformat()} for r in rates]}
