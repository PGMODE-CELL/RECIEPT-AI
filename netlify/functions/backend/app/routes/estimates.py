from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
import json

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.estimate import Estimate
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/estimates", tags=["Estimates"])


@router.post("/{org_id}")
async def create_estimate(
    org_id: int,
    contact_id: int = Form(...), items: str = Form("[]"), total: float = Form(0),
    valid_until: str = Form(""), notes: str = Form(""), terms: str = Form(""),
    project_id: int = Form(0),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(select(func.count()).select_from(Estimate).filter(Estimate.org_id == org_id))).scalar()
    est = Estimate(
        org_id=org_id, contact_id=contact_id, project_id=project_id if project_id else None,
        number=f"EST-{org_id}-{count + 1}",
        total=total, valid_until=date.fromisoformat(valid_until) if valid_until else None,
        items=json.loads(items), notes=notes, terms=terms,
    )
    db.add(est)
    await db.commit()
    return {"id": est.id, "number": est.number, "message": f"Estimate {est.number} created"}


@router.get("/{org_id}")
async def list_estimates(org_id: int, page: int = 1, per_page: int = 25,
                         user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Estimate).filter(Estimate.org_id == org_id))).scalar()
    result = await db.execute(
        select(Estimate).filter(Estimate.org_id == org_id).order_by(Estimate.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    ests = result.scalars().all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{
        "id": e.id, "number": e.number, "contact_id": e.contact_id,
        "date": str(e.date), "valid_until": str(e.valid_until) if e.valid_until else None,
        "total": float(e.total), "status": e.status,
    } for e in ests]}


@router.get("/{org_id}/{estimate_id}")
async def get_estimate(org_id: int, estimate_id: int,
                       user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    est = (await db.execute(select(Estimate).filter(Estimate.id == estimate_id, Estimate.org_id == org_id))).scalar_one_or_none()
    if not est:
        raise HTTPException(404, "Estimate not found")
    return {
        "id": est.id, "number": est.number, "contact_id": est.contact_id,
        "project_id": est.project_id, "date": str(est.date),
        "valid_until": str(est.valid_until) if est.valid_until else None,
        "total": float(est.total), "status": est.status, "items": est.items,
        "notes": est.notes, "terms": est.terms,
    }


@router.post("/{org_id}/{estimate_id}/convert")
async def convert_to_invoice(org_id: int, estimate_id: int,
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    est = (await db.execute(select(Estimate).filter(Estimate.id == estimate_id, Estimate.org_id == org_id))).scalar_one_or_none()
    if not est:
        raise HTTPException(404, "Estimate not found")
    if est.status == "converted":
        raise HTTPException(400, "Already converted to invoice")
    count = (await db.execute(select(func.count()).select_from(Invoice).filter(Invoice.org_id == org_id))).scalar()
    inv = Invoice(
        org_id=org_id, contact_id=est.contact_id, project_id=est.project_id,
        number=f"INV-{org_id}-{count + 1}", date=date.today(),
        total=float(est.total), items=est.items, status="draft",
    )
    db.add(inv)
    est.status = "converted"
    await db.commit()
    return {"invoice_id": inv.id, "number": inv.number, "message": f"Invoice {inv.number} created from estimate"}


@router.put("/{org_id}/{estimate_id}/status")
async def update_estimate_status(org_id: int, estimate_id: int, status: str = Form(...),
                                 user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    est = (await db.execute(select(Estimate).filter(Estimate.id == estimate_id, Estimate.org_id == org_id))).scalar_one_or_none()
    if not est:
        raise HTTPException(404, "Estimate not found")
    est.status = status
    await db.commit()
    return {"message": f"Estimate status updated to {status}"}
