from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, ForeignKey, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, default=1)
    full_name = Column(Text, nullable=False)
    location = Column(Text)
    phone = Column(Text)
    email = Column(Text)
    linkedin = Column(Text)
    github = Column(Text)
    portfolio = Column(Text)
    summary = Column(Text)
    section_headers = Column(Text)  # JSON: {"summary":"Professional Summary","skills":"Technical Skills",...}


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(Text, nullable=False)
    role_name = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    apply_link = Column(Text, nullable=False)
    h1b_sponsorship = Column(Boolean, nullable=False)
    salary = Column(Text)
    location = Column(Text)
    remote_type = Column(Text)
    job_type = Column(Text)
    experience_level = Column(Text)
    bookmarked = Column(Boolean, nullable=False, default=False)
    status = Column(Text, nullable=False, default="new")
    date_posted = Column(Text)
    date_applied = Column(Text)
    resume_path = Column(Text)
    notes = Column(Text)
    recruiter_name = Column(Text)
    recruiter_linkedin = Column(Text)
    company_website = Column(Text)
    source = Column(Text)
    external_job_id = Column(Text)
    skills = Column(Text)
    department = Column(Text)
    benefits = Column(Text)
    created_at = Column(Text, nullable=False)

    resumes = relationship("GeneratedResume", back_populates="job")


class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    date_start = Column(Text, nullable=False)
    date_end = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0)

    bullets = relationship(
        "ExperienceBullet", back_populates="experience",
        cascade="all, delete-orphan", order_by="ExperienceBullet.sort_order",
    )


class ExperienceBullet(Base):
    __tablename__ = "experience_bullets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    experience = relationship("Experience", back_populates="bullets")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    tech_stack = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    bullets = relationship(
        "ProjectBullet", back_populates="project",
        cascade="all, delete-orphan", order_by="ProjectBullet.sort_order",
    )


class ProjectBullet(Base):
    __tablename__ = "project_bullets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    project = relationship("Project", back_populates="bullets")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    items = relationship(
        "SkillItem", back_populates="skill",
        cascade="all, delete-orphan", order_by="SkillItem.sort_order",
    )


class SkillItem(Base):
    __tablename__ = "skill_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    item = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    skill = relationship("Skill", back_populates="items")


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, autoincrement=True)
    degree = Column(Text, nullable=False)
    institution = Column(Text, nullable=False)
    gpa = Column(Text)
    date_start = Column(Text, nullable=False)
    date_end = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)


class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"))
    filename = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    custom_summary = Column(Text)
    selected_experience_ids = Column(Text)
    selected_project_ids = Column(Text)
    tailoring_notes = Column(Text)
    created_at = Column(Text, nullable=False)

    job = relationship("Job", back_populates="resumes")
