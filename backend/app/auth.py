"""Auth helpers: validate Supabase access tokens and load public.users.

Supabase projects created (or migrated) after Oct 2025 sign tokens with an
asymmetric key (ES256/RS256) instead of a shared HS256 secret, and publish
the public half at {SUPABASE_URL}/auth/v1/.well-known/jwks.json. We verify
against that JWKS by the token's `kid` first, falling back to the legacy
shared-secret HS256 check for projects that never migrated.
"""

import json
import time
import urllib.error
import urllib.request
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=True)
settings = get_settings()

_JWKS_TTL_SECONDS = 600  # matches Supabase's own edge cache duration for this endpoint
_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}


def _fetch_jwks() -> list[dict]:
    if not settings.supabase_url:
        return []
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data.get("keys", [])


def _get_signing_key(kid: str) -> dict | None:
    """Look up a JWKS entry by kid, refreshing the cache (once) if it's stale or missing."""
    now = time.time()
    if now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS:
        try:
            _jwks_cache["keys"] = _fetch_jwks()
            _jwks_cache["fetched_at"] = now
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass  # serve whatever's cached, if anything

    for key in _jwks_cache["keys"]:
        if key.get("kid") == kid:
            return key

    # Not found — could be a key that just rotated in; force one refetch before giving up.
    try:
        _jwks_cache["keys"] = _fetch_jwks()
        _jwks_cache["fetched_at"] = time.time()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    for key in _jwks_cache["keys"]:
        if key.get("kid") == kid:
            return key
    return None


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        kid = jwt.get_unverified_header(creds.credentials).get("kid")
        signing_key = _get_signing_key(kid) if kid else None

        if signing_key is not None:
            payload = jwt.decode(
                creds.credentials,
                signing_key,
                algorithms=[signing_key.get("alg", "ES256")],
                audience=settings.jwt_audience,
            )
        else:
            # Legacy shared-secret project (no JWKS, or no key matching this token's kid).
            payload = jwt.decode(
                creds.credentials,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                audience=settings.jwt_audience,
            )

        sub = payload.get("sub")
        if not sub:
            raise credentials_exc
        user_id = UUID(sub)
    except (JWTError, ValueError) as exc:
        raise credentials_exc from exc

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exc
    return user


def require_roles(*roles: UserRole):
    def _dep(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _dep
