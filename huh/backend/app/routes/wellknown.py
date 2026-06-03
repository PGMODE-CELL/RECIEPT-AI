from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter(tags=["Well Known"])

SECURITY_TXT = """Contact: mailto:security@receiptai.dev
Contact: https://github.com/lokeshgoyal/receiptai/security/advisories/new
Policy: https://github.com/lokeshgoyal/receiptai/blob/main/SECURITY.md
Preferred-Languages: en
Canonical: https://receiptai.dev/.well-known/security.txt
"""


@router.get("/.well-known/security.txt", include_in_schema=False)
async def security_txt():
    return PlainTextResponse(SECURITY_TXT, media_type="text/plain")
