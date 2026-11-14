"""
Customer service – customer directory and profile management.
"""
from __future__ import annotations

import logging
from typing import Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, ValidationError
from app.models.customer import CustomerProfile
from app.models.user import User
from app.schemas.customer import CustomerProfileUpdate

logger = logging.getLogger(__name__)


class CustomerService:
    def __init__(self, db: Session):
        self.db = db

    async def get_profile(self, user_id: int) -> dict:
        user = (
            self.db.query(User)
            .options(joinedload(User.customer_profile))
            .filter(User.id == user_id)
            .first()
        )
        if not user:
            raise NotFoundError("User not found.")

        profile = user.customer_profile
        return {
            "id": user.id,
            "full_name": user.full_name,
            "mobile": user.mobile,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "profile": {
                "preferred_language": profile.preferred_language if profile else "en",
                "address": profile.address if profile else None,
                "district": profile.district if profile else None,
                "division": profile.division if profile else None,
                "post_code": profile.post_code if profile else None,
            }
            if profile
            else None,
        }

    async def update_profile(self, user_id: int, data: CustomerProfileUpdate) -> dict:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User not found.")

        profile = self.db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
        if not profile:
            profile = CustomerProfile(user_id=user_id)
            self.db.add(profile)

        update_dict = data.model_dump(exclude_unset=True)
        for k, v in update_dict.items():
            if hasattr(profile, k):
                setattr(profile, k, v)

        self.db.commit()
        return await self.get_profile(user_id)

    async def list_customers(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[list, int]:
        query = (
            self.db.query(User)
            .options(joinedload(User.customer_profile))
            .filter(User.role == "customer")
        )
        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(term),
                    User.mobile.ilike(term),
                    User.email.ilike(term),
                )
            )

        total = query.count()
        users = (
            query.order_by(User.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return users, total

    async def get_customer(self, customer_id: int) -> dict:
        return await self.get_profile(customer_id)

