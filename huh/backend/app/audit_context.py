"""
FastAPI middleware that sets request-scoped identity context vars
so that SQLAlchemy audit event listeners can record who did what.
"""
from fastapi import Request
from app.context import current_user_id, current_org_id, current_ip
from app.auth import decode_token


async def audit_context_middleware(request: Request, call_next):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    user_id = None
    org_id = None
    if token:
        try:
            payload = decode_token(token)
            user_id = int(payload.get("sub", 0)) or None
        except Exception:
            pass

    # Try to extract org_id from path
    path_parts = request.url.path.split("/")
    for part in path_parts:
        if part.isdigit():
            org_id = int(part)
            break

    token_cid = current_user_id.set(user_id)
    token_coid = current_org_id.set(org_id)
    token_ip = current_ip.set(request.client.host if request.client else None)

    try:
        response = await call_next(request)
        return response
    finally:
        current_user_id.reset(token_cid)
        current_org_id.reset(token_coid)
        current_ip.reset(token_ip)
