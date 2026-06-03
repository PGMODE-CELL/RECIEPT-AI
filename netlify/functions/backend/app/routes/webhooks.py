import json
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.webhook import Webhook
from app.models.webhook_log import WebhookLog
from app.auth import get_current_user

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.get("/{org_id}")
async def list_webhooks(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Webhook).filter(Webhook.org_id == org_id))).scalar()
    result = await db.execute(
        select(Webhook)
        .filter(Webhook.org_id == org_id)
        .order_by(Webhook.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    hooks = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": w.id, "org_id": w.org_id, "name": w.name,
            "url": w.url, "events": w.events,
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat(),
        } for w in hooks],
    }


@router.get("/{org_id}/{webhook_id}")
async def get_webhook(
    org_id: int,
    webhook_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = (await db.execute(select(Webhook).filter(Webhook.id == webhook_id, Webhook.org_id == org_id))).scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    return {
        "id": wh.id, "org_id": wh.org_id, "name": wh.name,
        "url": wh.url, "events": wh.events,
        "is_active": wh.is_active,
        "created_at": wh.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_webhook(
    org_id: int,
    name: str = Form(...),
    url: str = Form(...),
    events: str = Form(...),
    secret: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = Webhook(
        org_id=org_id, name=name, url=url,
        events=json.loads(events), secret=secret,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return {"id": wh.id, "name": wh.name, "message": "Webhook created"}


@router.put("/{org_id}/{webhook_id}")
async def update_webhook(
    org_id: int,
    webhook_id: int,
    name: str = Form(None),
    url: str = Form(None),
    events: str = Form(None),
    secret: str = Form(None),
    is_active: bool = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = (await db.execute(select(Webhook).filter(Webhook.id == webhook_id, Webhook.org_id == org_id))).scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    if name is not None: wh.name = name
    if url is not None: wh.url = url
    if events is not None: wh.events = json.loads(events)
    if secret is not None: wh.secret = secret
    if is_active is not None: wh.is_active = is_active
    await db.commit()
    return {"message": "Webhook updated", "id": wh.id}


@router.delete("/{org_id}/{webhook_id}")
async def delete_webhook(
    org_id: int,
    webhook_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = (await db.execute(select(Webhook).filter(Webhook.id == webhook_id, Webhook.org_id == org_id))).scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    await db.delete(wh)
    await db.commit()
    return {"message": "Webhook deleted"}


@router.post("/{org_id}/{webhook_id}/trigger")
async def trigger_webhook(
    org_id: int,
    webhook_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = (await db.execute(select(Webhook).filter(Webhook.id == webhook_id, Webhook.org_id == org_id))).scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    log = WebhookLog(
        webhook_id=wh.id, event="manual_trigger",
        status="success", response_code=200,
        response_body="Webhook triggered (stub)",
    )
    db.add(log)
    await db.commit()
    return {"message": "Webhook triggered", "webhook_id": wh.id}


@router.get("/{org_id}/{webhook_id}/logs")
async def get_webhook_logs(
    org_id: int,
    webhook_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = (await db.execute(select(Webhook).filter(Webhook.id == webhook_id, Webhook.org_id == org_id))).scalar_one_or_none()
    if not wh:
        raise HTTPException(404, "Webhook not found")
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(WebhookLog).filter(WebhookLog.webhook_id == webhook_id))).scalar()
    result = await db.execute(
        select(WebhookLog)
        .filter(WebhookLog.webhook_id == webhook_id)
        .order_by(WebhookLog.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    logs = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": l.id, "webhook_id": l.webhook_id, "event": l.event,
            "status": l.status, "response_code": l.response_code,
            "response_body": l.response_body,
            "created_at": l.created_at.isoformat(),
        } for l in logs],
    }
