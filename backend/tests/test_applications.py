"""
Tests for application endpoints:
  POST   /api/v1/applications
  GET    /api/v1/applications
  GET    /api/v1/applications/{id}
  PATCH  /api/v1/applications/{id}/submit
  PATCH  /api/v1/applications/{id}/status
  POST   /api/v1/applications/{id}/assign-cr
  POST   /api/v1/applications/{id}/nominees
"""
import pytest


APPS = "/api/v1/applications"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_app(client, token: str) -> dict:
    headers = _auth_headers(token)
    payload = {
        "business_division": "real_estate",
        "product_type": "residential_plot",
        "purpose": "investment",
    }
    resp = client.post(APPS, json=payload, headers=headers)
    assert resp.status_code in (200, 201), f"Create app failed: {resp.text}"
    return resp.json()


# ---------------------------------------------------------------------------
# Create application
# ---------------------------------------------------------------------------

def test_create_application_as_customer(client, customer_token):
    app_data = _create_app(client, customer_token)
    assert "id" in app_data
    assert app_data.get("status") in ("draft", "DRAFT")


def test_create_application_requires_auth(client):
    resp = client.post(
        APPS,
        json={"business_division": "real_estate", "product_type": "residential_plot"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Visibility / isolation
# ---------------------------------------------------------------------------

def test_customer_cannot_see_other_applications(client, customer_token):
    """A second customer registers and their application list must not expose
    the first customer's applications."""
    # Create app as first customer
    _create_app(client, customer_token)

    # Register second customer
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Second Customer",
            "mobile": "01833333333",
            "email": "second@example.com",
            "password": "Second@Pass1",
            "role": "customer",
        },
    )
    login2 = client.post(
        "/api/v1/auth/login",
        json={"mobile": "01833333333", "password": "Second@Pass1"},
    )
    token2 = login2.json()["access_token"]

    resp = client.get(APPS, headers=_auth_headers(token2))
    assert resp.status_code == 200
    items = resp.json().get("items", resp.json())
    assert isinstance(items, list)
    assert len(items) == 0  # second customer has no applications


# ---------------------------------------------------------------------------
# Submit application
# ---------------------------------------------------------------------------

def test_submit_application(client, customer_token):
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]
    headers = _auth_headers(customer_token)

    resp = client.patch(
        f"{APPS}/{app_id}/submit",
        json={"declaration_accepted": True},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json().get("status") in ("submitted", "SUBMITTED")


def test_cannot_submit_without_declaration(client, customer_token):
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]
    headers = _auth_headers(customer_token)

    resp = client.patch(
        f"{APPS}/{app_id}/submit",
        json={"declaration_accepted": False},
        headers=headers,
    )
    assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Status transitions by CR
# ---------------------------------------------------------------------------

def test_cr_can_update_status(client, customer_token, cr_token):
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]

    # Customer submits first
    client.patch(
        f"{APPS}/{app_id}/submit",
        json={"declaration_accepted": True},
        headers=_auth_headers(customer_token),
    )

    resp = client.patch(
        f"{APPS}/{app_id}/status",
        json={"status": "under_review"},
        headers=_auth_headers(cr_token),
    )
    assert resp.status_code == 200
    assert resp.json().get("status") in ("under_review", "UNDER_REVIEW")


def test_invalid_status_transition(client, customer_token, cr_token):
    """Direct draft -> approved must be rejected."""
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]

    resp = client.patch(
        f"{APPS}/{app_id}/status",
        json={"status": "approved"},
        headers=_auth_headers(cr_token),
    )
    assert resp.status_code in (400, 409, 422)


# ---------------------------------------------------------------------------
# Admin: assign CR
# ---------------------------------------------------------------------------

def test_admin_can_assign_cr(client, admin_token, customer_token, cr_token):
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]

    # Retrieve the CR's user id
    cr_resp = client.get("/api/v1/admin/users", headers=_auth_headers(admin_token))
    users = cr_resp.json().get("items", cr_resp.json())
    cr_users = [u for u in users if u.get("role") in ("cr", "CR")]
    assert cr_users, "No CR user found"
    cr_id = cr_users[0]["id"]

    resp = client.post(
        f"{APPS}/{app_id}/assign-cr",
        json={"cr_user_id": cr_id},
        headers=_auth_headers(admin_token),
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Nominees
# ---------------------------------------------------------------------------

def test_add_nominee(client, customer_token):
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]
    headers = _auth_headers(customer_token)

    nominee = {
        "full_name": "Jane Nominee",
        "relationship": "spouse",
        "mobile": "01844444444",
        "share_percentage": 100,
    }
    resp = client.post(f"{APPS}/{app_id}/nominees", json=nominee, headers=headers)
    assert resp.status_code in (200, 201)
    assert resp.json().get("full_name") == "Jane Nominee"


def test_add_too_many_nominees(client, customer_token):
    """Maximum two nominees per application; a third must be rejected."""
    app_data = _create_app(client, customer_token)
    app_id = app_data["id"]
    headers = _auth_headers(customer_token)

    base_nominees = [
        {"full_name": "Nominee One", "relationship": "spouse", "mobile": "01855555551", "share_percentage": 50},
        {"full_name": "Nominee Two", "relationship": "parent", "mobile": "01855555552", "share_percentage": 50},
    ]
    for n in base_nominees:
        r = client.post(f"{APPS}/{app_id}/nominees", json=n, headers=headers)
        assert r.status_code in (200, 201)

    third = {"full_name": "Nominee Three", "relationship": "sibling", "mobile": "01855555553", "share_percentage": 0}
    resp = client.post(f"{APPS}/{app_id}/nominees", json=third, headers=headers)
    assert resp.status_code in (400, 409, 422)
