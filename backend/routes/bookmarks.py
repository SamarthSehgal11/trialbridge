"""Routes for /api/bookmarks (CRUD)."""

import logging
from fastapi import APIRouter, HTTPException

import database as db
from models import BookmarkRequest, BookmarkNotesRequest
from routes.search import fetch_trial_detail

logger = logging.getLogger("trialbridge-bookmarks")

router = APIRouter()


@router.post("/bookmarks")
def add_trial_bookmark(req: BookmarkRequest):
    success = db.add_bookmark(req.session_id, req.nct_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add bookmark to database")
    return {"status": "success", "message": "Bookmark added"}


@router.delete("/bookmarks")
def remove_trial_bookmark(req: BookmarkRequest):
    success = db.remove_bookmark(req.session_id, req.nct_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove bookmark from database")
    return {"status": "success", "message": "Bookmark removed"}


@router.get("/bookmarks")
def get_trial_bookmarks(session_id: str):
    bookmarks_data = db.get_bookmarks(session_id)
    if not bookmarks_data:
        return []

    bookmarks_details = []
    for nct_id, notes in bookmarks_data.items():
        try:
            detail = fetch_trial_detail(nct_id)
            detail["notes"] = notes or ""
            bookmarks_details.append(detail)
        except Exception:
            pass
    return bookmarks_details


@router.put("/bookmarks/notes")
def update_bookmark_notes(req: BookmarkNotesRequest):
    success = db.update_bookmark_notes(req.session_id, req.nct_id, req.notes)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update bookmark notes")
    return {"status": "success", "message": "Bookmark notes updated"}
