from typing import Optional
from pydantic import BaseModel


class JobCreate(BaseModel):
    company_name: str
    role_name: str
    job_description: str
    apply_link: str
    h1b_sponsorship: bool
    salary: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    bookmarked: bool = False
    status: str = "new"
    date_posted: Optional[str] = None
    date_applied: Optional[str] = None
    resume_path: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_linkedin: Optional[str] = None
    company_website: Optional[str] = None
    source: Optional[str] = None
    external_job_id: Optional[str] = None
    skills: Optional[str] = None
    department: Optional[str] = None
    benefits: Optional[str] = None


class JobUpdate(BaseModel):
    bookmarked: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    date_applied: Optional[str] = None
    resume_path: Optional[str] = None
