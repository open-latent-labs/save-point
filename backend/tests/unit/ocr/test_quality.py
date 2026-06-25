"""OCR 품질 판정 단위 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/ocr/quality.py (순수 함수라 mock 불필요한 모범 단위 테스트)
"""
import pytest

pytestmark = pytest.mark.unit


# ── 빈 페이지: 텍스트도 이미지도 없으면 True ────────────────────────────────
def test_is_blank_page_no_text_no_image_returns_true():
    """텍스트가 없고 이미지 비율도 임계 미만이면 빈 페이지로 본다."""
    pytest.skip("TODO(B): 구현")
    # from app.services.ocr.quality import is_blank_page
    # # Arrange / Act
    # result = is_blank_page("   ", image_ratio=0.0)
    # # Assert
    # assert result is True


# ── 빈 페이지 아님: 이미지가 있으면 False ───────────────────────────────────
def test_is_blank_page_has_image_returns_false():
    """텍스트가 없어도 이미지 비율이 임계 이상이면 빈 페이지가 아니다."""
    pytest.skip("TODO(B): 구현")
    # from app.services.ocr.quality import is_blank_page
    # assert is_blank_page("", image_ratio=0.5) is False


# ── 점수: 빈 텍스트는 0.0 ───────────────────────────────────────────────────
def test_score_text_empty_text_returns_zero():
    """빈 텍스트의 품질 점수는 0.0 이다."""
    pytest.skip("TODO(B): 구현")
    # from app.services.ocr.quality import score_text
    # assert score_text("") == 0.0
