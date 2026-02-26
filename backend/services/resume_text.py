"""Build plain-text representation of resume from DB data."""

from sqlalchemy.orm import Session, joinedload

from ..models.db_models import Profile, Experience, Project, Skill, Education
from .resume_helpers import row_to_dict, format_experience, format_project, format_skill


def build_resume_text(session: Session) -> str:
    """Fetch all resume sections from DB and return as plain text."""
    profile = session.get(Profile, 1)
    if not profile:
        return ""

    lines: list[str] = []

    # Contact / Header
    lines.append(profile.full_name or "")
    contact_parts = [p for p in [profile.email, profile.phone, profile.location,
                                  profile.linkedin, profile.github, profile.portfolio] if p]
    if contact_parts:
        lines.append(" | ".join(contact_parts))
    lines.append("")

    # Summary
    if profile.summary:
        lines.append("SUMMARY")
        lines.append(profile.summary)
        lines.append("")

    # Experience
    exps = session.query(Experience).options(
        joinedload(Experience.bullets)
    ).order_by(Experience.sort_order).all()
    if exps:
        lines.append("EXPERIENCE")
        for exp in exps:
            date_range = f"{exp.date_start} - {exp.date_end or 'Present'}"
            lines.append(f"{exp.title}, {exp.company} ({date_range})")
            for b in exp.bullets:
                lines.append(f"  - {b.text}")
            lines.append("")

    # Projects
    projs = session.query(Project).options(
        joinedload(Project.bullets)
    ).order_by(Project.sort_order).all()
    if projs:
        lines.append("PROJECTS")
        for proj in projs:
            lines.append(f"{proj.name} | {proj.tech_stack}")
            for b in proj.bullets:
                lines.append(f"  - {b.text}")
            lines.append("")

    # Skills
    skills = session.query(Skill).options(
        joinedload(Skill.items)
    ).order_by(Skill.sort_order).all()
    if skills:
        lines.append("SKILLS")
        for sk in skills:
            items = ", ".join(i.item for i in sk.items)
            lines.append(f"{sk.category}: {items}")
        lines.append("")

    # Education
    edus = session.query(Education).order_by(Education.sort_order).all()
    if edus:
        lines.append("EDUCATION")
        for edu in edus:
            gpa_str = f" (GPA: {edu.gpa})" if edu.gpa else ""
            lines.append(f"{edu.degree}, {edu.institution}{gpa_str} ({edu.date_start} - {edu.date_end})")
        lines.append("")

    return "\n".join(lines)
