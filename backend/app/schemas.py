import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ApplicationStatus, CertificateStatus, InternshipStatus, SkillLevel, UserRole, WorkType


class JobOut(BaseModel):
    """Frontend Internship / Job shape."""

    id: str
    title: str
    company: str
    location: str
    type: WorkType
    duration: str
    category: str
    description: str
    stipend: str
    tags: list[str]
    postedDate: str
    deadline: str
    skills: list[str] = Field(default_factory=list)


class MatchRequest(BaseModel):
    internship_ids: list[uuid.UUID] | None = None


class MatchResultOut(BaseModel):
    jobId: str
    company: str
    role: str
    hscr: float
    sgi: float
    sssa: float
    matchedSkills: list[str]
    missingSkills: list[str]


class ApplicationCreate(BaseModel):
    internship_id: uuid.UUID


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    id: str
    internshipId: str
    studentId: str
    studentName: str | None = None
    role: str
    company: str
    status: ApplicationStatus
    appliedDate: str
    recordHash: str | None = None


class CompanyProfileUpdate(BaseModel):
    company_name: str
    industry: str | None = None


class CompanyMeOut(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    company_name: str | None = None
    industry: str | None = None
    verification_status: bool = False


class InternshipCreate(BaseModel):
    title: str
    description: str
    location: str
    work_type: WorkType
    duration: str
    category: str
    stipend: str
    deadline: date
    tags: list[str] = Field(default_factory=list)


class InternshipUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    work_type: WorkType | None = None
    duration: str | None = None
    category: str | None = None
    stipend: str | None = None
    deadline: date | None = None
    tags: list[str] | None = None
    status: InternshipStatus | None = None


class CandidateMatchOut(BaseModel):
    studentId: str
    fullName: str
    university: str | None = None
    major: str | None = None
    graduationYear: int | None = None
    hscr: float
    sgi: float
    sssa: float
    matchedSkills: list[str]
    missingSkills: list[str]


class CvExtractTextBody(BaseModel):
    text: str


class CvExtractResultOut(BaseModel):
    skills: list[str]
    gpa: float | None
    education: list[str]
    experience: list[str]


class CvAnalyzeResultOut(BaseModel):
    """CV processed in-memory: skills + embedding stored; file discarded."""

    skills: list[str]
    gpa: float | None = None
    education: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    embedding_dims: int = 0
    embedding_stored: bool = False
    cv_stored: bool = False


class StudentMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    university: str | None = None
    major: str | None = None
    graduation_year: int | None = None
    gpa: float | None = None
    skills: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Internship certificates
# ---------------------------------------------------------------------------


class CertificateSkillIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    level: SkillLevel = SkillLevel.good


class CertificateSkillOut(BaseModel):
    id: str
    name: str
    level: SkillLevel


class CertificateCreate(BaseModel):
    """Company confirms a completed internship (about a 2-minute form)."""

    application_id: uuid.UUID
    start_date: date
    end_date: date
    skills: list[CertificateSkillIn] = Field(min_length=1, max_length=30)
    supervisor_name: str = Field(min_length=1, max_length=255)
    supervisor_comment: str | None = Field(default=None, max_length=1000)


class CertificateDecline(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class CertificateRevoke(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class CertificateOut(BaseModel):
    id: str
    applicationId: str
    internshipId: str
    studentId: str
    studentName: str | None = None
    company: str
    role: str
    startDate: str
    endDate: str
    skills: list[CertificateSkillOut]
    supervisorName: str
    supervisorComment: str | None = None
    status: CertificateStatus
    studentNote: str | None = None
    createdAt: str | None = None
    issuedAt: str | None = None
    revokedAt: str | None = None
    revokeReason: str | None = None
    verifyUrl: str | None = None


class CertificatePrefillOut(BaseModel):
    """Checklist for the company form, pre-filled from the posting's required skills."""

    applicationId: str
    studentName: str | None = None
    role: str
    suggestedSkills: list[str]


class CertificatePublicKeyOut(BaseModel):
    keyId: str
    algorithm: str
    publicKey: str  # base64, raw 32 bytes
    publicKeyPem: str


class CertificateVerifyOut(BaseModel):
    """Public verify result. ``signedData`` is exactly what ``signature`` covers."""

    id: str
    status: CertificateStatus
    valid: bool
    signatureValid: bool
    signedData: str
    signature: str
    keyId: str
    algorithm: str
    publicKey: str
    revokedAt: str | None = None
    revokeReason: str | None = None
