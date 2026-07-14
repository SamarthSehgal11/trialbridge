"""Routes for /api/search and /api/autocomplete."""

import logging
import requests
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks, Request

import database as db
import search_engine as se
from cache import get_cached_data, set_cached_data
from eligibility import check_eligibility, parse_study
from limiter import limiter

logger = logging.getLogger("trialbridge-search")

router = APIRouter()

# ---------------------------------------------------------------------------
# Medical Conditions Ontology (autocomplete source)
# ---------------------------------------------------------------------------
MEDICAL_CONDITIONS_ONTOLOGY = [
    # Cancers & Neoplasms
    "Breast Cancer", "Lung Cancer", "Prostate Cancer", "Colorectal Cancer", "Melanoma",
    "Leukemia", "Lymphoma", "Pancreatic Cancer", "Ovarian Cancer", "Glioblastoma",
    "Gastric Cancer", "Bladder Cancer", "Kidney Cancer", "Multiple Myeloma", "Thyroid Cancer",
    # Cardiovascular & Heart
    "Hypertension", "Coronary Artery Disease", "Heart Failure", "Atrial Fibrillation",
    "Myocardial Infarction", "Stroke", "Atherosclerosis", "Angina", "Cardiomyopathy",
    # Diabetes & Endocrine
    "Type 2 Diabetes", "Type 1 Diabetes", "Diabetic Nephropathy", "Diabetic Neuropathy",
    "Diabetic Retinopathy", "Hypothyroidism", "Hyperthyroidism", "Obesity", "Cushing Syndrome",
    # Neurology & Brain
    "Alzheimer's Disease", "Parkinson's Disease", "Multiple Sclerosis", "Epilepsy",
    "Amyotrophic Lateral Sclerosis (ALS)", "Huntington's Disease", "Migraine", "Dementia",
    # Respiratory & Lung
    "Asthma", "Chronic Obstructive Pulmonary Disease (COPD)", "Pulmonary Fibrosis",
    "Cystic Fibrosis", "Pneumonia", "Sleep Apnea", "Sarcoidosis",
    # Autoimmune & Rheumatology
    "Rheumatoid Arthritis", "Osteoarthritis", "Systemic Lupus Erythematosus", "Psoriasis",
    "Crohn's Disease", "Ulcerative Colitis", "Celiac Disease", "Ankylosing Spondylitis",
    # Infectious Diseases
    "HIV/AIDS", "Hepatitis B", "Hepatitis C", "Tuberculosis", "Influenza", "COVID-19",
    "Malaria", "Sepsis", "Lyme Disease",
    # Mental Health & Psychiatric
    "Major Depressive Disorder", "Generalized Anxiety Disorder", "Schizophrenia",
    "Bipolar Disorder", "Post-Traumatic Stress Disorder (PTSD)",
    "Obsessive-Compulsive Disorder (OCD)",
    # Renal & Kidney
    "Chronic Kidney Disease", "End-Stage Renal Disease", "Polycystic Kidney Disease",
    "Nephrotic Syndrome",
    # Ophthalmology
    "Glaucoma", "Macular Degeneration", "Cataracts", "Dry Eye Syndrome",
]


# ---------------------------------------------------------------------------
# Individual trial detail fetch (used by bookmarks route too)
# ---------------------------------------------------------------------------
def fetch_trial_detail(nct_id: str) -> dict:
    cache_key = f"trial_{nct_id.strip()}"
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    logger.info(f"Fetching trial detail for NCT ID: {nct_id}")
    url = f"https://clinicaltrials.gov/api/v2/studies/{nct_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Trial with NCT ID {nct_id} not found")
        elif response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch trial details from ClinicalTrials.gov")

        study = response.json()
        parsed_study = parse_study(study, match_score=None)
        set_cached_data(cache_key, parsed_study)
        return parsed_study
    except requests.RequestException as e:
        logger.error(f"Network error calling ClinicalTrials API for detail: {e}")
        raise HTTPException(status_code=503, detail="ClinicalTrials.gov API is currently unreachable")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/search")
@limiter.limit("15/minute")
def search_trials(
    request: Request,
    query: str = Query(..., description="Plain-language condition/query search"),
    age: Optional[int] = Query(None, description="Patient age"),
    gender: Optional[str] = Query(None, description="Patient gender"),
    prior_treatments: Optional[str] = Query(None, description="Patient prior treatments"),
    current_meds: Optional[str] = Query(None, description="Patient current medications"),
    healthy: Optional[bool] = Query(None, description="Is patient healthy"),
    metastasis: Optional[bool] = Query(None, description="Has metastasis"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if not query.strip():
        return []

    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "127.0.0.1"

    cache_key = f"search_{query.strip().lower()}"
    parsed_results = get_cached_data(cache_key)

    if parsed_results is None:
        logger.info(f"Fetching trials from ClinicalTrials.gov API for query: '{query}'")
        url = "https://clinicaltrials.gov/api/v2/studies"
        params = {"query.term": query, "pageSize": 60, "format": "json"}
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                logger.error(f"ClinicalTrials API returned status code {response.status_code}")
                raise HTTPException(status_code=502, detail="Failed to fetch from ClinicalTrials.gov API")

            data = response.json()
            studies = data.get("studies", [])
            if not studies:
                logger.info("No studies returned from ClinicalTrials.gov API.")
                return []

            logger.info(f"Fetched {len(studies)} studies. Ranking them using Sentence-Transformers...")
            ranked_studies = se.compute_similarity(query, studies)
            parsed_results = [parse_study(s, s.get("matchScore", 50)) for s in ranked_studies]
            set_cached_data(cache_key, parsed_results)

            phases_str = ",".join([r["phase"] for r in parsed_results[:20]])
            background_tasks.add_task(db.log_search, query, len(parsed_results), ip, phases_str)

        except requests.RequestException as e:
            logger.error(f"Network error calling ClinicalTrials API: {e}")
            raise HTTPException(status_code=503, detail="ClinicalTrials.gov API is currently unreachable")
        except Exception as e:
            logger.error(f"Unexpected error during search: {e}")
            raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    else:
        phases_str = ",".join([r["phase"] for r in parsed_results[:20]])
        background_tasks.add_task(db.log_search, query, len(parsed_results), ip, phases_str)

    screened_results = []
    has_screening_params = any([
        age is not None, gender is not None, prior_treatments is not None,
        current_meds is not None, healthy is not None, metastasis is not None,
    ])
    for study in parsed_results:
        study_copy = dict(study)
        if has_screening_params:
            elig_status = check_eligibility(
                study_copy,
                age=age,
                gender=gender,
                prior_treatments=prior_treatments,
                current_meds=current_meds,
                healthy=healthy,
                metastasis=metastasis,
            )
            study_copy["eligibilityStatus"] = elig_status
        else:
            study_copy["eligibilityStatus"] = {"eligible": True, "reasons": []}
        screened_results.append(study_copy)

    return screened_results[:20]


@router.get("/trial/{nct_id}")
def get_trial_detail(nct_id: str):
    return fetch_trial_detail(nct_id)


@router.get("/autocomplete")
def autocomplete_conditions(q: str = Query("", description="Prefix or condition keyword to search")):
    query = q.strip().lower()
    if not query:
        return []

    matches = []
    for condition in MEDICAL_CONDITIONS_ONTOLOGY:
        if query in condition.lower():
            rank = 0
            if condition.lower().startswith(query):
                rank = 2
            elif any(w.startswith(query) for w in condition.lower().split()):
                rank = 1
            matches.append((condition, rank))

    matches.sort(key=lambda x: (-x[1], x[0]))
    return [m[0] for m in matches[:10]]
