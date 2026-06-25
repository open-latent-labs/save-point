"""요약/분류 단위 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/summary_service.py, app/llm/summary_prompt.py

※ summary_service의 정상/폴백 케이스는 레퍼런스 샘플(test_reference_sample.py)에
   이미 시연돼 있으니, 여기서는 재시도·프롬프트 등 추가 케이스를 다룬다.
"""
import json

import pytest

pytestmark = pytest.mark.unit


# ── 재시도: 첫 응답이 깨졌다가 두 번째에 정상 JSON이면 파싱 성공 ────────────
async def test_summarize_and_classify_retries_then_succeeds(mock_ollama_generate, sample_doc_text):
    """첫 호출은 깨진 JSON, 다음 호출은 정상 JSON이면 정상 결과를 돌려준다."""
    pytest.skip("TODO(B): 구현 — respx side_effect로 1차 실패→2차 성공 시퀀스 구성")
    # from app.services.summary_service import summarize_and_classify
    # from app.models.enums import Category
    # # Arrange: 응답을 ["bad json", '{"category":"UI","summary_ko":"..."}'] 순서로
    # # Act: result = await summarize_and_classify(sample_doc_text, max_retries=1)
    # # Assert: assert result["category"] == Category.UI


# ── 프롬프트: 입력 텍스트가 프롬프트에 포함된다 ─────────────────────────────
def test_build_summary_prompt_includes_input_text():
    """build_summary_prompt 결과 문자열에 원문 텍스트가 들어간다."""
    pytest.skip("TODO(B): 구현")
    # from app.llm.summary_prompt import build_summary_prompt
    # text = "Rendering pipeline overview"
    # assert text in build_summary_prompt(text)
