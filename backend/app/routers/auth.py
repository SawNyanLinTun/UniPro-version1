from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Student, StudentSkill, User, UserRole
from app.schemas import StudentMeOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=StudentMeOut)
def me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentMeOut:
    """Return the public profile for the Supabase-authenticated user."""
    skills: list[str] = []
    university = major = None
    graduation_year = None
    gpa = None

    if user.role == UserRole.student:
        student = db.get(Student, user.user_id)
        if student:
            university = student.university
            major = student.major
            graduation_year = student.graduation_year
            gpa = student.gpa
            rows = db.scalars(select(StudentSkill).where(StudentSkill.student_id == user.user_id)).all()
            skills = [r.skill_id for r in rows]

    return StudentMeOut(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role,
        university=university,
        major=major,
        graduation_year=graduation_year,
        gpa=gpa,
        skills=skills,
    )
