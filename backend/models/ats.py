from typing import Optional
from pydantic import BaseModel


class ATSScoreRequest(BaseModel):
    job_description: str
    resume_text: Optional[str] = None
    job_id: Optional[int] = None


class ATSCategoryScore(BaseModel):
    score: int
    weight: int

    class Config:
        extra = "allow"


class ATSScoreResponse(BaseModel):
    id: int
    job_id: Optional[int] = None
    overall_score: int
    category_scores: dict
    suggestions: list[str]
    created_at: str
