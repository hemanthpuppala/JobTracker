"""Shared helper functions for resume data formatting."""

from ..models.db_models import Experience, Project, Skill


def row_to_dict(obj) -> dict:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def format_experience(exp: Experience) -> dict:
    return {
        "id": exp.id, "company": exp.company, "title": exp.title,
        "date_start": exp.date_start, "date_end": exp.date_end,
        "sort_order": exp.sort_order,
        "bullets": [b.text for b in exp.bullets],
    }


def format_project(proj: Project) -> dict:
    return {
        "id": proj.id, "name": proj.name, "tech_stack": proj.tech_stack,
        "sort_order": proj.sort_order,
        "bullets": [b.text for b in proj.bullets],
    }


def format_skill(skill: Skill) -> dict:
    return {
        "id": skill.id, "category": skill.category, "sort_order": skill.sort_order,
        "items": ", ".join(i.item for i in skill.items),
    }
