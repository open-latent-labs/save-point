from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    user_id: str
    email: EmailStr
    password: str


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


TokenResponse.model_rebuild()
