import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    company = "company"
    admin = "admin"


class WorkType(str, enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class InternshipStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    under_review = "under_review"
    interview = "interview"
    accepted = "accepted"
    rejected = "rejected"


class CertificateStatus(str, enum.Enum):
    # Company confirmed the internship; waiting for the student to accept the record.
    awaiting_student = "awaiting_student"
    # Student accepted; UniPro signed it. Publicly verifiable.
    issued = "issued"
    # Student disagreed with the record; company can correct and resubmit.
    disputed = "disputed"
    # Withdrawn after issue (e.g. issued by mistake). Verify page shows "Revoked".
    revoked = "revoked"


class SkillLevel(str, enum.Enum):
    basic = "basic"
    good = "good"
    strong = "strong"


def _str_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Store enum *values* as strings (SQLite + Postgres friendly)."""
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda obj: [e.value for e in obj],
        native_enum=False,
        validate_strings=True,
    )


class User(Base):
    """Public profile row. Passwords live only in Supabase auth.users."""

    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(_str_enum(UserRole, "user_role"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student | None"] = relationship(back_populates="user", uselist=False)
    company: Mapped["Company | None"] = relationship(back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    university: Mapped[str | None] = mapped_column(String(255))
    major: Mapped[str | None] = mapped_column(String(255))
    graduation_year: Mapped[int | None] = mapped_column()
    gpa: Mapped[float | None] = mapped_column(Float)
    cv_path: Mapped[str | None] = mapped_column(String(512))
    skills_embedding: Mapped[list | None] = mapped_column(JSON)

    user: Mapped[User] = relationship(back_populates="student")
    skills: Mapped[list["StudentSkill"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    matches: Mapped[list["Match"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    saved: Mapped[list["SavedInternship"]] = relationship(back_populates="student", cascade="all, delete-orphan")


class Company(Base):
    __tablename__ = "companies"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(255))
    verification_status: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    user: Mapped[User] = relationship(back_populates="company")
    internships: Mapped[list["Internship"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"

    skill_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)


class StudentSkill(Base):
    __tablename__ = "student_skills"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.user_id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("skills.skill_id", ondelete="CASCADE"), primary_key=True
    )

    student: Mapped[Student] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class Internship(Base):
    __tablename__ = "internships"

    internship_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("companies.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    work_type: Mapped[WorkType] = mapped_column(_str_enum(WorkType, "work_type"), nullable=False)
    duration: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    stipend: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[InternshipStatus] = mapped_column(
        _str_enum(InternshipStatus, "internship_status"),
        default=InternshipStatus.open,
        server_default=InternshipStatus.open.value,
    )
    posted_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    required_skills_embedding: Mapped[list | None] = mapped_column(JSON)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    company: Mapped[Company] = relationship(back_populates="internships")
    skills: Mapped[list["InternshipSkill"]] = relationship(
        back_populates="internship", cascade="all, delete-orphan"
    )
    matches: Mapped[list["Match"]] = relationship(back_populates="internship", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(
        back_populates="internship", cascade="all, delete-orphan"
    )
    saved_by: Mapped[list["SavedInternship"]] = relationship(
        back_populates="internship", cascade="all, delete-orphan"
    )


class InternshipSkill(Base):
    __tablename__ = "internship_skills"

    internship_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internships.internship_id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("skills.skill_id", ondelete="CASCADE"), primary_key=True
    )

    internship: Mapped[Internship] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_match_student_internship"),)

    match_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    internship_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internships.internship_id", ondelete="CASCADE"), nullable=False, index=True
    )
    hscr: Mapped[float] = mapped_column(Float, nullable=False)
    sgi: Mapped[float] = mapped_column(Float, nullable=False)
    sssa: Mapped[float] = mapped_column(Float, nullable=False)
    matched_skills: Mapped[list] = mapped_column(JSON, default=list)
    missing_skills: Mapped[list] = mapped_column(JSON, default=list)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    student: Mapped[Student] = relationship(back_populates="matches")
    internship: Mapped[Internship] = relationship(back_populates="matches")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("student_id", "internship_id", name="uq_application_student_internship"),
    )

    application_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    internship_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internships.internship_id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        _str_enum(ApplicationStatus, "application_status"),
        default=ApplicationStatus.applied,
        server_default=ApplicationStatus.applied.value,
    )
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    record_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    student: Mapped[Student] = relationship(back_populates="applications")
    internship: Mapped[Internship] = relationship(back_populates="applications")


class SavedInternship(Base):
    __tablename__ = "saved_internships"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.user_id", ondelete="CASCADE"), primary_key=True
    )
    internship_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internships.internship_id", ondelete="CASCADE"), primary_key=True
    )
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[Student] = relationship(back_populates="saved")
    internship: Mapped[Internship] = relationship(back_populates="saved_by")


class InternshipCertificate(Base):
    """
    Signed record that a student completed an internship found through UniPro.

    Flow: company confirms (awaiting_student) → student accepts → UniPro signs (issued).
    ``signed_payload`` is the exact JSON string that ``signature`` covers; it is only
    set once issued and must never be edited afterwards.
    """

    __tablename__ = "internship_certificates"

    certificate_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("applications.application_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("companies.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    internship_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internships.internship_id", ondelete="CASCADE"), nullable=False
    )
    role_title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    # [{"id": "react", "name": "React", "level": "strong"}, ...]
    skills: Mapped[list] = mapped_column(JSON, default=list)
    supervisor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    supervisor_comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[CertificateStatus] = mapped_column(
        _str_enum(CertificateStatus, "certificate_status"),
        default=CertificateStatus.awaiting_student,
        server_default=CertificateStatus.awaiting_student.value,
        nullable=False,
    )
    student_note: Mapped[str | None] = mapped_column(Text)
    signed_payload: Mapped[str | None] = mapped_column(Text)
    signature: Mapped[str | None] = mapped_column(String(128))
    key_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoke_reason: Mapped[str | None] = mapped_column(Text)

    student: Mapped[Student] = relationship()
    company: Mapped[Company] = relationship()
    internship: Mapped[Internship] = relationship()
