from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email_template import EmailTemplate
from app.auth import get_current_user

router = APIRouter(prefix="/api/email-templates", tags=["Email Templates"])


@router.post("/{org_id}")
def create_template(org_id: int, name: str = "", subject: str = "", body: str = "", template_type: str = "invoice", variables: str = "", is_default: str = "no", db: Session = Depends(get_db), user=Depends(get_current_user)):
    tpl = EmailTemplate(org_id=org_id, name=name, subject=subject, body=body, template_type=template_type, variables=variables, is_default=(is_default == "yes"), active=True)
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return {"success": True, "template": {"id": tpl.id, "name": tpl.name, "subject": tpl.subject, "template_type": tpl.template_type}}


@router.get("/{org_id}")
def list_templates(org_id: int, template_type: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(EmailTemplate).filter(EmailTemplate.org_id == org_id)
    if template_type:
        q = q.filter(EmailTemplate.template_type == template_type)
    templates = q.order_by(EmailTemplate.created_at.desc()).all()
    return {"templates": [{"id": t.id, "name": t.name, "subject": t.subject, "template_type": t.template_type, "is_default": t.is_default} for t in templates]}


@router.put("/{org_id}/{template_id}")
def update_template(org_id: int, template_id: int, subject: str = None, body: str = None, is_default: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.org_id == org_id).first()
    if not tpl:
        raise HTTPException(404, "Template not found")
    if subject is not None:
        tpl.subject = subject
    if body is not None:
        tpl.body = body
    if is_default is not None:
        tpl.is_default = (is_default == "yes")
    db.commit()
    return {"success": True}


@router.delete("/{org_id}/{template_id}")
def delete_template(org_id: int, template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.org_id == org_id).first()
    if not tpl:
        raise HTTPException(404, "Template not found")
    db.delete(tpl)
    db.commit()
    return {"success": True}
