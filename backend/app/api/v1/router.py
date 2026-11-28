from fastapi import APIRouter
from app.api.v1.endpoints import auth, customers, businesses, applications, admin, exports, notifications, leads

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(businesses.router, prefix="/businesses", tags=["Businesses"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(exports.router, prefix="/exports", tags=["Exports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(leads.router, prefix="/leads", tags=["External Leads"])
