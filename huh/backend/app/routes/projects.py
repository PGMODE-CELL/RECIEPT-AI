from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("/{org_id}")
async def list_projects(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).filter(Project.org_id == org_id).order_by(Project.name))
    projects = result.scalars().all()
    return [{
        "id": p.id, "name": p.name, "description": p.description,
        "status": p.status, "budget": float(p.budget or 0),
        "start_date": p.start_date.isoformat() if p.start_date else "",
        "end_date": p.end_date.isoformat() if p.end_date else "",
    } for p in projects]


@router.post("/{org_id}")
async def create_project(
    org_id: int,
    name: str = Form(...), description: str = Form(""),
    budget: float = Form(0), status: str = Form("active"),
    start_date: str = Form(""), end_date: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    p = Project(
        org_id=org_id, name=name, description=description,
        budget=Decimal(str(budget)), status=status,
        start_date=datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else date.today(),
        end_date=datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None,
    )
    db.add(p)
    await db.commit()
    return {"id": p.id, "name": p.name, "message": f"Project '{name}' created"}


@router.get("/{org_id}/{project_id}/pnl")
async def project_pnl(org_id: int, project_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project = (
        await db.execute(select(Project).filter(Project.id == project_id, Project.org_id == org_id))
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    income_result = await db.execute(
        select(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org_id, Transaction.project_id == project_id,
            Transaction.type == "money_in"
        )
    )
    income = income_result.scalar() or 0

    expenses_result = await db.execute(
        select(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org_id, Transaction.project_id == project_id,
            Transaction.type == "money_out"
        )
    )
    expenses = expenses_result.scalar() or 0

    invoiced_result = await db.execute(
        select(func.sum(Invoice.total)).filter(
            Invoice.org_id == org_id, Invoice.project_id == project_id
        )
    )
    invoiced = invoiced_result.scalar() or 0

    billed_result = await db.execute(
        select(func.sum(Bill.total)).filter(
            Bill.org_id == org_id, Bill.project_id == project_id
        )
    )
    billed = billed_result.scalar() or 0

    return {
        "project": project.name, "status": project.status,
        "budget": float(project.budget or 0),
        "income": float(income), "expenses": float(expenses),
        "profit_loss": float(income - expenses),
        "invoiced": float(invoiced), "billed": float(billed),
    }


@router.put("/{org_id}/{project_id}")
async def update_project(
    org_id: int, project_id: int,
    name: str = Form(...), status: str = Form("active"),
    budget: float = Form(0), description: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(Project).filter(Project.id == project_id, Project.org_id == org_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    p.name = name
    p.status = status
    p.budget = Decimal(str(budget))
    p.description = description
    await db.commit()
    return {"message": f"Project '{name}' updated"}


@router.delete("/{org_id}/{project_id}")
async def delete_project(
    org_id: int,
    project_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(Project).filter(Project.id == project_id, Project.org_id == org_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    await db.delete(p)
    await db.commit()
    return {"message": "Project deleted"}


@router.post("/{org_id}/{project_id}/tasks")
async def create_task(
    org_id: int,
    project_id: int,
    name: str = Form(...),
    assignee: str = Form(""),
    due_date: str = Form(""),
    status: str = Form("todo"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(Project).filter(Project.id == project_id, Project.org_id == org_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    task = Task(
        org_id=org_id, project_id=project_id, name=name,
        assignee=assignee, status=status,
        due_date=datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "name": task.name, "message": f"Task '{name}' created"}


@router.put("/{org_id}/{project_id}/tasks/{task_id}")
async def update_task(
    org_id: int,
    project_id: int,
    task_id: int,
    name: str = Form(None),
    assignee: str = Form(None),
    status: str = Form(None),
    due_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = (await db.execute(select(Task).filter(Task.id == task_id, Task.project_id == project_id, Task.org_id == org_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    if name is not None:
        task.name = name
    if assignee is not None:
        task.assignee = assignee
    if status is not None:
        task.status = status
    if due_date is not None:
        task.due_date = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
    await db.commit()
    return {"message": "Task updated"}


@router.delete("/{org_id}/{project_id}/tasks/{task_id}")
async def delete_task(
    org_id: int,
    project_id: int,
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = (await db.execute(select(Task).filter(Task.id == task_id, Task.project_id == project_id, Task.org_id == org_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted"}
