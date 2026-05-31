import re
from datetime import date, timedelta, datetime


def parse_date_range(text: str) -> tuple:
    text = text.lower()
    today = date.today()

    if "this month" in text:
        start = today.replace(day=1)
        return start, today
    if "last month" in text:
        first_of_this = today.replace(day=1)
        end = first_of_this - timedelta(days=1)
        start = end.replace(day=1)
        return start, end
    if "this week" in text:
        start = today - timedelta(days=today.weekday())
        return start, today
    if "this year" in text:
        start = today.replace(month=1, day=1)
        return start, today
    if "last 7 days" in text or "past week" in text:
        return today - timedelta(days=7), today
    if "last 30 days" in text or "past month" in text:
        return today - timedelta(days=30), today
    if "last 90 days" in text or "past quarter" in text or "last quarter" in text:
        return today - timedelta(days=90), today
    if "last year" in text:
        return today.replace(year=today.year - 1, month=1, day=1), today
    if "yesterday" in text:
        return today - timedelta(days=1), today - timedelta(days=1)
    if "today" in text:
        return today, today

    match = re.search(r"in (\w+) (\d{4})", text)
    if match:
        month_name = match.group(1)
        year = int(match.group(2))
        try:
            start = datetime.strptime(f"{month_name} 1 {year}", "%B %d %Y").date()
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end = start.replace(month=start.month + 1, day=1) - timedelta(days=1)
            return start, end
        except ValueError:
            pass

    return None, None


def parse_query(query: str):
    query_lower = query.lower()
    start, end = parse_date_range(query)

    response_type = "summary"
    if any(w in query_lower for w in ["how much", "total", "spend", "spent", "earn", "made", "cost"]):
        response_type = "amount"
    if any(w in query_lower for w in ["list", "show", "what", "transactions"]):
        response_type = "list"
    if any(w in query_lower for w in ["compare", "vs", "versus", "difference"]):
        response_type = "compare"

    direction = None
    if any(w in query_lower for w in ["spent", "spend", "expense", "cost", "paid", "buy", "purchased"]):
        direction = "money_out"
    if any(w in query_lower for w in ["earn", "made", "income", "received", "got", "deposit"]):
        direction = "money_in"

    category = None
    for cat in [
        "food", "dining", "groceries", "eat",
        "transport", "gas", "uber", "travel",
        "shopping", "clothes", "amazon",
        "rent", "housing", "utilities", "electric", "water", "internet",
        "entertainment", "netflix", "movie", "game",
        "health", "medical", "gym", "pharmacy",
        "salary", "income", "freelance", "paycheck",
    ]:
        if cat in query_lower:
            category = cat
            break

    return {
        "start": start,
        "end": end,
        "response_type": response_type,
        "direction": direction,
        "category": category,
        "original_query": query,
    }
