import json

from loguru import logger
from pydantic import BaseModel, ValidationError, field_validator

from app.llm.ollama_client import generate
from app.llm.summary_prompt import build_summary_prompt
from app.models.enums import Category

class SummaryOutput(BaseModel):
    category: Category = Category.OTHER
    summary_ko: str = ""

    @field_validator("category", mode="before")
    @classmethod
    def coerce_category(cls, v: str) -> str:
        return v if v in Category._value2member_map_ else Category.OTHER.value

def _parse(raw: str) -> SummaryOutput:
    return SummaryOutput.model_validate(json.loads(raw.strip()))

async def summarize_and_classify(text: str, max_retries: int = 2) -> dict:
    prompt = build_summary_prompt(text)

    last_raw = ""
    for attempt in range(max_retries + 1):
        try:
            last_raw = await generate(prompt, json_mode=True)
            output = _parse(last_raw)

            logger.info(f"LLM 출력 성공! (시도 횟수 {attempt})")
            
            return output.model_dump()

        except (json.JSONDecodeError, ValidationError) as e:
            if attempt < max_retries:
                logger.warning(
                    f"[LLM 출력 검증 실패 — 재시도 {attempt + 1}/{max_retries}] {e}"
                )
            else:
                logger.error(
                    f"[LLM 출력 검증 최종 실패] {e}. "
                    f"원본 응답(첫 300자): {last_raw[:300]}"
                )

    return {
        "category": Category.OTHER,
        "summary": last_raw[:2000] if last_raw else None,
    }
