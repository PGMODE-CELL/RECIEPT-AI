import re

CATEGORY_KEYWORDS = {
    "Food & Dining": [
        "restaurant", "cafe", "coffee", "pizza", "burger", "lunch", "dinner",
        "breakfast", "grocery", "supermarket", "food", "dining", "takeout",
        "delivery", "mcdonald", "subway", "starbucks", "dunkin", "publix",
        "walmart", "costco", "trader joe", "whole foods", "kroger",
    ],
    "Transportation": [
        "gas", "fuel", "uber", "lyft", "taxi", "metro", "bus", "train",
        "parking", "toll", "car wash", "tire", "oil change", "repair",
        "shell", "exxon", "chevron", "bp", "speedway",
    ],
    "Shopping": [
        "amazon", "target", "best buy", "mall", "clothing", "shoes",
        "electronics", "home depot", "lowes", "ikea", "nike", "adidas",
        "zara", "h&m", "gap", "walmart",
    ],
    "Housing": [
        "rent", "mortgage", "maintenance", "repair", "plumber", "electrician",
        "apartment", "lease", "property",
    ],
    "Utilities": [
        "electric", "water", "internet", "phone", "gas bill", "utility",
        "comcast", "spectrum", "verizon", "at&t", "t-mobile", "sprint",
        "power", "energy",
    ],
    "Entertainment": [
        "netflix", "spotify", "hulu", "disney", "hbo", "game", "movie",
        "concert", "ticket", "cinema", "theater", "music", "apple tv",
        "prime video", "youtube", "patreon",
    ],
    "Health": [
        "pharmacy", "doctor", "dentist", "hospital", "medical", "insurance",
        "cvs", "walgreens", "copay", "prescription", "therapy", "gym",
        "fitness", "planet fitness", "24 hour fitness",
    ],
    "Travel": [
        "flight", "hotel", "airbnb", "booking", "expedia", "airline",
        "airport", "vacation", "resort", "rental car", "hertz", "avis",
        "marriott", "hilton", "holiday inn",
    ],
    "Income": [
        "salary", "payroll", "deposit", "direct deposit", "paycheck",
        "wage", "income", "freelance", "consulting", "contract", "invoice",
        "payment received", "stripe", "paypal", "venmo", "zelle",
    ],
    "Transfer": [
        "transfer", "withdrawal", "atm", "cash withdrawal", "move money",
    ],
}


def categorize(description: str, amount: float = None) -> str:
    desc_lower = description.lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in desc_lower:
                return category

    if amount is not None:
        if amount > 0 and amount < 50:
            return "Food & Dining"
        if amount > 500:
            return "Shopping"

    return "Other"
