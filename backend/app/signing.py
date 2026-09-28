"""
Ed25519 signing for UniPro internship certificates.

UniPro holds one private key (CERTIFICATE_SIGNING_KEY, never shared) and
publishes the matching public key at GET /certificates/public-key.

A certificate is signed over an exact JSON string (``signed_payload``). We store
and return that string unchanged, so anyone can check the signature without
having to re-create the JSON in the same key order.

Generate a new key:

    python -m app.signing
"""

from __future__ import annotations

import base64
import json
from functools import lru_cache

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from app.config import get_settings

ALGORITHM = "Ed25519"


class SigningKeyMissing(RuntimeError):
    pass


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


@lru_cache
def _private_key() -> Ed25519PrivateKey:
    raw = get_settings().certificate_signing_key
    if not raw:
        raise SigningKeyMissing(
            "CERTIFICATE_SIGNING_KEY is not set. Generate one with: python -m app.signing"
        )
    try:
        seed = base64.b64decode(raw.strip(), validate=True)
    except ValueError as exc:
        raise SigningKeyMissing("CERTIFICATE_SIGNING_KEY is not valid base64") from exc
    if len(seed) != 32:
        raise SigningKeyMissing("CERTIFICATE_SIGNING_KEY must decode to 32 bytes")
    return Ed25519PrivateKey.from_private_bytes(seed)


def public_key() -> Ed25519PublicKey:
    return _private_key().public_key()


def public_key_raw_b64() -> str:
    raw = public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return _b64(raw)


def public_key_pem() -> str:
    return public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("ascii")


def key_id() -> str:
    return get_settings().certificate_key_id


def canonical_json(payload: dict) -> str:
    """Deterministic JSON: sorted keys, no extra whitespace, UTF-8 kept as-is."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign(message: str) -> str:
    """Return a base64 Ed25519 signature over the UTF-8 bytes of ``message``."""
    return _b64(_private_key().sign(message.encode("utf-8")))


def verify(message: str, signature_b64: str) -> bool:
    try:
        signature = base64.b64decode(signature_b64, validate=True)
        public_key().verify(signature, message.encode("utf-8"))
        return True
    except (InvalidSignature, ValueError):
        return False


def generate_key_b64() -> str:
    key = Ed25519PrivateKey.generate()
    seed = key.private_bytes(
        serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption()
    )
    return _b64(seed)


if __name__ == "__main__":
    print("Add this to backend/.env (keep it secret, never commit it):\n")
    print(f"CERTIFICATE_SIGNING_KEY={generate_key_b64()}")
