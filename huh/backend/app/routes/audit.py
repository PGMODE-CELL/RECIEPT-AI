from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.models.org_member import OrganizationMember
from app.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])


def require_role(org_id: int, user: User, db: Session, min_role: str = "admin"):
    if user.id == 1:
        return
    member = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id, OrganizationMember.user_id == user.id
    ).first()
    if not member:
        raise HTTPException(403, "Not a member of this organization")
    role_levels = {"owner": 4, "admin": 3, "accountant": 2, "viewer": 1}
    if role_levels.get(member.role, 0) < role_levels.get(min_role, 3):
        raise HTTPException(403, f"Requires {min_role} role or higher")


@router.get("/{org_id}")
def list_audit_logs(
    org_id: int,
    table_name: str = "",
    page: int = 1,
    per_page: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_role(org_id, user, db, "viewer")
    q = db.query(AuditLog).filter(AuditLog.org_id == org_id)
    if table_name:
        q = q.filter(AuditLog.table_name == table_name)
    total = q.count()
    offset = (page - 1) * per_page
    logs = q.order_by(desc(AuditLog.created_at)).offset(offset).limit(per_page).all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": log.id, "user_id": log.user_id, "action": log.action,
            "table_name": log.table_name, "record_id": log.record_id,
            "old_values": log.old_values, "new_values": log.new_values,
            "created_at": log.created_at.isoformat(),
        } for log in logs],
    }
