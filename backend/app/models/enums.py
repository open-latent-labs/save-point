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
    FAILED = "FAILED"


class DocumentAccess(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class Category(str, enum.Enum):
    SCRIPTING = "SCRIPTING"
    RENDERING = "RENDERING"
    EDITOR = "EDITOR"
    PHYSICS = "PHYSICS"
    MATH = "MATH"
    UI = "UI"
    XR = "XR"
    ANIMATION = "ANIMATION"
    INPUT = "INPUT"
    PERFORMANCE = "PERFORMANCE"
    AUDIO = "AUDIO"
    NETWORKING = "NETWORKING"
    OTHER = "OTHER"


class OcrStatus(str, enum.Enum):
    PENDING = "PENDING"
    DONE = "DONE"
    FAILED = "FAILED"


class OcrEngine(str, enum.Enum):
    NATIVE = "NATIVE"
    PADDLE = "PADDLE"
    SURYA = "SURYA"


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
