"""
Signed internship completion certificates.

Flow
----
1. Company confirms a completed internship for an *accepted* application
   (dates, skills actually used, supervisor)          → status awaiting_student
2. Student reviews it and accepts                     → UniPro signs it, status issued
   ...or declines with a note                         → status disputed (company can resubmit)
3. Anyone with the link can verify it (public)        → GET /certificates/verify/{id}
4. Company or admin can revoke an issued certificate  → status revoked

Only what the company confirmed is signed: the certificate says "Company X confirms
this student used React", not that UniPro tested the student.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app import signing
from app.auth import get_current_user, require_roles
from app.config import get_settings
from app.database import get_db
from app.matching import skill_slug
from app.models import (
    Application,
    ApplicationStatus,
    CertificateStatus,
    Company,
    Internship,
    InternshipCertificate,
    InternshipSkill,
    Skill,
    Student,
    User,
    UserRole,
)
from app.schemas import (
    CertificateCreate,
    CertificateDecline,
    CertificateOut,
    CertificatePrefillOut,
    CertificatePublicKeyOut,
    CertificateRevoke,
    CertificateSkillOut,
    CertificateVerifyOut,
)

router = APIRouter(prefix="/certificates", tags=["certificates"])
settings = get_settings()

PAYLOAD_TYPE = "UniProInternshipCertificate"
PAYLOAD_VERSION = 1


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _verify_url(certificate_id: UUID) -> str:
    return f"{settings.public_app_url.rstrip('/')}/#/verify/{certificate_id}"


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _load(db: Session, certificate_id: UUID) -> InternshipCertificate:
    cert = db.scalar(
        select(InternshipCertificate)
        .where(InternshipCertificate.certificate_id == certificate_id)
        .options(
            joinedload(InternshipCertificate.company),
            joinedload(InternshipCertificate.student).joinedload(Student.user),
        )
    )
    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


def _to_out(cert: InternshipCertificate) -> CertificateOut:
    student_name = cert.student.user.full_name if cert.student and cert.student.user else None
    public = cert.status in (CertificateStatus.issued, CertificateStatus.revoked)
    return CertificateOut(
        id=str(cert.certificate_id),
        applicationId=str(cert.application_id),
        internshipId=str(cert.internship_id),
        studentId=str(cert.student_id),
        studentName=student_name,
        company=cert.company.company_name if cert.company else "",
        role=cert.role_title,
        startDate=cert.start_date.isoformat(),
        endDate=cert.end_date.isoformat(),
        skills=[CertificateSkillOut(**s) for s in (cert.skills or [])],
        supervisorName=cert.supervisor_name,
        supervisorComment=cert.supervisor_comment,
        status=cert.status,
        studentNote=cert.student_note,
        createdAt=_iso(cert.created_at),
        issuedAt=_iso(cert.issued_at),
        revokedAt=_iso(cert.revoked_at),
        revokeReason=cert.revoke_reason,
        verifyUrl=_verify_url(cert.certificate_id) if public else None,
    )


def _normalize_skills(db: Session, body: CertificateCreate) -> list[dict]:
    """Map names to taxonomy ids (same slugs SmartMatch uses) and drop duplicates."""
    out: list[dict] = []
    seen: set[str] = set()
    for item in body.skills:
        name = item.name.strip()
        sid = skill_slug(name)
        if not name or sid in seen:
            continue
        seen.add(sid)
        known = db.get(Skill, sid)
        out.append({"id": sid, "name": known.name if known else name, "level": item.level.value})
    if not out:
        raise HTTPException(status_code=400, detail="At least one skill is required")
    return out


def _company_application(db: Session, user: User, application_id: UUID) -> Application:
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
    if app.internship is None or app.internship.company_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your internship")
    return app


def _build_payload(cert: InternshipCertificate, issued_at: datetime) -> dict:
    company = cert.company
    student_user = cert.student.user if cert.student else None
    return {
        "type": PAYLOAD_TYPE,
        "version": PAYLOAD_VERSION,
        "id": str(cert.certificate_id),
        "issuer": "UniPro",
        "issuedAt": issued_at.isoformat(),
        "keyId": signing.key_id(),
        "student": {
            "id": str(cert.student_id),
            "name": (student_user.full_name if student_user else None) or "",
        },
        "company": {
            "id": str(cert.company_id),
            "name": company.company_name if company else "",
            "verified": bool(company.verification_status) if company else False,
        },
        "internship": {"id": str(cert.internship_id), "role": cert.role_title},
        "period": {"start": cert.start_date.isoformat(), "end": cert.end_date.isoformat()},
        "skills": cert.skills or [],
        "confirmedBy": {
            "name": cert.supervisor_name,
            "comment": cert.supervisor_comment,
        },
        "statement": "The company confirmed that the student completed this internship and used these skills.",
    }


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@router.get("/public-key", response_model=CertificatePublicKeyOut)
def get_public_key() -> CertificatePublicKeyOut:
    """UniPro's public key, so anyone can check certificate signatures themselves."""
    try:
        return CertificatePublicKeyOut(
            keyId=signing.key_id(),
            algorithm=signing.ALGORITHM,
            publicKey=signing.public_key_raw_b64(),
            publicKeyPem=signing.public_key_pem(),
        )
    except signing.SigningKeyMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/verify/{certificate_id}", response_model=CertificateVerifyOut)
def verify_certificate(
    certificate_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> CertificateVerifyOut:
    """Public check. Pending or disputed certificates are not public."""
    cert = db.get(InternshipCertificate, certificate_id)
    if (
        cert is None
        or cert.status not in (CertificateStatus.issued, CertificateStatus.revoked)
        or not cert.signed_payload
        or not cert.signature
    ):
        raise HTTPException(status_code=404, detail="Certificate not found")
    try:
        signature_ok = signing.verify(cert.signed_payload, cert.signature)
        public_key = signing.public_key_raw_b64()
    except signing.SigningKeyMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return CertificateVerifyOut(
        id=str(cert.certificate_id),
        status=cert.status,
        valid=signature_ok and cert.status == CertificateStatus.issued,
        signatureValid=signature_ok,
        signedData=cert.signed_payload,
        signature=cert.signature,
        keyId=cert.key_id or signing.key_id(),
        algorithm=signing.ALGORITHM,
        publicKey=public_key,
        revokedAt=_iso(cert.revoked_at),
        revokeReason=cert.revoke_reason,
    )


# ---------------------------------------------------------------------------
# Company: confirm, list, revoke
# ---------------------------------------------------------------------------


@router.get("/prefill/{application_id}", response_model=CertificatePrefillOut)
def prefill(
    application_id: UUID,
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> CertificatePrefillOut:
    app = _company_application(db, user, application_id)
    rows = db.scalars(
        select(Skill.name)
        .join(InternshipSkill, InternshipSkill.skill_id == Skill.skill_id)
        .where(InternshipSkill.internship_id == app.internship_id)
        .order_by(Skill.name)
    ).all()
    suggested = list(rows) or [str(t) for t in (app.internship.tags or [])]
    return CertificatePrefillOut(
        applicationId=str(app.application_id),
        studentName=app.student.user.full_name if app.student and app.student.user else None,
        role=app.internship.title,
        suggestedSkills=suggested,
    )


@router.post("", response_model=CertificateOut, status_code=status.HTTP_201_CREATED)
def confirm_internship(
    body: CertificateCreate,
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> CertificateOut:
    """Company confirms a completed internship. Resubmitting fixes a pending or disputed record."""
    app = _company_application(db, user, body.application_id)
    if app.status != ApplicationStatus.accepted:
        raise HTTPException(status_code=400, detail="Only accepted applications can be confirmed")
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="End date is before start date")
    if body.end_date > date.today():
        raise HTTPException(status_code=400, detail="The internship has not ended yet")

    company = db.get(Company, user.user_id)
    if company is None:
        raise HTTPException(status_code=400, detail="Company profile required")
    if settings.require_verified_company_for_certificates and not company.verification_status:
        raise HTTPException(status_code=403, detail="Only verified companies can confirm internships")

    skills = _normalize_skills(db, body)
    cert = db.scalar(
        select(InternshipCertificate).where(InternshipCertificate.application_id == app.application_id)
    )
    if cert is None:
        cert = InternshipCertificate(
            application_id=app.application_id,
            student_id=app.student_id,
            company_id=user.user_id,
            internship_id=app.internship_id,
        )
        db.add(cert)
    elif cert.status not in (CertificateStatus.awaiting_student, CertificateStatus.disputed):
        raise HTTPException(status_code=409, detail="A certificate was already issued for this internship")

    cert.role_title = app.internship.title
    cert.start_date = body.start_date
    cert.end_date = body.end_date
    cert.skills = skills
    cert.supervisor_name = body.supervisor_name.strip()
    cert.supervisor_comment = (body.supervisor_comment or "").strip() or None
    cert.status = CertificateStatus.awaiting_student
    cert.student_note = None
    db.commit()
    return _to_out(_load(db, cert.certificate_id))


@router.post("/{certificate_id}/revoke", response_model=CertificateOut)
def revoke_certificate(
    certificate_id: UUID,
    body: CertificateRevoke,
    user: Annotated[User, Depends(require_roles(UserRole.company, UserRole.admin))],
    db: Annotated[Session, Depends(get_db)],
) -> CertificateOut:
    cert = _load(db, certificate_id)
    if user.role == UserRole.company and cert.company_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your certificate")
    if cert.status != CertificateStatus.issued:
        raise HTTPException(status_code=400, detail="Only issued certificates can be revoked")
    cert.status = CertificateStatus.revoked
    cert.revoked_at = datetime.now(timezone.utc)
    cert.revoke_reason = body.reason.strip()
    db.commit()
    return _to_out(_load(db, certificate_id))


# ---------------------------------------------------------------------------
# Student: accept or decline
# ---------------------------------------------------------------------------


def _student_pending(db: Session, user: User, certificate_id: UUID) -> InternshipCertificate:
    cert = _load(db, certificate_id)
    if cert.student_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your certificate")
    if cert.status != CertificateStatus.awaiting_student:
        raise HTTPException(status_code=400, detail="This certificate is not waiting for your review")
    return cert


@router.post("/{certificate_id}/accept", response_model=CertificateOut)
def accept_certificate(
    certificate_id: UUID,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> CertificateOut:
    """Student agrees with the record → UniPro signs it and it becomes public."""
    cert = _student_pending(db, user, certificate_id)
    issued_at = datetime.now(timezone.utc).replace(microsecond=0)
    payload = signing.canonical_json(_build_payload(cert, issued_at))
    try:
        signature = signing.sign(payload)
    except signing.SigningKeyMissing as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    cert.signed_payload = payload
    cert.signature = signature
    cert.key_id = signing.key_id()
    cert.issued_at = issued_at
    cert.status = CertificateStatus.issued
    db.commit()
    return _to_out(_load(db, certificate_id))


@router.post("/{certificate_id}/decline", response_model=CertificateOut)
def decline_certificate(
    certificate_id: UUID,
    body: CertificateDecline,
    user: Annotated[User, Depends(require_roles(UserRole.student))],
    db: Annotated[Session, Depends(get_db)],
) -> CertificateOut:
    cert = _student_pending(db, user, certificate_id)
    cert.status = CertificateStatus.disputed
    cert.student_note = (body.note or "").strip() or None
    db.commit()
    return _to_out(_load(db, certificate_id))


# ---------------------------------------------------------------------------
# Shared list
# ---------------------------------------------------------------------------


@router.get("", response_model=list[CertificateOut])
def list_certificates(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[CertificateOut]:
    q = select(InternshipCertificate).options(
        joinedload(InternshipCertificate.company),
        joinedload(InternshipCertificate.student).joinedload(Student.user),
    )
    if user.role == UserRole.student:
        q = q.where(InternshipCertificate.student_id == user.user_id)
    elif user.role == UserRole.company:
        q = q.where(InternshipCertificate.company_id == user.user_id)
    elif user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Students, companies, or admins only")
    rows = db.scalars(q.order_by(InternshipCertificate.created_at.desc())).unique().all()
    return [_to_out(c) for c in rows]


def verified_skill_ids(db: Session, student_id: UUID) -> set[str]:
    """Skills confirmed on the student's issued certificates (used by SmartMatch)."""
    rows = db.scalars(
        select(InternshipCertificate.skills).where(
            InternshipCertificate.student_id == student_id,
            InternshipCertificate.status == CertificateStatus.issued,
        )
    ).all()
    return {s["id"] for skills in rows for s in (skills or []) if isinstance(s, dict) and s.get("id")}
