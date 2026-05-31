import io
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.invoice import Invoice
from app.models.contact import Contact
from app.auth import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.get("/{org_id}/{invoice_id}/pdf")
def get_invoice_pdf(
    org_id: int,
    invoice_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        .first()
    )
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    contact = db.query(Contact).filter(Contact.id == invoice.contact_id).first()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(
        Paragraph(
            f"<b>INVOICE #{invoice.number}</b>",
            ParagraphStyle(
                "Title",
                parent=styles["Heading1"],
                fontSize=24,
                spaceAfter=20,
            ),
        )
    )
    elements.append(Paragraph(f"From: {org.name}", styles["Normal"]))
    elements.append(
        Paragraph(
            f"To: {contact.name if contact else 'Customer'}", styles["Normal"]
        )
    )
    elements.append(Paragraph(f"Date: {invoice.date}", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    if invoice.items:
        data = [["Item", "Qty", "Price", "Total"]]
        for item in invoice.items:
            data.append(
                [
                    item.get("description", ""),
                    str(item.get("quantity", 1)),
                    f"${item.get('price', 0):.2f}",
                    f"${item.get('price', 0) * item.get('quantity', 1):.2f}",
                ]
            )
        data.append(
            [
                "",
                "",
                "<b>Total</b>",
                f"<b>${float(invoice.total):.2f}</b>",
            ]
        )

        table = Table(
            data, colWidths=[3 * inch, 0.8 * inch, 1.2 * inch, 1.2 * inch]
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -2), 1, colors.grey),
                    ("LINEABOVE", (0, -1), (-1, -1), 2, colors.black),
                    ("FONTNAME", (-2, -1), (-1, -1), "Helvetica-Bold"),
                ]
            )
        )
        elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename=invoice_{invoice.number}.pdf"
            )
        },
    )
