"""initial_tables

Revision ID: 0001_initial_tables
Revises: 
Create Date: 2026-11-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_tables'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('mobile', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='customer'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_mobile'), 'users', ['mobile'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. refresh_tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('device_info', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_refresh_tokens_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_refresh_tokens')),
    )
    op.create_index(op.f('ix_refresh_tokens_id'), 'refresh_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)

    # 3. otp_verifications
    op.create_table(
        'otp_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('mobile', sa.String(length=20), nullable=False),
        sa.Column('otp_hash', sa.String(length=255), nullable=False),
        sa.Column('purpose', sa.String(length=50), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_otp_verifications_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_otp_verifications')),
    )
    op.create_index(op.f('ix_otp_verifications_id'), 'otp_verifications', ['id'], unique=False)
    op.create_index(op.f('ix_otp_verifications_mobile'), 'otp_verifications', ['mobile'], unique=False)

    # 4. login_attempts
    op.create_table(
        'login_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mobile', sa.String(length=20), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('attempted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_login_attempts')),
    )
    op.create_index(op.f('ix_login_attempts_id'), 'login_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_login_attempts_mobile'), 'login_attempts', ['mobile'], unique=False)

    # 5. businesses
    op.create_table(
        'businesses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_businesses')),
    )
    op.create_index(op.f('ix_businesses_id'), 'businesses', ['id'], unique=False)
    op.create_index(op.f('ix_businesses_code'), 'businesses', ['code'], unique=True)

    # 6. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=True),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('file_key', sa.String(length=500), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('verification_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('verified_by_id', sa.Integer(), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], name=op.f('fk_documents_uploaded_by_id_users'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['verified_by_id'], ['users.id'], name=op.f('fk_documents_verified_by_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_documents')),
    )
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_index(op.f('ix_documents_file_key'), 'documents', ['file_key'], unique=True)

    # 7. customer_profiles
    op.create_table(
        'customer_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_photo_id', sa.Integer(), nullable=True),
        sa.Column('preferred_language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('division', sa.String(length=100), nullable=True),
        sa.Column('post_code', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['profile_photo_id'], ['documents.id'], name=op.f('fk_customer_profiles_profile_photo_id_documents'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_customer_profiles_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_customer_profiles')),
        sa.UniqueConstraint('user_id', name=op.f('uq_customer_profiles_user_id')),
    )
    op.create_index(op.f('ix_customer_profiles_id'), 'customer_profiles', ['id'], unique=False)

    # 8. applications
    op.create_table(
        'applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_number', sa.String(length=50), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('application_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('application_status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('payment_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('assigned_cr_id', sa.Integer(), nullable=True),
        sa.Column('declaration_accepted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_cr_id'], ['users.id'], name=op.f('fk_applications_assigned_cr_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], name=op.f('fk_applications_business_id_businesses'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], name=op.f('fk_applications_customer_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_applications')),
    )
    op.create_index(op.f('ix_applications_id'), 'applications', ['id'], unique=False)
    op.create_index(op.f('ix_applications_application_number'), 'applications', ['application_number'], unique=True)
    op.create_index(op.f('ix_applications_customer_id'), 'applications', ['customer_id'], unique=False)
    op.create_index(op.f('ix_applications_business_id'), 'applications', ['business_id'], unique=False)

    # Add FK from documents to applications now that applications table exists
    op.create_foreign_key(
        op.f('fk_documents_application_id_applications'),
        'documents', 'applications',
        ['application_id'], ['id'],
        ondelete='CASCADE'
    )

    # 9. applicant_infos
    op.create_table(
        'applicant_infos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('full_name_en', sa.String(length=255), nullable=True),
        sa.Column('full_name_bn', sa.String(length=255), nullable=True),
        sa.Column('father_name', sa.String(length=255), nullable=True),
        sa.Column('mother_name', sa.String(length=255), nullable=True),
        sa.Column('spouse_name', sa.String(length=255), nullable=True),
        sa.Column('present_address', sa.Text(), nullable=True),
        sa.Column('permanent_address', sa.Text(), nullable=True),
        sa.Column('mobile_number', sa.String(length=20), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('nationality', sa.String(length=100), nullable=True, server_default='Bangladeshi'),
        sa.Column('religion', sa.String(length=100), nullable=True),
        sa.Column('nid_number', sa.String(length=50), nullable=True),
        sa.Column('passport_number', sa.String(length=50), nullable=True),
        sa.Column('tin_number', sa.String(length=50), nullable=True),
        sa.Column('personal_email', sa.String(length=255), nullable=True),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('office_address', sa.Text(), nullable=True),
        sa.Column('designation', sa.String(length=255), nullable=True),
        sa.Column('cell_number', sa.String(length=20), nullable=True),
        sa.Column('photograph_file_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_applicant_infos_application_id_applications'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['photograph_file_id'], ['documents.id'], name=op.f('fk_applicant_infos_photograph_file_id_documents'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_applicant_infos')),
        sa.UniqueConstraint('application_id', name=op.f('uq_applicant_infos_application_id')),
    )
    op.create_index(op.f('ix_applicant_infos_id'), 'applicant_infos', ['id'], unique=False)

    # 10. nominees
    op.create_table(
        'nominees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('nominee_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('father_or_husband_name', sa.String(length=255), nullable=True),
        sa.Column('nid_or_passport', sa.String(length=50), nullable=True),
        sa.Column('cell_number', sa.String(length=20), nullable=True),
        sa.Column('relationship', sa.String(length=100), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('photograph_file_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_nominees_application_id_applications'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['photograph_file_id'], ['documents.id'], name=op.f('fk_nominees_photograph_file_id_documents'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_nominees')),
        sa.UniqueConstraint('application_id', 'nominee_number', name='uq_nominees_app_number'),
    )
    op.create_index(op.f('ix_nominees_id'), 'nominees', ['id'], unique=False)

    # 11. bank_details
    op.create_table(
        'bank_details',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=True),
        sa.Column('account_number', sa.String(length=100), nullable=True),
        sa.Column('bank_name', sa.String(length=255), nullable=True),
        sa.Column('branch', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_bank_details_application_id_applications'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_bank_details')),
        sa.UniqueConstraint('application_id', name=op.f('uq_bank_details_application_id')),
    )
    op.create_index(op.f('ix_bank_details_id'), 'bank_details', ['id'], unique=False)

    # 12. ownership_details
    op.create_table(
        'ownership_details',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('package', sa.String(length=255), nullable=True),
        sa.Column('number_of_ownership', sa.Integer(), nullable=True),
        sa.Column('price_per_ownership', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('discount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('total_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('amount_in_words', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_ownership_details_application_id_applications'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_ownership_details')),
        sa.UniqueConstraint('application_id', name=op.f('uq_ownership_details_application_id')),
    )
    op.create_index(op.f('ix_ownership_details_id'), 'ownership_details', ['id'], unique=False)

    # 13. payment_details
    op.create_table(
        'payment_details',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('token_money', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('booking_money', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('booking_money_date', sa.Date(), nullable=True),
        sa.Column('installment_type', sa.String(length=100), nullable=True),
        sa.Column('number_of_installments', sa.Integer(), nullable=True),
        sa.Column('installment_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('installment_starting_date', sa.Date(), nullable=True),
        sa.Column('dues_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_payment_details_application_id_applications'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_payment_details')),
        sa.UniqueConstraint('application_id', name=op.f('uq_payment_details_application_id')),
    )
    op.create_index(op.f('ix_payment_details_id'), 'payment_details', ['id'], unique=False)

    # 14. application_remarks
    op.create_table(
        'application_remarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('remark', sa.Text(), nullable=False),
        sa.Column('visibility', sa.String(length=50), nullable=False, server_default='internal'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_application_remarks_application_id_applications'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_application_remarks_user_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_application_remarks')),
    )
    op.create_index(op.f('ix_application_remarks_id'), 'application_remarks', ['id'], unique=False)

    # 15. application_status_histories
    op.create_table(
        'application_status_histories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('previous_status', sa.String(length=50), nullable=True),
        sa.Column('new_status', sa.String(length=50), nullable=False),
        sa.Column('changed_by_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_application_status_histories_application_id_applications'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], name=op.f('fk_application_status_histories_changed_by_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_application_status_histories')),
    )
    op.create_index(op.f('ix_application_status_histories_id'), 'application_status_histories', ['id'], unique=False)

    # 16. cr_assignments
    op.create_table(
        'cr_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('cr_user_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], name=op.f('fk_cr_assignments_application_id_applications'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], name=op.f('fk_cr_assignments_assigned_by_id_users'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['cr_user_id'], ['users.id'], name=op.f('fk_cr_assignments_cr_user_id_users'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_cr_assignments')),
    )
    op.create_index(op.f('ix_cr_assignments_id'), 'cr_assignments', ['id'], unique=False)

    # 17. pricing_configurations
    op.create_table(
        'pricing_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('package_name', sa.String(length=255), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], name=op.f('fk_pricing_configurations_business_id_businesses'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_pricing_configurations_created_by_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_pricing_configurations')),
    )
    op.create_index(op.f('ix_pricing_configurations_id'), 'pricing_configurations', ['id'], unique=False)

    # 18. terms_and_conditions
    op.create_table(
        'terms_and_conditions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], name=op.f('fk_terms_and_conditions_business_id_businesses'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_terms_and_conditions_created_by_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_terms_and_conditions')),
        sa.UniqueConstraint('business_id', 'version', name='uq_terms_business_version'),
    )
    op.create_index(op.f('ix_terms_and_conditions_id'), 'terms_and_conditions', ['id'], unique=False)

    # 19. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_audit_logs_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs')),
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('terms_and_conditions')
    op.drop_table('pricing_configurations')
    op.drop_table('cr_assignments')
    op.drop_table('application_status_histories')
    op.drop_table('application_remarks')
    op.drop_table('payment_details')
    op.drop_table('ownership_details')
    op.drop_table('bank_details')
    op.drop_table('nominees')
    op.drop_table('applicant_infos')
    op.drop_constraint(op.f('fk_documents_application_id_applications'), 'documents', type_='foreignkey')
    op.drop_table('applications')
    op.drop_table('customer_profiles')
    op.drop_table('documents')
    op.drop_table('businesses')
    op.drop_table('login_attempts')
    op.drop_table('otp_verifications')
    op.drop_table('refresh_tokens')
    op.drop_table('users')

