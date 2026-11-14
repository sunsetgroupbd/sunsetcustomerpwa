"""
Business service – manage the 4 business divisions, pricing, and terms.
"""
from __future__ import annotations

import logging
from typing import Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.business import Business
from app.models.pricing import PricingConfiguration
from app.models.terms import TermsAndConditions
from app.schemas.business import BusinessCreate, BusinessUpdate

logger = logging.getLogger(__name__)


class BusinessService:
    def __init__(self, db: Session):
        self.db = db

    async def list_active_businesses(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[list[Business], int]:
        query = self.db.query(Business).filter(Business.is_active == True)
        if search:
            query = query.filter(
                or_(
                    Business.name.ilike(f"%{search}%"),
                    Business.code.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        items = query.order_by(Business.id.asc()).offset((page - 1) * per_page).limit(per_page).all()
        return items, total

    async def get_business(self, business_id: int) -> dict:
        biz = self.db.query(Business).filter(Business.id == business_id).first()
        if not biz:
            raise NotFoundError(f"Business {business_id} not found.")

        # Fetch active pricing configs
        pricings = (
            self.db.query(PricingConfiguration)
            .filter(
                PricingConfiguration.business_id == business_id,
                PricingConfiguration.is_active == True,
            )
            .all()
        )

        # Fetch latest active terms
        terms = (
            self.db.query(TermsAndConditions)
            .filter(
                TermsAndConditions.business_id == business_id,
                TermsAndConditions.is_active == True,
            )
            .order_by(TermsAndConditions.created_at.desc())
            .first()
        )

        return {
            "id": biz.id,
            "name": biz.name,
            "code": biz.code,
            "description": biz.description,
            "is_active": biz.is_active,
            "created_at": biz.created_at,
            "pricing": [
                {
                    "id": p.id,
                    "package_name": p.package_name,
                    "price": float(p.price),
                    "effective_from": p.effective_from,
                }
                for p in pricings
            ],
            "terms": {
                "id": terms.id,
                "version": terms.version,
                "content": terms.content,
            }
            if terms
            else None,
        }

    async def create_business(self, data: BusinessCreate) -> Business:
        exists = self.db.query(Business).filter(Business.code == data.code.upper()).first()
        if exists:
            raise ConflictError(f"Business with code '{data.code}' already exists.")

        biz = Business(
            name=data.name,
            code=data.code.upper(),
            description=data.description,
            is_active=data.is_active,
        )
        self.db.add(biz)
        self.db.commit()
        self.db.refresh(biz)
        return biz

    async def update_business(self, business_id: int, data: BusinessUpdate) -> Business:
        biz = self.db.query(Business).filter(Business.id == business_id).first()
        if not biz:
            raise NotFoundError(f"Business {business_id} not found.")

        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(biz, k, v)

        self.db.commit()
        self.db.refresh(biz)
        return biz

