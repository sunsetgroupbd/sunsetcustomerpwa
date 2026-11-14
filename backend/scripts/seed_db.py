"""
Seed script: creates default businesses, pricing, terms, demo users for every role,
and rich demo applications across multiple states.
Idempotent - safe to run multiple times.

Usage:
    python -m scripts.seed_db
"""
import os
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.business import Business
from app.models.user import User, UserRole
from app.models.customer import CustomerProfile
from app.models.pricing import PricingConfiguration
from app.models.terms import TermsAndConditions
from app.models.application import (
    Application,
    ApplicationStatus,
    PaymentStatus,
    ApplicantInfo,
    Nominee,
    BankDetail,
    OwnershipDetail,
    PaymentDetail,
    ApplicationRemark,
    ApplicationStatusHistory,
)
from app.core.security import get_password_hash


BUSINESSES = [
    {
        "name": "Sunset Kuakata Hotel & Resort",
        "code": "SKH",
        "description": "Luxury seaside hospitality suites & beachfront ownership at Kuakata Beach.",
    },
    {
        "name": "Dhaka Fantasy Island",
        "code": "DFI",
        "description": "Premier amusement theme park & family entertainment resort in Dhaka.",
    },
    {
        "name": "Sun Care Hospital & Diagnostic Centre",
        "code": "SCH",
        "description": "State-of-the-art multi-specialty healthcare, pathology, and diagnostic services.",
    },
    {
        "name": "Super Combo",
        "code": "SPC",
        "description": "Integrated multi-division commercial privileges and shared ownership bundle.",
    },
]

USERS_SEED = [
    {
        "mobile": "01700000000",
        "full_name": "System Administrator",
        "role": UserRole.admin,
        "password": "Admin@123",
        "email": "admin@sunsetgroup.com",
    },
    {
        "mobile": "01800000000",
        "full_name": "Tanvir Ahmed (CR Officer)",
        "role": UserRole.cr,
        "password": "Cr@123456",
        "email": "tanvir.cr@sunsetgroup.com",
    },
    {
        "mobile": "01811111111",
        "full_name": "Farzana Yasmin (CR Officer)",
        "role": UserRole.cr,
        "password": "Cr@123456",
        "email": "farzana.cr@sunsetgroup.com",
    },
    {
        "mobile": "01900000000",
        "full_name": "Mohammad Rahim",
        "role": UserRole.customer,
        "password": "Customer@123",
        "email": "rahim@example.com",
        "address": "House 12, Road 4, Sector 7, Uttara",
        "district": "Dhaka",
    },
    {
        "mobile": "01911111111",
        "full_name": "Nusrat Jahan",
        "role": UserRole.customer,
        "password": "Customer@123",
        "email": "nusrat@example.com",
        "address": "Apartment 5B, Gulshan Avenue",
        "district": "Dhaka",
    },
    {
        "mobile": "01922222222",
        "full_name": "Tariqul Islam",
        "role": UserRole.customer,
        "password": "Customer@123",
        "email": "tariqul@example.com",
        "address": "Agrabad C/A, Chattogram",
        "district": "Chattogram",
    },
]


def seed_businesses(db: Session) -> dict[str, Business]:
    print("\n--- 1. Seeding Businesses ---")
    biz_map = {}
    for biz_data in BUSINESSES:
        biz = db.query(Business).filter(Business.code == biz_data["code"]).first()
        if not biz:
            biz = Business(**biz_data)
            db.add(biz)
            db.flush()
            print(f"  [CREATED] Business: {biz.code} - {biz.name}")
        else:
            print(f"  [EXISTS]  Business: {biz.code}")
        biz_map[biz.code] = biz
    db.commit()
    return biz_map


def seed_users(db: Session) -> dict[str, User]:
    print("\n--- 2. Seeding Users for Every Role ---")
    user_map = {}
    for u_data in USERS_SEED:
        user = db.query(User).filter(User.mobile == u_data["mobile"]).first()
        if not user:
            pw_hash = get_password_hash(u_data["password"])
            user = User(
                mobile=u_data["mobile"],
                full_name=u_data["full_name"],
                role=u_data["role"],
                email=u_data.get("email"),
                is_verified=True,
                is_active=True,
                password_hash=pw_hash,
            )
            db.add(user)
            db.flush()

            # Create customer profile if role is customer
            if u_data["role"] == UserRole.customer:
                profile = CustomerProfile(
                    user_id=user.id,
                    address=u_data.get("address"),
                    district=u_data.get("district"),
                    division="Dhaka",
                    preferred_language="en",
                )
                db.add(profile)

            print(f"  [CREATED] User: {user.mobile} ({user.role.value}) -> {user.full_name}")
        else:
            print(f"  [EXISTS]  User: {user.mobile} ({user.role.value}) -> {user.full_name}")
        user_map[user.mobile] = user
    db.commit()
    return user_map


def seed_pricing_and_terms(db: Session, businesses: dict[str, Business], admin: User) -> None:
    print("\n--- 3. Seeding Package Pricing & Terms ---")
    packages_data = [
        ("Bronze", Decimal("250000.00")),
        ("Silver", Decimal("500000.00")),
        ("Gold", Decimal("1000000.00")),
        ("Platinum", Decimal("2000000.00")),
    ]

    for code, biz in businesses.items():
        # Packages
        for pkg_name, price in packages_data:
            existing = (
                db.query(PricingConfiguration)
                .filter(
                    PricingConfiguration.business_id == biz.id,
                    PricingConfiguration.package_name == pkg_name,
                )
                .first()
            )
            if not existing:
                cfg = PricingConfiguration(
                    business_id=biz.id,
                    package_name=pkg_name,
                    price=price,
                    effective_from=date(2026, 1, 1),
                    is_active=True,
                    created_by_id=admin.id,
                )
                db.add(cfg)

        # Terms and conditions
        terms = db.query(TermsAndConditions).filter(TermsAndConditions.business_id == biz.id).first()
        if not terms:
            t = TermsAndConditions(
                business_id=biz.id,
                version="1.0",
                content=(
                    f"Terms and Conditions for {biz.name}:\n\n"
                    "1. Ownership Rights: Ownership is granted via registered sub-kabala deed upon completion of all installment payments.\n"
                    "2. Dividends: Annual/quarterly dividend yields are distributed according to verified shareholding percentages.\n"
                    "3. Transferability: Shares and deed titles may be transferred or willed to legal nominees.\n"
                    "4. Termination & Refunds: Any cancellation will follow standard Sunset Group corporate policy.\n"
                ),
                is_active=True,
                created_by_id=admin.id,
            )
            db.add(t)

    db.commit()
    print("  [OK] Packages & Terms seeded for all 4 divisions.")


def seed_applications(
    db: Session,
    businesses: dict[str, Business],
    users: dict[str, User],
) -> None:
    print("\n--- 4. Seeding Demo Applications Across Different States ---")

    admin = users["01700000000"]
    cr1 = users["01800000000"]
    cr2 = users["01811111111"]
    cust1 = users["01900000000"]
    cust2 = users["01911111111"]
    cust3 = users["01922222222"]

    demo_apps = [
        {
            "app_num": "SKH-2026-00001",
            "customer": cust1,
            "business": businesses["SKH"],
            "status": ApplicationStatus.UNDER_REVIEW,
            "payment_status": PaymentStatus.PARTIAL,
            "assigned_cr": cr1,
            "package": "Gold",
            "units": 1,
            "unit_price": Decimal("1000000.00"),
            "discount": Decimal("50000.00"),
            "total_price": Decimal("950000.00"),
            "words": "Nine Lac Fifty Thousand Taka Only",
            "token": Decimal("50000.00"),
            "booking": Decimal("150000.00"),
            "installments": 24,
            "inst_amount": Decimal("31250.00"),
            "dues": Decimal("750000.00"),
            "applicant": {
                "full_name_en": "Mohammad Rahim",
                "full_name_bn": "মোহাম্মদ রহিম",
                "father_name": "Abdul Karim",
                "mother_name": "Rahima Khatun",
                "spouse_name": "Salma Begum",
                "present_address": "House 12, Road 4, Sector 7, Uttara, Dhaka",
                "permanent_address": "Village: Shampur, Thana: Sonaimuri, Noakhali",
                "mobile_number": "01900000000",
                "date_of_birth": date(1985, 4, 15),
                "nationality": "Bangladeshi",
                "religion": "Islam",
                "nid_number": "19852691234567890",
                "tin_number": "4589234123",
                "personal_email": "rahim@example.com",
                "company_name": "Rahim Commercial Trading Ltd.",
                "designation": "Managing Director",
                "office_address": "Motijheel C/A, Dhaka",
            },
            "nominee": {
                "nominee_number": 1,
                "name": "Salma Begum",
                "father_or_husband_name": "Mohammad Rahim",
                "relationship": "Spouse / Wife",
                "cell_number": "01911223344",
                "nid_or_passport": "19882691234567891",
                "date_of_birth": date(1988, 8, 20),
            },
            "bank": {
                "account_name": "Mohammad Rahim",
                "account_number": "115.120.984521",
                "bank_name": "Dutch-Bangla Bank PLC",
                "branch": "Uttara Branch, Dhaka",
            },
            "remarks": [
                (cr1.id, "Initial documents received. NID verification in progress.", "internal"),
                (cr1.id, "Applicant contacted via phone. Scheduled deed signing for next week.", "all"),
            ],
        },
        {
            "app_num": "DFI-2026-00002",
            "customer": cust1,
            "business": businesses["DFI"],
            "status": ApplicationStatus.APPROVED,
            "payment_status": PaymentStatus.PAID,
            "assigned_cr": cr1,
            "package": "Silver",
            "units": 2,
            "unit_price": Decimal("400000.00"),
            "discount": Decimal("0.00"),
            "total_price": Decimal("800000.00"),
            "words": "Eight Lac Taka Only",
            "token": Decimal("100000.00"),
            "booking": Decimal("700000.00"),
            "installments": 1,
            "inst_amount": Decimal("0.00"),
            "dues": Decimal("0.00"),
            "applicant": {
                "full_name_en": "Mohammad Rahim",
                "full_name_bn": "মোহাম্মদ রহিম",
                "father_name": "Abdul Karim",
                "mother_name": "Rahima Khatun",
                "spouse_name": "Salma Begum",
                "present_address": "House 12, Road 4, Sector 7, Uttara, Dhaka",
                "permanent_address": "Village: Shampur, Thana: Sonaimuri, Noakhali",
                "mobile_number": "01900000000",
                "date_of_birth": date(1985, 4, 15),
                "nationality": "Bangladeshi",
                "religion": "Islam",
                "nid_number": "19852691234567890",
            },
            "nominee": {
                "nominee_number": 1,
                "name": "Salma Begum",
                "relationship": "Wife",
                "cell_number": "01911223344",
                "nid_or_passport": "19882691234567891",
            },
            "bank": {
                "account_name": "Mohammad Rahim",
                "account_number": "115.120.984521",
                "bank_name": "Dutch-Bangla Bank PLC",
                "branch": "Uttara Branch",
            },
            "remarks": [
                (cr1.id, "All payments verified. Deed generated and ownership certificate issued.", "all"),
            ],
        },
        {
            "app_num": "SCH-2026-00003",
            "customer": cust2,
            "business": businesses["SCH"],
            "status": ApplicationStatus.DOCUMENTS_REQUIRED,
            "payment_status": PaymentStatus.PENDING,
            "assigned_cr": cr2,
            "package": "Bronze",
            "units": 1,
            "unit_price": Decimal("300000.00"),
            "discount": Decimal("0.00"),
            "total_price": Decimal("300000.00"),
            "words": "Three Lac Taka Only",
            "token": Decimal("30000.00"),
            "booking": Decimal("70000.00"),
            "installments": 12,
            "inst_amount": Decimal("16666.00"),
            "dues": Decimal("200000.00"),
            "applicant": {
                "full_name_en": "Nusrat Jahan",
                "full_name_bn": "নুসরাত জাহান",
                "father_name": "Dr. Kamrul Hasan",
                "mother_name": "Shamsun Nahar",
                "present_address": "Apartment 5B, Gulshan Avenue, Dhaka",
                "permanent_address": "Munshiganj Sadar, Munshiganj",
                "mobile_number": "01911111111",
                "date_of_birth": date(1992, 11, 8),
                "nationality": "Bangladeshi",
                "nid_number": "19922695556677889",
                "company_name": "Apex Pharma",
                "designation": "Clinical Research Associate",
            },
            "nominee": {
                "nominee_number": 1,
                "name": "Dr. Kamrul Hasan",
                "relationship": "Father",
                "cell_number": "01722334455",
                "nid_or_passport": "19602691122334455",
            },
            "bank": {
                "account_name": "Nusrat Jahan",
                "account_number": "20501140201994",
                "bank_name": "Islami Bank Bangladesh PLC",
                "branch": "Gulshan Branch",
            },
            "remarks": [
                (cr2.id, "Nominee NID scan was blurry. Requested a clearer digital upload from customer.", "all"),
            ],
        },
        {
            "app_num": "SPC-2026-00004",
            "customer": cust3,
            "business": businesses["SPC"],
            "status": ApplicationStatus.SUBMITTED,
            "payment_status": PaymentStatus.PENDING,
            "assigned_cr": cr1,
            "package": "Platinum",
            "units": 1,
            "unit_price": Decimal("4000000.00"),
            "discount": Decimal("200000.00"),
            "total_price": Decimal("3800000.00"),
            "words": "Thirty Eight Lac Taka Only",
            "token": Decimal("200000.00"),
            "booking": Decimal("600000.00"),
            "installments": 36,
            "inst_amount": Decimal("83333.00"),
            "dues": Decimal("3000000.00"),
            "applicant": {
                "full_name_en": "Tariqul Islam",
                "father_name": "Sirajul Islam",
                "mother_name": "Rokeya Begum",
                "present_address": "Agrabad C/A, Chattogram",
                "permanent_address": "Feni Sadar, Feni",
                "mobile_number": "01922222222",
                "date_of_birth": date(1980, 2, 25),
                "nationality": "Bangladeshi",
                "nid_number": "19802693344556677",
                "company_name": "Bay Global Logistics",
                "designation": "Director",
            },
            "nominee": {
                "nominee_number": 1,
                "name": "Rokeya Begum",
                "relationship": "Mother",
                "cell_number": "01811223344",
                "nid_or_passport": "19582697788990011",
            },
            "bank": {
                "account_name": "Tariqul Islam",
                "account_number": "104.110.556677",
                "bank_name": "BRAC Bank PLC",
                "branch": "Agrabad Branch, Chattogram",
            },
            "remarks": [],
        },
        {
            "app_num": "SKH-2026-00005",
            "customer": cust3,
            "business": businesses["SKH"],
            "status": ApplicationStatus.DRAFT,
            "payment_status": PaymentStatus.PENDING,
            "assigned_cr": None,
            "package": "Silver",
            "units": 1,
            "unit_price": Decimal("500000.00"),
            "discount": Decimal("0.00"),
            "total_price": Decimal("500000.00"),
            "words": "Five Lac Taka Only",
            "token": Decimal("50000.00"),
            "booking": Decimal("0.00"),
            "installments": 12,
            "inst_amount": Decimal("37500.00"),
            "dues": Decimal("450000.00"),
            "applicant": {
                "full_name_en": "Tariqul Islam",
                "mobile_number": "01922222222",
            },
            "nominee": None,
            "bank": None,
            "remarks": [],
        },
    ]

    for data in demo_apps:
        existing = db.query(Application).filter(Application.application_number == data["app_num"]).first()
        if existing:
            print(f"  [EXISTS]  Application: {data['app_num']}")
            continue

        app = Application(
            application_number=data["app_num"],
            customer_id=data["customer"].id,
            business_id=data["business"].id,
            application_date=date(2026, 2, 1),
            application_status=data["status"],
            payment_status=data["payment_status"],
            assigned_cr_id=data["assigned_cr"].id if data["assigned_cr"] else None,
            declaration_accepted=True,
            submitted_at=datetime.now(timezone.utc) - timedelta(days=5),
        )
        db.add(app)
        db.flush()

        # 1. Applicant info
        if data.get("applicant"):
            ai = ApplicantInfo(
                application_id=app.id,
                **data["applicant"],
            )
            db.add(ai)

        # 2. Nominee
        if data.get("nominee"):
            nom = Nominee(
                application_id=app.id,
                **data["nominee"],
            )
            db.add(nom)

        # 3. Bank
        if data.get("bank"):
            bd = BankDetail(
                application_id=app.id,
                **data["bank"],
            )
            db.add(bd)

        # 4. Ownership
        od = OwnershipDetail(
            application_id=app.id,
            package=data["package"],
            number_of_ownership=data["units"],
            price_per_ownership=data["unit_price"],
            discount=data["discount"],
            total_price=data["total_price"],
            amount_in_words=data["words"],
        )
        db.add(od)

        # 5. Payment Detail
        pd = PaymentDetail(
            application_id=app.id,
            token_money=data["token"],
            booking_money=data["booking"],
            installment_type="monthly",
            number_of_installments=data["installments"],
            installment_amount=data["inst_amount"],
            dues_amount=data["dues"],
        )
        db.add(pd)

        # 6. Remarks
        for user_id, remark_text, vis in data.get("remarks", []):
            rem = ApplicationRemark(
                application_id=app.id,
                user_id=user_id,
                remark=remark_text,
                visibility=vis,
            )
            db.add(rem)

        # 7. Status history
        hist = ApplicationStatusHistory(
            application_id=app.id,
            previous_status=ApplicationStatus.DRAFT,
            new_status=data["status"],
            changed_by_id=admin.id,
            reason=f"Application moved to {data['status'].value}",
        )
        db.add(hist)

        print(f"  [CREATED] Application: {app.application_number} ({data['business'].code}) -> {data['status'].value}")

    db.commit()


def run_seed() -> None:
    print("=" * 60)
    print("  SUNSET GROUP — COMPLETE DEMO & ROLE SEEDER")
    print("=" * 60)

    # Ensure all tables exist
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("✓ Verified database tables.")

    db: Session = SessionLocal()
    try:
        businesses = seed_businesses(db)
        users = seed_users(db)
        admin = users["01700000000"]
        seed_pricing_and_terms(db, businesses, admin)
        seed_applications(db, businesses, users)
    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {exc}")
        raise
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("  SEEDING COMPLETE! ALL ROLES READY FOR LOGIN:")
    print("=" * 60)
    print("  ADMIN:     Mobile: 01700000000   Password: Admin@123")
    print("  CR TEAM:   Mobile: 01800000000   Password: Cr@123456")
    print("  CR TEAM 2: Mobile: 01811111111   Password: Cr@123456")
    print("  CUSTOMER:  Mobile: 01900000000   Password: Customer@123")
    print("  CUSTOMER 2:Mobile: 01911111111   Password: Customer@123")
    print("  CUSTOMER 3:Mobile: 01922222222   Password: Customer@123")
    print("=" * 60)


if __name__ == "__main__":
    run_seed()
