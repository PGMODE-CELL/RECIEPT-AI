import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)

SMTP_HOST = getattr(settings, "SMTP_HOST", "")
SMTP_PORT = getattr(settings, "SMTP_PORT", 587)
SMTP_USER = getattr(settings, "SMTP_USER", "")
SMTP_PASS = getattr(settings, "SMTP_PASS", "")
SMTP_FROM = getattr(settings, "SMTP_FROM", "noreply@receiptai.app")


def send_email(to: str, subject: str, html: str) -> bool:
    if not SMTP_HOST:
        logger.warning("SMTP not configured — email not sent")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT)) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


def invoice_email(contact_name: str, invoice_number: str, total: float, due_date: str) -> str:
    return f"""<div style="font-family:sans-serif;max-width:600px;margin:auto">
<h2>Invoice {invoice_number}</h2>
<p>Hi {contact_name},</p>
<p>Your invoice <strong>#{invoice_number}</strong> for <strong>${total:.2f}</strong> is due on <strong>{due_date}</strong>.</p>
<p>Please make payment at your earliest convenience.</p>
<br/><p style="color:#666">— Receipt AI</p>
</div>"""


def payslip_email(employee_name: str, month: str, net_pay: float) -> str:
    return f"""<div style="font-family:sans-serif;max-width:600px;margin:auto">
<h2>Payslip — {month}</h2>
<p>Hi {employee_name},</p>
<p>Your payslip for <strong>{month}</strong> has been generated.</p>
<p>Net Pay: <strong>${net_pay:.2f}</strong></p>
<br/><p style="color:#666">— Receipt AI</p>
</div>"""


def reminder_email(contact_name: str, invoice_number: str, total: float, days_overdue: int) -> str:
    return f"""<div style="font-family:sans-serif;max-width:600px;margin:auto">
<h2>Payment Reminder</h2>
<p>Hi {contact_name},</p>
<p>Invoice <strong>#{invoice_number}</strong> for <strong>${total:.2f}</strong> is <strong>{days_overdue} day(s) overdue</strong>.</p>
<p>Please arrange payment immediately.</p>
<br/><p style="color:#666">— Receipt AI</p>
</div>"""
