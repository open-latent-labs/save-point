from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.models.enums import Category, DocumentAccess, DocumentStatus


class SortBy(str, Enum):
    LATEST = "latest"
    NAME = "name"
    FILE_SIZE = "file_size"
    BOOKMARKED = "bookmarked"


class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str
    message: str


class ListRequest(BaseModel):
    page: int
    size: int
    sort: SortBy = SortBy.LATEST
    access_type: Optional[DocumentAccess] = None
    status: Optional[DocumentStatus] = None
    category: Optional[Category] = None
    is_bookmarked: Optional[bool] = None

