"""Tests for parse_study() and calculate_days_remaining()."""
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from eligibility import parse_study, calculate_days_remaining


def _raw_study(**protocol_overrides):
    """Build a minimal raw ClinicalTrials.gov study dict."""
    protocol = {
        "identificationModule": {"nctId": "NCT00000001", "briefTitle": "Test Study"},
        "statusModule": {
            "overallStatus": "RECRUITING",
            "startDateStruct": {"date": "2023-01"},
            "completionDateStruct": {"date": "2026-12"},
        },
        "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Test Sponsor"}},
        "designModule": {"phases": ["PHASE2"]},
        "conditionsModule": {"conditions": ["Lung Cancer"]},
        "descriptionModule": {"briefSummary": "A test study."},
        "eligibilityModule": {
            "eligibilityCriteria": "Inclusion Criteria:\n- Adults only",
            "minimumAge": "18 Years",
            "maximumAge": "75 Years",
            "gender": "ALL",
            "stdAges": ["ADULT"],
        },
        "contactsLocationsModule": {},
    }
    protocol.update(protocol_overrides)
    return {"protocolSection": protocol}


def test_parse_study_handles_missing_fields():
    result = parse_study({"protocolSection": {}})
    assert result["nctId"] == ""
    assert result["title"] == "Untitled Study"
    assert result["sponsor"] == "Unknown Sponsor"
    assert result["phase"] == "Phase NA"
    assert result["status"] == "UNKNOWN"


def test_parse_study_normalizes_phase_correctly():
    study = _raw_study()
    result = parse_study(study)
    assert result["phase"] == "Phase II"


def test_parse_study_status_normalized():
    study = _raw_study()
    result = parse_study(study)
    assert result["status"] == "Recruiting"


def test_closing_soon_badge_30_days():
    future = (date.today() + timedelta(days=20)).strftime("%Y-%m-%d")
    days = calculate_days_remaining(future)
    assert days is not None
    assert 0 <= days <= 30


def test_closing_soon_badge_60_days():
    future = (date.today() + timedelta(days=50)).strftime("%Y-%m-%d")
    days = calculate_days_remaining(future)
    assert days is not None
    assert 31 <= days <= 60


def test_no_urgency_for_distant_date():
    future = (date.today() + timedelta(days=365)).strftime("%Y-%m-%d")
    days = calculate_days_remaining(future)
    assert days is not None
    assert days > 90


def test_closing_soon_field_set_in_parse_study():
    soon_date = (date.today() + timedelta(days=15)).strftime("%Y-%m-%d")
    protocol = _raw_study()
    protocol["protocolSection"]["statusModule"]["completionDateStruct"]["date"] = soon_date
    result = parse_study(protocol)
    assert result["closingSoonStatus"] == "30 days"


def test_calculate_days_remaining_unknown_returns_none():
    assert calculate_days_remaining("Unknown End") is None
    assert calculate_days_remaining("") is None
    assert calculate_days_remaining(None) is None
