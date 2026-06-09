from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.org_member import OrganizationMember
from app.services.notifications import generate_all_notifications

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


async def require_member(org_id: int, user: User, db: AsyncSession):
    member = (
        await db.execute(
            select(OrganizationMember).filter(
                OrganizationMember.org_id == org_id,
                OrganizationMember.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(403, "Not a member of this organization")


def _serialize(n: Notification):
    return {
        "id": n.id,
        "org_id": n.org_id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "reference_type": n.reference_type,
        "reference_id": n.reference_id,
        "data": n.data,
        "read": n.read,
        "created_at": n.created_at.isoformat(),
    }


@router.get("/{org_id}")
async def list_notifications(
    org_id: int,
    limit: int = 50,
    unread_only: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    q = select(Notification).filter(Notification.org_id == org_id)
    if unread_only:
        q = q.filter(~Notification.read)
    result = await db.execute(q.order_by(Notification.created_at.desc()).limit(limit))
    notifications = result.scalars().all()
    unread_count = (
        await db.execute(
            select(func.count())
            .select_from(Notification)
            .filter(Notification.org_id == org_id, ~Notification.read)
        )
    ).scalar()
    return {
        "notifications": [_serialize(n) for n in notifications],
        "unread_count": unread_count,
    }


@router.post("/{org_id}/generate")
async def generate_notifications(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    result = await generate_all_notifications(db, org_id)
    await db.commit()
    return result


@router.put("/{org_id}/read/{notification_id}")
async def mark_read(
    org_id: int,
    notification_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    n = (
        await db.execute(
            select(Notification).filter(
                Notification.id == notification_id,
                Notification.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.read = True
    await db.commit()
    return _serialize(n)


@router.put("/{org_id}/read-all")
async def mark_all_read(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    from sqlalchemy import update as sql_update

    await db.execute(
        sql_update(Notification)
        .where(Notification.org_id == org_id, ~Notification.read)
        .values(read=True)
    )
    await db.commit()
    return {"ok": True}


@router.get("/{org_id}/unread-count")
async def unread_count(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(org_id, user, db)
    count = (
        await db.execute(
            select(func.count())
            .select_from(Notification)
            .filter(Notification.org_id == org_id, ~Notification.read)
        )
    ).scalar()
    return {"unread_count": count}
