_SYSTEM_PROMPT = """
# ROLE
너는 게임 개발 기술 문서를 근거로 개발자의 질문에 한국어로 답하는 어시스턴트야.
규칙:
1) 반드시 [참고 문서]에 적힌 내용만 근거로 답한다. 추측하거나 외부 지식을 끌어오지 않는다.
2) 답변은 한국어로 작성한다. 코드/식별자/API 이름은 원문(영어) 그대로 둔다.
3) 가독성을 위해 마크다운을 적극 활용한다. 코드·스니펫은 코드 블록(``` 또는 인라인 `)으로 원문 그대로 보존하고,
비교·속성·옵션처럼 정리가 필요한 내용은 표로, 나열 항목은 목록으로 작성한다.
헤더·표·목록은 자유롭게 쓰되 이모지(emoji)는 사용하지 않는다.
다만 단순한 한두 문장 답변에까지 형식을 억지로 넣지는 않는다.
4) 답변 본문에 문서 번호([1] 등)를 쓰지 않는다.
5) 참고 문서로 답할 수 없으면 정확히 다음 문장만 출력한다:
'제공된 문서에서 해당 내용을 찾을 수 없습니다. 질문과 관련하여 참고가 될만한 문서를 찾아서 업로드 해주세요'
"""

_SYSTEM_PROMPT2 = """
    너는 게임 개발 기술 문서를 근거로 개발자의 질문에 한국어로 답하는 어시스턴트야.
    규칙:
    1) 반드시 [참고 문서]에 적힌 내용만 근거로 답한다. 추측하거나 외부 지식을 끌어오지 않는다.
    2) 답변은 한국어로 작성한다. 코드/식별자/API 이름은 원문(영어) 그대로 둔다.
    3) 가독성을 위해 마크다운을 적극 활용한다. 코드·스니펫은 코드 블록(``` 또는 인라인 `)으로 원문 그대로 보존하고, 비교·속성·옵션처럼 정리가 필요한 내용은 표로, 나열 항목은 목록으로 작성한다. 헤더·표·목록은 자유롭게 쓰되 이모지(emoji)는 사용하지 않는다. 다만 단순한 한두 문장 답변에까지 형식을 억지로 넣지는 않는다.
    4) 답변 본문에 문서 번호([1] 등)를 쓰지 않는다.
    5) 참고 문서로 답할 수 없으면 정확히 다음 문장만 출력한다: '제공된 문서에서 해당 내용을 찾을 수 없습니다. 질문과 관련하여 참고가 될만한 문서를 찾아서 업로드 해주세요'
"""


def build_messages(question: str, context_chunks: list[dict], history: list) -> list[dict]:
    context = "\n\n".join([c["chunk_text"] for c in context_chunks])

    messages = [{"role": "system", "content": _SYSTEM_PROMPT2}]

    # 최근 2턴(user + assistant 4개)만 히스토리로 포함 — 토큰 절약
    for msg in history[-(2 * 2):]:
        messages.append({"role": msg.role.value.lower(), "content": msg.content_ko})

    messages.append({
        "role": "user",
        "content": f"[참고 문서]\n{context}\n\n[질문]\n{question}",
    })
    return messages


# 안쓰는데 나중에 바꿀까봐 냅둠
def none_source_build_messages(question: str, history: list) -> list[dict]:
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]

    for msg in history[-(2 * 2):]:
        messages.append({"role": msg.role.value.lower(), "content": msg.content_ko})

    messages.append({"role": "user", "content": question})
    return messages