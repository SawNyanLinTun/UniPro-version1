"""Coverage for the student's own editable profile fields (university, major,
graduation year, GPA) -- separate from CV-derived skills, which this endpoint
never touches.
"""

from app.models import UserRole


def test_student_can_fill_in_and_update_their_profile(client, as_user, make_user):
    student = make_user(UserRole.student, email="fill@uni.edu", full_name="New Student")
    as_user(student)

    r = client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["university"] is None  # nothing filled in yet

    r = client.put(
        "/students/me",
        json={"university": "Chulalongkorn University", "major": "Computer Engineering", "graduation_year": 2026},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["university"] == "Chulalongkorn University"
    assert body["major"] == "Computer Engineering"
    assert body["graduation_year"] == 2026

    r = client.get("/auth/me")
    assert r.json()["university"] == "Chulalongkorn University"

    r = client.put("/students/me", json={"university": "Thammasat University"})
    assert r.status_code == 200
    assert r.json()["university"] == "Thammasat University"
    assert r.json()["major"] is None  # a full replace, not a partial merge


def test_profile_update_does_not_touch_cv_derived_skills(client, as_user, make_user):
    student = make_user(UserRole.student, email="skills@uni.edu")
    as_user(student)
    client.post("/cv/analyze", data={"text": "Skilled in Python and SQL."})
    assert sorted(client.get("/auth/me").json()["skills"]) == ["python", "sql"]

    r = client.put("/students/me", json={"university": "Kasetsart University"})
    assert r.status_code == 200
    assert sorted(r.json()["skills"]) == ["python", "sql"]


def test_only_students_can_update_a_student_profile(client, as_user, make_user):
    company = make_user(UserRole.company, email="notastudent@co.com")
    as_user(company)
    r = client.put("/students/me", json={"university": "Nope"})
    assert r.status_code == 403


def test_graduation_year_and_gpa_are_validated(client, as_user, make_user):
    student = make_user(UserRole.student, email="bounds@uni.edu")
    as_user(student)
    assert client.put("/students/me", json={"graduation_year": 1800}).status_code == 422
    assert client.put("/students/me", json={"gpa": 4.5}).status_code == 422
