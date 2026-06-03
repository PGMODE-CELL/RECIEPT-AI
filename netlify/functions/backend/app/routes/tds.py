from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.tds import TdsRate, TdsDeduction, TdsCertificate
from app.auth import get_current_user

router = APIRouter(prefix="/api/tds", tags=["TDS"])


# --- TDS Rate CRUD ---

@router.get("/{org_id}/rates")
async def list_rates(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rates = (await db.execute(select(TdsRate).filter(TdsRate.org_id == org_id))).scalars().all()
    return [{"id": r.id, "section": r.section, "name": r.name, "rate": float(r.rate),
             "threshold": float(r.threshold), "applicable_to": r.applicable_to} for r in rates]


@router.post("/{org_id}/rates")
async def add_rate(
    org_id: int,
    section: str = Form(...), name: str = Form(...), rate: float = Form(...),
    threshold: float = Form(0), applicable_to: str = Form("all"),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    r = TdsRate(org_id=org_id, section=section, name=name, rate=Decimal(str(rate)),
                threshold=Decimal(str(threshold)), applicable_to=applicable_to)
    db.add(r)
    await db.commit()
    return {"id": r.id, "message": f"TDS rate for Section {section} ({name}) = {rate}%"}


# --- TDS Deduction CRUD ---

@router.get("/{org_id}/deductions")
async def list_deductions(org_id: int, section: str = "", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(TdsDeduction).filter(TdsDeduction.org_id == org_id)
    if section:
        stmt = stmt.filter(TdsDeduction.section == section)
    ds = (await db.execute(stmt.order_by(TdsDeduction.date.desc()))).scalars().all()
    return [{
        "id": d.id, "section": d.section, "deductee_name": d.deductee_name,
        "deductee_pan": d.deductee_pan, "amount": float(d.amount),
        "tds_amount": float(d.tds_amount), "rate": float(d.rate),
        "date": d.date.isoformat(), "is_salary": d.is_salary, "remarks": d.remarks,
    } for d in ds]


@router.post("/{org_id}/compute")
async def compute_tds(
    org_id: int,
    section: str = Form(...), deductee_name: str = Form(...),
    deductee_pan: str = Form(""), amount: float = Form(...),
    date_str: str = Form(""), is_salary: bool = Form(False),
    remarks: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    rate_config = (await db.execute(select(TdsRate).filter(
        TdsRate.org_id == org_id, TdsRate.section == section
    ))).scalar_one_or_none()
    if not rate_config:
        raise HTTPException(400, "TDS rate not configured for this section")

    amt = Decimal(str(amount))
    threshold = rate_config.threshold or Decimal("0")
    if amt < threshold:
        raise HTTPException(400, f"Amount ${float(amt):.2f} below Section {section} threshold of ${float(threshold):.2f}")

    tds_rate = rate_config.rate / Decimal("100")
    tds_amount = (amt * tds_rate).quantize(Decimal("0.01"))

    d = TdsDeduction(
        org_id=org_id, section=section, deductee_name=deductee_name,
        deductee_pan=deductee_pan, amount=amt, tds_amount=tds_amount,
        rate=rate_config.rate,         date=datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else date.today(),
        is_salary=is_salary, remarks=remarks,
    )
    db.add(d)
    await db.commit()
    return {
        "id": d.id,
        "message": f"TDS ${float(tds_amount):.2f} deducted at {float(rate_config.rate)}% under Section {section}",
        "tds_amount": float(tds_amount), "net_payable": float(amt - tds_amount),
    }


# --- TDS Certificates / Form 26Q/27Q ---

@router.post("/{org_id}/certificate")
async def generate_certificate(
    org_id: int,
    financial_year: str = Form(...), quarter: str = Form(...), section: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    stmt = select(TdsDeduction).filter(TdsDeduction.org_id == org_id)
    if section:
        stmt = stmt.filter(TdsDeduction.section == section)

    deductions = (await db.execute(stmt)).scalars().all()
    if not deductions:
        raise HTTPException(400, "No deductions found for this period")

    total_amt = sum(d.amount for d in deductions)
    total_tds = sum(d.tds_amount for d in deductions)
    deductee_count = len(set(d.deductee_pan or d.deductee_name for d in deductions))

    cert = TdsCertificate(
        org_id=org_id, financial_year=financial_year, quarter=quarter,
        section=section or "ALL", total_deductions=total_amt,
        total_tds=total_tds, deductee_count=deductee_count,
    )
    db.add(cert)
    await db.commit()

    return {
        "id": cert.id,
        "financial_year": financial_year, "quarter": quarter,
        "section": section or "ALL",
        "total_deductions": float(total_amt),
        "total_tds": float(total_tds),
        "deductee_count": deductee_count,
        "message": f"Form {'26Q' if section in ('192','') else '27Q'} summary generated",
    }


@router.get("/{org_id}/certificates")
async def list_certificates(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    certs = (await db.execute(select(TdsCertificate).filter(TdsCertificate.org_id == org_id).order_by(TdsCertificate.generated_at.desc()))).scalars().all()
    return [{
        "id": c.id, "financial_year": c.financial_year, "quarter": c.quarter,
        "section": c.section, "total_deductions": float(c.total_deductions),
        "total_tds": float(c.total_tds), "deductee_count": c.deductee_count,
        "generated_at": c.generated_at.isoformat(),
    } for c in certs]
