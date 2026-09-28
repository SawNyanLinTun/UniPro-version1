from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.database import get_db
from app.models import Student, StudentSkill, User, UserRole
from app.schemas import StudentMeOut, StudentProfileUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.put("/me", response_model=StudentMeOut)
def update_my_profile(
    body: StudentProfileUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> StudentMeOut:
    """Create the student profile on first write, update it after. Skills stay CV-driven."""
    student = db.get(Student, user.user_id)
    if student is None:
        student = Student(user_id=user.user_id)
        db.add(student)

    student.university = body.university
    student.major = body.major
    student.graduation_year = body.graduation_year
    student.gpa = body.gpa

    db.commit()
    db.refresh(student)

    rows = db.scalars(select(StudentSkill).where(StudentSkill.student_id == user.user_id)).all()
    return StudentMeOut(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role,
        university=student.university,
        major=student.major,
        graduation_year=student.graduation_year,
        gpa=student.gpa,
        skills=[r.skill_id for r in rows],
    )
