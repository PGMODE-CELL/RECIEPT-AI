import json
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.revenue_recognition import RevenueRecognition
from app.auth import get_current_user

router = APIRouter(prefix="/api/revenue-recognition", tags=["Revenue Recognition"])


@router.get("/{org_id}")
async def list_revenue_recognition(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(RevenueRecognition).filter(RevenueRecognition.org_id == org_id))).scalar()
    result = await db.execute(
        select(RevenueRecognition)
        .filter(RevenueRecognition.org_id == org_id)
        .order_by(RevenueRecognition.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": r.id, "org_id": r.org_id, "invoice_id": r.invoice_id,
            "total_amount": float(r.total_amount),
            "recognized_amount": float(r.recognized_amount),
            "schedule": r.schedule,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        } for r in items],
    }


@router.get("/{org_id}/{rr_id}")
async def get_revenue_recognition(
    org_id: int,
    rr_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rr = (await db.execute(select(RevenueRecognition).filter(RevenueRecognition.id == rr_id, RevenueRecognition.org_id == org_id))).scalar_one_or_none()
    if not rr:
        raise HTTPException(404, "Revenue recognition not found")
    return {
        "id": rr.id, "org_id": rr.org_id, "invoice_id": rr.invoice_id,
        "total_amount": float(rr.total_amount),
        "recognized_amount": float(rr.recognized_amount),
        "schedule": rr.schedule,
        "status": rr.status,
        "created_at": rr.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_revenue_recognition(
    org_id: int,
    invoice_id: int = Form(...),
    total_amount: float = Form(...),
    schedule: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rr = RevenueRecognition(
        org_id=org_id, invoice_id=invoice_id, total_amount=total_amount,
        schedule=json.loads(schedule),
    )
    db.add(rr)
    await db.commit()
    await db.refresh(rr)
    return {"id": rr.id, "message": "Revenue recognition created"}


@router.put("/{org_id}/{rr_id}")
async def update_revenue_recognition(
    org_id: int,
    rr_id: int,
    invoice_id: int = Form(None),
    total_amount: float = Form(None),
    recognized_amount: float = Form(None),
    schedule: str = Form(None),
    status: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rr = (await db.execute(select(RevenueRecognition).filter(RevenueRecognition.id == rr_id, RevenueRecognition.org_id == org_id))).scalar_one_or_none()
    if not rr:
        raise HTTPException(404, "Revenue recognition not found")
    if invoice_id is not None: rr.invoice_id = invoice_id
    if total_amount is not None: rr.total_amount = Decimal(str(total_amount))
    if recognized_amount is not None: rr.recognized_amount = Decimal(str(recognized_amount))
    if schedule is not None: rr.schedule = json.loads(schedule)
    if status is not None: rr.status = status
    await db.commit()
    return {"message": "Revenue recognition updated", "id": rr.id}


@router.delete("/{org_id}/{rr_id}")
async def delete_revenue_recognition(
    org_id: int,
    rr_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rr = (await db.execute(select(RevenueRecognition).filter(RevenueRecognition.id == rr_id, RevenueRecognition.org_id == org_id))).scalar_one_or_none()
    if not rr:
        raise HTTPException(404, "Revenue recognition not found")
    await db.delete(rr)
    await db.commit()
    return {"message": "Revenue recognition deleted"}


@router.post("/{org_id}/{rr_id}/recognize")
async def recognize_next_amount(
    org_id: int,
    rr_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rr = (await db.execute(select(RevenueRecognition).filter(RevenueRecognition.id == rr_id, RevenueRecognition.org_id == org_id))).scalar_one_or_none()
    if not rr:
        raise HTTPException(404, "Revenue recognition not found")
    schedule = rr.schedule or []
    next_entry = None
    for entry in schedule:
        if entry.get("date") and not entry.get("recognized", False):
            next_entry = entry
            break
    if next_entry:
        rr.recognized_amount = Decimal(str(float(rr.recognized_amount) + float(next_entry["amount"])))
        next_entry["recognized"] = True
        rr.schedule = schedule
        if float(rr.recognized_amount) >= float(rr.total_amount):
            rr.status = "completed"
        else:
            rr.status = "in_progress"
        await db.commit()
        return {
            "recognized_amount": float(next_entry["amount"]),
            "total_recognized": float(rr.recognized_amount),
            "message": "Amount recognized",
        }
    return {"message": "No pending schedule entries", "total_recognized": float(rr.recognized_amount)}
