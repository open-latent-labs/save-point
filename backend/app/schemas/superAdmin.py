from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import UserRole, UserBan


class ChangeRoleRequest(BaseModel):
    id: str
    role: str


class ChangeBanRequest(BaseModel):
    id: str
    ban: str

class UserListQuery(BaseModel):
    page: int
    size: int = 8
    role: str = ""
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    user_id: str
    role: UserRole
    ban: UserBan
    upload_file_count: int
    ask_count: int
    img_url: str | None = None
    created_at: datetime
    updated_at: datetime
    last_active_at: datetime | None = None


class UserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    users: list[UserResponse]
