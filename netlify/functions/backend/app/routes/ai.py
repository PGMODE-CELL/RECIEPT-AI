from datetime import date, datetime
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.receipt import Receipt
from app.models.transaction import Transaction
from app.auth import get_current_user
from app.services.ocr import extract_receipt_data
from app.services.categorizer import categorize
from app.services.nlp import parse_query

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/scan-receipt/{org_id}")
async def scan_receipt(
    org_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()

    try:
        text = content.decode("utf-8", errors="ignore")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="ignore")

    extracted = extract_receipt_data(text)

    category = categorize(extracted.get("vendor", ""), extracted.get("total"))

    receipt = Receipt(
        org_id=org_id,
        file_name=file.filename,
        vendor=extracted["vendor"],
        date=datetime.strptime(extracted["date"], "%Y-%m-%d").date() if extracted["date"] else date.today(),
        total=extracted["total"],
        tax=extracted["tax"],
        category=category,
        status="approved",
        extracted_data=extracted,
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)

    return {
        "receipt_id": receipt.id,
        "vendor": extracted["vendor"],
        "date": extracted["date"],
        "total": extracted["total"],
        "tax": extracted["tax"],
        "category": category,
        "confidence": extracted["confidence"],
        "message": f"Receipt from {extracted['vendor']} for ${extracted['total']:.2f}",
    }


@router.get("/nlp-query/{org_id}")
async def nlp_query(
    org_id: int,
    q: str = Query(..., description="Natural language query"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parsed = parse_query(q)

    query = select(Transaction).filter(Transaction.org_id == org_id)

    if parsed["start"]:
        query = query.filter(Transaction.date >= parsed["start"])
    if parsed["end"]:
        query = query.filter(Transaction.date <= parsed["end"])
    if parsed["direction"]:
        query = query.filter(Transaction.type == parsed["direction"])

    transactions = (await db.execute(query.order_by(Transaction.date.desc()))).scalars().all()

    if parsed["category"]:
        transactions = [
            t for t in transactions
            if parsed["category"] in t.description.lower()
        ]

    total = sum(float(t.amount) for t in transactions)

    count = len(transactions)

    response_text = _generate_response(parsed, total, count, transactions)

    return {
        "query": q,
        "parsed": parsed,
        "total": round(total, 2),
        "count": count,
        "transactions": [
            {
                "id": t.id,
                "date": str(t.date),
                "description": t.description,
                "amount": float(t.amount),
                "type": t.type,
            }
            for t in transactions[:20]
        ],
        "response": response_text,
    }


def _generate_response(parsed: dict, total: float, count: int, transactions: list) -> str:
    direction_label = "spent" if parsed["direction"] == "money_out" else "earned"
    category_label = parsed["category"] or "everything"
    time_label = ""

    if parsed["start"] and parsed["end"]:
        if parsed["start"] == parsed["end"]:
            time_label = f" on {parsed['start']}"
        else:
            time_label = f" from {parsed['start']} to {parsed['end']}"

    if parsed["response_type"] == "amount":
        if count == 0:
            return f"You didn't {direction_label} anything for {category_label}{time_label}."
        return f"You {direction_label} **${total:,.2f}** across {count} transaction{'s' if count != 1 else ''} for {category_label}{time_label}."

    if parsed["response_type"] == "list":
        if count == 0:
            return f"No transactions found for {category_label}{time_label}."
        lines = [f"Here are your {category_label} transactions{time_label}:"]
        for t in transactions[:10]:
            lines.append(f"- {t.date}: {t.description} — ${float(t.amount):,.2f}")
        if count > 10:
            lines.append(f"... and {count - 10} more")
        return "\n".join(lines)

    if parsed["response_type"] == "compare":
        out_query = [t for t in transactions if t.type == "money_out"]
        in_query = [t for t in transactions if t.type == "money_in"]
        out_total = sum(float(t.amount) for t in out_query)
        in_total = sum(float(t.amount) for t in in_query)
        diff = in_total - out_total
        return (
            f"You earned **${in_total:,.2f}** and spent **${out_total:,.2f}**{time_label}. "
            f"You kept **${diff:,.2f}** ({'profitable' if diff > 0 else 'overspending'})."
        )

    return f"You had {count} transaction{'s' if count != 1 else ''} totaling **${total:,.2f}** for {category_label}{time_label}."
