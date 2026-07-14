"""Tests for eligibility.check_eligibility()."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from eligibility import check_eligibility


def _base_study(**overrides):
    """Return a minimal parsed study dict."""
    study = {
        "minAgeStr": "18 Years",
        "maxAgeStr": "65 Years",
        "genderApi": "ALL",
        "healthyVolunteersApi": "",
        "conditions": ["Lung Cancer"],
        "eligibilityCriteria": (
            "Inclusion Criteria:\n- Diagnosed with lung cancer\n"
            "Exclusion Criteria:\n- Prior chemotherapy\n- Metastatic disease"
        ),
    }
    study.update(overrides)
    return study


def test_age_within_range_passes():
    result = check_eligibility(_base_study(), age=45)
    assert result["eligible"] is True
    assert result["reasons"] == []


def test_age_outside_range_fails():
    result = check_eligibility(_base_study(), age=80)
    assert result["eligible"] is False
    assert any("exceeds maximum" in r for r in result["reasons"])


def test_age_below_minimum_fails():
    result = check_eligibility(_base_study(), age=10)
    assert result["eligible"] is False
    assert any("below minimum" in r for r in result["reasons"])


def test_gender_mismatch_returns_ineligible():
    study = _base_study(genderApi="FEMALE")
    result = check_eligibility(study, gender="MALE")
    assert result["eligible"] is False
    assert any("restricted to female" in r for r in result["reasons"])


def test_missing_criteria_returns_possibly_eligible():
    """No eligibility criteria text means no NLP exclusions."""
    study = _base_study(eligibilityCriteria="")
    result = check_eligibility(study, age=45)
    assert result["eligible"] is True


def test_metastasis_flag_excludes_correctly():
    study = _base_study(
        eligibilityCriteria=(
            "Inclusion Criteria:\n- Stage III-IV cancer\n"
            "Exclusion Criteria:\n- Active brain metastases\n- CNT secondaries"
        )
    )
    result = check_eligibility(study, metastasis=True)
    assert result["eligible"] is False
    assert any("metastases" in r.lower() for r in result["reasons"])


def test_prior_treatment_exclusion():
    result = check_eligibility(_base_study(), prior_treatments="chemotherapy")
    assert result["eligible"] is False
    assert any("chemotherapy" in r.lower() for r in result["reasons"])


def test_healthy_volunteer_excluded():
    study = _base_study(healthyVolunteersApi="NOT_ACCEPTABLE")
    result = check_eligibility(study, healthy=True)
    assert result["eligible"] is False
    assert any("healthy volunteers" in r.lower() for r in result["reasons"])
