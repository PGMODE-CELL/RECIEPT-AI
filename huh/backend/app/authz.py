"""Centralized authorization helpers.

`require_org_access` is attached to every router. It enforces that, whenever a
route is scoped to an organization (i.e. has an ``{org_id}`` path parameter),
the caller is authenticated and is a member of that organization. Routes without
an ``org_id`` path parameter (auth, health, setup, etc.) are left untouched so
public/user-scoped endpoints keep working.
"""

from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database_async import get_async_db
from app.models.org_member import OrganizationMember
from app.models.user import User

# Paths that are org-scoped in their URL but must be reachable without a user
# session (the caller authenticates by other means, e.g. a signed webhook).
_PUBLIC_ORG_SUFFIXES = ("/stripe/webhook",)

_ROLE_LEVELS = {"owner": 4, "admin": 3, "accountant": 2, "viewer": 1}


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Not authenticated")
    return token


async def require_org_access(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    org_id = request.path_params.get("org_id")
    if org_id is None:
        return  # route is not org-scoped; nothing to enforce here

    if any(request.url.path.endswith(s) for s in _PUBLIC_ORG_SUFFIXES):
        return  # authenticated by signature, not a user session

    try:
        org_id_int = int(org_id)
    except (TypeError, ValueError):
        raise HTTPException(404, "Organization not found")

    token = _bearer_token(request)
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(401, "Invalid token")

    user = (
        await db.execute(select(User).filter(User.id == user_id))
    ).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid user")

    member = (
        await db.execute(
            select(OrganizationMember).filter(
                OrganizationMember.org_id == org_id_int,
                OrganizationMember.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(403, "Not a member of this organization")


async def require_role(
    org_id: int, user: User, db: AsyncSession, min_role: str = "admin"
) -> None:
    """Assert that ``user`` has at least ``min_role`` within ``org_id``."""
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
    if _ROLE_LEVELS.get(member.role, 0) < _ROLE_LEVELS.get(min_role, 3):
        raise HTTPException(403, f"Requires {min_role} role or higher")
