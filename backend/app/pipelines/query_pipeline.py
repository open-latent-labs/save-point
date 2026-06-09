from app.services.rag_service import search_vectors
from app.llm.chat_prompt import build_prompt
from app.llm.ollama_client import generate

async def query(question: str, user_id: str) -> dict:
    # 질문 -> 질문 임베딩 -> 벡터 검색 -> 검색 결과
    search_results = await search_vectors(question, user_id)
    
    if not search_results:
        return {"prompt": None, "sources": []}

    # 질문+관련문서 -> 프롬포팅
    prompt = build_prompt(question, search_results)

    # 찾은 문서 데이터(출처)
    sources = [
        {
            "document_id": r["document_id"],
            "filename": r["filename"],
            "page_number": r["page_number"],
        }
        for r in search_results
    ]

    return {"prompt": prompt, "sources": sources}