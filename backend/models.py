from pydantic import BaseModel


class BookmarkRequest(BaseModel):
    session_id: str
    nct_id: str


class BookmarkNotesRequest(BaseModel):
    session_id: str
    nct_id: str
    notes: str
