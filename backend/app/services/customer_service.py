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
            "customer_id_number": user.customer_id_number or (profile.customer_id_number if profile else None),
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "profile": {
                "preferred_language": profile.preferred_language if profile else "en",
                "address": profile.address if profile else None,
                "district": profile.district if profile else None,
                "division": profile.division if profile else None,
                "post_code": profile.post_code if profile else None,
                "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
                "gender": profile.gender if profile else None,
                "emergency_contact": profile.emergency_contact if profile else None,
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

        # Update User fields if provided
        if "full_name" in update_dict and update_dict["full_name"]:
            user.full_name = update_dict["full_name"].strip()

        if "email" in update_dict:
            new_email = update_dict["email"].strip().lower() if update_dict["email"] else None
            if new_email and new_email != user.email:
                # check uniqueness
                existing = self.db.query(User).filter(User.email == new_email, User.id != user_id).first()
                if existing:
                    raise ValidationError("This email address is already in use by another account.")
            user.email = new_email

        # Update CustomerProfile fields
        for k, v in update_dict.items():
            if k in ("full_name", "email"):
                continue
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

    async def change_password(
        self,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> None:
        from app.core.security import get_password_hash, verify_password

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User not found.")

        if user.password_hash:
            if not verify_password(current_password, user.password_hash):
                raise ValidationError("Current password is incorrect.")

        if len(new_password) < 6:
            raise ValidationError("New password must be at least 6 characters long.")

        if user.password_hash and verify_password(new_password, user.password_hash):
            raise ValidationError("New password cannot be the same as your current password.")

        user.password_hash = get_password_hash(new_password)
        self.db.commit()

