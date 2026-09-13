from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.matching import skill_slug
from app.models import Company, Internship, InternshipSkill, InternshipStatus, Skill, User, UserRole
from app.schemas import InternshipCreate, InternshipUpdate, JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _ensure_skill_rows(db: Session, tags: list[str]) -> list[str]:
    """Upsert a Skill row per tag (by slug) and return the deduped skill ids."""
    skill_ids: list[str] = []
    for tag in tags:
        sid = skill_slug(tag)
        if sid not in skill_ids:
            skill_ids.append(sid)
            if db.get(Skill, sid) is None:
                db.add(Skill(skill_id=sid, name=tag))
    return skill_ids


def internship_to_job(internship: Internship) -> JobOut:
    skill_ids = [s.skill_id for s in internship.skills]
    company_name = internship.company.company_name if internship.company else ""
    return JobOut(
        id=str(internship.internship_id),
        title=internship.title,
        company=company_name,
        location=internship.location,
        type=internship.work_type,
        duration=internship.duration,
        category=internship.category,
        description=internship.description,
        stipend=internship.stipend,
        tags=list(internship.tags or []),
        postedDate=internship.posted_date.isoformat(),
        deadline=internship.deadline.isoformat(),
        skills=skill_ids,
    )


@router.get("", response_model=list[JobOut])
def list_jobs(db: Annotated[Session, Depends(get_db)]) -> list[JobOut]:
    rows = db.scalars(
        select(Internship)
        .where(Internship.status == InternshipStatus.open)
        .options(joinedload(Internship.company), joinedload(Internship.skills))
        .order_by(Internship.posted_date.desc())
    ).unique().all()
    return [internship_to_job(r) for r in rows]


@router.get("/mine", response_model=list[JobOut])
def list_my_jobs(
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> list[JobOut]:
    """A company's own postings, open or closed."""
    rows = db.scalars(
        select(Internship)
        .where(Internship.company_id == user.user_id)
        .options(joinedload(Internship.company), joinedload(Internship.skills))
        .order_by(Internship.posted_date.desc())
    ).unique().all()
    return [internship_to_job(r) for r in rows]


@router.get("/{internship_id}", response_model=JobOut)
def get_job(internship_id: UUID, db: Annotated[Session, Depends(get_db)]) -> JobOut:
    internship = db.scalar(
        select(Internship)
        .where(Internship.internship_id == internship_id)
        .options(joinedload(Internship.company), joinedload(Internship.skills))
    )
    if internship is None:
        raise HTTPException(status_code=404, detail="Internship not found")
    return internship_to_job(internship)


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: InternshipCreate,
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> JobOut:
    if db.get(Company, user.user_id) is None:
        raise HTTPException(status_code=400, detail="Company profile required")

    tags = list(dict.fromkeys(body.tags))
    internship = Internship(
        company_id=user.user_id,
        title=body.title,
        description=body.description,
        location=body.location,
        work_type=body.work_type,
        duration=body.duration,
        category=body.category,
        stipend=body.stipend,
        status=InternshipStatus.open,
        posted_date=date.today(),
        deadline=body.deadline,
        tags=tags,
    )
    db.add(internship)
    db.flush()

    for sid in _ensure_skill_rows(db, tags):
        db.add(InternshipSkill(internship_id=internship.internship_id, skill_id=sid))

    db.commit()
    internship = db.scalar(
        select(Internship)
        .where(Internship.internship_id == internship.internship_id)
        .options(joinedload(Internship.company), joinedload(Internship.skills))
    )
    assert internship is not None
    return internship_to_job(internship)


@router.patch("/{internship_id}", response_model=JobOut)
def update_job(
    internship_id: UUID,
    body: InternshipUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> JobOut:
    internship = db.get(Internship, internship_id)
    if internship is None:
        raise HTTPException(status_code=404, detail="Internship not found")
    if internship.company_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your internship")

    data = body.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    for field, value in data.items():
        setattr(internship, field, value)

    if tags is not None:
        tags = list(dict.fromkeys(tags))
        internship.tags = tags
        db.execute(delete(InternshipSkill).where(InternshipSkill.internship_id == internship_id))
        for sid in _ensure_skill_rows(db, tags):
            db.add(InternshipSkill(internship_id=internship_id, skill_id=sid))
        internship.required_skills_embedding = None  # re-embed lazily on next match

    db.commit()
    internship = db.scalar(
        select(Internship)
        .where(Internship.internship_id == internship_id)
        .options(joinedload(Internship.company), joinedload(Internship.skills))
    )
    assert internship is not None
    return internship_to_job(internship)
