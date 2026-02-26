import io
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..db import get_session
from ..models.db_models import ATSScore, Job
from ..models.ats import ATSScoreRequest, ATSScoreResponse
from ..services.ats_scorer import score_resume
from ..services.resume_text import build_resume_text

router = APIRouter(prefix="/api/ats")


def _extract_text_from_pdf(data: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_text_from_docx(data: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF or DOCX resume."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    data = await file.read()
    try:
        if ext == "pdf":
            text = _extract_text_from_pdf(data)
        else:
            text = _extract_text_from_docx(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    return {"text": text, "filename": file.filename}


@router.post("/score", response_model=ATSScoreResponse)
async def ats_score(req: ATSScoreRequest, session: Session = Depends(get_session)):
    """Score a resume against a job description."""
    # Get resume text: use provided text or build from DB
    resume_text = req.resume_text
    if not resume_text:
        resume_text = build_resume_text(session)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="No resume data found. Add resume data first.")

    # If job_id provided but no JD, pull JD from job
    jd = req.job_description
    if not jd.strip():
        raise HTTPException(status_code=400, detail="Job description is required")

    # Score
    result = score_resume(resume_text, jd)

    # Persist
    now = datetime.now(timezone.utc).isoformat()
    record = ATSScore(
        job_id=req.job_id,
        job_description=jd,
        resume_snapshot=resume_text,
        overall_score=result["overall_score"],
        category_scores=json.dumps(result["categories"]),
        suggestions=json.dumps(result["suggestions"]),
        created_at=now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    return ATSScoreResponse(
        id=record.id,
        job_id=record.job_id,
        overall_score=record.overall_score,
        category_scores=result["categories"],
        suggestions=result["suggestions"],
        created_at=record.created_at,
    )


@router.get("/scores")
async def list_scores(job_id: Optional[int] = Query(None), session: Session = Depends(get_session)):
    """List all ATS score history, optionally filtered by job_id."""
    q = session.query(ATSScore).order_by(ATSScore.created_at.desc())
    if job_id is not None:
        q = q.filter(ATSScore.job_id == job_id)
    rows = q.all()

    results = []
    for r in rows:
        results.append({
            "id": r.id,
            "job_id": r.job_id,
            "overall_score": r.overall_score,
            "category_scores": json.loads(r.category_scores) if r.category_scores else {},
            "suggestions": json.loads(r.suggestions) if r.suggestions else [],
            "created_at": r.created_at,
        })
    return results


@router.get("/scores/{score_id}")
async def get_score(score_id: int, session: Session = Depends(get_session)):
    """Get a single ATS score detail."""
    record = session.get(ATSScore, score_id)
    if not record:
        raise HTTPException(status_code=404, detail="Score not found")
    return {
        "id": record.id,
        "job_id": record.job_id,
        "overall_score": record.overall_score,
        "category_scores": json.loads(record.category_scores) if record.category_scores else {},
        "suggestions": json.loads(record.suggestions) if record.suggestions else [],
        "job_description": record.job_description,
        "resume_snapshot": record.resume_snapshot,
        "created_at": record.created_at,
    }


@router.delete("/scores/{score_id}")
async def delete_score(score_id: int, session: Session = Depends(get_session)):
    """Delete a score record."""
    record = session.get(ATSScore, score_id)
    if not record:
        raise HTTPException(status_code=404, detail="Score not found")
    session.delete(record)
    session.commit()
    return {"ok": True}
