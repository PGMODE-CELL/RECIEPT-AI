from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.models.org_member import OrganizationMember
from app.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])


async def require_role(
    org_id: int, user: User, db: AsyncSession, min_role: str = "admin"
):
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
    role_levels = {"owner": 4, "admin": 3, "accountant": 2, "viewer": 1}
    if role_levels.get(member.role, 0) < role_levels.get(min_role, 3):
        raise HTTPException(403, f"Requires {min_role} role or higher")


@router.get("/{org_id}")
async def list_audit_logs(
    org_id: int,
    table_name: str = "",
    page: int = 1,
    per_page: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_role(org_id, user, db, "viewer")
    q = select(AuditLog).filter(AuditLog.org_id == org_id)
    if table_name:
        q = q.filter(AuditLog.table_name == table_name)
    count_q = (
        select(func.count()).select_from(AuditLog).filter(AuditLog.org_id == org_id)
    )
    if table_name:
        count_q = count_q.filter(AuditLog.table_name == table_name)
    total = (await db.execute(count_q)).scalar()
    offset = (page - 1) * per_page
    logs = (
        (
            await db.execute(
                q.order_by(desc(AuditLog.created_at)).offset(offset).limit(per_page)
            )
        )
        .scalars()
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "table_name": log.table_name,
                "record_id": log.record_id,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


@router.post("/{org_id}/log")
async def create_audit_log(
    org_id: int,
    action: str = Form(...),
    table_name: str = Form(...),
    record_id: int = Form(0),
    old_values: str = Form(""),
    new_values: str = Form(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json

    log = AuditLog(
        org_id=org_id,
        user_id=user.id,
        action=action,
        table_name=table_name,
        record_id=record_id if record_id else None,
        old_values=json.loads(old_values) if old_values else None,
        new_values=json.loads(new_values) if new_values else None,
    )
    db.add(log)
    await db.commit()
    return {"message": "Audit log created", "id": log.id}
