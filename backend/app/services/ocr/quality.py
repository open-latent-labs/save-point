from __future__ import annotations

import string
import unicodedata

# ── 임계값 ──────────────────────────────────────────────────────────────────
# 네이티브 텍스트 판독성이 이 값 미만이면 깨짐/판독 불가로 보고 OCR 재추출
READABILITY_THRESHOLD = 0.4

# 텍스트가 판독 가능해도 이미지가 페이지의 이 비율 이상을 덮으면
# 그림 속 텍스트를 놓쳤을 수 있으므로 OCR 수행
IMAGE_COVERAGE_THRESHOLD = 0.5

# 페이지의 이 비율 이상을 그림이 덮으면 '그림 중심 페이지'로 본다
LAYOUT_HEAVY_IMAGE_RATIO = 0.3
# 그림 중심 페이지가 문서 전체의 이 비율 이상이면 레이아웃 보존이 중요한 문서로 본다
LAYOUT_HEAVY_PAGE_SHARE = 0.3

# 이미지 비율이 이 값 미만이면 이미지가 없는 것으로 간주
BLANK_IMAGE_RATIO = 0.01

# ── 사전 기반 유효단어 판정 자료 (영어 문서 대상) ────────────────────────────
# 전수 사전이 아니라 "정상 영어 문서라면 몇 개는 반드시 걸리는" 고빈도 닻(anchor).
# 깨진 글자 수프에는 거의 걸리지 않으므로 판독성의 핵심 신호가 된다.
_COMMON_EN = {
    "the", "of", "and", "to", "a", "in", "is", "that", "for", "it", "as",
    "with", "be", "on", "by", "at", "this", "or", "an", "are", "from", "but",
    "not", "you", "we", "can", "all", "has", "have", "will", "one", "was",
    "if", "they", "their", "there", "which", "more", "when", "use", "using",
    "each", "other", "than", "then", "these", "such", "data", "page", "over",
    "figure", "table", "section", "example", "result", "method", "into",
}

_VOWELS = set("aeiouAEIOU")


# ── 빈 페이지 ────────────────────────────────────────────────────────────────
# 텍스트도 이미지도 없는 빈 페이지 여부 (OCR 불필요)
def is_blank_page(text: str, image_ratio: float = 0.0) -> bool:
    return (not text or not text.strip()) and image_ratio < BLANK_IMAGE_RATIO


# ── 판독성(text_readability) ─────────────────────────────────────────────────
def _is_garbage(token: str) -> bool:
    """ISRI/UNLV(Taghva 등)와 Kulp & April 의 'garbage token' 9규칙.

    공백으로 나뉜 토큰 하나가 아래 중 하나라도 해당하면 깨진 토큰으로 본다.
    임계값·가중치가 없는 count 기반 규칙이라 별도 튜닝이 불필요하다.
    """
    n = len(token)
    if n == 0:
        return False

    # (1) 21자 이상
    if n >= 21:
        return True

    # (2) 같은 문자 3연속
    for i in range(n - 2):
        if token[i] == token[i + 1] == token[i + 2]:
            return True

    # (3) 모음 4연속 / (4) 자음 6연속 (알파벳에 한해)
    vowel_run = consonant_run = 0
    for c in token:
        if c.isalpha():
            if c in _VOWELS:
                vowel_run, consonant_run = vowel_run + 1, 0
            else:
                vowel_run, consonant_run = 0, consonant_run + 1
            if vowel_run >= 4 or consonant_run >= 6:
                return True
        else:
            vowel_run = consonant_run = 0

    # (5) 모음·자음 개수 비가 8배 초과 (둘 다 1개 이상일 때)
    vowels = sum(1 for c in token if c in _VOWELS)
    consonants = sum(1 for c in token if c.isalpha() and c not in _VOWELS)
    if vowels and consonants and (vowels > 8 * consonants or consonants > 8 * vowels):
        return True

    # (6) 소문자가 1개 이상인데 대문자가 더 많음
    lower = sum(1 for c in token if c.islower())
    upper = sum(1 for c in token if c.isupper())
    if lower >= 1 and upper > lower:
        return True

    # (7) 대문자가 1개 이상이면서 소문자로 시작하고 소문자로 끝남
    if upper >= 1 and token[0].islower() and token[-1].islower():
        return True

    # (8) 영숫자가 1개 이상인데 비영숫자가 더 많음
    alnum = sum(1 for c in token if c.isalnum())
    if alnum >= 1 and (n - alnum) > alnum:
        return True

    # (9) 첫/끝 문자를 제외하고 서로 다른 비영숫자가 2종 이상
    if n > 2 and len({c for c in token[1:-1] if not c.isalnum()}) >= 2:
        return True

    return False


def _word_validity(token: str) -> float:
    """단어 하나의 유효도. 1.0=사전 적중, 0.0=ISRI 가비지, 0.5=그 외(그럴듯)."""
    if token.strip(string.punctuation).lower() in _COMMON_EN:
        return 1.0
    if _is_garbage(token):
        return 0.0
    return 0.5


def text_readability(text: str) -> float:
    """추출된 텍스트가 사람이 읽을 수 있는 정상 텍스트인지 0.0~1.0 으로 평가.

    OCR confidence 와 별개로 '글자 수프/깨짐'을 잡아내는 신호.
    이미지 비율·블록 수와는 무관하게 순수하게 텍스트 품질만 본다.
    """
    if not text or not text.strip():
        return 0.0

    stripped = text.strip()

    # 1) 문자 품질: 글자·숫자·공백 비율 (특수문자·제어문자·깨짐 기호 많으면 낮아짐)
    good_chars = sum(
        1 for c in stripped
        if unicodedata.category(c)[0] in ("L", "N") or c in (" ", "\n", "\t")
    )
    char_score = good_chars / len(stripped)

    # 2) 사전 기반 유효단어 비율 (공백 단위 토큰 — ISRI 규칙이 대소문자·기호까지 본다)
    tokens = stripped.split()
    if tokens:
        validities = [_word_validity(t) for t in tokens]
        word_score = sum(validities) / len(tokens)
        dict_hits = sum(1 for v in validities if v >= 1.0)
    else:
        word_score = 0.0
        dict_hits = 0

    readability = 0.4 * char_score + 0.6 * word_score

    # 사전 적중이 전혀 없는 다토큰 텍스트는 키보드 난타/깨짐으로 간주해 상한 제한
    if dict_hits == 0 and len(tokens) >= 4:
        readability = min(readability, 0.3)

    return round(min(readability, 1.0), 3)


# ── OCR 필요 여부(needs_ocr) ─────────────────────────────────────────────────
def needs_ocr(
    text: str,
    image_ratio: float = 0.0,
    block_count: int | None = None,
) -> bool:
    """이 페이지를 OCR로 (재)추출해야 하는지 판정.

    판독성(텍스트가 깨졌나)과 이미지 커버리지(그림 속 텍스트를 놓쳤나)를
    별개 신호로 보고 OR 결합한다 — 하나의 혼합 점수로 뭉뚱그리지 않는다.
    """
    if is_blank_page(text, image_ratio):
        return False
    # 텍스트 블록이 없는 이미지 전용 페이지
    if block_count is not None and block_count == 0:
        return True
    # 네이티브 텍스트가 판독 불가 → OCR로 재추출
    if text_readability(text) < READABILITY_THRESHOLD:
        return True
    # 텍스트는 멀쩡하나 그림이 페이지 대부분을 덮으면 그림 속 텍스트 가능성
    if image_ratio >= IMAGE_COVERAGE_THRESHOLD:
        return True
    return False


# ── 레이아웃 중요도(is_layout_important) ─────────────────────────────────────
def is_layout_important(image_ratios: list[float]) -> bool:
    # pdf 는 문단마다 블록이 잡혀서 block_count를 보조 신호로 쓰기에는 노이즈가 크니 image_ratio 만으로 판단
    if not image_ratios:
        return False
    heavy_pages = sum(1 for r in image_ratios if r >= LAYOUT_HEAVY_IMAGE_RATIO)
    return heavy_pages / len(image_ratios) >= LAYOUT_HEAVY_PAGE_SHARE


# ── OCR confidence 집계 ──────────────────────────────────────────────────────
def aggregate_confidence(
    confidences: list[float],
    texts: list[str] | None = None,
) -> float:
    """엔진의 라인별 인식 confidence를 글자 수 가중 평균으로 집계.

    1글자 아티팩트 라인과 긴 본문 라인이 같은 가중치를 받으면 왜곡되므로,
    각 라인의 글자 수로 가중한다.
    """
    if not confidences:
        return 0.0
    if texts is not None and len(texts) == len(confidences):
        weights = [max(len(t.strip()), 1) for t in texts]
    else:
        weights = [1] * len(confidences)
    total = sum(weights)
    weighted = sum(c * w for c, w in zip(confidences, weights))
    return round(weighted / total, 3)
