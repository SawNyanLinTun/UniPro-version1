import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ApplicationStatus, UserRole, WorkType


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
    role: str
    company: str
    status: ApplicationStatus
    appliedDate: str
    recordHash: str | None = None


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
