"""Routes for /api/insights and /api/filters."""

from fastapi import APIRouter

import database as db

router = APIRouter()


@router.get("/insights")
def get_insights():
    return db.get_analytics_summary()


@router.get("/filters")
def get_filters():
    return {
        "phases": ["Phase I", "Phase II", "Phase III", "Phase IV"],
        "statuses": ["Recruiting", "Active", "Completed", "Enrolling by Invitation"],
        "ageGroups": ["Child (0-17)", "Adult (18-65)", "Older Adult (66+)"],
        "conditions": [
            "Cancer & Neoplasms",
            "Cardiovascular & Heart Diseases",
            "Diabetes & Endocrine",
            "Neurology & Brain",
            "Infectious Diseases",
            "Respiratory & Lung",
            "Mental Health & Psychiatric",
        ],
    }
