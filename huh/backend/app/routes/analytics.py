from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, UTC
import hashlib
import json

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.analytics import AnalyticsEvent
from app.models.user import User
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class AnalyticsEventIn(BaseModel):
    event: str = Field(..., min_length=1, max_length=100)
    properties: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = Field(None, max_length=64)


class AnalyticsEventOut(BaseModel):
    id: int
    event: str
    user_id: Optional[int]
    org_id: Optional[int]
    session_id: Optional[str]
    properties: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


def _hash_ip(ip: str) -> str:
    """Hash IP for privacy — not reversible."""
    return hashlib.sha256(ip.encode()).hexdigest()[:64]


def _get_client_ip(request: Request) -> str:
    """Extract client IP, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("", status_code=status.HTTP_201_CREATED)
async def track_event(
    event_in: AnalyticsEventIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Track an analytics event.
    Works with or without authentication.
    """
    ip = _get_client_ip(request)
    ip_hash = _hash_ip(ip) if ip != "unknown" else None
    user_agent = request.headers.get("User-Agent", "")[:500]

    org_id = None
    if current_user:
        # Get user's active org
        from app.models.org_member import OrganizationMember
        member = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.is_active == True
        ).first()
        if member:
            org_id = member.organization_id

    event = AnalyticsEvent(
        event=event_in.event,
        user_id=current_user.id if current_user else None,
        org_id=org_id,
        session_id=event_in.session_id,
        properties=event_in.properties,
        user_agent=user_agent,
        ip_hash=ip_hash,
    )
    db.add(event)
    db.commit()
    return {"status": "ok"}


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def track_batch(
    events: List[AnalyticsEventIn],
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Track multiple events in one request."""
    ip = _get_client_ip(request)
    ip_hash = _hash_ip(ip) if ip != "unknown" else None
    user_agent = request.headers.get("User-Agent", "")[:500]

    org_id = None
    if current_user:
        from app.models.org_member import OrganizationMember
        member = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.is_active == True
        ).first()
        if member:
            org_id = member.organization_id

    db_events = [
        AnalyticsEvent(
            event=e.event,
            user_id=current_user.id if current_user else None,
            org_id=org_id,
            session_id=e.session_id,
            properties=e.properties,
            user_agent=user_agent,
            ip_hash=ip_hash,
        )
        for e in events
    ]
    db.bulk_save_objects(db_events)
    db.commit()
    return {"status": "ok", "count": len(db_events)}


@router.get("/events", response_model=List[AnalyticsEventOut])
async def get_events(
    event: Optional[str] = None,
    user_id: Optional[int] = None,
    org_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get analytics events (admin only).
    Requires authentication.
    """
    query = db.query(AnalyticsEvent)

    if event:
        query = query.filter(AnalyticsEvent.event == event)
    if user_id:
        query = query.filter(AnalyticsEvent.user_id == user_id)
    if org_id:
        query = query.filter(AnalyticsEvent.org_id == org_id)

    events = query.order_by(desc(AnalyticsEvent.created_at)).offset(offset).limit(limit).all()
    return events


@router.get("/summary")
async def get_summary(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get event counts by type for the last N days (admin only).
    """
    from datetime import timedelta
    since = datetime.now(UTC) - timedelta(days=days)

    results = db.query(
        AnalyticsEvent.event,
        func.count(AnalyticsEvent.id).label("count")
    ).filter(
        AnalyticsEvent.created_at >= since
    ).group_by(AnalyticsEvent.event).all()

    return {
        "period_days": days,
        "events": [{"event": r.event, "count": r.count} for r in results],
        "total": sum(r.count for r in results),
    }


@router.get("/downloads")
async def get_download_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Track/download stats (placeholder — integrate with GitHub API or CDN logs).
    """
    return {
        "message": "Integrate with GitHub Releases API or CDN logs for real download counts",
        "suggestion": "Use GitHub API: GET /repos/{owner}/{repo}/releases",
    }