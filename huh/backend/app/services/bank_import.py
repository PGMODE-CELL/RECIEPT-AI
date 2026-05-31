import csv
import io
from datetime import datetime
from typing import List, Dict


def parse_csv(content: str) -> List[Dict]:
    reader = csv.DictReader(io.StringIO(content))
    transactions = []

    for row in reader:
        tx = _normalize_row(row)
        if tx:
            transactions.append(tx)

    return transactions


def _normalize_row(row: dict) -> dict:
    normalized = {}
    for key, value in row.items():
        key_lower = key.lower().strip()

        if key_lower in ("date", "transaction date", "posting date", "trans date"):
            for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"):
                try:
                    normalized["date"] = datetime.strptime(value.strip(), fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
            if "date" not in normalized:
                normalized["date"] = value.strip()

        elif key_lower in ("description", "memo", "name", "payee", "merchant", "narrative", "details"):
            normalized["description"] = value.strip()

        elif key_lower in ("amount", "value", "sum", "transaction amount"):
            cleaned = value.strip().replace("$", "").replace(",", "").replace('"', "")
            try:
                normalized["amount"] = abs(float(cleaned))
                normalized["type"] = "money_out" if float(cleaned) < 0 else "money_in"
            except ValueError:
                pass

        elif key_lower in ("debit", "withdrawal", "paid out"):
            cleaned = value.strip().replace("$", "").replace(",", "")
            try:
                num = float(cleaned)
                if num > 0:
                    normalized["amount"] = num
                    normalized["type"] = "money_out"
            except ValueError:
                pass

        elif key_lower in ("credit", "deposit", "paid in"):
            cleaned = value.strip().replace("$", "").replace(",", "")
            try:
                num = float(cleaned)
                if num > 0:
                    normalized["amount"] = num
                    normalized["type"] = "money_in"
            except ValueError:
                pass

        elif key_lower in ("category", "type", "transaction type"):
            normalized["category"] = value.strip()

    if "description" not in normalized:
        normalized["description"] = "Imported transaction"
    if "amount" not in normalized:
        normalized["amount"] = 0.0
    if "type" not in normalized:
        normalized["type"] = "money_out"
    if "date" not in normalized:
        normalized["date"] = datetime.now().strftime("%Y-%m-%d")

    return normalized
