from app.schemas.application import (
    NomineeCreate,
    NomineeUpdate,
    NomineeResponse,
)

# Request aliases for API route compatibility
NomineeCreateRequest = NomineeCreate
NomineeUpdateRequest = NomineeUpdate

__all__ = [
    "NomineeCreate",
    "NomineeUpdate",
    "NomineeResponse",
    "NomineeCreateRequest",
    "NomineeUpdateRequest",
]

