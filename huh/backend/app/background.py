import asyncio
import logging
from typing import Callable, Any
from app.config import settings

logger = logging.getLogger("receipt_ai.background")

_queue: list[tuple[Callable, tuple, dict]] = []
_running = False

async def _worker():
    global _running
    _running = True
    while _running:
        while _queue:
            fn, args, kwargs = _queue.pop(0)
            try:
                if asyncio.iscoroutinefunction(fn):
                    await fn(*args, **kwargs)
                else:
                    fn(*args, **kwargs)
            except Exception as e:
                logger.error(f"Background task failed: {e}")
        await asyncio.sleep(0.1)

async def start_worker():
    asyncio.create_task(_worker())

def stop_worker():
    global _running
    _running = False

def enqueue(fn: Callable, *args, **kwargs):
    _queue.append((fn, args, kwargs))
