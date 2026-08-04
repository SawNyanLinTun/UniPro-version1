"""Seed skills, companies, and internships from frontend mock data.

Does not create password-based auth users. Demo logins must be created in
Supabase Auth (the handle_new_user trigger inserts public.users).

When DATABASE_URL points at Supabase Postgres with users → auth.users FK,
set SEED_ON_STARTUP=false — seed company User rows cannot satisfy that FK.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.matching import skill_slug
from app.models import (
    Company,
    Internship,
    InternshipSkill,
    InternshipStatus,
    Skill,
    User,
    UserRole,
    WorkType,
)

logger = logging.getLogger(__name__)

# Stable UUIDs derived from mock listing ids / company names
NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _uid(key: str) -> uuid.UUID:
    return uuid.uuid5(NS, f"unipro.{key}")


MOCK_LISTINGS = [
    {
        "key": "1",
        "title": "Distributed Systems Associate",
        "company": "Agoda",
        "industry": "Travel Tech",
        "location": "Bangkok",
        "type": WorkType.onsite,
        "duration": "3-6 months",
        "category": "Software Development",
        "description": (
            "Build the backbone of modern infrastructure. "
            "Focus on low-latency data streams and scaling global travel systems."
        ),
        "stipend": "฿25,000/mo",
        "tags": ["Go", "Kubernetes", "Redis"],
        "posted_date": date(2024, 3, 1),
        "deadline": date(2024, 4, 15),
    },
    {
        "key": "2",
        "title": "UI/UX Design Intern",
        "company": "Lineman Wongnai",
        "industry": "Food Delivery",
        "location": "Bangkok",
        "type": WorkType.hybrid,
        "duration": "4 months",
        "category": "Design",
        "description": (
            "Define the physical language of virtual objects. "
            "Master the art of fluid interactions for millions of users."
        ),
        "stipend": "฿18,000/mo",
        "tags": ["Figma", "Framer", "Product Design"],
        "posted_date": date(2024, 3, 5),
        "deadline": date(2024, 4, 20),
    },
    {
        "key": "3",
        "title": "Data Science Intern",
        "company": "SCB 10X",
        "industry": "Fintech / AI",
        "location": "Bangkok",
        "type": WorkType.onsite,
        "duration": "6 months",
        "category": "Data Science",
        "description": (
            "Work at the intersection of ethics and architecture. "
            "Fine-tune the future of cognition for Southeast Asian languages."
        ),
        "stipend": "฿30,000/mo",
        "tags": ["Python", "LLMs", "NLP"],
        "posted_date": date(2024, 2, 28),
        "deadline": date(2024, 3, 30),
    },
    {
        "key": "4",
        "title": "Digital Marketing Strategist",
        "company": "Shopee Thailand",
        "industry": "E-commerce",
        "location": "Bangkok",
        "type": WorkType.remote,
        "duration": "3 months",
        "category": "Marketing",
        "description": (
            "Drive user acquisition and engagement through data-backed "
            "marketing strategies and campaign operations."
        ),
        "stipend": "฿15,000/mo",
        "tags": ["SEO", "Content Strategy", "Ads"],
        "posted_date": date(2024, 3, 10),
        "deadline": date(2024, 5, 1),
    },
    {
        "key": "5",
        "title": "Business Development Intern",
        "company": "KBTG",
        "industry": "Banking Tech",
        "location": "Nonthaburi",
        "type": WorkType.hybrid,
        "duration": "6 months",
        "category": "Business",
        "description": (
            "Analyze digital transformation trends in the banking sector. "
            "Help define the future of mobile payments."
        ),
        "stipend": "฿22,000/mo",
        "tags": ["Fintech", "Strategy", "Agile"],
        "posted_date": date(2024, 3, 2),
        "deadline": date(2024, 4, 10),
    },
    {
        "key": "6",
        "title": "Full Stack Developer",
        "company": "Seven Peaks Software",
        "industry": "Software Consulting",
        "location": "Bangkok",
        "type": WorkType.onsite,
        "duration": "4-6 months",
        "category": "Software Development",
        "description": (
            "Join an international team building enterprise-grade applications using React and Node.js."
        ),
        "stipend": "฿20,000/mo",
        "tags": ["React", "Node.js", "TypeScript"],
        "posted_date": date(2024, 3, 8),
        "deadline": date(2024, 4, 25),
    },
    {
        "key": "7",
        "title": "Machine Learning Engineer",
        "company": "Omise",
        "industry": "Payments",
        "location": "Phuket",
        "type": WorkType.remote,
        "duration": "6 months",
        "category": "Data Science",
        "description": "Help develop fraud detection models and automated payment routing algorithms.",
        "stipend": "฿28,000/mo",
        "tags": ["PyTorch", "Scikit-learn", "AWS"],
        "posted_date": date(2024, 3, 12),
        "deadline": date(2024, 5, 15),
    },
]


def _ensure_skill(db: Session, tag: str) -> Skill:
    sid = skill_slug(tag)
    skill = db.get(Skill, sid)
    if skill is None:
        skill = Skill(skill_id=sid, name=tag)
        db.add(skill)
        db.flush()
    return skill


def seed_if_empty(db: Session) -> None:
    existing = db.scalar(select(Internship).limit(1))
    if existing is not None:
        return

    all_tags: set[str] = set()
    for listing in MOCK_LISTINGS:
        all_tags.update(listing["tags"])
    for tag in sorted(all_tags):
        _ensure_skill(db, tag)

    try:
        companies: dict[str, Company] = {}
        for listing in MOCK_LISTINGS:
            name = listing["company"]
            if name in companies:
                continue
            company_user_id = _uid(f"company.{name}")
            user = User(
                user_id=company_user_id,
                email=f"{skill_slug(name)}@company.unipro.example.com",
                full_name=f"{name} Recruiter",
                role=UserRole.company,
            )
            company = Company(
                user_id=company_user_id,
                company_name=name,
                industry=listing["industry"],
                verification_status=True,
            )
            db.add(user)
            db.add(company)
            companies[name] = company

        db.flush()

        for listing in MOCK_LISTINGS:
            company = companies[listing["company"]]
            internship_id = _uid(f"internship.{listing['key']}")
            internship = Internship(
                internship_id=internship_id,
                company_id=company.user_id,
                title=listing["title"],
                description=listing["description"],
                location=listing["location"],
                work_type=listing["type"],
                duration=listing["duration"],
                category=listing["category"],
                stipend=listing["stipend"],
                status=InternshipStatus.open,
                posted_date=listing["posted_date"],
                deadline=listing["deadline"],
                required_skills_embedding=None,
                tags=list(listing["tags"]),
            )
            db.add(internship)
            db.flush()
            for tag in listing["tags"]:
                skill = _ensure_skill(db, tag)
                db.add(InternshipSkill(internship_id=internship_id, skill_id=skill.skill_id))

        db.commit()
    except IntegrityError:
        db.rollback()
        logger.warning(
            "Seed skipped: cannot insert public.users without matching auth.users "
            "(expected when using Supabase). Set SEED_ON_STARTUP=false and seed jobs separately."
        )
