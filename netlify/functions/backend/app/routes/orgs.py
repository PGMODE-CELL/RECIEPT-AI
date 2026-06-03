from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.organization import Organization
from app.auth import get_current_user

router = APIRouter(prefix="/api/orgs", tags=["Organizations"])


@router.get("")
async def list_orgs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).filter(Organization.owner_id == user.id))
    return result.scalars().all()


@router.get("/{org_id}")
async def get_org(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = (await db.execute(select(Organization).filter(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.put("/{org_id}")
async def update_org(
    org_id: int,
    name: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = (await db.execute(select(Organization).filter(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organization not found")
    if name is not None:
        org.name = name
    await db.commit()
    return {"message": "Organization updated"}
