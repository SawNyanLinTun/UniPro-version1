"""Coverage for internship certificates: company confirms -> student accepts
-> UniPro signs it, and it shows up (masked) in the public Scholarship Ledger
gallery -- but only once actually issued, never while pending/disputed/revoked.

Assertions key off specific certificate ids rather than raw list length/emptiness:
the test DB is shared for the whole pytest session (see conftest.py), so other
tests in this file (and possibly future ones) may leave their own issued
certificates sitting in the public gallery.
"""

from app.models import Company, UserRole


def _post_job(client, **overrides):
    body = {
        "title": "Backend Intern",
        "description": "Build APIs",
        "location": "Bangkok",
        "work_type": "onsite",
        "duration": "3 months",
        "category": "Software Development",
        "stipend": "20000",
        "deadline": "2026-06-01",
        "tags": ["Python", "SQL"],
    }
    body.update(overrides)
    return client.post("/jobs", json=body)


def _confirm(client, application_id, **overrides):
    body = {
        "application_id": application_id,
        "start_date": "2025-01-01",
        "end_date": "2025-06-01",
        "skills": [{"name": "Python", "level": "strong"}],
        "supervisor_name": "Jane Manager",
    }
    body.update(overrides)
    return client.post("/certificates", json=body)


def _public_gallery(client, **params):
    return client.get("/certificates/public", params=params or None).json()


def _public_ids(client, **params):
    return {row["id"] for row in _public_gallery(client, **params)}


def _issued_certificate(
    client,
    as_user,
    make_user,
    db_session,
    *,
    tag,
    category="Software Development",
    verified_company=False,
    student_name="Somchai Boonmee",
):
    """Full flow: post job -> apply -> accept -> confirm -> student accepts."""
    company = make_user(UserRole.company, email=f"co-{tag}@example.com", full_name="Hiring Manager")
    as_user(company)
    client.put("/companies/me", json={"company_name": "Acme Corp"})
    if verified_company:
        row = db_session.get(Company, company.user_id)
        row.verification_status = True
        db_session.commit()
    job = _post_job(client, category=category).json()

    student = make_user(UserRole.student, email=f"stu-{tag}@example.com", full_name=student_name)
    as_user(student)
    client.post("/cv/analyze", data={"text": "Motivated applicant."})  # creates the Student profile row
    application = client.post("/applications", json={"internship_id": job["id"]}).json()

    as_user(company)
    client.patch(f"/applications/{application['id']}", json={"status": "accepted"})
    cert = _confirm(client, application["id"]).json()

    as_user(student)
    issued = client.post(f"/certificates/{cert['id']}/accept").json()
    return issued, student_name


# Runs first in file+collection order (see conftest.py's session-scoped schema) so
# the gallery is still genuinely empty here, before any other test issues a certificate.
def test_public_gallery_is_empty_with_no_certificates(client):
    r = client.get("/certificates/public")
    assert r.status_code == 200
    assert r.json() == []


def test_issued_certificate_appears_masked_in_public_gallery(client, as_user, make_user, db_session):
    issued, real_name = _issued_certificate(
        client, as_user, make_user, db_session, tag="main", verified_company=True
    )
    assert issued["status"] == "issued"

    rows = {row["id"]: row for row in _public_gallery(client)}
    assert issued["id"] in rows
    row = rows[issued["id"]]
    assert row["maskedName"] != real_name
    assert not row["maskedName"].startswith(real_name)  # no full name leaked
    assert row["company"] == "Acme Corp"
    assert row["companyVerified"] is True
    assert row["category"] == "Software Development"
    assert row["skills"] == [{"id": "python", "name": "Python", "level": "strong"}]
    assert row["issuedAt"]
    assert row["verifyUrl"].endswith(f"/verify/{issued['id']}")
    # Nothing beyond the masked public shape leaks through this endpoint.
    assert "studentId" not in row
    assert "applicationId" not in row
    assert "supervisorName" not in row


def test_pending_disputed_and_revoked_certificates_are_not_public(client, as_user, make_user, db_session):
    company = make_user(UserRole.company, email="co-lifecycle@example.com")
    as_user(company)
    client.put("/companies/me", json={"company_name": "Lifecycle Co"})
    job = _post_job(client).json()

    student = make_user(UserRole.student, email="stu-lifecycle@example.com", full_name="Pending Student")
    as_user(student)
    client.post("/cv/analyze", data={"text": "Applicant."})
    application = client.post("/applications", json={"internship_id": job["id"]}).json()

    as_user(company)
    client.patch(f"/applications/{application['id']}", json={"status": "accepted"})
    cert = _confirm(client, application["id"]).json()
    assert cert["status"] == "awaiting_student"
    assert cert["id"] not in _public_ids(client)

    as_user(student)
    disputed = client.post(f"/certificates/{cert['id']}/decline", json={"note": "wrong dates"}).json()
    assert disputed["status"] == "disputed"
    assert cert["id"] not in _public_ids(client)

    as_user(company)
    _confirm(client, application["id"])  # resubmit fixes the disputed record

    as_user(student)
    issued = client.post(f"/certificates/{cert['id']}/accept").json()
    assert issued["status"] == "issued"
    assert cert["id"] in _public_ids(client)

    as_user(company)
    revoked = client.post(f"/certificates/{cert['id']}/revoke", json={"reason": "mistake"}).json()
    assert revoked["status"] == "revoked"
    assert cert["id"] not in _public_ids(client)


def test_category_filter_is_case_insensitive(client, as_user, make_user, db_session):
    issued, _ = _issued_certificate(
        client, as_user, make_user, db_session, tag="cat", category="Data Science"
    )

    assert issued["id"] in _public_ids(client, category="data science")

    rows = _public_gallery(client, category="data science")
    assert all(row["category"] == "Data Science" for row in rows)

    assert issued["id"] not in _public_ids(client, category="Marketing")
