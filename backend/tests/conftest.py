"""Test DB + auth wiring: a throwaway SQLite file per test session, and a
fixture that lets each test swap in whichever authenticated user it needs
instead of a real Supabase JWT.
"""

import os
import tempfile
import uuid

import pytest

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("INIT_DB_ON_STARTUP", "false")
os.environ.setdefault("SEED_ON_STARTUP", "false")

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

from fastapi.testclient import TestClient  # noqa: E402

from app.auth import get_current_user  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, UserRole  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    os.remove(_db_path)


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def as_user():
    """Call as_user(some_user) before a request to authenticate as them."""
    holder: dict[str, User | None] = {"user": None}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]

    def _set(user: User) -> None:
        holder["user"] = user

    yield _set
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture()
def client(as_user):
    return TestClient(app)


@pytest.fixture()
def make_user(db_session):
    def _make(role: UserRole, *, email: str | None = None, full_name: str = "Test User") -> User:
        user = User(
            user_id=uuid.uuid4(),
            email=email or f"{uuid.uuid4()}@example.com",
            full_name=full_name,
            role=role,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make
