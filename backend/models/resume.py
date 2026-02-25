from typing import Optional
from pydantic import BaseModel


class Profile(BaseModel):
    id: int = 1
    full_name: str
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    section_headers: Optional[dict] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    section_headers: Optional[dict] = None


class ExperienceCreate(BaseModel):
    company: str
    title: str
    date_start: str
    date_end: Optional[str] = None
    bullets: str  # JSON array of strings
    sort_order: int = 0


class ExperienceUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    bullets: Optional[str] = None
    sort_order: Optional[int] = None


class ProjectCreate(BaseModel):
    name: str
    tech_stack: str
    bullets: str  # JSON array of strings
    sort_order: int = 0


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    tech_stack: Optional[str] = None
    bullets: Optional[str] = None
    sort_order: Optional[int] = None


class SkillCreate(BaseModel):
    category: str
    items: str  # comma-separated
    sort_order: int = 0


class SkillUpdate(BaseModel):
    category: Optional[str] = None
    items: Optional[str] = None
    sort_order: Optional[int] = None


class EducationCreate(BaseModel):
    degree: str
    institution: str
    gpa: Optional[str] = None
    date_start: str
    date_end: str
    is_default: bool = True
    sort_order: int = 0


class EducationUpdate(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    gpa: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


class DocxStyleConfig(BaseModel):
    font: str = "Calibri"
    base_font_size: float = 10
    margins: Optional[dict] = None  # {top, bottom, left, right} in pt


class ResumeGenerateRequest(BaseModel):
    job_id: Optional[int] = None
    custom_summary: Optional[str] = None
    selected_experience_ids: Optional[list[int]] = None
    selected_project_ids: Optional[list[int]] = None
    selected_skill_ids: Optional[list[int]] = None
    selected_education_ids: Optional[list[int]] = None
    tailoring_notes: Optional[str] = None
    style_config: Optional[DocxStyleConfig] = None
