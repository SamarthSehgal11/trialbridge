"""Integration tests for FastAPI endpoints using TestClient + pytest-mock."""
import sys
import os
import json
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def mock_ml_model(mocker):
    """Prevent actual ML model loading during all API tests."""
    mocker.patch("search_engine.init_model")
    mocker.patch("search_engine.model", create=True, new=MagicMock())
    mocker.patch("search_engine.cross_model", create=True, new=MagicMock())


@pytest.fixture()
def client(mocker):
    """Return a TestClient with DB init mocked out."""
    mocker.patch("database.init_db")
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _mock_ct_response(mocker, studies=None):
    """Patch routes.search.requests.get to return a canned CT response."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"studies": studies or []}
    mocker.patch("routes.search.requests.get", return_value=mock_resp)
    return mock_resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def test_search_endpoint_returns_200(client, mocker):
    _mock_ct_response(mocker, studies=[])
    resp = client.get("/api/search?query=cancer")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_search_with_empty_query_returns_200_empty_list(client, mocker):
    """Empty query should return [] without hitting the external API."""
    resp = client.get("/api/search?query=")
    assert resp.status_code == 200
    assert resp.json() == []


def test_search_missing_query_returns_422(client):
    """Missing required 'query' param must return HTTP 422."""
    resp = client.get("/api/search")
    assert resp.status_code == 422


def test_filters_endpoint_returns_expected_keys(client):
    resp = client.get("/api/filters")
    assert resp.status_code == 200
    body = resp.json()
    assert "phases" in body
    assert "statuses" in body
    assert "ageGroups" in body
    assert "conditions" in body


def test_autocomplete_returns_list(client):
    resp = client.get("/api/autocomplete?q=lung")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all(isinstance(item, str) for item in data)
    assert any("lung" in item.lower() or "Lung" in item for item in data)


def test_autocomplete_empty_query_returns_empty(client):
    resp = client.get("/api/autocomplete?q=")
    assert resp.status_code == 200
    assert resp.json() == []


def test_bookmark_add_and_remove(client, mocker):
    mocker.patch("database.add_bookmark", return_value=True)
    mocker.patch("database.remove_bookmark", return_value=True)

    add_resp = client.post(
        "/api/bookmarks",
        json={"session_id": "test_session", "nct_id": "NCT00000001"},
    )
    assert add_resp.status_code == 200
    assert add_resp.json()["status"] == "success"

    del_resp = client.request(
        "DELETE",
        "/api/bookmarks",
        json={"session_id": "test_session", "nct_id": "NCT00000001"},
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"


def test_insights_endpoint_returns_expected_structure(client, mocker):
    mocker.patch(
        "database.get_analytics_summary",
        return_value={
            "top_conditions": [],
            "geo_distribution": [],
            "phase_distribution": [],
            "total_searches": 0,
            "unique_conditions": 0,
            "most_active_day": None,
        },
    )
    resp = client.get("/api/insights")
    assert resp.status_code == 200
    body = resp.json()
    assert "top_conditions" in body
    assert "total_searches" in body
