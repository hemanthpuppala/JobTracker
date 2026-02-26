import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from ..config import GENERATED_RESUMES_DIR
from ..db import get_session
from ..models.db_models import (
    Profile, Experience, Project, Skill, Education, GeneratedResume, Job,
)
from ..models.resume import ResumeGenerateRequest
from ..services.resume_builder import generate_resume
from ..services.resume_helpers import (
    format_experience as _format_experience_for_docx,
    format_project as _format_project_for_docx,
    format_skill as _format_skill_for_docx,
    row_to_dict as _row_to_dict,
)

router = APIRouter(prefix="/api/resume")


@router.post("/generate")
async def generate(req: ResumeGenerateRequest, session: Session = Depends(get_session)):
    profile = session.get(Profile, 1)
    if not profile:
        raise HTTPException(status_code=400, detail="No profile data found")
    profile_dict = _row_to_dict(profile)

    # Experiences
    all_exps = session.query(Experience).options(joinedload(Experience.bullets)).order_by(Experience.sort_order).all()
    if req.selected_experience_ids:
        selected = set(req.selected_experience_ids)
        experiences = [_format_experience_for_docx(e) for e in all_exps if e.id in selected]
    else:
        experiences = [_format_experience_for_docx(e) for e in all_exps]

    # Projects
    all_projs = session.query(Project).options(joinedload(Project.bullets)).order_by(Project.sort_order).all()
    if req.selected_project_ids:
        selected = set(req.selected_project_ids)
        projects = [_format_project_for_docx(p) for p in all_projs if p.id in selected]
    else:
        projects = [_format_project_for_docx(p) for p in all_projs]

    # Skills
    all_skills = session.query(Skill).options(joinedload(Skill.items)).order_by(Skill.sort_order).all()
    if req.selected_skill_ids:
        selected = set(req.selected_skill_ids)
        skills = [_format_skill_for_docx(s) for s in all_skills if s.id in selected]
    else:
        skills = [_format_skill_for_docx(s) for s in all_skills]

    # Education
    if req.selected_education_ids:
        education = [
            _row_to_dict(e) for e in session.query(Education)
            .filter(Education.id.in_(req.selected_education_ids))
            .order_by(Education.sort_order).all()
        ]
    else:
        education = [
            _row_to_dict(e) for e in session.query(Education)
            .filter(Education.is_default == True)
            .order_by(Education.sort_order).all()
        ]

    # Generate .docx
    docx_bytes = generate_resume(
        profile=profile_dict,
        experiences=experiences,
        projects=projects,
        skills=skills,
        education=education,
        custom_summary=req.custom_summary,
        style_config=req.style_config.model_dump() if req.style_config else None,
    )

    # Build filename
    now = datetime.now(timezone.utc)
    job_label = "general"
    if req.job_id:
        job = session.get(Job, req.job_id)
        if job:
            company = job.company_name.replace(" ", "_")
            role = job.role_name.replace(" ", "_")
            job_label = f"{company}_{role}"

    filename = f"Hemanth_Puppala_{job_label}_{now.strftime('%Y%m%d_%H%M%S')}.docx"
    GENERATED_RESUMES_DIR.mkdir(exist_ok=True)
    file_path = GENERATED_RESUMES_DIR / filename
    file_path.write_bytes(docx_bytes)

    # Track in DB
    gen = GeneratedResume(
        job_id=req.job_id, filename=filename, file_path=str(file_path),
        custom_summary=req.custom_summary,
        selected_experience_ids=json.dumps(req.selected_experience_ids) if req.selected_experience_ids else None,
        selected_project_ids=json.dumps(req.selected_project_ids) if req.selected_project_ids else None,
        tailoring_notes=req.tailoring_notes, created_at=now.isoformat(),
    )
    session.add(gen)
    session.commit()
    return _row_to_dict(gen)


@router.get("/generated")
async def list_generated(session: Session = Depends(get_session)):
    rows = session.query(GeneratedResume).order_by(GeneratedResume.created_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.get("/generated/{item_id}/download")
async def download_resume(item_id: int, session: Session = Depends(get_session)):
    gen = session.get(GeneratedResume, item_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Resume not found")
    file_path = Path(gen.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=gen.filename,
    )


@router.delete("/generated/{item_id}")
async def delete_generated(item_id: int, session: Session = Depends(get_session)):
    gen = session.get(GeneratedResume, item_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Resume not found")
    file_path = Path(gen.file_path)
    if file_path.exists():
        file_path.unlink()
    session.delete(gen)
    session.commit()
    return {"ok": True}
