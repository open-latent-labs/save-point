"""OCR 파이프라인 통합 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/ocr/pipline.py (run_ocr)

외부 의존성: PyMuPDF 로 즉석 생성한 '텍스트 레이어 PDF'를 실제로 처리한다.
텍스트가 선택 가능하므로 파이프라인은 NATIVE 경로를 타고, 무거운 OCR 엔진
(paddle/surya)은 로드되지 않는다. (PDF 빌더는 tests/support/factories.py)
"""
import pytest

from app.schemas.extraction import ExtractionMethod
from app.services.ocr.pipline import run_ocr
from tests.support.factories import make_text_pdf

pytestmark = pytest.mark.integration


@pytest.fixture
def text_pdf_bytes(sample_doc_text) -> bytes:
    """루트 conftest 의 영어 샘플 문장을 텍스트 PDF 바이트로 만든다."""
    return make_text_pdf(sample_doc_text)


# ── 해피패스: 텍스트 PDF 를 처리하면 본문 텍스트가 추출된다 ─────────────────
async def test_run_ocr_text_pdf_extracts_native_text(text_pdf_bytes):
    """run_ocr 에 텍스트 PDF 를 넣으면 비어있지 않은 본문 텍스트가 나온다."""
    # Act
    result = await run_ocr(text_pdf_bytes, ".pdf")

    # Assert: 핵심 한 가지 — 원문 단어가 추출 결과에 들어있다
    assert "Scripting" in result.full_text


# ── 텍스트 PDF 는 OCR 엔진 없이 NATIVE 메서드로 추출된다 ────────────────────
async def test_run_ocr_text_pdf_uses_native_method(text_pdf_bytes):
    """선택 가능한 텍스트라 OCR 폴백 없이 NATIVE 로 추출되어야 한다."""
    # Act
    result = await run_ocr(text_pdf_bytes, ".pdf")

    # Assert
    assert result.pages[0].method is ExtractionMethod.NATIVE


# ── 엣지: 지원하지 않는 확장자는 ValueError ─────────────────────────────────
async def test_run_ocr_unsupported_extension_raises_value_error():
    """.pdf/.pptx 가 아닌 확장자는 ValueError 를 던진다."""
    # Act / Assert
    with pytest.raises(ValueError):
        await run_ocr(b"not a real document", ".txt")
