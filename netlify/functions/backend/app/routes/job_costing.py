from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.job_cost import JobCost
from app.auth import get_current_user

router = APIRouter(prefix="/api/job-costing", tags=["Job Costing"])


@router.get("/{org_id}")
async def list_job_costs(
    org_id: int,
    project_id: int = Query(None),
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    query = select(JobCost).filter(JobCost.org_id == org_id)
    count_query = select(func.count()).select_from(JobCost).filter(JobCost.org_id == org_id)
    if project_id is not None:
        query = query.filter(JobCost.project_id == project_id)
        count_query = count_query.filter(JobCost.project_id == project_id)
    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(JobCost.date.desc()).offset(offset).limit(per_page)
    )
    costs = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": c.id, "org_id": c.org_id, "project_id": c.project_id,
            "description": c.description, "cost_type": c.cost_type,
            "amount": float(c.amount),
            "date": c.date.isoformat() if c.date else None,
            "created_at": c.created_at.isoformat(),
        } for c in costs],
    }


@router.get("/{org_id}/{cost_id}")
async def get_job_cost(
    org_id: int,
    cost_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = (await db.execute(select(JobCost).filter(JobCost.id == cost_id, JobCost.org_id == org_id))).scalar_one_or_none()
    if not cost:
        raise HTTPException(404, "Job cost not found")
    return {
        "id": cost.id, "org_id": cost.org_id, "project_id": cost.project_id,
        "description": cost.description, "cost_type": cost.cost_type,
        "amount": float(cost.amount),
        "date": cost.date.isoformat() if cost.date else None,
        "created_at": cost.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_job_cost(
    org_id: int,
    project_id: int = Form(...),
    description: str = Form(None),
    cost_type: str = Form(...),
    amount: float = Form(0),
    date: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = JobCost(
        org_id=org_id, project_id=project_id, description=description,
        cost_type=cost_type, amount=amount,
        date=date.fromisoformat(date),
    )
    db.add(cost)
    await db.commit()
    await db.refresh(cost)
    return {"id": cost.id, "message": "Job cost created"}


@router.put("/{org_id}/{cost_id}")
async def update_job_cost(
    org_id: int,
    cost_id: int,
    project_id: int = Form(None),
    description: str = Form(None),
    cost_type: str = Form(None),
    amount: float = Form(None),
    cost_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = (await db.execute(select(JobCost).filter(JobCost.id == cost_id, JobCost.org_id == org_id))).scalar_one_or_none()
    if not cost:
        raise HTTPException(404, "Job cost not found")
    if project_id is not None: cost.project_id = project_id
    if description is not None: cost.description = description
    if cost_type is not None: cost.cost_type = cost_type
    if amount is not None: cost.amount = amount
    if cost_date is not None: cost.date = date.fromisoformat(cost_date)
    await db.commit()
    return {"message": "Job cost updated", "id": cost.id}


@router.delete("/{org_id}/{cost_id}")
async def delete_job_cost(
    org_id: int,
    cost_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = (await db.execute(select(JobCost).filter(JobCost.id == cost_id, JobCost.org_id == org_id))).scalar_one_or_none()
    if not cost:
        raise HTTPException(404, "Job cost not found")
    await db.delete(cost)
    await db.commit()
    return {"message": "Job cost deleted"}


@router.post("/{org_id}/{cost_id}/calculate-wip")
async def calculate_wip(
    org_id: int,
    cost_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost = (await db.execute(select(JobCost).filter(JobCost.id == cost_id, JobCost.org_id == org_id))).scalar_one_or_none()
    if not cost:
        raise HTTPException(404, "Job cost not found")
    result = await db.execute(
        select(JobCost)
        .filter(JobCost.project_id == cost.project_id, JobCost.org_id == org_id)
    )
    total_costs = result.scalars().all()
    wip_value = sum(float(c.amount) for c in total_costs)
    return {
        "project_id": cost.project_id,
        "work_in_progress": wip_value,
        "message": "WIP calculated",
    }
