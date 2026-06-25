"""OCR 파이프라인 통합 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/ocr/pipline.py (run_ocr) 또는 extractor

외부 의존성: tests/fixtures/ 의 샘플 PDF를 실제로 처리.
(무거운 엔진은 환경에 따라 skip 조건을 둘 수 있음)
"""
import pytest

pytestmark = pytest.mark.integration


# ── 샘플 PDF를 처리하면 텍스트가 추출된다 ───────────────────────────────────
async def test_run_ocr_sample_pdf_extracts_text():
    """fixtures의 샘플 PDF를 run_ocr에 넣으면 비어있지 않은 텍스트가 나온다."""
    pytest.skip("TODO(B): 구현 — tests/fixtures/sample.pdf 추가 후 활성화")
    # from app.services.ocr.pipline import run_ocr
    # # Arrange: file_bytes = (FIXTURES_DIR / "sample.pdf").read_bytes()
    # # Act: result = await run_ocr(file_bytes, ".pdf")
    # # Assert: assert result.pages and any(p.text.strip() for p in result.pages)
