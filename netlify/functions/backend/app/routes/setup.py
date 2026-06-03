from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.account import Account
from app.models.org_member import OrganizationMember
from app.schemas.setup import SetupOrgRequest
from app.auth import get_current_user
from app.encryption import encrypt_dict

router = APIRouter(prefix="/api/setup", tags=["Setup"])

COUNTRY_CONFIGS = {
    "US": {
        "currency": "USD",
        "tax_name": "Sales Tax",
        "tax_rate": 8.0,
        "accounts": [
            {"name": "Cash", "type": "asset"},
            {"name": "Bank", "type": "asset"},
            {"name": "Money People Owe You", "type": "asset"},
            {"name": "Money You Owe", "type": "liability"},
            {"name": "Tax You Owe", "type": "liability"},
            {"name": "Your Investment", "type": "equity"},
            {"name": "Sales", "type": "income"},
            {"name": "Products You Sell", "type": "income"},
            {"name": "Buying Stuff", "type": "expense"},
            {"name": "Rent", "type": "expense"},
            {"name": "Salaries", "type": "expense"},
            {"name": "Office Stuff", "type": "expense"},
            {"name": "Travel & Food", "type": "expense"},
            {"name": "Bills (Electric/Internet)", "type": "expense"},
        ],
    },
    "IN": {
        "currency": "INR",
        "tax_name": "GST",
        "tax_rate": 18.0,
        "accounts": [
            {"name": "Cash", "type": "asset"},
            {"name": "Bank Account", "type": "asset"},
            {"name": "Money Customers Owe", "type": "asset"},
            {"name": "Money You Owe Suppliers", "type": "liability"},
            {"name": "GST Payable", "type": "liability"},
            {"name": "Owner Capital", "type": "equity"},
            {"name": "Sales", "type": "income"},
            {"name": "Services", "type": "income"},
            {"name": "Purchases", "type": "expense"},
            {"name": "Rent", "type": "expense"},
            {"name": "Staff Salaries", "type": "expense"},
            {"name": "Office Expenses", "type": "expense"},
        ],
    },
    "GB": {
        "currency": "GBP",
        "tax_name": "VAT",
        "tax_rate": 20.0,
        "accounts": [
            {"name": "Cash", "type": "asset"},
            {"name": "Bank", "type": "asset"},
            {"name": "Debtors", "type": "asset"},
            {"name": "Creditors", "type": "liability"},
            {"name": "VAT Control", "type": "liability"},
            {"name": "Capital", "type": "equity"},
            {"name": "Turnover", "type": "income"},
            {"name": "Cost of Sales", "type": "expense"},
            {"name": "Overheads", "type": "expense"},
            {"name": "Wages", "type": "expense"},
        ],
    },
    "CN": {
        "currency": "CNY",
        "tax_name": "增值税",
        "tax_rate": 13.0,
        "accounts": [
            {"name": "现金", "type": "asset"},
            {"name": "银行存款", "type": "asset"},
            {"name": "应收账款", "type": "asset"},
            {"name": "应付账款", "type": "liability"},
            {"name": "增值税应交", "type": "liability"},
            {"name": "实收资本", "type": "equity"},
            {"name": "主营业务收入", "type": "income"},
            {"name": "主营业务成本", "type": "expense"},
            {"name": "管理费用", "type": "expense"},
            {"name": "工资", "type": "expense"},
        ],
    },
    "AE": {
        "currency": "AED",
        "tax_name": "VAT",
        "tax_rate": 5.0,
        "accounts": [
            {"name": "Cash", "type": "asset"},
            {"name": "Bank", "type": "asset"},
            {"name": "Receivables", "type": "asset"},
            {"name": "Payables", "type": "liability"},
            {"name": "VAT", "type": "liability"},
            {"name": "Capital", "type": "equity"},
            {"name": "Revenue", "type": "income"},
            {"name": "Expenses", "type": "expense"},
        ],
    },
}

COUNTRY_NAMES = {
    "US": "United States",
    "IN": "India",
    "GB": "United Kingdom",
    "CN": "China",
    "AE": "UAE",
}


@router.get("/countries")
def get_countries():
    return [
        {
            "code": k,
            "name": COUNTRY_NAMES[k],
            "currency": v["currency"],
            "tax": v["tax_name"],
        }
        for k, v in COUNTRY_CONFIGS.items()
    ]


@router.post("/create")
async def setup_org(
    data: SetupOrgRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = COUNTRY_CONFIGS.get(data.country, COUNTRY_CONFIGS["US"])
    encrypted = encrypt_dict({"tax_id": data.tax_id}, ["tax_id"])
    org = Organization(
        name=data.name,
        owner_id=user.id,
        country=data.country,
        currency=config["currency"],
        tax_id=encrypted["tax_id"],
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)

    for i, acc in enumerate(config["accounts"]):
        db.add(
            Account(
                org_id=org.id, code=str(1000 + i), name=acc["name"], type=acc["type"]
            )
        )
    db.add(OrganizationMember(user_id=user.id, org_id=org.id, role="owner"))
    await db.commit()

    return {
        "org_id": org.id,
        "name": data.name,
            "message": f"{data.name} is ready! We set up {len(config['accounts'])} accounts for you.",
    }
