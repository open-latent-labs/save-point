from pydantic import BaseModel

# TODO: 요청/응답 스키마 작성
class ChatRequest(BaseModel):
    query: str
