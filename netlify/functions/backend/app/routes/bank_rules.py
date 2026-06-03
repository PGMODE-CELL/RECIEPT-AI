from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.bank_rule import BankRule
from app.auth import get_current_user

router = APIRouter(prefix="/api/bank-rules", tags=["Bank Rules"])


@router.get("/{org_id}")
async def list_bank_rules(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(BankRule).filter(BankRule.org_id == org_id))).scalar()
    result = await db.execute(
        select(BankRule)
        .filter(BankRule.org_id == org_id)
        .order_by(BankRule.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    rules = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": r.id, "org_id": r.org_id, "name": r.name,
            "match_type": r.match_type, "match_text": r.match_text,
            "category": r.category, "account_id": r.account_id,
            "created_at": r.created_at.isoformat(),
        } for r in rules],
    }


@router.get("/{org_id}/{rule_id}")
async def get_bank_rule(
    org_id: int,
    rule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = (await db.execute(select(BankRule).filter(BankRule.id == rule_id, BankRule.org_id == org_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Bank rule not found")
    return {
        "id": rule.id, "org_id": rule.org_id, "name": rule.name,
        "match_type": rule.match_type, "match_text": rule.match_text,
        "category": rule.category, "account_id": rule.account_id,
        "created_at": rule.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_bank_rule(
    org_id: int,
    name: str = Form(...),
    match_type: str = Form(...),
    match_text: str = Form(...),
    category: str = Form(None),
    account_id: int = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = BankRule(
        org_id=org_id, name=name, match_type=match_type,
        match_text=match_text, category=category, account_id=account_id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"id": rule.id, "name": rule.name, "message": "Bank rule created"}


@router.put("/{org_id}/{rule_id}")
async def update_bank_rule(
    org_id: int,
    rule_id: int,
    name: str = Form(None),
    match_type: str = Form(None),
    match_text: str = Form(None),
    category: str = Form(None),
    account_id: int = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = (await db.execute(select(BankRule).filter(BankRule.id == rule_id, BankRule.org_id == org_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Bank rule not found")
    if name is not None: rule.name = name
    if match_type is not None: rule.match_type = match_type
    if match_text is not None: rule.match_text = match_text
    if category is not None: rule.category = category
    if account_id is not None: rule.account_id = account_id
    await db.commit()
    return {"message": "Bank rule updated", "id": rule.id}


@router.delete("/{org_id}/{rule_id}")
async def delete_bank_rule(
    org_id: int,
    rule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = (await db.execute(select(BankRule).filter(BankRule.id == rule_id, BankRule.org_id == org_id))).scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Bank rule not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Bank rule deleted"}


@router.post("/{org_id}/apply")
async def apply_rules(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"org_id": org_id, "message": "Rules applied", "matched": 0}
