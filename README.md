# TrialBridge

Live Application: https://trialbridge-smoky.vercel.app

TrialBridge is a clinical trial discovery platform built for patients, caregivers, and researchers. Users describe their condition in plain language and the platform returns semantically ranked, real-time trial records sourced directly from ClinicalTrials.gov. The search is powered by local vector embeddings rather than keyword matching, which allows it to surface relevant trials even when the user does not know the exact medical terminology.

---

## Live Deployment

Frontend: https://trialbridge-smoky.vercel.app  
Backend API: https://trialbridge-production.up.railway.app  
API Documentation: https://trialbridge-production.up.railway.app/docs  

---

## Architecture

```
Browser
  |
  React + Vite (Vercel)
  |
  FastAPI + Uvicorn (Railway)
  |
  +-- Sentence Transformers (all-MiniLM-L6-v2)
  |
  +-- ClinicalTrials.gov v2 REST API
  |
  +-- PostgreSQL / SQLite (bookmarks and analytics)
```

---

## Features

Semantic Search — plain-language queries ranked using cosine similarity against local vector embeddings. No keyword matching required.

Eligibility Screener — a multi-step screening tool that filters trials against patient age, gender, current medications, prior treatments, and metastasis status.

Live Filters — narrow results by trial phase, recruitment status, age group, and condition category without a page reload.

Saved Trials — bookmark trials across a session, add personal notes, and export a formatted PDF summary for clinical consultations.

Trial Comparison — side-by-side table comparing up to three saved trials on phase, status, eligibility criteria, and location.

Search Insights — analytics dashboard showing search history, phase distribution, and a geographic map of trial locations.

Rate Limiting — backend-enforced 15 requests per minute per IP address using SlowAPI.

---

## Tech Stack

Layer — Technology

Frontend: React 18, Vite, React Router, Axios, Vanilla CSS  
Backend: FastAPI, Uvicorn, SlowAPI  
Machine Learning: sentence-transformers (all-MiniLM-L6-v2, cross-encoder/ms-marco-MiniLM-L6-v2)  
Database: PostgreSQL in production, SQLite as local fallback  
Configuration: pydantic-settings  
Infrastructure: Docker, Nginx, Railway (backend), Vercel (frontend)  

---

## Project Structure

```
TrialBridge/
  backend/
    main.py              App entry point, middleware, router registration
    config.py            Environment configuration via pydantic-settings
    cache.py             Thread-safe in-memory TTL cache
    eligibility.py       Trial eligibility checking and study parsing
    database.py          PostgreSQL and SQLite database layer
    search_engine.py     Two-stage semantic ranking (bi-encoder + cross-encoder)
    limiter.py           SlowAPI rate limiter singleton
    routes/
      search.py          GET /api/search, /api/autocomplete, /api/trial/{id}
      bookmarks.py       POST, DELETE, GET, PUT /api/bookmarks
      insights.py        GET /api/insights, /api/filters
    Dockerfile
    railway.toml
  frontend/
    src/
      pages/
        LandingPage.jsx
        ResultsPage.jsx
        InsightsPage.jsx
        TrialDetailPage.jsx
      components/
        TrialCard.jsx
        FilterSidebar.jsx
        ScreeningPanel.jsx
        TrialDetailDrawer.jsx
        TrialComparisonModal.jsx
      hooks/
        useTrialFilters.js
        useMapData.js
      context/
        TrialContext.jsx
    Dockerfile
    nginx.conf
    vercel.json
```

---

## Local Setup

Requirements: Python 3.10 or later, Node.js 18 or later.

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API will be available at http://localhost:8000. On the first run, the sentence-transformers models will be downloaded automatically (approximately 180 MB total).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at http://localhost:5173.

**Docker**

```bash
docker-compose up --build
```

---

## Environment Variables

Create a `.env` file inside the `backend/` directory.

```
DATABASE_URL=postgresql://user:pass@localhost:5432/trialbridge_db
CACHE_TTL=60
ALLOWED_ORIGINS=http://localhost:5173
```

If `DATABASE_URL` is not set or PostgreSQL is unreachable, the application falls back to a local SQLite database at `backend/trialbridge.db` automatically.

---

## API Reference

GET /api/search — semantic trial search, accepts query, age, gender, prior_treatments, current_meds, healthy, metastasis  
GET /api/autocomplete — condition name suggestions based on a prefix  
GET /api/trial/{nct_id} — full detail record for a single trial  
POST /api/bookmarks — add a trial to a session's bookmarks  
DELETE /api/bookmarks — remove a bookmark  
GET /api/bookmarks — retrieve all bookmarks for a session  
PUT /api/bookmarks/notes — update notes on a saved bookmark  
GET /api/insights — aggregated analytics for recent searches  
GET /api/filters — available filter options for the current result set  
GET /health — service health check endpoint  

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## Data Source

All trial records are sourced from the ClinicalTrials.gov v2 API, a public service provided by the National Library of Medicine at the National Institutes of Health.

API documentation: https://clinicaltrials.gov/data-api/about-api

---

## Disclaimer

TrialBridge is an independent educational project and is not affiliated with ClinicalTrials.gov, the NIH, or any healthcare institution. It is not a diagnostic tool and does not constitute medical advice. Patients and caregivers should consult a licensed clinician before making any decisions regarding clinical trial participation.
