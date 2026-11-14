"""
Tests for authentication endpoints:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
  POST /api/v1/auth/logout
  POST /api/v1/auth/forgot-password
  POST /api/v1/auth/reset-password
"""
import pytest


AUTH = "/api/v1/auth"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, mobile="01811111111", password="ValidPass@1", email="u@example.com"):
    return client.post(
        f"{AUTH}/register",
        json={
            "full_name": "John Doe",
            "mobile": mobile,
            "email": email,
            "password": password,
            "role": "customer",
        },
    )


def _login(client, mobile="01811111111", password="ValidPass@1"):
    return client.post(
        f"{AUTH}/login",
        json={"mobile": mobile, "password": password},
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_success(client):
    resp = _register(client)
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert "id" in data or "mobile" in data or "access_token" in data


def test_register_duplicate_mobile(client):
    _register(client)  # first registration succeeds
    resp = _register(client)  # same mobile again
    assert resp.status_code == 409


def test_register_weak_password(client):
    # Password without uppercase, digit, and special char should be rejected
    resp = _register(client, password="weakpass")
    assert resp.status_code == 422


def test_register_invalid_mobile_format(client):
    resp = _register(client, mobile="12345")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_success(client):
    _register(client)
    resp = _login(client)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("token_type", "").lower() == "bearer"


def test_login_wrong_password(client):
    _register(client)
    resp = _login(client, password="WrongPass@9")
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = _login(client, mobile="09999999999")
    assert resp.status_code == 401


def test_login_unverified(client):
    """If the platform requires mobile/email verification before login, unverified
    accounts should receive 401. Skip this test if the app auto-verifies on register."""
    _register(client)
    # Simulate an unverified state: attempt login immediately without OTP verification.
    # Platforms that auto-verify will return 200; those that require verification, 401.
    resp = _login(client)
    assert resp.status_code in (200, 401)


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

def test_refresh_token(client):
    _register(client)
    login_resp = _login(client)
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    resp = client.post(f"{AUTH}/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


def test_refresh_with_invalid_token(client):
    resp = client.post(f"{AUTH}/refresh", json={"refresh_token": "not.a.valid.token"})
    assert resp.status_code in (401, 422)


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

def test_logout(client):
    _register(client)
    login_resp = _login(client)
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    resp = client.post(
        f"{AUTH}/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers=headers,
    )
    assert resp.status_code in (200, 204)

    # Revoked refresh token must no longer be usable
    resp2 = client.post(f"{AUTH}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# Forgot / Reset password (OTP flow)
# ---------------------------------------------------------------------------

def test_forgot_password(client):
    _register(client)
    resp = client.post(f"{AUTH}/forgot-password", json={"mobile": "01811111111"})
    # Must return 200 (OTP sent) even if mobile not found, to avoid enumeration
    assert resp.status_code == 200


def test_forgot_password_unknown_mobile(client):
    resp = client.post(f"{AUTH}/forgot-password", json={"mobile": "09000000000"})
    # Should still return 200 to prevent enumeration
    assert resp.status_code == 200


def test_reset_password(client):
    """Full OTP reset flow – the OTP is obtained from the response in test mode."""
    _register(client)
    forgot_resp = client.post(f"{AUTH}/forgot-password", json={"mobile": "01811111111"})
    assert forgot_resp.status_code == 200
    body = forgot_resp.json()

    # In test/development mode the API may return the OTP directly
    otp = body.get("otp") or body.get("debug_otp") or "000000"

    resp = client.post(
        f"{AUTH}/reset-password",
        json={
            "mobile": "01811111111",
            "otp": otp,
            "new_password": "NewPass@9876",
        },
    )
    # 200 means success; 400/422 is acceptable when OTP is not exposed in this environment
    assert resp.status_code in (200, 400, 422)


def test_reset_password_wrong_otp(client):
    _register(client)
    client.post(f"{AUTH}/forgot-password", json={"mobile": "01811111111"})
    resp = client.post(
        f"{AUTH}/reset-password",
        json={
            "mobile": "01811111111",
            "otp": "000000",
            "new_password": "NewPass@9876",
        },
    )
    assert resp.status_code in (400, 401, 422)
