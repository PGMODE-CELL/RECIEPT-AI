from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.lease import Lease
from app.auth import get_current_user

router = APIRouter(prefix="/api/leases", tags=["Leases"])


@router.get("/{org_id}")
async def list_leases(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Lease).filter(Lease.org_id == org_id))).scalar()
    result = await db.execute(
        select(Lease)
        .filter(Lease.org_id == org_id)
        .order_by(Lease.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    leases = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": l.id, "org_id": l.org_id, "name": l.name,
            "asset_description": l.asset_description,
            "start_date": l.start_date.isoformat() if l.start_date else None,
            "end_date": l.end_date.isoformat() if l.end_date else None,
            "monthly_payment": float(l.monthly_payment),
            "interest_rate": float(l.interest_rate),
            "total_liability": float(l.total_liability),
            "status": l.status,
            "created_at": l.created_at.isoformat(),
        } for l in leases],
    }


@router.get("/{org_id}/{lease_id}")
async def get_lease(
    org_id: int,
    lease_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = (await db.execute(select(Lease).filter(Lease.id == lease_id, Lease.org_id == org_id))).scalar_one_or_none()
    if not lease:
        raise HTTPException(404, "Lease not found")
    return {
        "id": lease.id, "org_id": lease.org_id, "name": lease.name,
        "asset_description": lease.asset_description,
        "start_date": lease.start_date.isoformat() if lease.start_date else None,
        "end_date": lease.end_date.isoformat() if lease.end_date else None,
        "monthly_payment": float(lease.monthly_payment),
        "interest_rate": float(lease.interest_rate),
        "total_liability": float(lease.total_liability),
        "status": lease.status,
        "created_at": lease.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_lease(
    org_id: int,
    name: str = Form(...),
    asset_description: str = Form(None),
    start_date: str = Form(...),
    end_date: str = Form(...),
    monthly_payment: float = Form(0),
    interest_rate: float = Form(0),
    total_liability: float = Form(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = Lease(
        org_id=org_id, name=name, asset_description=asset_description,
        start_date=date.fromisoformat(start_date),
        end_date=date.fromisoformat(end_date),
        monthly_payment=monthly_payment, interest_rate=interest_rate,
        total_liability=total_liability,
    )
    db.add(lease)
    await db.commit()
    await db.refresh(lease)
    return {"id": lease.id, "name": lease.name, "message": "Lease created"}


@router.put("/{org_id}/{lease_id}")
async def update_lease(
    org_id: int,
    lease_id: int,
    name: str = Form(None),
    asset_description: str = Form(None),
    start_date: str = Form(None),
    end_date: str = Form(None),
    monthly_payment: float = Form(None),
    interest_rate: float = Form(None),
    total_liability: float = Form(None),
    status: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = (await db.execute(select(Lease).filter(Lease.id == lease_id, Lease.org_id == org_id))).scalar_one_or_none()
    if not lease:
        raise HTTPException(404, "Lease not found")
    if name is not None: lease.name = name
    if asset_description is not None: lease.asset_description = asset_description
    if start_date is not None: lease.start_date = date.fromisoformat(start_date)
    if end_date is not None: lease.end_date = date.fromisoformat(end_date)
    if monthly_payment is not None: lease.monthly_payment = monthly_payment
    if interest_rate is not None: lease.interest_rate = interest_rate
    if total_liability is not None: lease.total_liability = total_liability
    if status is not None: lease.status = status
    await db.commit()
    return {"message": "Lease updated", "id": lease.id}


@router.delete("/{org_id}/{lease_id}")
async def delete_lease(
    org_id: int,
    lease_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = (await db.execute(select(Lease).filter(Lease.id == lease_id, Lease.org_id == org_id))).scalar_one_or_none()
    if not lease:
        raise HTTPException(404, "Lease not found")
    await db.delete(lease)
    await db.commit()
    return {"message": "Lease deleted"}


@router.post("/{org_id}/{lease_id}/calculate-liability")
async def calculate_liability(
    org_id: int,
    lease_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lease = (await db.execute(select(Lease).filter(Lease.id == lease_id, Lease.org_id == org_id))).scalar_one_or_none()
    if not lease:
        raise HTTPException(404, "Lease not found")
    months_elapsed = 0
    current_liability = float(lease.total_liability) - (months_elapsed * float(lease.monthly_payment))
    if current_liability < 0:
        current_liability = 0
    return {
        "lease_id": lease.id,
        "current_liability": current_liability,
        "message": "Liability calculated",
    }
