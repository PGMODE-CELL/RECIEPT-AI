import os
from pathlib import Path
from typing import BinaryIO, Optional
from app.config import settings

S3_ENABLED = bool(settings.S3_ENDPOINT and settings.S3_BUCKET)
s3_client = None

if S3_ENABLED:
    import boto3
    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION or "us-east-1",
    )

LOCAL_STORAGE_DIR = Path(settings.LOCAL_STORAGE_DIR or "./storage")
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

async def upload_file(file_path: str, content: BinaryIO, bucket: Optional[str] = None) -> str:
    if S3_ENABLED:
        bucket = bucket or settings.S3_BUCKET
        s3_client.upload_fileobj(content, bucket, file_path)
        return f"{settings.S3_PUBLIC_URL or settings.S3_ENDPOINT}/{bucket}/{file_path}"
    else:
        dest = LOCAL_STORAGE_DIR / file_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            f.write(content.read())
        return f"/storage/{file_path}"

async def download_file(file_path: str) -> Optional[bytes]:
    if S3_ENABLED:
        obj = s3_client.get_object(Bucket=settings.S3_BUCKET, Key=file_path)
        return obj["Body"].read()
    else:
        dest = LOCAL_STORAGE_DIR / file_path
        return dest.read_bytes() if dest.exists() else None

async def delete_file(file_path: str):
    if S3_ENABLED:
        s3_client.delete_object(Bucket=settings.S3_BUCKET, Key=file_path)
    else:
        dest = LOCAL_STORAGE_DIR / file_path
        if dest.exists():
            os.remove(str(dest))

def get_file_url(file_path: str) -> str:
    if S3_ENABLED:
        return f"{settings.S3_PUBLIC_URL or settings.S3_ENDPOINT}/{settings.S3_BUCKET}/{file_path}"
    return f"/storage/{file_path}"
