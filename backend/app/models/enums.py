import enum


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class UserBan(str, enum.Enum):
    BAN = "BAN"
    UNBAN = "UNBAN"


class DocumentStatus(str, enum.Enum):
    INITIAL = "INITIAL"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DocumentAccess(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class DocMainType(str, enum.Enum):
    ENGINE_REFERENCE = "ENGINE_REFERENCE"
    POSTMORTEM = "POSTMORTEM"
    BUG_ANALYSIS = "BUG_ANALYSIS"
    ARCHITECTURE = "ARCHITECTURE"
    TUTORIAL = "TUTORIAL"
    OTHER = "OTHER"


class DocSubType(str, enum.Enum):
    UNITY = "UNITY"
    UNREAL = "UNREAL"
    GODOT = "GODOT"
    CUSTOM = "CUSTOM"
    AUTOMATION = "AUTOMATION"
    OTHER = "OTHER"


class OcrStatus(str, enum.Enum):
    PENDING = "PENDING"
    DONE = "DONE"
    FAILED = "FAILED"


class OcrEngine(str, enum.Enum):
    PADDLE = "PADDLE"
    EASYOCR = "EASYOCR"
    TESSERACT = "TESSERACT"


class JobType(str, enum.Enum):
    OCR = "OCR"
    CLASSIFY_SUMMARIZE = "CLASSIFY_SUMMARIZE"
    EMBED = "EMBED"


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class ApprovalAction(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ChatRole(str, enum.Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"


class NotificationType(str, enum.Enum):
    ROLE_PROMOTED = "ROLE_PROMOTED"
    ROLE_DEMOTED = "ROLE_DEMOTED"
    DOCUMENT_APPROVED = "DOCUMENT_APPROVED"
    DOCUMENT_REJECTED = "DOCUMENT_REJECTED"
