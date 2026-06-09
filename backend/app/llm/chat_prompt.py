# # TODO: 챗봇 LLM 프롬프트 템플릿 작성

# CHAT_PROMPT_TEMPLATE = """
# """


# def build_chat_prompt(query: str, context_chunks: list[str]) -> str:
#     context = "\n\n---\n\n".join(context_chunks)
#     return CHAT_PROMPT_TEMPLATE.format(context=context, query=query)

def build_prompt(question: str, context_chunks: list[dict]) -> str:
    context = "\n\n".join([c["chunk_text"] for c in context_chunks])

    return f"""
                # ROLE
                - 당신은 ...

                [참고 문서]
                {context}

                [질문]
                {question}

                [답변]"""