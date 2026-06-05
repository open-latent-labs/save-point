# TODO: 챗봇 LLM 프롬프트 템플릿 작성

CHAT_PROMPT_TEMPLATE = """
"""


def build_chat_prompt(query: str, context_chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    return CHAT_PROMPT_TEMPLATE.format(context=context, query=query)
