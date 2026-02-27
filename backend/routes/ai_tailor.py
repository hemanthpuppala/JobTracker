"""API routes for AI resume tailoring, sessions, and saved resumes."""

import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..db import get_session
from ..models.db_models import TailorSession, SessionEvent, Experience, Project, Skill, Profile, SavedResume
from ..models.session import (
    TailorRequest, TailorResponse,
    SessionCreate, SessionResponse, SessionUpdate,
    SavedResumeCreate, SavedResumeResponse, SavedResumeDetail,
)
from ..services.resume_text import build_resume_text
from ..services.resume_tailor import tailor_resume, run_pipeline
from ..services.resume_parser import parse_resume

router = APIRouter(prefix="/api")


def _build_structured_resume(db: Session) -> dict:
    """Build structured resume data with IDs for AI to reference."""
    profile = db.get(Profile, 1)

    exps = db.query(Experience).options(
        joinedload(Experience.bullets)
    ).order_by(Experience.sort_order).all()

    projs = db.query(Project).options(
        joinedload(Project.bullets)
    ).order_by(Project.sort_order).all()

    skills = db.query(Skill).options(
        joinedload(Skill.items)
    ).order_by(Skill.sort_order).all()

    return {
        "summary": profile.summary if profile else "",
        "experiences": [
            {"id": e.id, "company": e.company, "title": e.title, "bullets": [b.text for b in e.bullets]}
            for e in exps
        ],
        "projects": [
            {"id": p.id, "name": p.name, "tech_stack": p.tech_stack, "bullets": [b.text for b in p.bullets]}
            for p in projs
        ],
        "skills": [
            {"id": s.id, "category": s.category, "items": ", ".join(i.item for i in s.items)}
            for s in skills
        ],
    }


@router.post("/ai/tailor", response_model=TailorResponse)
async def ai_tailor(req: TailorRequest, db: Session = Depends(get_session)):
    """Legacy single-shot AI tailoring endpoint."""
    resume_text = req.resume_text
    if not resume_text or not resume_text.strip():
        resume_text = build_resume_text(db)
    if not resume_text.strip():
        raise HTTPException(400, "No resume data found")
    if not req.job_description.strip():
        raise HTTPException(400, "Job description is required")

    structured = req.resume_structured if req.resume_structured else _build_structured_resume(db)

    try:
        result = await tailor_resume(
            resume_text=resume_text,
            resume_structured=structured,
            job_description=req.job_description,
            ats_result=req.ats_result,
        )
    except Exception as e:
        raise HTTPException(500, f"AI tailoring failed: {e}")

    # Log event to session if provided
    now = datetime.now(timezone.utc).isoformat()
    session_id = req.session_id
    if session_id:
        session = db.get(TailorSession, session_id)
        if session:
            event = SessionEvent(
                session_id=session_id,
                event_type="ai_tailor",
                data=json.dumps(result),
                created_at=now,
            )
            db.add(event)
            session.status = "tailoring"
            session.updated_at = now
            db.commit()

    return TailorResponse(
        summary=result.get("summary", ""),
        experiences=result.get("experiences", []),
        projects=result.get("projects", []),
        skills=result.get("skills", []),
        session_id=session_id,
    )


@router.post("/ai/tailor/stream")
async def ai_tailor_stream(
    req: TailorRequest,
    db: Session = Depends(get_session),
):
    """SSE streaming pipeline endpoint.

    Returns Server-Sent Events with step-by-step progress.
    Each event: data: {"step": "...", "status": "running|done|error", ...}
    """
    r_text = req.resume_text
    if not r_text or not r_text.strip():
        r_text = build_resume_text(db)
    if not r_text or not r_text.strip():
        async def error_stream():
            yield f"data: {json.dumps({'step': 'error', 'status': 'error', 'message': 'No resume data found'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")
    if not req.job_description.strip():
        async def error_stream():
            yield f"data: {json.dumps({'step': 'error', 'status': 'error', 'message': 'Job description is required'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    job_description = req.job_description
    structured = req.resume_structured if req.resume_structured else _build_structured_resume(db)

    # Create session if not provided
    now = datetime.now(timezone.utc).isoformat()
    session_id = req.session_id
    if not session_id:
        ts = TailorSession(
            job_id=req.job_id,
            job_description=job_description,
            resume_source=req.resume_source,
            status="tailoring",
            created_at=now,
            updated_at=now,
        )
        db.add(ts)
        db.commit()
        db.refresh(ts)
        session_id = ts.id

    async def event_stream():
        # Send session_id first
        yield f"data: {json.dumps({'step': 'session', 'status': 'done', 'data': {'session_id': session_id}})}\n\n"

        final_result = None
        async for event in run_pipeline(
            r_text, structured, job_description,
            custom_prompt=req.custom_prompt,
            cached_jd_analysis=req.jd_analysis,
            pdf_page_count=req.pdf_page_count,
        ):
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("step") == "complete" and event.get("status") == "done":
                final_result = event.get("data")

        # Save final result to session
        if final_result:
            try:
                session = db.get(TailorSession, session_id)
                if session:
                    event_data = {
                        "result": final_result,
                        "custom_prompt": req.custom_prompt,
                        "pdf_page_count": req.pdf_page_count,
                    }
                    se = SessionEvent(
                        session_id=session_id,
                        event_type="ai_tailor_pipeline",
                        data=json.dumps(event_data),
                        created_at=datetime.now(timezone.utc).isoformat(),
                    )
                    db.add(se)
                    session.status = "tailored"
                    session.updated_at = datetime.now(timezone.utc).isoformat()
                    db.commit()
            except Exception:
                pass

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# --- Session CRUD ---

@router.post("/sessions", response_model=SessionResponse)
async def create_session(req: SessionCreate, db: Session = Depends(get_session)):
    now = datetime.now(timezone.utc).isoformat()
    session = TailorSession(
        job_id=req.job_id,
        job_description=req.job_description,
        resume_source=req.resume_source,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_to_response(session)


@router.get("/sessions")
async def list_sessions(db: Session = Depends(get_session)):
    sessions = db.query(TailorSession).order_by(TailorSession.created_at.desc()).all()
    return [_session_to_response(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session_detail(session_id: int, db: Session = Depends(get_session)):
    session = db.query(TailorSession).options(
        joinedload(TailorSession.events)
    ).filter(TailorSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    return _session_to_response(session, include_events=True)


@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(session_id: int, req: SessionUpdate, db: Session = Depends(get_session)):
    session = db.get(TailorSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if req.status:
        session.status = req.status
    session.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(session)
    return _session_to_response(session)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int, db: Session = Depends(get_session)):
    session = db.get(TailorSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}


# --- Resume Parsing ---

def _extract_text_from_pdf(data: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_text_from_docx(data: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


@router.post("/resumes/parse")
async def parse_resume_file(file: UploadFile = File(...)):
    """Upload PDF/DOCX → extract text → heuristic parse → return structured JSON."""
    if not file.filename:
        raise HTTPException(400, "No file provided")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(400, "Only PDF and DOCX files are supported")

    data = await file.read()
    try:
        text = _extract_text_from_pdf(data) if ext == "pdf" else _extract_text_from_docx(data)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")
    if not text.strip():
        raise HTTPException(400, "Could not extract text from file")

    return parse_resume(text)


class ParseTextRequest(BaseModel):
    text: str


@router.post("/resumes/parse-text")
async def parse_resume_text(req: ParseTextRequest):
    """Parse plain text resume into structured JSON."""
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")
    return parse_resume(req.text)


# --- Saved Resumes CRUD ---

@router.post("/saved-resumes", response_model=SavedResumeResponse)
async def create_saved_resume(req: SavedResumeCreate, db: Session = Depends(get_session)):
    now = datetime.now(timezone.utc).isoformat()
    saved = SavedResume(
        label=req.label,
        session_id=req.session_id,
        data=json.dumps(req.data),
        created_at=now,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return SavedResumeResponse(id=saved.id, label=saved.label, session_id=saved.session_id, created_at=saved.created_at)


@router.get("/saved-resumes", response_model=list[SavedResumeResponse])
async def list_saved_resumes(db: Session = Depends(get_session)):
    rows = db.query(SavedResume).order_by(SavedResume.created_at.desc()).all()
    return [
        SavedResumeResponse(id=r.id, label=r.label, session_id=r.session_id, created_at=r.created_at)
        for r in rows
    ]


@router.get("/saved-resumes/{resume_id}", response_model=SavedResumeDetail)
async def get_saved_resume(resume_id: int, db: Session = Depends(get_session)):
    r = db.get(SavedResume, resume_id)
    if not r:
        raise HTTPException(404, "Saved resume not found")
    return SavedResumeDetail(
        id=r.id, label=r.label, session_id=r.session_id,
        data=json.loads(r.data), created_at=r.created_at,
    )


@router.delete("/saved-resumes/{resume_id}")
async def delete_saved_resume(resume_id: int, db: Session = Depends(get_session)):
    r = db.get(SavedResume, resume_id)
    if not r:
        raise HTTPException(404, "Saved resume not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


def _session_to_response(session: TailorSession, include_events: bool = False) -> SessionResponse:
    events = []
    if include_events and session.events:
        for e in session.events:
            events.append({
                "id": e.id,
                "event_type": e.event_type,
                "data": json.loads(e.data) if e.data else None,
                "created_at": e.created_at,
            })
    return SessionResponse(
        id=session.id,
        job_id=session.job_id,
        job_description=session.job_description,
        resume_source=session.resume_source,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
        events=events,
    )
