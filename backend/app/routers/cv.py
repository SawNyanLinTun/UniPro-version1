"""CV extract / analyze: process in memory, store skills + embedding only — never the CV file."""

from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.auth import require_roles
from app.config import get_settings
from app.database import get_db
from app.embeddings import embed_skills, embed_text
from app.matching import skill_slug
from app.models import Skill, Student, StudentSkill, User, UserRole
from app.schemas import CvAnalyzeResultOut, CvExtractResultOut

router = APIRouter(prefix="/cv", tags=["cv"])

KNOWN_SKILLS = [
    "Go",
    "Kubernetes",
    "Redis",
    "Figma",
    "Framer",
    "Product Design",
    "Python",
    "LLMs",
    "NLP",
    "SEO",
    "Content Strategy",
    "Ads",
    "Fintech",
    "Strategy",
    "Agile",
    "React",
    "Node.js",
    "TypeScript",
    "PyTorch",
    "Scikit-learn",
    "AWS",
    "Docker",
    "Java",
    "SQL",
    "JavaScript",
    "Machine Learning",
]


def _heuristic_extract(text: str) -> CvExtractResultOut:
    lower = text.lower()
    skills: list[str] = []
    seen: set[str] = set()
    for name in KNOWN_SKILLS:
        if name.lower() in lower:
            sid = skill_slug(name)
            if sid not in seen:
                seen.add(sid)
                skills.append(sid)

    gpa: float | None = None
    m = re.search(r"\bgpa[:\s]*([0-4](?:\.\d{1,2})?)\b", lower)
    if m:
        try:
            gpa = float(m.group(1))
        except ValueError:
            gpa = None

    education: list[str] = []
    for line in text.splitlines():
        if re.search(r"\b(university|bachelor|master|b\.?s\.?|m\.?s\.?|degree)\b", line, re.I):
            education.append(line.strip())

    experience: list[str] = []
    for line in text.splitlines():
        if re.search(r"\b(intern|engineer|developer|experience|worked|company)\b", line, re.I):
            experience.append(line.strip())

    return CvExtractResultOut(
        skills=skills,
        gpa=gpa,
        education=education[:10],
        experience=experience[:10],
    )


def _gemini_extract(text: str) -> CvExtractResultOut | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    try:
        import urllib.request

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        )
        prompt = (
            "Extract from this CV as JSON with keys skills (list of lowercase skill ids), "
            "gpa (number or null), education (list of strings), experience (list of strings). "
            f"CV text:\n{text[:8000]}"
        )
        payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            return None
        parsed = json.loads(m.group(0))
        return CvExtractResultOut(
            skills=[skill_slug(str(s)) for s in parsed.get("skills", [])],
            gpa=parsed.get("gpa"),
            education=list(parsed.get("education") or []),
            experience=list(parsed.get("experience") or []),
        )
    except Exception:
        return None


def _finalize(content: str) -> CvExtractResultOut:
    if not content.strip():
        return CvExtractResultOut(skills=[], gpa=None, education=[], experience=[])
    gemini = _gemini_extract(content)
    if gemini is not None:
        return gemini
    return _heuristic_extract(content)


def _bytes_to_text(filename: str | None, data: bytes) -> str:
    """Parse upload bytes to text in memory; never write to disk."""
    name = (filename or "").lower()
    if name.endswith(".pdf") or data[:4] == b"%PDF":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(data))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages).strip()
            if text:
                return text
        except Exception:
            pass
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")


def _ensure_skill_rows(db: Session, skill_ids: list[str]) -> None:
    for sid in skill_ids:
        if db.get(Skill, sid) is None:
            db.add(Skill(skill_id=sid, name=sid.replace("-", " ").title()))


def _persist_student_skills_and_embedding(
    db: Session,
    user: User,
    extracted: CvExtractResultOut,
    cv_text: str,
) -> CvAnalyzeResultOut:
    """Upsert student profile skills + vector. cv_path stays null; file is not stored."""
    student = db.get(Student, user.user_id)
    if student is None:
        student = Student(user_id=user.user_id)
        db.add(student)
        db.flush()

    skill_ids = list(dict.fromkeys(extracted.skills))  # stable unique
    _ensure_skill_rows(db, skill_ids)

    db.execute(delete(StudentSkill).where(StudentSkill.student_id == user.user_id))
    for sid in skill_ids:
        db.add(StudentSkill(student_id=user.user_id, skill_id=sid))

    # Prefer embedding the CV text; fall back to skills-only vector
    embedding = embed_text(cv_text) or embed_skills(skill_ids)
    student.skills_embedding = embedding
    student.cv_path = None  # never keep CV files
    if extracted.gpa is not None:
        student.gpa = extracted.gpa

    db.commit()
    db.refresh(student)

    return CvAnalyzeResultOut(
        skills=skill_ids,
        gpa=extracted.gpa,
        education=extracted.education,
        experience=extracted.experience,
        embedding_dims=len(embedding) if embedding else 0,
        embedding_stored=bool(embedding),
        cv_stored=False,
    )


@router.post("/extract", response_model=CvExtractResultOut)
async def extract_cv(request: Request) -> CvExtractResultOut:
    """Ephemeral extract only (no DB write). Prefer POST /cv/analyze for students."""
    content_type = (request.headers.get("content-type") or "").lower()

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON body") from exc
        return _finalize(str((body or {}).get("text") or ""))

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        parts: list[str] = []
        text_val = form.get("text")
        if isinstance(text_val, str) and text_val:
            parts.append(text_val)
        file_val = form.get("file")
        if isinstance(file_val, StarletteUploadFile):
            data = await file_val.read()
            parts.append(_bytes_to_text(file_val.filename, data))
        return _finalize("\n".join(parts))

    raw = (await request.body()).decode("utf-8", errors="ignore")
    return _finalize(raw)


@router.post("/analyze", response_model=CvAnalyzeResultOut)
async def analyze_cv(
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
) -> CvAnalyzeResultOut:
    """
    Upload a CV (multipart). We extract skills, compute an AI embedding,
    store only those on the student profile, and discard the file bytes.
    """
    parts: list[str] = []
    if text and text.strip():
        parts.append(text.strip())
    if file is not None:
        data = await file.read()
        if data:
            parts.append(_bytes_to_text(file.filename, data))
        # file handle closed by FastAPI; bytes never written to disk / cv_path

    content = "\n".join(parts).strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a CV file or text",
        )

    extracted = _finalize(content)
    return _persist_student_skills_and_embedding(db, user, extracted, content)
