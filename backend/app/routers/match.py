from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles
from app.database import get_db
from app.embeddings import embed_text
from app.matching import compute_match
from app.models import Internship, InternshipSkill, InternshipStatus, Match, Student, StudentSkill, User, UserRole
from app.schemas import MatchRequest, MatchResultOut

router = APIRouter(tags=["match"])


def _student_skill_ids(db: Session, student_id: UUID) -> set[str]:
    rows = db.scalars(select(StudentSkill.skill_id).where(StudentSkill.student_id == student_id)).all()
    return set(rows)


def _internship_skill_ids(db: Session, internship_id: UUID) -> set[str]:
    rows = db.scalars(
        select(InternshipSkill.skill_id).where(InternshipSkill.internship_id == internship_id)
    ).all()
    return set(rows)


def _ensure_internship_embedding(db: Session, internship: Internship, skill_ids: set[str]) -> list[float] | None:
    """Lazy-cache Gemini embedding for internship tags so SSSA can use student CV vectors."""
    if internship.required_skills_embedding:
        return list(internship.required_skills_embedding)
    label = internship.title
    if skill_ids:
        label = f"{internship.title}. Skills: {', '.join(sorted(skill_ids))}"
    elif internship.tags:
        label = f"{internship.title}. Skills: {', '.join(str(t) for t in internship.tags)}"
    vec = embed_text(label)
    if vec:
        internship.required_skills_embedding = vec
        db.add(internship)
    return vec


def _match_to_out(match: Match, internship: Internship) -> MatchResultOut:
    company_name = internship.company.company_name if internship.company else ""
    return MatchResultOut(
        jobId=str(internship.internship_id),
        company=company_name,
        role=internship.title,
        hscr=match.hscr,
        sgi=match.sgi,
        sssa=match.sssa,
        matchedSkills=list(match.matched_skills or []),
        missingSkills=list(match.missing_skills or []),
    )


@router.post("/match", response_model=list[MatchResultOut])
def run_match(
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
    body: Annotated[MatchRequest, Body()] = MatchRequest(),
) -> list[MatchResultOut]:
    student = db.get(Student, user.user_id)
    if student is None:
        raise HTTPException(status_code=400, detail="Student profile required")

    candidate_skills = _student_skill_ids(db, user.user_id)
    candidate_embedding = student.skills_embedding

    q = (
        select(Internship)
        .where(Internship.status == InternshipStatus.open)
        .options(joinedload(Internship.company))
    )
    if body.internship_ids:
        q = q.where(Internship.internship_id.in_(body.internship_ids))

    internships = db.scalars(q).unique().all()
    results: list[MatchResultOut] = []
    now = datetime.now(timezone.utc)

    for internship in internships:
        required = _internship_skill_ids(db, internship.internship_id)
        required_embedding = internship.required_skills_embedding
        if candidate_embedding and not required_embedding:
            required_embedding = _ensure_internship_embedding(db, internship, required)
        scores = compute_match(
            required,
            candidate_skills,
            required_embedding=required_embedding,
            candidate_embedding=candidate_embedding,
        )

        existing = db.scalar(
            select(Match).where(
                Match.student_id == user.user_id,
                Match.internship_id == internship.internship_id,
            )
        )
        if existing:
            existing.hscr = scores.hscr
            existing.sgi = scores.sgi
            existing.sssa = scores.sssa
            existing.matched_skills = scores.matched_skills
            existing.missing_skills = scores.missing_skills
            existing.calculated_at = now
            match = existing
        else:
            match = Match(
                student_id=user.user_id,
                internship_id=internship.internship_id,
                hscr=scores.hscr,
                sgi=scores.sgi,
                sssa=scores.sssa,
                matched_skills=scores.matched_skills,
                missing_skills=scores.missing_skills,
                calculated_at=now,
            )
            db.add(match)

        results.append(_match_to_out(match, internship))

    db.commit()
    results.sort(key=lambda m: (m.hscr + m.sssa) / 2, reverse=True)
    return results


@router.get("/matches", response_model=list[MatchResultOut])
def list_matches(
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> list[MatchResultOut]:
    rows = db.scalars(
        select(Match)
        .where(Match.student_id == user.user_id)
        .options(joinedload(Match.internship).joinedload(Internship.company))
        .order_by(Match.hscr.desc())
    ).unique().all()

    out: list[MatchResultOut] = []
    for match in rows:
        if match.internship is None:
            continue
        out.append(_match_to_out(match, match.internship))
    return out
