from pydantic import BaseModel

# 요청 응답 스키마
class ChatRequest(BaseModel):
    question: str
    user_id: str
    session_id: str
    selected_document_ids: list[str] = []

class SessionCreateRequest(BaseModel):
    user_id: str
    session_name: str = "새 채팅"

class SessionRenameRequest(BaseModel):
    session_name: str