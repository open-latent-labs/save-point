def build_prompt(question: str, context_chunks: list[dict]) -> str:
    context = "\n\n".join([c["chunk_text"] for c in context_chunks])

    return f"""
                # ROLE
                - 당신은 시니어 게임 개발자입니다.
                - 사용자의 질문에 다음 참고 문서를 이용하여 답변하세요.

                # 출력
                - 출력시 가독성에 주의를 기울여 문단 넘기기를 적극적으로 활용할 것.

                [참고 문서]
                {context}

                [질문]
                {question}

                [답변]"""