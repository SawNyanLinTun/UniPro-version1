"""End-to-end coverage for the company-side API: profile, postings,
candidate ranking, and the application review lifecycle — plus the
ownership checks that keep one company off another company's data.
"""

from datetime import date

from app.models import UserRole


def _post_job(client, **overrides):
    body = {
        "title": "Backend Intern",
        "description": "Build APIs",
        "location": "Bangkok",
        "work_type": "onsite",
        "duration": "3 months",
        "category": "Engineering",
        "stipend": "20000",
        "deadline": str(date(2026, 6, 1)),
        "tags": ["Python", "SQL"],
    }
    body.update(overrides)
    return client.post("/jobs", json=body)


def test_company_can_complete_profile(client, as_user, make_user):
    company = make_user(UserRole.company, email="acme@co.com")
    as_user(company)

    r = client.put("/companies/me", json={"company_name": "Acme Corp", "industry": "Fintech"})
    assert r.status_code == 200
    assert r.json()["company_name"] == "Acme Corp"

    r = client.get("/companies/me")
    assert r.status_code == 200
    assert r.json()["industry"] == "Fintech"


def test_job_requires_a_company_profile_first(client, as_user, make_user):
    company = make_user(UserRole.company, email="noprofile@co.com")
    as_user(company)

    r = _post_job(client)
    assert r.status_code == 400


def test_company_can_post_list_and_edit_a_job(client, as_user, make_user):
    company = make_user(UserRole.company, email="build@co.com")
    as_user(company)
    client.put("/companies/me", json={"company_name": "Build Co"})

    r = _post_job(client)
    assert r.status_code == 201
    job = r.json()
    assert job["skills"] == ["python", "sql"]

    r = client.get("/jobs/mine")
    assert r.status_code == 200
    assert any(j["id"] == job["id"] for j in r.json())

    r = client.patch(f"/jobs/{job['id']}", json={"tags": ["Python", "Django"], "status": "closed"})
    assert r.status_code == 200
    assert sorted(r.json()["skills"]) == ["django", "python"]
    assert r.json()["type"] == "onsite"  # untouched fields survive a partial patch


def test_candidates_are_ranked_by_skill_overlap(client, as_user, make_user):
    company = make_user(UserRole.company, email="rank@co.com")
    as_user(company)
    client.put("/companies/me", json={"company_name": "Rank Co"})
    job = _post_job(client, tags=["Python", "SQL", "Docker"]).json()

    strong = make_user(UserRole.student, email="strong@uni.edu", full_name="Strong Match")
    weak = make_user(UserRole.student, email="weak@uni.edu", full_name="Weak Match")

    as_user(strong)
    client.post("/cv/analyze", data={"text": "Skilled in Python, SQL, and Docker."})
    as_user(weak)
    client.post("/cv/analyze", data={"text": "Skilled in Python only."})

    as_user(company)
    r = client.get(f"/jobs/{job['id']}/candidates")
    assert r.status_code == 200
    names = [c["fullName"] for c in r.json()]
    assert names == ["Strong Match", "Weak Match"]  # best match first


def test_student_apply_then_company_advances_status(client, as_user, make_user):
    company = make_user(UserRole.company, email="hire@co.com")
    as_user(company)
    client.put("/companies/me", json={"company_name": "Hire Co"})
    job = _post_job(client).json()

    student = make_user(UserRole.student, email="applicant@uni.edu", full_name="Applicant One")
    as_user(student)
    client.post("/cv/analyze", data={"text": "Motivated applicant."})  # creates the Student profile row
    r = client.post("/applications", json={"internship_id": job["id"]})
    assert r.status_code == 201
    application = r.json()
    assert application["studentName"] == "Applicant One"
    assert application["status"] == "applied"

    as_user(company)
    r = client.get("/applications")
    assert r.status_code == 200
    assert any(a["id"] == application["id"] for a in r.json())

    r = client.patch(f"/applications/{application['id']}", json={"status": "interview"})
    assert r.status_code == 200
    assert r.json()["status"] == "interview"


def test_company_cannot_touch_another_companys_job_or_applications(client, as_user, make_user):
    owner = make_user(UserRole.company, email="owner@co.com")
    intruder = make_user(UserRole.company, email="intruder@co.com")
    student = make_user(UserRole.student, email="bystander@uni.edu")

    as_user(owner)
    client.put("/companies/me", json={"company_name": "Owner Co"})
    job = _post_job(client).json()

    as_user(student)
    client.post("/cv/analyze", data={"text": "Bystander applicant."})  # creates the Student profile row
    application = client.post("/applications", json={"internship_id": job["id"]}).json()

    as_user(intruder)
    client.put("/companies/me", json={"company_name": "Intruder Co"})

    assert client.patch(f"/jobs/{job['id']}", json={"title": "Hijacked"}).status_code == 403
    assert client.get(f"/jobs/{job['id']}/candidates").status_code == 403
    assert client.patch(f"/applications/{application['id']}", json={"status": "rejected"}).status_code == 403
