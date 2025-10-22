from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)

TEST_ACTIVITY = "Chess Club"
TEST_EMAIL = "tester@mergington.edu"


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert TEST_ACTIVITY in data


def test_signup_and_unregister_flow():
    # ensure email not already present
    if TEST_EMAIL in activities[TEST_ACTIVITY]["participants"]:
        activities[TEST_ACTIVITY]["participants"].remove(TEST_EMAIL)

    # sign up
    resp = client.post(f"/activities/{TEST_ACTIVITY}/signup?email={TEST_EMAIL}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")
    assert TEST_EMAIL in activities[TEST_ACTIVITY]["participants"]

    # duplicate signup should fail
    resp2 = client.post(f"/activities/{TEST_ACTIVITY}/signup?email={TEST_EMAIL}")
    assert resp2.status_code == 400

    # unregister
    resp3 = client.delete(f"/activities/{TEST_ACTIVITY}/participants?email={TEST_EMAIL}")
    assert resp3.status_code == 200
    assert TEST_EMAIL not in activities[TEST_ACTIVITY]["participants"]

    # unregistering again should return 404
    resp4 = client.delete(f"/activities/{TEST_ACTIVITY}/participants?email={TEST_EMAIL}")
    assert resp4.status_code == 404


def test_signup_nonexistent_activity():
    resp = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert resp.status_code == 404


def test_unregister_nonexistent_activity():
    resp = client.delete("/activities/NoSuchActivity/participants?email=a@b.com")
    assert resp.status_code == 404
