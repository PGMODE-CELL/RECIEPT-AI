from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["Bills"])


@router.post("/{org_id}")
async def create_bill(
    org_id: int,
    contact_id: int = Form(...),
    amount: float = Form(...),
    description: str = Form(...),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(select(func.count()).select_from(Bill).filter(Bill.org_id == org_id))).scalar()
    bill = Bill(
        org_id=org_id,
        contact_id=contact_id,
        number=f"BILL-{count+1:04d}",
        due_date=date.today() + timedelta(days=due_days),
        total=amount,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return {
        "bill_id": bill.id,
        "number": bill.number,
        "message": f"Bill recorded: ${amount:.2f} for {description}",
    }


@router.get("/{org_id}")
async def list_bills(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Bill).filter(Bill.org_id == org_id))).scalar()
    result = await db.execute(
        select(Bill)
        .filter(Bill.org_id == org_id)
        .order_by(Bill.date.desc())
        .offset(offset)
        .limit(per_page)
    )
    bills = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": b.id, "org_id": b.org_id, "contact_id": b.contact_id,
            "number": b.number, "date": b.date.isoformat(),
            "due_date": b.due_date.isoformat(), "total": float(b.total),
            "paid": float(b.paid), "status": b.status,
        } for b in bills],
    }


@router.get("/{org_id}/{bill_id}")
async def get_bill(
    org_id: int,
    bill_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bill = (
        await db.execute(
            select(Bill).filter(Bill.id == bill_id, Bill.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found")
    return {
        "id": bill.id, "org_id": bill.org_id, "contact_id": bill.contact_id,
        "number": bill.number, "date": bill.date.isoformat(),
        "due_date": bill.due_date.isoformat(), "total": float(bill.total),
        "paid": float(bill.paid), "status": bill.status,
    }


@router.delete("/{org_id}/{bill_id}")
async def delete_bill(
    org_id: int,
    bill_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bill = (
        await db.execute(
            select(Bill).filter(Bill.id == bill_id, Bill.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found")
    await db.delete(bill)
    await db.commit()
    return {"message": "Bill deleted"}


@router.put("/{org_id}/{bill_id}/status")
async def update_bill_status(
    org_id: int,
    bill_id: int,
    status: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bill = (
        await db.execute(
            select(Bill).filter(Bill.id == bill_id, Bill.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found")
    bill.status = status
    await db.commit()
    return {"message": f"Status updated to {status}"}


@router.put("/{org_id}/{bill_id}")
async def update_bill(
    org_id: int,
    bill_id: int,
    contact_id: int = Form(None),
    amount: float = Form(None),
    description: str = Form(None),
    due_days: int = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bill = (
        await db.execute(
            select(Bill).filter(Bill.id == bill_id, Bill.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not bill:
        raise HTTPException(404, "Bill not found")
    if contact_id is not None:
        bill.contact_id = contact_id
    if amount is not None:
        bill.total = amount
    if description is not None:
        bill.description = description
    if due_days is not None:
        bill.due_date = date.today() + timedelta(days=due_days)
    await db.commit()
    return {"message": "Bill updated"}
