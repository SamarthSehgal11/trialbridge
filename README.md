# TrialBridge 🏥

TrialBridge is an AI-powered clinical trial matching platform that connects patients and researchers with ongoing clinical studies. Users describe their diagnosis in plain conversational English and TrialBridge returns semantically-ranked, live trial records from ClinicalTrials.gov using local vector embeddings.

---

## 📐 Architecture

```text
              +----------------------------------------------+
              |               Patient / Browser              |
              +----------------------+-----------------------+
                                     |
                   React Router, Axios, Custom CSS
                                     |
                                     v
              +----------------------------------------------+
              |         React + Vite Frontend (Port 5173)    |
              |  pages/ components/ hooks/ styles/           |
              +----------------------+-----------------------+
                                     |
                         HTTP API calls (JSON)
                                     |
                                     v
              +----------------------------------------------+
              |         FastAPI Backend (Port 8000)          |
              |  main.py · routes/ · eligibility · cache     |
              +----+------------------+--------------+-------+
                   |                  |              |
        ML Ranking Engine             |    PostgreSQL / SQLite DB
                   v                  |              v
        +-------------------+         |     +-----------------+
        | sentence-transformers        |     |  Bookmarks +    |
        | all-MiniLM-L6-v2  |         |     |  Analytics Logs |
        +-------------------+         v     +-----------------+
                       +---------------------------------+
                       |  ClinicalTrials.gov v2 REST API |
                       +---------------------------------+
```

---

## 🚀 Key Features

- **Semantic Search** — Plain-language queries ranked by `all-MiniLM-L6-v2` cosine similarity
- **Eligibility Screener** — 5-step NLP wizard that screens trials against patient age, gender, medications, and metastasis status
- **Live Filters** — Phase, status, age group, condition category with instant client-side filtering
- **Saved Trials** — Session-persistent bookmarks with personal notes and doctor Q&A export
- **Trial Comparison** — Side-by-side table comparing up to 3 saved trials
- **Search Insights** — Analytics dashboard with donut chart, horizontal bar, and geographic map
- **Rate Limiting** — `slowapi` guards against abuse (15 searches/min per IP)
- **Export to PDF** — Browser print report formatted for clinical consultation

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, Axios |
| Styling | Vanilla CSS (split into `styles/` modules) |
| Backend | FastAPI, Uvicorn, SlowAPI |
| ML | `sentence-transformers` (all-MiniLM-L6-v2) |
| Database | PostgreSQL (prod) / SQLite (dev fallback) |
| Config | `pydantic-settings` BaseSettings |
| Testing | `pytest`, `httpx`, `pytest-mock` |
| CI/CD | GitHub Actions |
| Container | Docker + Nginx (production) |

---

## 🗂️ Project Structure

```
TrialBridge/
├── backend/
│   ├── main.py           # App init, middleware, router registration
│   ├── config.py         # pydantic-settings BaseSettings
│   ├── cache.py          # Thread-safe TTL cache
│   ├── eligibility.py    # check_eligibility(), parse_study()
│   ├── models.py         # Pydantic request/response models
│   ├── limiter.py        # SlowAPI limiter singleton
│   ├── database.py       # PostgreSQL/SQLite layer
│   ├── search_engine.py  # Sentence-Transformers similarity ranking
│   ├── routes/
│   │   ├── search.py     # GET /api/search, /api/autocomplete, /api/trial/{id}
│   │   ├── bookmarks.py  # POST/DELETE/GET/PUT /api/bookmarks
│   │   └── insights.py   # GET /api/insights, /api/filters
│   └── tests/
│       ├── test_eligibility.py
│       ├── test_search.py
│       └── test_api.py
└── frontend/
    └── src/
        ├── pages/
        │   ├── ResultsPage.jsx  # Orchestrator (~270 lines)
        │   ├── LandingPage.jsx
        │   ├── InsightsPage.jsx
        │   └── TrialDetailPage.jsx
        ├── components/
        │   ├── TrialCard.jsx
        │   ├── FilterSidebar.jsx
        │   ├── ScreeningPanel.jsx
        │   ├── TrialDetailDrawer.jsx
        │   └── TrialComparisonModal.jsx
        ├── hooks/
        │   ├── useTrialFilters.js
        │   └── useMapData.js
        ├── styles/
        │   ├── base.css        # Variables, reset, typography
        │   ├── animations.css  # All @keyframes + utilities
        │   ├── layout.css      # Navbar, grid, footer, responsive
        │   ├── components.css  # Cards, badges, drawers, modals
        │   └── pages/
        │       ├── landing.css
        │       ├── results.css
        │       └── insights.css
        └── context/
            └── TrialContext.jsx
```

---

## ⚙️ Installation

### Prerequisites
- Python 3.10+, Node.js 18+

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: .\\venv\\Scripts\\activate
pip install -r requirements.txt
python main.py
```
*Backend available at `http://localhost:8000`. First run downloads the ML model (~90 MB).*

### Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend available at `http://localhost:5173`.*

### Docker (Production)
```bash
docker-compose up --build
```

---

## 🗄️ Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/trialbridge_db
CACHE_TTL=60
```
If `DATABASE_URL` is absent or PostgreSQL is unreachable, the backend auto-falls back to `backend/trialbridge.db` (SQLite).

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search` | Semantic trial search with optional eligibility params |
| `GET` | `/api/autocomplete` | Condition name autocomplete |
| `GET` | `/api/trial/{nct_id}` | Full trial detail |
| `POST` | `/api/bookmarks` | Add bookmark |
| `DELETE` | `/api/bookmarks` | Remove bookmark |
| `GET` | `/api/bookmarks` | Get all bookmarks for a session |
| `PUT` | `/api/bookmarks/notes` | Update bookmark notes |
| `GET` | `/api/insights` | Analytics summary |
| `GET` | `/api/filters` | Available filter options |

---

## ⚠️ Medical Disclaimer

TrialBridge is an educational prototype. It is **not** a diagnostic tool or substitute for professional medical advice. Always consult with a licensed clinician before joining any clinical trial.

---

## 🏷️ Data Source

All trial listings are sourced from the [ClinicalTrials.gov v2 API](https://clinicaltrials.gov/data-api/about-api) — a public service of the National Library of Medicine.
