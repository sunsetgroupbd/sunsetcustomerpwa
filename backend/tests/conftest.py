from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.core.dependencies import get_db
from app.db.session import get_db as get_db_session
from main import app

# Place test.db inside backend/tests and clean up automatically
TEST_DB_PATH = Path(__file__).resolve().parent / "test.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH.as_posix()}"


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest.fixture(scope="function")
def db():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="function")
def client(db):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_session] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    """Register and login an admin user, return access token."""
    # Admin users are seeded via scripts/seed_db.py; just login here
    resp = client.post(
        "/api/v1/auth/login",
        json={"mobile": "01700000000", "password": "Admin@1234"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def customer_token(client):
    """Register a fresh customer user and return access token."""
    reg_data = {
        "full_name": "Test Customer",
        "mobile": "01811111111",
        "email": "testcustomer@example.com",
        "password": "Customer@1234",
        "role": "customer",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_data)
    assert reg_resp.status_code in (200, 201), f"Customer register failed: {reg_resp.text}"

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"mobile": "01811111111", "password": "Customer@1234"},
    )
    assert login_resp.status_code == 200, f"Customer login failed: {login_resp.text}"
    return login_resp.json()["access_token"]


@pytest.fixture
def cr_token(client):
    """Register a fresh CR (customer representative) user and return access token."""
    reg_data = {
        "full_name": "Test CR",
        "mobile": "01922222222",
        "email": "testcr@example.com",
        "password": "CrUser@1234",
        "role": "cr",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_data)
    assert reg_resp.status_code in (200, 201), f"CR register failed: {reg_resp.text}"

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"mobile": "01922222222", "password": "CrUser@1234"},
    )
    assert login_resp.status_code == 200, f"CR login failed: {login_resp.text}"
    return login_resp.json()["access_token"]
