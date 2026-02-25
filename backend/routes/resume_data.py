import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..db import get_session
from ..models.db_models import (
    Profile, Experience, ExperienceBullet,
    Project, ProjectBullet, Skill, SkillItem, Education,
)
from ..models.resume import (
    ProfileUpdate, ExperienceCreate, ExperienceUpdate,
    ProjectCreate, ProjectUpdate, SkillCreate, SkillUpdate,
    EducationCreate, EducationUpdate,
)

router = APIRouter(prefix="/api/resume")


def _exp_to_dict(exp: Experience) -> dict:
    d = {c.name: getattr(exp, c.name) for c in Experience.__table__.columns}
    d["bullets"] = [{"id": b.id, "experience_id": b.experience_id, "text": b.text, "sort_order": b.sort_order} for b in exp.bullets]
    return d


def _proj_to_dict(proj: Project) -> dict:
    d = {c.name: getattr(proj, c.name) for c in Project.__table__.columns}
    d["bullets"] = [{"id": b.id, "project_id": b.project_id, "text": b.text, "sort_order": b.sort_order} for b in proj.bullets]
    return d


def _skill_to_dict(skill: Skill) -> dict:
    d = {c.name: getattr(skill, c.name) for c in Skill.__table__.columns}
    d["items"] = [{"id": i.id, "skill_id": i.skill_id, "item": i.item, "sort_order": i.sort_order} for i in skill.items]
    return d


def _row_to_dict(obj) -> dict:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


# --- Profile ---
@router.get("/profile")
async def get_profile(session: Session = Depends(get_session)):
    profile = session.get(Profile, 1)
    if not profile:
        return {}
    d = _row_to_dict(profile)
    # Parse JSON text column
    if d.get("section_headers") and isinstance(d["section_headers"], str):
        try:
            d["section_headers"] = json.loads(d["section_headers"])
        except (json.JSONDecodeError, TypeError):
            d["section_headers"] = None
    return d


@router.put("/profile")
async def update_profile(data: ProfileUpdate, session: Session = Depends(get_session)):
    profile = session.get(Profile, 1)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        # Serialize dict fields to JSON text for storage
        if field == "section_headers" and isinstance(val, dict):
            val = json.dumps(val)
        setattr(profile, field, val)
    session.commit()
    d = _row_to_dict(profile)
    if d.get("section_headers") and isinstance(d["section_headers"], str):
        try:
            d["section_headers"] = json.loads(d["section_headers"])
        except (json.JSONDecodeError, TypeError):
            d["section_headers"] = None
    return d


# --- Experiences ---
@router.get("/experiences")
async def list_experiences(session: Session = Depends(get_session)):
    exps = session.query(Experience).options(joinedload(Experience.bullets)).order_by(Experience.sort_order, Experience.id).all()
    return [_exp_to_dict(e) for e in exps]


@router.post("/experiences")
async def create_experience(data: ExperienceCreate, session: Session = Depends(get_session)):
    exp = Experience(company=data.company, title=data.title, date_start=data.date_start, date_end=data.date_end, sort_order=data.sort_order)
    session.add(exp)
    session.flush()
    if data.bullets:
        bullets = json.loads(data.bullets) if isinstance(data.bullets, str) else data.bullets
        for i, text in enumerate(bullets):
            session.add(ExperienceBullet(experience_id=exp.id, text=text, sort_order=i))
    session.commit()
    session.refresh(exp)
    return _exp_to_dict(exp)


@router.put("/experiences/{item_id}")
async def update_experience(item_id: int, data: ExperienceUpdate, session: Session = Depends(get_session)):
    exp = session.get(Experience, item_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    update_data = data.model_dump(exclude_unset=True)
    bullets_data = update_data.pop("bullets", None)
    for k, v in update_data.items():
        setattr(exp, k, v)
    if bullets_data is not None:
        bullets = json.loads(bullets_data) if isinstance(bullets_data, str) else bullets_data
        session.query(ExperienceBullet).filter(ExperienceBullet.experience_id == item_id).delete()
        for i, text in enumerate(bullets):
            session.add(ExperienceBullet(experience_id=item_id, text=text, sort_order=i))
    session.commit()
    session.refresh(exp)
    return _exp_to_dict(exp)


@router.delete("/experiences/{item_id}")
async def delete_experience(item_id: int, session: Session = Depends(get_session)):
    exp = session.get(Experience, item_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    session.delete(exp)
    session.commit()
    return {"ok": True}


# --- Projects ---
@router.get("/projects")
async def list_projects(session: Session = Depends(get_session)):
    projs = session.query(Project).options(joinedload(Project.bullets)).order_by(Project.sort_order, Project.id).all()
    return [_proj_to_dict(p) for p in projs]


@router.post("/projects")
async def create_project(data: ProjectCreate, session: Session = Depends(get_session)):
    proj = Project(name=data.name, tech_stack=data.tech_stack, sort_order=data.sort_order)
    session.add(proj)
    session.flush()
    if data.bullets:
        bullets = json.loads(data.bullets) if isinstance(data.bullets, str) else data.bullets
        for i, text in enumerate(bullets):
            session.add(ProjectBullet(project_id=proj.id, text=text, sort_order=i))
    session.commit()
    session.refresh(proj)
    return _proj_to_dict(proj)


@router.put("/projects/{item_id}")
async def update_project(item_id: int, data: ProjectUpdate, session: Session = Depends(get_session)):
    proj = session.get(Project, item_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = data.model_dump(exclude_unset=True)
    bullets_data = update_data.pop("bullets", None)
    for k, v in update_data.items():
        setattr(proj, k, v)
    if bullets_data is not None:
        bullets = json.loads(bullets_data) if isinstance(bullets_data, str) else bullets_data
        session.query(ProjectBullet).filter(ProjectBullet.project_id == item_id).delete()
        for i, text in enumerate(bullets):
            session.add(ProjectBullet(project_id=item_id, text=text, sort_order=i))
    session.commit()
    session.refresh(proj)
    return _proj_to_dict(proj)


@router.delete("/projects/{item_id}")
async def delete_project(item_id: int, session: Session = Depends(get_session)):
    proj = session.get(Project, item_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(proj)
    session.commit()
    return {"ok": True}


# --- Skills ---
@router.get("/skills")
async def list_skills(session: Session = Depends(get_session)):
    skills = session.query(Skill).options(joinedload(Skill.items)).order_by(Skill.sort_order, Skill.id).all()
    return [_skill_to_dict(s) for s in skills]


@router.post("/skills")
async def create_skill(data: SkillCreate, session: Session = Depends(get_session)):
    skill = Skill(category=data.category, sort_order=data.sort_order)
    session.add(skill)
    session.flush()
    if data.items:
        items = [i.strip() for i in data.items.split(",") if i.strip()]
        for i, item in enumerate(items):
            session.add(SkillItem(skill_id=skill.id, item=item, sort_order=i))
    session.commit()
    session.refresh(skill)
    return _skill_to_dict(skill)


@router.put("/skills/{item_id}")
async def update_skill(item_id: int, data: SkillUpdate, session: Session = Depends(get_session)):
    skill = session.get(Skill, item_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)
    for k, v in update_data.items():
        setattr(skill, k, v)
    if items_data is not None:
        items = [i.strip() for i in items_data.split(",") if i.strip()]
        session.query(SkillItem).filter(SkillItem.skill_id == item_id).delete()
        for i, item in enumerate(items):
            session.add(SkillItem(skill_id=item_id, item=item, sort_order=i))
    session.commit()
    session.refresh(skill)
    return _skill_to_dict(skill)


@router.delete("/skills/{item_id}")
async def delete_skill(item_id: int, session: Session = Depends(get_session)):
    skill = session.get(Skill, item_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    session.delete(skill)
    session.commit()
    return {"ok": True}


# --- Education ---
@router.get("/education")
async def list_education(session: Session = Depends(get_session)):
    rows = session.query(Education).order_by(Education.sort_order, Education.id).all()
    return [_row_to_dict(e) for e in rows]


@router.post("/education")
async def create_education(data: EducationCreate, session: Session = Depends(get_session)):
    edu = Education(
        degree=data.degree, institution=data.institution, gpa=data.gpa,
        date_start=data.date_start, date_end=data.date_end,
        is_default=data.is_default, sort_order=data.sort_order,
    )
    session.add(edu)
    session.commit()
    return _row_to_dict(edu)


@router.put("/education/{item_id}")
async def update_education(item_id: int, data: EducationUpdate, session: Session = Depends(get_session)):
    edu = session.get(Education, item_id)
    if not edu:
        raise HTTPException(status_code=404, detail="Education not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(edu, k, v)
    session.commit()
    return _row_to_dict(edu)


@router.delete("/education/{item_id}")
async def delete_education(item_id: int, session: Session = Depends(get_session)):
    edu = session.get(Education, item_id)
    if not edu:
        raise HTTPException(status_code=404, detail="Education not found")
    session.delete(edu)
    session.commit()
    return {"ok": True}
