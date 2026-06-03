import json
import hashlib
from typing import Optional, Any
from app.config import settings

REDIS_URL = settings.REDIS_URL
redis_client = None

if REDIS_URL:
    import redis.asyncio as aioredis
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)

def _make_key(prefix: str, *args, **kwargs) -> str:
    raw = f"{prefix}:{':'.join(str(a) for a in args)}:{json.dumps(kwargs, sort_keys=True)}"
    return f"cache:{hashlib.md5(raw.encode()).hexdigest()}"

async def cache_get(key: str) -> Optional[Any]:
    if not redis_client: return None
    val = await redis_client.get(key)
    return json.loads(val) if val else None

async def cache_set(key: str, value: Any, ttl: int = 300):
    if not redis_client: return
    await redis_client.setex(key, ttl, json.dumps(value, default=str))

async def cache_delete(pattern: str):
    if not redis_client: return
    keys = await redis_client.keys(pattern)
    if keys:
        await redis_client.delete(*keys)

async def cache_invalidate_prefix(prefix: str):
    await cache_delete(f"cache:{prefix}:*")

async def is_rate_limited(key: str, max_requests: int, window: int) -> bool:
    if not redis_client: return False
    now = __import__('time').time()
    pipe = redis_client.pipeline()
    pipe.zadd(key, {str(now): now})
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.expire(key, window)
    pipe.zcard(key)
    result = await pipe.execute()
    return result[3] > max_requests

_in_process_ratelimit = {}
def is_rate_limited_fallback(key: str, max_requests: int, window: int) -> bool:
    import time
    now = time.time()
    if key not in _in_process_ratelimit:
        _in_process_ratelimit[key] = []
    _in_process_ratelimit[key] = [t for t in _in_process_ratelimit[key] if t > now - window]
    _in_process_ratelimit[key].append(now)
    return len(_in_process_ratelimit[key]) > max_requests
