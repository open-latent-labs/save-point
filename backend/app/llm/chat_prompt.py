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