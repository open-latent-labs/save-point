from __future__ import annotations

import re
import unicodedata

QUALITY_THRESHOLD = 0.4

# 텍스트 추출 품질 점수 계산 (0.0 = 판독 불가, 1.0 = 양호)
def score_text(
    text: str,
    image_ratio: float = 0.0,
    block_count: int | None = None,
) -> float:

    # 텍스트 블록이 없으면 이미지 전용 페이지
    if block_count is not None and block_count == 0:
        return 0.0

    if not text or not text.strip():
        return 0.0

    stripped = text.strip()

    if len(stripped) < 5:
        return 0.05

    # 문자 품질: 알파벳·숫자·공백 비율 (특수문자·제어문자 많으면 낮아짐)
    good_chars = sum(
        1 for c in stripped
        if unicodedata.category(c)[0] in ("L", "N") or c in (" ", "\n", "\t")
    )
    char_score = good_chars / len(stripped)

    # 단어 품질: 한글 2음절 이상 / 영어 3자 이상 / 숫자
    words = re.findall(r"[가-힣]{2,}|[a-zA-Z]{3,}|\d+", stripped)
    word_score = min(len(words) / 15, 1.0)

    # 기본 점수 (텍스트 품질)
    base = 0.6 * char_score + 0.4 * word_score

    # 이미지 비율 패널티: 50% 초과부터 감점 시작, 최솟값 0.1
    # ex) image_ratio=0.8 → img_factor=0.7, image_ratio=1.0 → img_factor=max(0.1, 0.5)
    img_factor = max(0.1, 1.0 - max(0.0, image_ratio - 0.5))

    # 블록 수 가중치: 블록이 적으면 최대 20% 추가 감점
    # ex) block_count=1 → 0.84, block_count=5+ → 1.0
    if block_count is not None:
        block_weight = min(block_count / 5, 1.0)
        score = base * img_factor * (0.8 + 0.2 * block_weight)
    else:
        score = base * img_factor

    return round(min(score, 1.0), 3)
