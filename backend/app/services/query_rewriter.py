from loguru import logger
from app.llm.ollama_client import generate_rewrite

_REWRITE_PROMPT = """
다음은 사용자와 어시스턴트의 이전 대화와, 사용자의 새로운 질문입니다.
새 질문을 벡터 검색에 사용할 수 있는 완전한 문장 형태의 독립적인 질문으로 바꿔주세요.

규칙:
- 반드시 완전한 문장(질문) 형태로 출력하세요. 단어나 식별자만 나열하지 마세요.
- 백틱(`), 마크다운, 쉼표로 구분된 목록 형식을 쓰지 마세요.
- 이전 대화에서 생략된 주어/목적어(지시 대명사 등)를 구체적인 명사로 채워 넣으세요.
- 사용자가 원하는 행동(설명, 비교, 요약, 이유 등)을 질문 안에 그대로 유지하세요.
- 기술 용어와 영어 식별자는 번역하지 말고 문장 안에 자연스럽게 포함시키세요.
- 설명이나 부연 없이, 재작성된 질문 문장만 출력하세요.

예시 1)
이전 대화: "user: vec2가 뭐야? / assistant: vec2는 2차원 벡터 타입입니다. 예시 코드는 ..."
새 질문: "아까 예시 코드 보여준거 자세하게 설명해줘"
검색 쿼리: vec2 타입 예시 코드에 대해 자세히 설명해줘

예시 2)
새 질문: "vec2타입의 변수가 뭐야?"
검색 쿼리: vec2 타입의 변수가 무엇인지 설명해줘
"""


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
