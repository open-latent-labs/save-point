from loguru import logger
from app.llm.ollama_client import generate_rewrite

_REWRITE_PROMPT = """
다음 대화 내용과 현재 질문을 보고, 벡터 검색에 사용할 독립적인 검색 쿼리를 생성하세요.

규칙:
- 검색 쿼리 텍스트만 출력하고, 설명이나 부연은 절대 쓰지 마세요.
- 이전 대화의 맥락(지시 대명사, 생략된 주어 등)을 파악해 구체적인 용어로 채워 넣으세요.
- 기술 용어와 영어 식별자는 그대로 유지하세요."""


async def rewrite_query(question: str, chat_history: list[dict]) -> str:
    # 최근 2턴(user+assistant 각 1개)
    history_text = "\n".join(f"{msg['role']}: {msg['content']}" for msg in chat_history[-4:])
    prompt = f"""
{_REWRITE_PROMPT}

[이전 대화]
{history_text}

[현재 질문]
{question}

[검색 쿼리]"""

    try:
        rewritten = (await generate_rewrite(prompt)).strip()
        if rewritten:
            logger.info(f"[쿼리 리라이팅] '{question}' → '{rewritten}'")
            return rewritten
    except Exception as e:
        logger.warning(f"[쿼리 리라이팅 실패] 원본 쿼리 사용: {e}")

    return question
