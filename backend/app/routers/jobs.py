from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Internship, InternshipStatus
from app.schemas import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
