"""
═══════════════════════════════════════════════════════════════════════════════
 ★ 레퍼런스 테스트 샘플 — 모든 팀원은 이 파일의 스타일을 그대로 복사해서 작성 ★
═══════════════════════════════════════════════════════════════════════════════
 (지우지 말 것. 실제 테스트는 본인 담당 디렉터리 tests/unit/<도메인>/ 에 작성)

 작성 규칙 (요약)
   1) 이름   : test_<무엇>_<조건>_<기대결과>
              예) test_summarize_and_classify_valid_json_returns_parsed_output
   2) 구조   : AAA — Arrange(준비) → Act(실행) → Assert(검증)
   3) 한 테스트 = 한 가지만 검증 (assert 1개 원칙)
   4) async  : @pytest.mark.asyncio 안 붙임 (pyproject asyncio_mode=auto 가 처리)
   5) 외부호출: 실제 Ollama/DB 호출 금지 → respx 등으로 가로채기 (공용 fixture 사용)
   6) 분량   : 담당 파트당 해피패스 1개 + 엣지 1~2개, 총 2~4개면 충분

 이 샘플이 검증하는 대상: app/services/summary_service.py 의 summarize_and_classify
   - LLM(Ollama)이 준 JSON을 파싱해 category/summary_ko 를 돌려준다.
   - JSON이 깨지면 재시도 후 OTHER 로 폴백한다.
"""
import json

import pytest

from app.models.enums import Category
from app.services.summary_service import summarize_and_classify

pytestmark = pytest.mark.unit  # 이 파일의 모든 테스트는 unit 마커


# ── 해피패스: 올바른 JSON 응답 → 그대로 파싱된다 ────────────────────────────
async def test_summarize_and_classify_valid_json_returns_parsed_category(
    mock_ollama_generate, sample_doc_text
):
    # Arrange: LLM이 돌려줄 응답을 결정적으로 고정 (실제 호출 안 함)
    mock_ollama_generate(
        json.dumps({"category": "SCRIPTING", "summary_ko": "스크립팅 API 문서 요약"})
    )

    # Act
    result = await summarize_and_classify(sample_doc_text)

    # Assert: 핵심 한 가지 — 카테고리가 기대대로 파싱됐는가
    assert result["category"] == Category.SCRIPTING


# ── 엣지: 깨진 JSON → 재시도 후 OTHER 로 폴백한다 ───────────────────────────
async def test_summarize_and_classify_invalid_json_falls_back_to_other(
    mock_ollama_generate, sample_doc_text
):
    # Arrange: JSON 파싱이 불가능한 응답
    mock_ollama_generate("this is not json {{{")

    # Act: 재시도 없이 한 번만 시도하도록 max_retries=0
    result = await summarize_and_classify(sample_doc_text, max_retries=0)

    # Assert
    assert result["category"] == Category.OTHER
