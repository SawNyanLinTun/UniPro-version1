from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.database import get_db
from app.models import Company, User, UserRole
from app.schemas import CompanyMeOut, CompanyProfileUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_out(user: User, company: Company | None) -> CompanyMeOut:
    return CompanyMeOut(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name or "",
        role=user.role,
        company_name=company.company_name if company else None,
        industry=company.industry if company else None,
        verification_status=company.verification_status if company else False,
    )


@router.get("/me", response_model=CompanyMeOut)
def get_my_company(
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> CompanyMeOut:
    return _to_out(user, db.get(Company, user.user_id))


@router.put("/me", response_model=CompanyMeOut)
def update_my_company(
    body: CompanyProfileUpdate,
    user: Annotated[User, Depends(require_roles(UserRole.company))],
    db: Annotated[Session, Depends(get_db)],
) -> CompanyMeOut:
    """Create the company profile on first write, update it after."""
    company = db.get(Company, user.user_id)
    if company is None:
        company = Company(user_id=user.user_id, company_name=body.company_name, industry=body.industry)
        db.add(company)
    else:
        company.company_name = body.company_name
        company.industry = body.industry

    db.commit()
    db.refresh(company)
    return _to_out(user, company)
