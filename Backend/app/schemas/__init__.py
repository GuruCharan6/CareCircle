from app.schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    RefreshTokenRequest,
    UserResponse,
)
from app.schemas.calendar import (
    CalendarEventConfirm,
    CalendarEventCreate,
    CalendarEventListItem,
    CalendarEventResponse,
    CalendarEventUpdate,
)
from app.schemas.caregiver import (
    CaregiverCreate,
    CaregiverRemoveResponse,
    CaregiverResponse,
    CaregiverUpdate,
)
from app.schemas.chatbot import (
    ChatActionConfirm,
    ChatRequest,
    ChatResponse,
    ChatSource,
    SuggestedPrompt,
)
from app.schemas.common import ErrorResponse, PaginatedResponse, SuccessResponse
from app.schemas.crisis import (
    CrisisAccessLog,
    CrisisEmergencyContact,
    CrisisLastCardiacEvent,
    CrisisMedicationItem,
    CrisisNearestEmergency,
    CrisisPacketResponse,
)
from app.schemas.digest import (
    DigestPreferencesUpdate,
    DigestRefillAlert,
    DigestResponse,
    DigestUpcomingEvent,
)
from app.schemas.document import (
    DocumentApproveRequest,
    DocumentListItem,
    DocumentRejectRequest,
    DocumentResponse,
    SignedUploadURLRequest,
    SignedUploadURLResponse,
)
from app.schemas.drug_interaction import (
    DrugInteractionResponse,
    DrugInteractionSummary,
    InteractionCheckRequest,
)
from app.schemas.lab_result import LabResultCreate, LabResultResponse, LabTrendItem
from app.schemas.medication import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
    RefillDaysRequest,
)
from app.schemas.notification import (
    MarkReadRequest,
    NotificationResponse,
    UnreadCountResponse,
)
from app.schemas.observation import ObservationCreate, ObservationResponse
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.schemas.patient_state import PatientStateResponse, StalenessIndicator
from app.schemas.prescriber import PrescriberCreate, PrescriberResponse, PrescriberUpdate
from app.schemas.refill import (
    RefillConfirmRequest,
    RefillCreate,
    RefillResponse,
    RefillStatusResponse,
)

__all__ = [
    # common
    "PaginatedResponse",
    "ErrorResponse",
    "SuccessResponse",
    # auth
    "OTPSendRequest",
    "OTPVerifyRequest",
    "GoogleAuthRequest",
    "RefreshTokenRequest",
    "AuthResponse",
    "OTPSendResponse",
    "UserResponse",
    # patient
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    # document
    "SignedUploadURLRequest",
    "SignedUploadURLResponse",
    "DocumentApproveRequest",
    "DocumentRejectRequest",
    "DocumentResponse",
    "DocumentListItem",
    # medication
    "MedicationCreate",
    "MedicationUpdate",
    "MedicationResponse",
    "RefillDaysRequest",
    # lab_result
    "LabResultCreate",
    "LabResultResponse",
    "LabTrendItem",
    # observation
    "ObservationCreate",
    "ObservationResponse",
    # caregiver
    "CaregiverCreate",
    "CaregiverUpdate",
    "CaregiverResponse",
    "CaregiverRemoveResponse",
    # calendar
    "CalendarEventCreate",
    "CalendarEventUpdate",
    "CalendarEventConfirm",
    "CalendarEventResponse",
    "CalendarEventListItem",
    # refill
    "RefillCreate",
    "RefillConfirmRequest",
    "RefillResponse",
    "RefillStatusResponse",
    # drug_interaction
    "InteractionCheckRequest",
    "DrugInteractionResponse",
    "DrugInteractionSummary",
    # notification
    "NotificationResponse",
    "MarkReadRequest",
    "UnreadCountResponse",
    # digest
    "DigestResponse",
    "DigestUpcomingEvent",
    "DigestRefillAlert",
    "DigestPreferencesUpdate",
    # crisis
    "CrisisPacketResponse",
    "CrisisMedicationItem",
    "CrisisEmergencyContact",
    "CrisisNearestEmergency",
    "CrisisLastCardiacEvent",
    "CrisisAccessLog",
    # chatbot
    "ChatRequest",
    "ChatResponse",
    "ChatSource",
    "ChatActionConfirm",
    "SuggestedPrompt",
    # patient_state
    "PatientStateResponse",
    "StalenessIndicator",
    # prescriber
    "PrescriberCreate",
    "PrescriberUpdate",
    "PrescriberResponse",
]
