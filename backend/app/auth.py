"""Auth helpers: validate Supabase access tokens and load public.users.

Supabase projects created (or migrated) after Oct 2025 sign tokens with an
asymmetric key (ES256/RS256) instead of a shared HS256 secret, and publish
the public half at {SUPABASE_URL}/auth/v1/.well-known/jwks.json. We verify
against that JWKS by the token's `kid` first, falling back to the legacy
shared-secret HS256 check for projects that never migrated.
"""

import json
import logging
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

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=True)
settings = get_settings()

_JWKS_TTL_SECONDS = 600  # matches Supabase's own edge cache duration for this endpoint
_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}


def _fetch_jwks() -> list[dict]:
    if not settings.supabase_url:
        logger.warning("auth: SUPABASE_URL is not set — cannot fetch JWKS, will fall back to legacy HS256")
        return []
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    keys = data.get("keys", [])
    logger.warning("auth: fetched JWKS from %s — %d key(s), kids=%s", url, len(keys), [k.get("kid") for k in keys])
    return keys


def _get_signing_key(kid: str) -> dict | None:
    """Look up a JWKS entry by kid, refreshing the cache (once) if it's stale or missing."""
    now = time.time()
    if now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS:
        try:
            _jwks_cache["keys"] = _fetch_jwks()
            _jwks_cache["fetched_at"] = now
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("auth: JWKS fetch failed: %r — serving stale/empty cache", exc)

    for key in _jwks_cache["keys"]:
        if key.get("kid") == kid:
            return key

    # Not found — could be a key that just rotated in; force one refetch before giving up.
    logger.warning("auth: kid=%r not in cached JWKS (%d keys) — forcing refetch", kid, len(_jwks_cache["keys"]))
    try:
        _jwks_cache["keys"] = _fetch_jwks()
        _jwks_cache["fetched_at"] = time.time()
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("auth: JWKS refetch failed: %r", exc)
        return None

    for key in _jwks_cache["keys"]:
        if key.get("kid") == kid:
            return key
    return None


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    def _exc(reason: str) -> HTTPException:
        # TEMPORARY DEBUG — remove once the live 401 issue is found. Server-side logging
        # isn't reaching Render's log viewer, so the real failure reason is surfaced
        # directly in the response body instead, where it's visible in the browser.
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {reason}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        header = jwt.get_unverified_header(creds.credentials)
    except JWTError as exc:
        raise _exc(f"could not parse token header: {exc}") from exc

    kid = header.get("kid")
    signing_key = _get_signing_key(kid) if kid else None

    try:
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
    except JWTError as exc:
        detail = f"jwt.decode failed (kid={kid!r}, alg={header.get('alg')!r}, used_jwks={signing_key is not None}"
        if signing_key is None:
            detail += f", supabase_url_set={bool(settings.supabase_url)}"
        raise _exc(f"{detail}): {exc}") from exc

    sub = payload.get("sub")
    if not sub:
        raise _exc("token payload has no 'sub' claim")
    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise _exc(f"sub {sub!r} is not a valid UUID: {exc}") from exc

    user = db.get(User, user_id)
    if user is None:
        raise _exc(f"no public.users row for user_id={user_id}")
    return user


def require_roles(*roles: UserRole):
    def _dep(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _dep
