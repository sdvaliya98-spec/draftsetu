import pytest
from datetime import timedelta, datetime
import jwt
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import create_access_token, SECRET_KEY, ALGORITHM
from backend import models, database

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_valid_token_authenticated_api_works(client, test_db):
    # Ensure test user exists
    user = test_db.query(models.User).filter(models.User.username == "test_session_user").first()
    if not user:
        user = models.User(
            username="test_session_user",
            email="session_user@example.com",
            full_name="Session User",
            password_hash="$2b$12$K8...", # dummy hash
            is_active=True,
            is_admin=False
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)

    token = create_access_token(
        data={"sub": user.username, "is_admin": False},
        expires_delta=timedelta(minutes=30)
    )

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "test_session_user"

def test_expired_token_returns_401_with_clear_detail(client, test_db):
    # Token expired 10 minutes ago
    expired_token = create_access_token(
        data={"sub": "test_session_user", "is_admin": False},
        expires_delta=timedelta(minutes=-10)
    )

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "Token has expired or is invalid" in response.json()["detail"]

def test_invalid_token_returns_401(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"})
    assert response.status_code == 401
    assert "Token has expired or is invalid" in response.json()["detail"]

def test_missing_token_returns_401(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_public_guest_endpoints_work_without_token(client):
    # Templates list should be public/guest accessible
    res_templates = client.get("/api/templates/")
    assert res_templates.status_code == 200

    # Menu list should be public/guest accessible
    res_menu = client.get("/api/menu/")
    assert res_menu.status_code == 200

    # Health check should be public
    res_health = client.get("/api/health")
    assert res_health.status_code == 200

def test_non_admin_forbidden_403_does_not_return_401(client, test_db):
    # Regular user token trying to access admin endpoint
    user = test_db.query(models.User).filter(models.User.username == "test_session_user").first()
    assert user is not None

    token = create_access_token(
        data={"sub": user.username, "is_admin": False},
        expires_delta=timedelta(minutes=30)
    )

    response = client.get("/api/admin/dashboard-stats", headers={"Authorization": f"Bearer {token}"})
    # Must be 403 Forbidden, NOT 401 Unauthorized
    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"
