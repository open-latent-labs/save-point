# from typing import AsyncGenerator
# from qdrant_client import AsyncQdrantClient

# # TODO: RAG 검색 후 LLM 스트리밍 응답 구현

# async def stream_chat_response(
#     client: AsyncQdrantClient,
#     query: str,
#     top_k: int = 5,
# ) -> AsyncGenerator[str, None]:
#     pass

import json
from app.pipelines.query_pipeline import query
from app.llm.ollama_client import generate_stream

async def stream_answer(question: str, user_id: str):
    result = await query(question, user_id)

    # query에서 관련 문서를 찾지 못해 prompt가 None으로 넘어온 경우.
    if not result["prompt"]:
        yield "data: 관련 문서를 찾을 수 없습니다.\n\n"
        yield "data: [DONE]\n\n"
        return
    
    async for token in generate_stream(result["prompt"]):
        yield f"data: {token}\n\n"

    yield f"data: [SOURCES]{json.dumps(result['sources'], ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"