from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database_async import get_async_db as get_db
from app.models.email_template import EmailTemplate
from app.auth import get_current_user

router = APIRouter(prefix="/api/email-templates", tags=["Email Templates"])


@router.post("/{org_id}")
async def create_template(org_id: int, name: str = "", subject: str = "", body: str = "", template_type: str = "invoice", variables: str = "", is_default: str = "no", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    tpl = EmailTemplate(org_id=org_id, name=name, subject=subject, body=body, template_type=template_type, variables=variables, is_default=(is_default == "yes"), active=True)
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return {"success": True, "template": {"id": tpl.id, "name": tpl.name, "subject": tpl.subject, "template_type": tpl.template_type}}


@router.get("/{org_id}")
async def list_templates(org_id: int, template_type: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    q = select(EmailTemplate).filter(EmailTemplate.org_id == org_id)
    if template_type:
        q = q.filter(EmailTemplate.template_type == template_type)
    result = await db.execute(q.order_by(EmailTemplate.created_at.desc()))
    templates = result.scalars().all()
    return {"templates": [{"id": t.id, "name": t.name, "subject": t.subject, "template_type": t.template_type, "is_default": t.is_default} for t in templates]}


@router.put("/{org_id}/{template_id}")
async def update_template(org_id: int, template_id: int, subject: str = None, body: str = None, is_default: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    tpl = (await db.execute(select(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.org_id == org_id))).scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    if subject is not None:
        tpl.subject = subject
    if body is not None:
        tpl.body = body
    if is_default is not None:
        tpl.is_default = (is_default == "yes")
    await db.commit()
    return {"success": True}


@router.delete("/{org_id}/{template_id}")
async def delete_template(org_id: int, template_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    tpl = (await db.execute(select(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.org_id == org_id))).scalar_one_or_none()
    if not tpl:
        raise HTTPException(404, "Template not found")
    await db.delete(tpl)
    await db.commit()
    return {"success": True}
