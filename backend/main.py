import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from config import settings
from limiter import limiter
from routes import search, bookmarks, insights
from database import init_db
import search_engine as se

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trialbridge-main")

app = FastAPI(title="TrialBridge API", version="1.0.0")

# Rate-limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(search.router, prefix="/api")
app.include_router(bookmarks.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


@app.on_event("startup")
def startup_event():
    logger.info("Starting TrialBridge API...")
    init_db()
    se.init_model()


@app.get("/health")
def health_check():
    """Railway healthcheck endpoint."""
    return {"status": "ok", "service": "TrialBridge API"}


@app.get("/")
def root():
    return {"message": "TrialBridge API — visit /docs for interactive API docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
