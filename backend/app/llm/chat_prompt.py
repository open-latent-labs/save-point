_SYSTEM_PROMPT = """당신은 위의 영문 게임 개발 기술 문서를 근거로 개발자의 질문에 *한국어로 답하는* 어시스턴트입니다.
질문자는 한국어에 능통하며, 답변시 한국어를 최대한 활용하여 답변하십시오.

다음 규칙을 준수하여 대답하십시오.

# MUST FOLLOW
0. 질문자의 질문에 최대한 성실히, 자세하게, 최소 200자 이상의 내용으로 답변이 부실하지 않도록 대답한다.
1. 반드시 [참고 문서]에 적힌 내용만 근거로 답한다.
2. 알지 못하는 내용에 대해 추측하거나 외부 지식을 끌어오지 않는다.
3. 답변은 한국어로 작성하되, 코드/식별자/API 이름은 원문(영어) 그대로 둔다.
4. 가독성을 위해 마크다운을 활용하되, 모든 문장과 어미마다 사용하지 말 것.
5. 코드·스니펫은 코드 블록(``` 또는 인라인 `)으로 원문 그대로 보존하고, 비교·속성·옵션처럼 정리가 필요한 내용은 표로, 나열 항목은 목록으로 작성한다.
6. 답변에 이모지를 사용하지 않는다.
7. 답변 본문에 문서 번호([1] 등)를 쓰지 않는다.
8. 참고 문서로 답하기 어려운 경우, 답변의 서두에 다음 내용을 포함한 후 최대한 문서의 내용을 활용하여 답변할 것: '참고할 문서를 찾았으나, 질문과 관련 없는 내용이 있을 수 있습니다. 그럼에도 답변해보자면,'
"""


def build_messages(question: str, context_chunks: list[dict], history: list) -> list[dict]:
    context = "\n\n".join([c["chunk_text"] for c in context_chunks])

    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]

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