from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    name: str
    user_id: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class SignupResponse(BaseModel):
    id: str
    email: str
    name: str
    user_id: str
    role: str


class LoginRequest(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    # 토큰은 HttpOnly 쿠키로 전달, 응답 바디에는 유저 정보만 포함
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    user_id: str
    role: str
    ask_count: int = 0
    created_at: str = ""


TokenResponse.model_rebuild()


class OAuthAccountInfo(BaseModel):
    provider: str
    email: str | None


class LinkedOAuthResponse(BaseModel):
    accounts: list[OAuthAccountInfo]


class CheckIdentityRequest(BaseModel):
    user_id: str
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    user_id: str
    email: EmailStr
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


class SetPrimaryEmailRequest(BaseModel):
    email: EmailStr
