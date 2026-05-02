from fastapi.testclient import TestClient

from app.db.init_db import init_db
from app.main import app


def test_register_and_login():
    init_db()
    client = TestClient(app)
    payload = {"email": "test@reef.ai", "password": "password123", "full_name": "Test Reef"}
    register = client.post("/api/v1/auth/register", json=payload)
    assert register.status_code in (200, 400)

    login = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.status_code == 200
    assert "access_token" in login.json()
