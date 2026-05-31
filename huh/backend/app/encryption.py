from cryptography.fernet import Fernet
import base64, hashlib
from app.config import settings


def _derive_key() -> bytes:
    key = settings.ENCRYPTION_KEY.encode()
    if len(key) < 32:
        key = hashlib.sha256(key).digest()
    return base64.urlsafe_b64encode(key[:32])


_cipher = Fernet(_derive_key())


def encrypt_field(value: str | None) -> str | None:
    if not value:
        return value
    return _cipher.encrypt(value.encode()).decode()


def decrypt_field(value: str | None) -> str | None:
    if not value:
        return value
    try:
        return _cipher.decrypt(value.encode()).decode()
    except Exception:
        return value  # fallback for unencrypted legacy data


def encrypt_dict(data: dict, fields: list[str]) -> dict:
    out = dict(data)
    for f in fields:
        if f in out and out[f] is not None:
            out[f] = encrypt_field(str(out[f]))
    return out


def decrypt_dict(data: dict, fields: list[str]) -> dict:
    out = dict(data)
    for f in fields:
        if f in out and out[f] is not None:
            out[f] = decrypt_field(out[f])
    return out
