import csv
import io
import re
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User, UserRole
from app.core.security import get_password_hash


def sanitize_phone(phone: str, employee_id: str) -> str:
    """Ensure an 11-digit Bangladeshi mobile number or generate fallback for employees."""
    clean = re.sub(r"[^\d]", "", phone or "")
    if clean.startswith("880") and len(clean) == 13:
        clean = clean[2:]
    if len(clean) == 11 and clean.startswith("01"):
        return clean

    # Fallback generation for employees without phone numbers
    # Format: 01300 + last 6 digits of employee id or padded
    emp_digits = re.sub(r"[^\d]", "", employee_id or "999999")
    suffix = emp_digits[-6:].zfill(6)
    return f"01300{suffix}"


def import_sales_team_csv(db: Session, csv_content: str) -> Dict[str, Any]:
    """
    Parse Sales Team CSV and insert or update users with role='sales'.
    Expected columns: S.L, Name, Employee ID, Username, Email, Phone Number, Designation
    """
    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)

    # Normalize headers
    field_map = {}
    if reader.fieldnames:
        for fn in reader.fieldnames:
            clean_fn = fn.strip().lower().replace(".", "").replace(" ", "_")
            field_map[clean_fn] = fn

    created_count = 0
    updated_count = 0
    errors: List[str] = []
    processed_users: List[Dict[str, Any]] = []

    for row_idx, raw_row in enumerate(reader, start=1):
        try:
            # Map values with loose matching
            row = {k.strip().lower().replace(".", "").replace(" ", "_"): v for k, v in raw_row.items() if k}

            name = (
                row.get("name")
                or raw_row.get("Name")
                or raw_row.get("Employee Name")
                or ""
            ).strip()
            if not name:
                continue

            emp_id = (
                row.get("employee_id")
                or raw_row.get("Employee ID")
                or row.get("empid")
                or ""
            ).strip()

            username = (
                row.get("username")
                or raw_row.get("Username")
                or (name.lower().replace(" ", ".") if name else "")
            ).strip().lower()

            email = (
                row.get("email")
                or raw_row.get("Email")
                or ""
            ).strip().lower() or None

            raw_phone = (
                row.get("phone_number")
                or raw_row.get("Phone Number")
                or row.get("mobile")
                or row.get("phone")
                or ""
            ).strip()

            designation = (
                row.get("designation")
                or raw_row.get("Designation")
                or "Sales Executive"
            ).strip()

            phone = sanitize_phone(raw_phone, emp_id)

            # Check if user already exists by phone, email, employee_id, or username
            user = None
            if emp_id:
                user = db.query(User).filter(User.employee_id == emp_id).first()
            if not user and phone:
                user = db.query(User).filter(User.mobile == phone).first()
            if not user and email:
                user = db.query(User).filter(User.email == email).first()
            if not user and username:
                user = db.query(User).filter(User.username == username).first()

            if user:
                # Update info
                user.full_name = name
                user.role = UserRole.sales
                if emp_id:
                    user.employee_id = emp_id
                if designation:
                    user.designation = designation
                if username and not user.username:
                    user.username = username
                if email and not user.email:
                    user.email = email
                updated_count += 1
            else:
                default_password = f"Sunset@{emp_id[-4:]}" if len(emp_id) >= 4 else "Sunset@123"
                user = User(
                    full_name=name,
                    mobile=phone,
                    email=email,
                    username=username or None,
                    employee_id=emp_id or None,
                    designation=designation or "Sales Executive",
                    role=UserRole.sales,
                    is_active=True,
                    is_verified=True,
                    password_hash=get_password_hash(default_password),
                )
                db.add(user)
                created_count += 1

            db.flush()
            processed_users.append({
                "name": name,
                "employee_id": emp_id,
                "phone": phone,
                "designation": designation,
                "email": email,
            })
        except Exception as e:
            errors.append(f"Row {row_idx} ({raw_row.get('Name', 'Unknown')}): {str(e)}")

    db.commit()
    return {
        "success": True,
        "total_rows": created_count + updated_count + len(errors),
        "created": created_count,
        "updated": updated_count,
        "errors": errors,
        "processed": processed_users,
    }
