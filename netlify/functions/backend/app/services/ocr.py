import re
from datetime import date, datetime
from typing import Optional


def extract_amount(text: str) -> Optional[float]:
    patterns = [
        r"total[:\s]*\$?([\d,]+\.\d{2})",
        r"amount[:\s]*\$?([\d,]+\.\d{2})",
        r"due[:\s]*\$?([\d,]+\.\d{2})",
        r"balance[:\s]*\$?([\d,]+\.\d{2})",
        r"\$?([\d,]+\.\d{2})\s*$",
        r"grand total[:\s]*\$?([\d,]+\.\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def extract_date(text: str) -> Optional[str]:
    patterns = [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}",
        r"(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                dt = datetime.strptime(match.group(1), "%m/%d/%Y")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                try:
                    dt = datetime.strptime(match.group(1), "%m-%d-%Y")
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    try:
                        dt = datetime.strptime(match.group(1), "%Y-%m-%d")
                        return dt.strftime("%Y-%m-%d")
                    except ValueError:
                        pass
    return str(date.today())


def extract_vendor(text: str) -> str:
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if not lines:
        return "Unknown Store"

    # Usually the first non-empty line is the store name
    first_line = lines[0]

    skip_words = ["total", "invoice", "receipt", "order", "payment", "date", "thank you"]
    for skip in skip_words:
        if skip in first_line.lower() and len(lines) > 1:
            first_line = lines[1]
            break

    return first_line[:50]


def extract_tax(text: str) -> Optional[float]:
    patterns = [
        r"tax[:\s]*\$?([\d,]+\.\d{2})",
        r"gst[:\s]*\$?([\d,]+\.\d{2})",
        r"vat[:\s]*\$?([\d,]+\.\d{2})",
        r"sales tax[:\s]*\$?([\d,]+\.\d{2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
    return 0.0


def extract_receipt_data(text: str) -> dict:
    return {
        "vendor": extract_vendor(text),
        "date": extract_date(text),
        "total": extract_amount(text) or 0.0,
        "tax": extract_tax(text),
        "confidence": 0.85,
    }
