# from fastapi import APIRouter

# router = APIRouter(prefix="/chat", tags=["chat"])

# # TODO: SSE 스트리밍 챗봇 엔드포인트 구현

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.chat_service import stream_answer

router = APIRouter(prefix="/api/v1")

class ChatRequest(BaseModel):
    question: str
    user_id: str

@router.post("/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        stream_answer(req.question, req.user_id),
        media_type="text/event-stream"
    )