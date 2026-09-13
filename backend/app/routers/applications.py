import hashlib
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Application, ApplicationStatus, Internship, Student, User, UserRole
from app.schemas import ApplicationCreate, ApplicationOut, ApplicationUpdate

router = APIRouter(prefix="/applications", tags=["applications"])


def _record_hash(student_id: UUID, internship_id: UUID) -> str:
    raw = f"{student_id}:{internship_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _to_out(app: Application) -> ApplicationOut:
    internship = app.internship
    company = internship.company.company_name if internship and internship.company else ""
    role = internship.title if internship else ""
    student_name = app.student.user.full_name if app.student and app.student.user else None
    return ApplicationOut(
        id=str(app.application_id),
        internshipId=str(app.internship_id),
        studentId=str(app.student_id),
        studentName=student_name,
        role=role,
        company=company,
        status=app.status,
        appliedDate=app.applied_at.date().isoformat() if app.applied_at else "",
        recordHash=app.record_hash,
    )


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    if db.get(Student, user.user_id) is None:
        raise HTTPException(status_code=400, detail="Student profile required")

    internship = db.scalar(
        select(Internship)
        .where(Internship.internship_id == body.internship_id)
        .options(joinedload(Internship.company))
    )
    if internship is None:
        raise HTTPException(status_code=404, detail="Internship not found")

    existing = db.scalar(
        select(Application).where(
            Application.student_id == user.user_id,
            Application.internship_id == body.internship_id,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this internship")

    app = Application(
        student_id=user.user_id,
        internship_id=body.internship_id,
        status=ApplicationStatus.applied,
        record_hash=_record_hash(user.user_id, body.internship_id),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    app = db.scalar(
        select(Application)
        .where(Application.application_id == app.application_id)
        .options(
            joinedload(Application.internship).joinedload(Internship.company),
            joinedload(Application.student).joinedload(Student.user),
        )
    )
    assert app is not None
    return _to_out(app)


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ApplicationOut]:
    q = select(Application).options(
        joinedload(Application.internship).joinedload(Internship.company),
        joinedload(Application.student).joinedload(Student.user),
    )
    if user.role == UserRole.student:
        q = q.where(Application.student_id == user.user_id)
    elif user.role == UserRole.company:
        q = q.join(Internship).where(Internship.company_id == user.user_id)
    elif user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Students, companies, or admins only")

    rows = db.scalars(q.order_by(Application.applied_at.desc())).unique().all()
    return [_to_out(r) for r in rows]


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: UUID,
    body: ApplicationUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.student, UserRole.company, UserRole.admin))],
    db: Annotated[Session, Depends(get_db)],
) -> ApplicationOut:
    app = db.scalar(
        select(Application)
        .where(Application.application_id == application_id)
        .options(
            joinedload(Application.internship).joinedload(Internship.company),
            joinedload(Application.student).joinedload(Student.user),
        )
    )
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if user.role == UserRole.student and app.student_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your application")
    if user.role == UserRole.company and (app.internship is None or app.internship.company_id != user.user_id):
        raise HTTPException(status_code=403, detail="Not your internship")

    app.status = body.status
    db.commit()
    db.refresh(app)
    return _to_out(app)
