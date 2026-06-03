from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sql_delete
from datetime import datetime, timezone
from app.database_async import get_async_db as get_db
from app.models.expense_report import ExpenseReport, ExpenseLine
from app.auth import get_current_user

router = APIRouter(prefix="/api/expense-reports", tags=["Expense Reports"])


@router.post("/{org_id}")
async def create_report(org_id: int, title: str = "", description: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = ExpenseReport(org_id=org_id, user_id=user.id, title=title, description=description, total=0, status="draft")
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return {"success": True, "report": {"id": report.id, "title": report.title, "status": report.status}}


@router.get("/{org_id}")
async def list_reports(org_id: int, status: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    q = select(ExpenseReport).filter(ExpenseReport.org_id == org_id)
    if status:
        q = q.filter(ExpenseReport.status == status)
    q = q.order_by(ExpenseReport.created_at.desc())
    result = await db.execute(q)
    reports = result.scalars().all()
    return {"reports": [{"id": r.id, "title": r.title, "total": r.total, "status": r.status, "user_id": r.user_id, "created_at": str(r.created_at.date())} for r in reports]}


@router.get("/{org_id}/{report_id}")
async def get_report(org_id: int, report_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    lines_result = await db.execute(select(ExpenseLine).filter(ExpenseLine.expense_report_id == report_id))
    lines = lines_result.scalars().all()
    return {"report": {"id": report.id, "title": report.title, "description": report.description, "total": report.total, "status": report.status}, "lines": [{"id": line.id, "date": str(line.date.date()), "category": line.category, "amount": line.amount, "description": line.description, "billable": line.billable} for line in lines]}


@router.post("/{org_id}/{report_id}/lines")
async def add_line(org_id: int, report_id: int, date: str = None, category: str = "", amount: float = 0, description: str = "", billable: str = "no", project_id: int = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    ld = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now(timezone.utc)
    line = ExpenseLine(expense_report_id=report_id, date=ld, category=category, amount=amount, description=description, billable=billable, project_id=project_id)
    db.add(line)
    report.total += amount
    await db.commit()
    return {"success": True, "line": {"id": line.id, "amount": line.amount, "category": line.category}}


@router.post("/{org_id}/{report_id}/submit")
async def submit_report(org_id: int, report_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.status = "submitted"
    await db.commit()
    return {"success": True, "status": "submitted"}


@router.post("/{org_id}/{report_id}/approve")
async def approve_report(org_id: int, report_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.status = "approved"
    report.approved_by = user.id
    report.approved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "status": "approved"}


@router.post("/{org_id}/{report_id}/reject")
async def reject_report(org_id: int, report_id: int, notes: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.status = "rejected"
    report.notes = notes
    await db.commit()
    return {"success": True, "status": "rejected"}


@router.delete("/{org_id}/{report_id}")
async def delete_report(
    org_id: int,
    report_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    report = (await db.execute(select(ExpenseReport).filter(ExpenseReport.id == report_id, ExpenseReport.org_id == org_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    await db.execute(sql_delete(ExpenseLine).where(ExpenseLine.expense_report_id == report_id))
    await db.delete(report)
    await db.commit()
    return {"message": "Report deleted"}
