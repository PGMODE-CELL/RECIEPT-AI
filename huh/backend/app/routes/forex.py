from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.forex import ForexRate
from app.auth import get_current_user

router = APIRouter(prefix="/api/forex", tags=["Forex"])


@router.get("/rates")
def list_rates(from_cur: str = "USD", to_cur: str = "INR", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rates = db.query(ForexRate).filter(
        ForexRate.from_currency == from_cur.upper(), ForexRate.to_currency == to_cur.upper()
    ).order_by(ForexRate.date.desc()).limit(30).all()
    return [{"id": r.id, "from": r.from_currency, "to": r.to_currency, "rate": float(r.rate), "date": r.date.isoformat()} for r in rates]


@router.post("/rates")
def add_rate(
    from_currency: str = Form(...), to_currency: str = Form(...),
    rate: float = Form(...), rate_date: str = Form(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    d = datetime.strptime(rate_date, "%Y-%m-%d").date() if rate_date else date.today()
    fr = ForexRate(from_currency=from_currency.upper(), to_currency=to_currency.upper(),
                   rate=Decimal(str(rate)), date=d)
    db.add(fr)
    db.commit()
    return {"message": f"Rate {from_currency.upper()}/{to_currency.upper()} = {rate}"}


@router.get("/convert")
def convert(amount: float, from_cur: str = "USD", to_cur: str = "INR",
            user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rate = db.query(ForexRate).filter(
        ForexRate.from_currency == from_cur.upper(), ForexRate.to_currency == to_cur.upper()
    ).order_by(ForexRate.date.desc()).first()
    if not rate:
        raise HTTPException(404, f"No rate for {from_cur}/{to_cur}")
    converted = Decimal(str(amount)) * rate.rate
    return {"from": from_cur.upper(), "to": to_cur.upper(), "rate": float(rate.rate), "original": amount, "converted": float(converted)}


@router.get("/revalue")
def revalue(org_currency: str = "INR", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rates = db.query(ForexRate).distinct(ForexRate.from_currency).order_by(ForexRate.from_currency, ForexRate.date.desc()).all()
    return {"base": org_currency, "rates": [{"currency": r.from_currency, "rate": float(r.rate), "date": r.date.isoformat()} for r in rates]}
