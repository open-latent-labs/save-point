"""요약/분류 단위 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/summary_service.py, app/llm/summary_prompt.py

※ summary_service의 정상/폴백 케이스는 레퍼런스 샘플(test_reference_sample.py)에
   이미 시연돼 있으니, 여기서는 재시도·프롬프트 등 추가 케이스를 다룬다.
"""
import json

import httpx
import pytest

from app.llm.summary_prompt import build_summary_prompt
from app.models.enums import Category
from app.services.summary_service import summarize_and_classify

pytestmark = pytest.mark.unit


# ── 재시도: 첫 응답이 깨졌다가 두 번째에 정상 JSON이면 파싱 성공 ────────────
async def test_summarize_and_classify_retries_then_succeeds(mock_ollama_generate, sample_doc_text):
    """첫 호출은 깨진 JSON, 다음 호출은 정상 JSON이면 정상 결과를 돌려준다."""
    # Arrange: respx 라우트를 등록한 뒤 응답 시퀀스(1차 실패 → 2차 성공)를 side_effect로 지정
    route = mock_ollama_generate("ignored")
    route.side_effect = [
        httpx.Response(200, json={"response": "broken json {{{"}),
        httpx.Response(
            200,
            json={"response": json.dumps({"category": "UI", "summary_ko": "UI 요약"})},
        ),
    ]

    # Act: 한 번 재시도하면 두 번째(정상) 응답을 받는다
    result = await summarize_and_classify(sample_doc_text, max_retries=1)

    # Assert
    assert result["category"] == Category.UI


# ── 프롬프트: 입력 텍스트가 프롬프트에 포함된다 ─────────────────────────────
def test_build_summary_prompt_includes_input_text():
    """build_summary_prompt 결과 문자열에 원문 텍스트가 들어간다."""
    # Arrange
    text = "Rendering pipeline overview"

    # Act / Assert
    assert text in build_summary_prompt(text)
