from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str


class SignupResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
