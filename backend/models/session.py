"""Pydantic models for sessions and AI tailoring."""

from typing import Optional
from pydantic import BaseModel


class TailorRequest(BaseModel):
    job_description: str
    resume_text: Optional[str] = None
    resume_source: str = "db"  # db | upload | paste | live
    job_id: Optional[int] = None
    session_id: Optional[int] = None
    ats_result: Optional[dict] = None
    resume_structured: Optional[dict] = None  # structured resume from frontend store (bypasses DB query)
    custom_prompt: Optional[str] = None  # user instructions like "keep it single page"
    jd_analysis: Optional[dict] = None  # cached JD analysis from previous run
    pdf_page_count: Optional[int] = None  # current PDF page count from frontend


class TailorResponse(BaseModel):
    summary: str
    experiences: list[dict]
    projects: list[dict]
    skills: list[dict]
    session_id: Optional[int] = None


class SessionCreate(BaseModel):
    job_id: Optional[int] = None
    job_description: str
    resume_source: str = "db"


class SessionResponse(BaseModel):
    id: int
    job_id: Optional[int] = None
    job_description: str
    resume_source: str
    status: str
    created_at: str
    updated_at: str
    events: list[dict] = []


class SessionUpdate(BaseModel):
    status: Optional[str] = None


class SavedResumeCreate(BaseModel):
    label: str
    data: dict
    session_id: Optional[int] = None


class SavedResumeResponse(BaseModel):
    id: int
    label: str
    session_id: Optional[int] = None
    created_at: str


class SavedResumeDetail(BaseModel):
    id: int
    label: str
    session_id: Optional[int] = None
    data: dict
    created_at: str
