"""
Export endpoints – CSV and Excel downloads for applications, customers, payments, and team metrics.
"""

from datetime import date, datetime
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.user import User
from app.schemas.export import ExportFilters
from app.services.export_service import ExportService

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_roles(["admin", "cr", "subadmin"]))])


@router.get(
    "/applications/csv",
    summary="Export applications as CSV",
)
async def export_applications_csv(
    business_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    application_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    assigned_cr_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "cr", "subadmin"])),
):
    """Download applications CSV with role-based field filtering."""
    filters = ExportFilters(
        business_id=business_id,
        date_from=date_from or start_date,
        date_to=date_to or end_date,
        application_status=application_status or status,
        payment_status=payment_status,
        assigned_cr_id=assigned_cr_id,
        search=search,
    )
    service = ExportService(db)
    csv_bytes = service.export_applications_csv(filters, current_user)
    filename = f"applications_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/applications/xlsx",
    summary="Export applications as formatted Excel (XLSX)",
)
@router.get(
    "/applications/excel",
    summary="Export applications as formatted Excel (XLSX) - alias",
    include_in_schema=False,
)
async def export_applications_xlsx(
    business_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    application_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    assigned_cr_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "cr", "subadmin"])),
):
    """Download professionally formatted Excel workbook."""
    filters = ExportFilters(
        business_id=business_id,
        date_from=date_from or start_date,
        date_to=date_to or end_date,
        application_status=application_status or status,
        payment_status=payment_status,
        assigned_cr_id=assigned_cr_id,
        search=search,
    )
        date_to=date_to,
        application_status=application_status,
        payment_status=payment_status,
        assigned_cr_id=assigned_cr_id,
        search=search,
    )
    service = ExportService(db)
    xlsx_bytes = service.export_applications_xlsx(filters, current_user)
    filename = f"applications_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/customers/xlsx",
    summary="Export customer directory as Excel (Admin only)",
)
async def export_customers_xlsx(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "subadmin"])),
):
    """Download customer master list Excel workbook."""
    filters = ExportFilters(search=search)
    service = ExportService(db)
    xlsx_bytes = service.export_customers_xlsx(filters, current_user)
    filename = f"customers_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/payments/xlsx",
    summary="Export payment ledger as Excel (Admin only)",
)
async def export_payments_xlsx(
    business_id: Optional[int] = Query(None),
    payment_status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "subadmin"])),
):
    """Download payment ledger Excel with automated sum totals row."""
    filters = ExportFilters(
        business_id=business_id,
        payment_status=payment_status,
        date_from=date_from,
        date_to=date_to,
    )
    service = ExportService(db)
    xlsx_bytes = service.export_payments_xlsx(filters, current_user)
    filename = f"payment_ledger_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/cr-performance/xlsx",
    summary="Export CR officer performance report as Excel (Admin only)",
)
async def export_cr_performance_xlsx(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "subadmin"])),
):
    """Download team throughput and SLA metrics."""
    filters = ExportFilters()
    service = ExportService(db)
    xlsx_bytes = service.export_cr_performance_xlsx(filters, current_user)
    filename = f"cr_performance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

