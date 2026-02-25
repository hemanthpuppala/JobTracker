import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_session
from ..models.db_models import Job, GeneratedResume
from ..models.job import JobCreate, JobUpdate
from ..services.websocket import broadcast

router = APIRouter(prefix="/api/jobs")


def _job_to_dict(job: Job) -> dict:
    return {c.name: getattr(job, c.name) for c in Job.__table__.columns}


@router.post("")
async def create_job(job: JobCreate, session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc).isoformat()
    db_job = Job(
        company_name=job.company_name, role_name=job.role_name,
        job_description=job.job_description, apply_link=job.apply_link,
        h1b_sponsorship=job.h1b_sponsorship, salary=job.salary,
        location=job.location, remote_type=job.remote_type,
        job_type=job.job_type, experience_level=job.experience_level,
        bookmarked=job.bookmarked, status=job.status,
        date_posted=job.date_posted, date_applied=job.date_applied,
        resume_path=job.resume_path, notes=job.notes,
        recruiter_name=job.recruiter_name, recruiter_linkedin=job.recruiter_linkedin,
        company_website=job.company_website, source=job.source,
        external_job_id=job.external_job_id, skills=job.skills,
        department=job.department, benefits=job.benefits, created_at=now,
    )
    session.add(db_job)
    session.commit()
    result = _job_to_dict(db_job)
    await broadcast({"type": "new_job", "job": result})
    return result


@router.get("")
async def list_jobs(session: Session = Depends(get_session)):
    jobs = session.query(Job).order_by(Job.id.desc()).all()
    return [_job_to_dict(j) for j in jobs]


@router.get("/export/csv")
async def export_csv(session: Session = Depends(get_session)):
    jobs = session.query(Job).order_by(Job.id.desc()).all()
    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs to export")
    rows = [_job_to_dict(j) for j in jobs]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs_export.csv"},
    )


@router.get("/stats")
async def job_stats(session: Session = Depends(get_session)):
    from sqlalchemy import func
    total = session.query(func.count(Job.id)).scalar()
    by_status = {}
    for status, cnt in session.query(Job.status, func.count(Job.id)).group_by(Job.status).all():
        by_status[status] = cnt
    by_source = {}
    for source, cnt in session.query(Job.source, func.count(Job.id)).filter(Job.source.isnot(None)).group_by(Job.source).all():
        by_source[source] = cnt
    applied_this_week = session.query(func.count(Job.id)).filter(
        Job.date_applied >= func.date('now', '-7 days')
    ).scalar()
    bookmarked = session.query(func.count(Job.id)).filter(Job.bookmarked == True).scalar()
    return {
        "total": total,
        "by_status": by_status,
        "by_source": by_source,
        "applied_this_week": applied_this_week,
        "bookmarked": bookmarked,
    }


@router.get("/{job_id}")
async def get_job(job_id: int, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)


@router.patch("/{job_id}")
async def update_job(job_id: int, update: JobUpdate, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, val in update.model_dump(exclude_unset=True).items():
        setattr(job, field, val)
    session.commit()
    return _job_to_dict(job)


@router.delete("/{job_id}")
async def delete_job(job_id: int, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    session.delete(job)
    session.commit()
    return {"ok": True}


@router.get("/{job_id}/resumes")
async def get_job_resumes(job_id: int, session: Session = Depends(get_session)):
    resumes = session.query(GeneratedResume).filter(
        GeneratedResume.job_id == job_id
    ).order_by(GeneratedResume.created_at.desc()).all()
    return [{c.name: getattr(r, c.name) for c in GeneratedResume.__table__.columns} for r in resumes]
