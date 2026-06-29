"""OCR 품질 판정 단위 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/ocr/quality.py (순수 함수라 mock 불필요한 모범 단위 테스트)

점수 분리 구조:
  - text_readability : 텍스트가 판독 가능한가 (글자 수프/깨짐 탐지, ISRI 가비지 규칙 기반)
  - needs_ocr        : 이 페이지를 OCR로 (재)추출해야 하는가 (판독성 + 이미지 커버리지)
  - is_layout_important : 그림 비중으로 레이아웃 보존 중요 문서인지 추정 (surya 선택용)
  - aggregate_confidence : 엔진 라인별 confidence 의 글자 수 가중 평균
"""
import pytest

from app.services.ocr.quality import (
    READABILITY_THRESHOLD,
    _is_garbage,
    aggregate_confidence,
    is_blank_page,
    is_layout_important,
    needs_ocr,
    text_readability,
)

pytestmark = pytest.mark.unit


# ── 빈 페이지: 텍스트도 이미지도 없으면 True ────────────────────────────────
def test_is_blank_page_no_text_no_image_returns_true():
    """텍스트가 없고 이미지 비율도 임계 미만이면 빈 페이지로 본다."""
    assert is_blank_page("   ", image_ratio=0.0) is True


# ── 빈 페이지 아님: 이미지가 있으면 False ───────────────────────────────────
def test_is_blank_page_has_image_returns_false():
    """텍스트가 없어도 이미지 비율이 임계 이상이면 빈 페이지가 아니다."""
    assert is_blank_page("", image_ratio=0.5) is False


# ── 판독성: 빈 텍스트는 0.0 ─────────────────────────────────────────────────
def test_text_readability_empty_text_returns_zero():
    """빈 텍스트의 판독성 점수는 0.0 이다."""
    assert text_readability("") == 0.0


# ── 판독성: 정상 영어 본문은 높은 점수 ──────────────────────────────────────
def test_text_readability_normal_english_scores_high():
    """사전 단어가 다수인 정상 영어 텍스트는 임계값을 넉넉히 넘는다."""
    text = "The system extracts text from each page of the document"
    assert text_readability(text) >= READABILITY_THRESHOLD


# ── 판독성: ISRI 가비지(자음덩어리·반복문자)가 다수면 낮은 점수 ─────────────
def test_text_readability_garbled_extraction_scores_low():
    """6자 이상 자음 연속 등 ISRI 가비지 토큰이 다수면 임계값 미만으로 깎인다."""
    text = "bcdfghj klmnpqr stvwxyz mnbvcxz"
    assert text_readability(text) < READABILITY_THRESHOLD


# ── 판독성: 사전에 없는 전문용어만 있어도 구조가 정상이면 유지 ──────────────
def test_text_readability_technical_no_dict_words_stays_high():
    """전문용어·API 식별자만 있어도(사전 미적중) 구조가 정상이면 판독성을 유지한다.

    유니티 공식문서처럼 일반 영단어가 적은 기술 문서가 불필요하게 OCR로 넘어가던
    문제를 막기 위한 회귀 테스트.
    """
    text = "GameObject transform Rigidbody Collider MonoBehaviour Coroutine"
    assert text_readability(text) >= READABILITY_THRESHOLD


# ── 판독성: 특수문자·깨짐 기호가 많으면 낮은 점수 ───────────────────────────
def test_text_readability_mojibake_scores_low():
    """글자가 거의 없는 특수문자 덩어리는 판독성이 낮다."""
    assert text_readability("@#$%^&*()_+ ~~~ ===") < READABILITY_THRESHOLD


# ── 판독성: 짧지만 정상인 제목은 깎이지 않는다 (하드 컷오프 제거 회귀 방지) ──
def test_text_readability_short_valid_title_not_cliffed():
    """예전엔 5자 미만이 0.05로 강제 하락했다 — 짧은 정상 제목이 임계값을 넘어야 한다."""
    assert text_readability("Introduction") >= READABILITY_THRESHOLD
    assert text_readability("AI Overview") >= READABILITY_THRESHOLD


# ── ISRI 가비지 9규칙: 정상 단어·약어는 가비지가 아니다 ─────────────────────
@pytest.mark.parametrize("token", ["Introduction", "OCR", "data", "revenue", "Table", "system"])
def test_is_garbage_real_words_are_false(token):
    assert _is_garbage(token) is False


# ── ISRI 가비지 9규칙: 각 규칙이 깨진 토큰을 잡아낸다 ────────────────────────
@pytest.mark.parametrize("token", [
    "a" * 21,     # (1) 21자 이상
    "ballooon",   # (2) 같은 문자 3연속
    "aeiou",      # (3) 모음 4연속 이상
    "zxcvbnm",    # (4) 자음 6연속
    "tHE",        # (6) 소문자 1개 + 대문자가 더 많음
    "tHe",        # (7) 대문자 있고 소문자로 시작·끝
    "a#@b",       # (9) 첫/끝 제외 서로 다른 비영숫자 2종
])
def test_is_garbage_broken_tokens_are_true(token):
    assert _is_garbage(token) is True


# ── needs_ocr: 빈 페이지는 OCR 불필요 ───────────────────────────────────────
def test_needs_ocr_blank_page_is_false():
    assert needs_ocr("", image_ratio=0.0, block_count=0) is False


# ── needs_ocr: 텍스트 블록 없는 이미지 전용 페이지는 OCR 필요 ───────────────
def test_needs_ocr_image_only_page_is_true():
    assert needs_ocr("", image_ratio=0.8, block_count=0) is True


# ── needs_ocr: 판독 불가 텍스트는 OCR 필요 ──────────────────────────────────
def test_needs_ocr_unreadable_text_is_true():
    assert needs_ocr("bcdfghj klmnpqr stvwxyz mnbvcxz", image_ratio=0.1, block_count=5) is True


# ── needs_ocr: 정상 텍스트 + 낮은 이미지 비율은 OCR 불필요 ──────────────────
def test_needs_ocr_good_text_low_image_is_false():
    text = "The quarterly report summary covers revenue and other data"
    assert needs_ocr(text, image_ratio=0.1, block_count=5) is False


# ── needs_ocr: 정상 텍스트라도 이미지가 페이지 대부분을 덮으면 OCR 필요 ─────
def test_needs_ocr_good_text_high_image_is_true():
    text = "The quarterly report summary covers revenue and other data"
    assert needs_ocr(text, image_ratio=0.9, block_count=2) is True


# ── confidence 집계: 글자 수 가중 평균 ──────────────────────────────────────
def test_aggregate_confidence_length_weighted():
    """짧은 저신뢰 라인보다 긴 고신뢰 라인이 더 큰 가중치를 받는다."""
    confidences = [0.99, 0.20]
    texts = ["a long and confident recognized line of text", "x"]
    result = aggregate_confidence(confidences, texts)
    # 단순 평균(0.595)보다 긴 라인 쪽으로 크게 치우친다
    assert result > 0.95


# ── confidence 집계: texts 없으면 균등 가중 평균 ────────────────────────────
def test_aggregate_confidence_uniform_without_texts():
    """texts 가 없으면 라인별 가중 없이 단순 평균을 낸다."""
    assert aggregate_confidence([0.8, 0.6]) == 0.7


# ── confidence 집계: 빈 입력은 0.0 ──────────────────────────────────────────
def test_aggregate_confidence_empty_returns_zero():
    assert aggregate_confidence([], None) == 0.0


# ── 레이아웃 중요도: 그림 중심 페이지가 상당수면 True ───────────────────────
def test_is_layout_important_figure_heavy_is_true():
    """그림 비중이 큰 페이지가 문서의 상당 비율이면 레이아웃 중요로 본다."""
    # 4페이지 중 2페이지(50%)가 그림 중심 → 임계 공유율(30%) 초과
    assert is_layout_important([0.6, 0.5, 0.05, 0.0]) is True


# ── 레이아웃 중요도: 텍스트 위주 문서는 False ───────────────────────────────
def test_is_layout_important_text_heavy_is_false():
    assert is_layout_important([0.05, 0.0, 0.1, 0.02]) is False


# ── 레이아웃 중요도: 빈 입력은 False ────────────────────────────────────────
def test_is_layout_important_empty_is_false():
    assert is_layout_important([]) is False
