from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.models import Internship, SavedInternship, Student, User, UserRole
from app.routers.jobs import internship_to_job
from app.schemas import JobOut

router = APIRouter(prefix="/saved", tags=["saved"])


@router.get("", response_model=list[JobOut])
def list_saved(
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> list[JobOut]:
    rows = db.scalars(
        select(SavedInternship)
        .where(SavedInternship.student_id == user.user_id)
        .options(
            joinedload(SavedInternship.internship).joinedload(Internship.company),
            joinedload(SavedInternship.internship).joinedload(Internship.skills),
        )
        .order_by(SavedInternship.saved_at.desc())
    ).unique().all()
    return [internship_to_job(r.internship) for r in rows if r.internship]


@router.post("/{internship_id}", status_code=status.HTTP_201_CREATED)
def save_internship(
    internship_id: UUID,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if db.get(Student, user.user_id) is None:
        raise HTTPException(status_code=400, detail="Student profile required")
    if db.get(Internship, internship_id) is None:
        raise HTTPException(status_code=404, detail="Internship not found")

    existing = db.get(SavedInternship, (user.user_id, internship_id))
    if existing:
        return {"ok": True, "already_saved": True}

    db.add(SavedInternship(student_id=user.user_id, internship_id=internship_id))
    db.commit()
    return {"ok": True, "already_saved": False}


@router.delete("/{internship_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_internship(
    internship_id: UUID,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    row = db.get(SavedInternship, (user.user_id, internship_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Not saved")
    db.delete(row)
    db.commit()
    return None
