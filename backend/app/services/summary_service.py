import asyncio
import json

from loguru import logger
from pydantic import AliasChoices, BaseModel, Field, ValidationError, field_validator

from app.llm.ollama_client import generate
from app.llm.summary_prompt import build_chunk_prompt, build_reduce_prompt, build_summary_prompt
from app.models.enums import Category

# ── 2차 게이트 임계값 ────────────────────────────────────────────────────────
_CHARS_PER_TOKEN = 3               # 보수적 추정 (한영 혼합: 영어 4, 한국어 2 중간값)
_SINGLE_SHOT_TOKEN_LIMIT = 24_000  # ≤ 24K tokens → single-shot
_CHUNK_TOKENS = 6_000              # Map 단계 청크 크기
_ABSOLUTE_TOKEN_LIMIT = 400_000    # 절대 상한 (초과 시 reject)

_SINGLE_SHOT_NUM_CTX = 32_768      # 2^15 — 24K 텍스트 + 프롬프트 ~4K + 여유
_CHUNK_NUM_CTX = 8_192             # 2^13 — 6K 청크 + 프롬프트 ~2K + 여유
_REDUCE_NUM_CTX = 32_768           # 2^15 — 청크 요약 합산 + 프롬프트

_SINGLE_SHOT_NUM_PREDICT = 2_048   # JSON { category + summary_ko 마크다운 }
_CHUNK_NUM_PREDICT = 512           # 한국어 bullet 3~6개 (num_ctx 8192에서 여유 ~2K뿐)
_REDUCE_NUM_PREDICT = 2_048        # JSON { category + summary_ko 마크다운 }


class SummaryOutput(BaseModel):
    category: Category = Category.OTHER
    summary_ko: str = Field("", validation_alias=AliasChoices("summary_ko", "summary"))

    @field_validator("category", mode="before")
    @classmethod
    def coerce_category(cls, v: str) -> str:
        if isinstance(v, str):
            upper = v.upper()
            if upper in Category._value2member_map_:
                return upper
        return Category.OTHER.value


def _estimate_tokens(text: str) -> int:
    return len(text) // _CHARS_PER_TOKEN


def _parse(raw: str) -> SummaryOutput:
    return SummaryOutput.model_validate(json.loads(raw.strip()))


async def _summarize_single_shot(text: str, max_retries: int = 2) -> dict:
    prompt = build_summary_prompt(text, max_chars=len(text))
    options = {"num_ctx": _SINGLE_SHOT_NUM_CTX, "temperature": 0, "num_predict": _SINGLE_SHOT_NUM_PREDICT}

    last_raw = ""
    for attempt in range(max_retries + 1):
        try:
            last_raw = await generate(prompt, json_mode=True, options=options)
            logger.debug(f"[LLM single-shot 응답] {last_raw[:300]}")
            output = _parse(last_raw)
            logger.info(f"[LLM single-shot 성공] (시도 {attempt + 1}), summary_ko 길이={len(output.summary_ko)}")
            return output.model_dump()
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt < max_retries:
                logger.warning(f"[LLM single-shot 재시도 {attempt + 1}/{max_retries}] {e}")
            else:
                logger.error(f"[LLM single-shot 최종 실패] {e}. 원본(300자): {last_raw[:300]}")

    return {"category": Category.OTHER, "summary_ko": last_raw or None}


async def _summarize_one_chunk(chunk: str, chunk_index: int, total_chunks: int) -> str:
    prompt = build_chunk_prompt(chunk, chunk_index, total_chunks)
    options = {"num_ctx": _CHUNK_NUM_CTX, "temperature": 0, "num_predict": _CHUNK_NUM_PREDICT}
    try:
        result = await generate(prompt, json_mode=False, options=options)
        return result.strip()
    except Exception as e:
        logger.warning(f"[Map 청크 {chunk_index}/{total_chunks} 실패] {e}")
        return ""


async def _summarize_map_reduce(text: str, max_retries: int = 2) -> dict:
    chunk_chars = _CHUNK_TOKENS * _CHARS_PER_TOKEN
    chunks = [text[i : i + chunk_chars] for i in range(0, len(text), chunk_chars)]
    total = len(chunks)
    logger.info(f"[LLM Map-Reduce] 청크 수={total}, 청크당 약 {_CHUNK_TOKENS:,} 토큰")

    # Map 단계: ollama_semaphore로 동시 요청 수 제어됨
    chunk_summaries = await asyncio.gather(
        *[_summarize_one_chunk(chunk, i + 1, total) for i, chunk in enumerate(chunks)]
    )
    valid_summaries = [s for s in chunk_summaries if s]
    logger.info(f"[LLM Map-Reduce] Map 완료, 성공={len(valid_summaries)}/{total}")

    # Reduce 단계
    reduce_prompt = build_reduce_prompt(valid_summaries, total)
    options = {"num_ctx": _REDUCE_NUM_CTX, "temperature": 0, "num_predict": _REDUCE_NUM_PREDICT}

    last_raw = ""
    for attempt in range(max_retries + 1):
        try:
            last_raw = await generate(reduce_prompt, json_mode=True, options=options)
            logger.debug(f"[LLM Reduce 응답] {last_raw[:300]}")
            output = _parse(last_raw)
            logger.info(f"[LLM Reduce 성공] (시도 {attempt + 1}), category={output.category}")
            return output.model_dump()
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt < max_retries:
                logger.warning(f"[LLM Reduce 재시도 {attempt + 1}/{max_retries}] {e}")
            else:
                logger.error(f"[LLM Reduce 최종 실패] {e}. 원본(300자): {last_raw[:300]}")

    return {"category": Category.OTHER, "summary_ko": last_raw or None}


async def summarize_and_classify(text: str, max_retries: int = 2) -> dict:
    tokens = _estimate_tokens(text)
    logger.info(f"[LLM 요약 게이트] 추정 토큰={tokens:,}")

    # 2차 게이트: 절대 상한 초과 → reject
    if tokens > _ABSOLUTE_TOKEN_LIMIT:
        raise ValueError(
            f"문서 크기({tokens:,} 토큰)가 처리 한도({_ABSOLUTE_TOKEN_LIMIT:,} 토큰)를 초과합니다. "
            "문서를 분할하여 업로드해 주세요."
        )

    # 2차 게이트: single-shot vs Map-Reduce 분기
    if tokens <= _SINGLE_SHOT_TOKEN_LIMIT:
        logger.info(f"[LLM 요약] single-shot 경로 선택 (≤{_SINGLE_SHOT_TOKEN_LIMIT:,} 토큰)")
        return await _summarize_single_shot(text, max_retries)

    logger.info(f"[LLM 요약] Map-Reduce 경로 선택 (>{_SINGLE_SHOT_TOKEN_LIMIT:,} 토큰)")
    return await _summarize_map_reduce(text, max_retries)
