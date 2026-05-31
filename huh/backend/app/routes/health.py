from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/api/health")
def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "receipt-ai-ultimate",
    }
