from datetime import date, timedelta, datetime
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
import json

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.tax import TaxRate, TaxReturn
from app.models.invoice import Invoice
from app.services.tax import compute_invoice_tax, get_tax_breakdown
from app.auth import get_current_user

router = APIRouter(prefix="/api/tax", tags=["Tax"])


# --- Tax Rate CRUD ---

@router.get("/{org_id}/rates")
async def list_rates(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaxRate).filter(TaxRate.org_id == org_id).order_by(TaxRate.name))
    rates = result.scalars().all()
    return [{"id": r.id, "name": r.name, "rate": float(r.rate), "type": r.type,
             "category": r.category, "is_active": r.is_active, "applies_to": r.applies_to} for r in rates]


@router.post("/{org_id}/rates")
async def create_rate(
    org_id: int,
    name: str = Form(...),
    rate: float = Form(...),
    type: str = Form("gst"),
    category: str = Form("standard"),
    applies_to: str = Form("both"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tr = TaxRate(org_id=org_id, name=name, rate=Decimal(str(rate)), type=type,
                 category=category, applies_to=applies_to)
    db.add(tr)
    await db.commit()
    return {"id": tr.id, "name": tr.name, "message": f"Tax rate '{name}' created"}


@router.delete("/{org_id}/rates/{rate_id}")
async def delete_rate(org_id: int, rate_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tr = (await db.execute(select(TaxRate).filter(TaxRate.id == rate_id, TaxRate.org_id == org_id))).scalar_one_or_none()
    if not tr:
        raise HTTPException(404, "Tax rate not found")
    await db.delete(tr)
    await db.commit()
    return {"message": "Tax rate deleted"}


# --- Tax Computation on Invoices ---

@router.post("/{org_id}/compute-invoice")
async def compute_tax(
    org_id: int,
    items_json: str = Form(...),
    tax_rate_ids: str = Form(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = json.loads(items_json)
    rate_ids = [int(x) for x in tax_rate_ids.split(",") if x.strip()]
    result = compute_invoice_tax(db, org_id, items, rate_ids if rate_ids else None)
    return result


@router.post("/{org_id}/create-tax-invoice")
async def create_tax_invoice(
    org_id: int,
    contact_id: int = Form(...),
    items_json: str = Form(...),
    tax_rate_ids: str = Form(""),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = json.loads(items_json)
    rate_ids = [int(x) for x in tax_rate_ids.split(",") if x.strip()]
    tax_result = compute_invoice_tax(db, org_id, items, rate_ids if rate_ids else None)

    count = (await db.execute(select(func.count()).select_from(Invoice).filter(Invoice.org_id == org_id))).scalar()
    invoice = Invoice(
        org_id=org_id,
        contact_id=contact_id,
        number=f"INV-{count+1:04d}",
        due_date=date.today() + timedelta(days=due_days),
        total=tax_result["grand_total"],
        items=tax_result["items"],
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    return {
        "invoice_id": invoice.id,
        "number": invoice.number,
        "total": tax_result["grand_total"],
        "taxable": tax_result["total_taxable"],
        "tax": tax_result["total_tax"],
        "items": tax_result["items"],
        "message": f"Tax invoice #{invoice.number} created for ${tax_result['grand_total']:.2f}",
    }


# --- Tax Return Summary ---

@router.get("/{org_id}/return")
async def get_tax_return(
    org_id: int,
    period_start: str = "",
    period_end: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start = datetime.strptime(period_start, "%Y-%m-%d").date() if period_start else date.today().replace(day=1)
    end = datetime.strptime(period_end, "%Y-%m-%d").date() if period_end else (date.today().replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)

    breakdown = get_tax_breakdown(db, org_id, start, end)

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "breakdown": breakdown,
        "summary": {
            "total_sales": sum(v["taxable"] for v in breakdown["sales"].values()),
            "total_purchases": sum(v["taxable"] for v in breakdown["purchases"].values()),
            "output_tax": breakdown["total_output_tax"],
            "input_tax": breakdown["total_input_tax"],
            "net_payable": breakdown["net_payable"],
            "refund": breakdown["refund"],
        },
        "plain_english": (
            f"For {start} to {end}: "
            f"Total taxable sales ${breakdown['total_output_tax']:.2f}, "
            f"input tax credit ${breakdown['total_input_tax']:.2f}. "
            f"{'You need to pay $' + str(breakdown['net_payable']) if breakdown['net_payable'] > 0 else 'You get a refund of $' + str(breakdown['refund'])}."
        ),
    }


@router.get("/{org_id}/returns")
async def list_returns(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaxReturn).filter(TaxReturn.org_id == org_id).order_by(TaxReturn.period_start.desc()))
    returns = result.scalars().all()
    return [{
        "id": r.id, "period_start": r.period_start.isoformat(), "period_end": r.period_end.isoformat(),
        "return_type": r.return_type, "status": r.status,
        "total_taxable": float(r.total_taxable), "total_tax": float(r.total_tax),
        "total_payable": float(r.total_payable), "total_credit": float(r.total_credit),
        "filed_at": r.filed_at.isoformat() if r.filed_at else None,
    } for r in returns]


@router.post("/{org_id}/returns")
async def create_return(
    org_id: int,
    period_start: str = Form(...),
    period_end: str = Form(...),
    return_type: str = Form("monthly"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start = datetime.strptime(period_start, "%Y-%m-%d").date()
    end = datetime.strptime(period_end, "%Y-%m-%d").date()

    existing = (await db.execute(
        select(TaxReturn).filter(
            TaxReturn.org_id == org_id,
            TaxReturn.period_start == start,
            TaxReturn.period_end == end,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Return already exists for this period")

    breakdown = get_tax_breakdown(db, org_id, start, end)
    tr = TaxReturn(
        org_id=org_id,
        period_start=start,
        period_end=end,
        return_type=return_type,
        total_taxable=sum(v["taxable"] for v in breakdown["sales"].values()),
        total_tax=breakdown["total_output_tax"],
        total_credit=breakdown["total_input_tax"],
        total_payable=breakdown["net_payable"],
        data=json.dumps(breakdown),
    )
    db.add(tr)
    await db.commit()
    return {"id": tr.id, "message": f"Tax return created for {period_start} to {period_end}"}
