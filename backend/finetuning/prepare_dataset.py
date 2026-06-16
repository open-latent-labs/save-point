"""
담당: D (데이터/통합)
HuggingFace 데이터셋 다운로드 및 파인튜닝 포맷 변환

실행:
    python pipeline/finetune/prepare_dataset.py --target llm1
    python pipeline/finetune/prepare_dataset.py --target llm2
    python pipeline/finetune/prepare_dataset.py --target all
"""
import argparse
import json
from pathlib import Path
from datasets import load_dataset, concatenate_datasets

DATA_DIR = Path("data/finetune")

# ──────────────────────────────────────────────
# Qwen2.5 Instruct 채팅 템플릿
# ──────────────────────────────────────────────
def to_qwen_chat(system: str, user: str, assistant: str) -> str:
    return (
        f"<|im_start|>system\n{system}<|im_end|>\n"
        f"<|im_start|>user\n{user}<|im_end|>\n"
        f"<|im_start|>assistant\n{assistant}<|im_end|>"
    )


# ──────────────────────────────────────────────
# LLM1: 문서 분류·요약
# 데이터셋: vishnuOI/unity-dev-instructions
# ──────────────────────────────────────────────

LLM1_SYSTEM = (
    "당신은 게임 개발 기술문서를 분류하고 한국어로 요약하는 전문가입니다.\n"
    "주어진 문서를 읽고 아래 형식으로 반드시 응답하세요.\n\n"
    "doc_type: engine_reference | postmortem | bug_analysis | architecture | tutorial | other\n"
    "engine_type: unity | unreal | godot | custom | agnostic\n"
    "summary: (한국어 요약 2~3문장)\n"
    "tags: (핵심 키워드 5개 이내, 쉼표 구분)"
)


def format_llm1_vishnuoi(row: dict) -> dict | None:
    """
    vishnuOI/unity-dev-instructions 컬럼 구조:
    source, category, system, instruction, response
    """
    instruction = (row.get("instruction") or "").strip()
    response    = (row.get("response")    or "").strip()
    category    = (row.get("category")    or "").strip()

    if not instruction or not response:
        return None

    # category → engine_type 매핑
    ENGINE_MAP = {
        "physics": "unity", "animation": "unity", "scripting": "unity",
        "xr": "unity", "vr": "unity", "ar": "unity",
        "rendering": "unity", "ui": "unity", "networking": "unity",
    }
    engine = ENGINE_MAP.get(category.lower(), "unity")

    # doc_type 추론 (category 기반 휴리스틱)
    DOC_TYPE_MAP = {
        "physics": "engine_reference", "animation": "engine_reference",
        "scripting": "engine_reference", "rendering": "engine_reference",
        "ui": "engine_reference", "networking": "engine_reference",
    }
    doc_type = DOC_TYPE_MAP.get(category.lower(), "tutorial")

    # 출력 포맷 구성
    output = (
        f"doc_type: {doc_type}\n"
        f"engine_type: {engine}\n"
        f"summary: {response[:300]}\n"
        f"tags: {category}"
    )

    return {
        "text": to_qwen_chat(
            system=LLM1_SYSTEM,
            user=f"다음 Unity 기술문서를 분류하고 요약하세요.\n\n{instruction[:1500]}",
            assistant=output,
        )
    }


def prepare_llm1():
    """LLM1 파인튜닝 데이터 준비"""
    output_dir = DATA_DIR / "llm1"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Loading vishnuOI/unity-dev-instructions ...")
    ds = load_dataset("vishnuOI/unity-dev-instructions", split="train")
    print(f"  원본 행 수: {len(ds)}")

    records = []
    skipped = 0
    for row in ds:
        formatted = format_llm1_vishnuoi(row)
        if formatted:
            records.append(formatted)
        else:
            skipped += 1

    print(f"  변환 완료: {len(records)}행 / 스킵: {skipped}행")

    # train / eval 분리 (9:1)
    split_idx = int(len(records) * 0.9)
    train_records = records[:split_idx]
    eval_records  = records[split_idx:]

    for name, data in [("train", train_records), ("eval", eval_records)]:
        path = output_dir / f"{name}.jsonl"
        with open(path, "w", encoding="utf-8") as f:
            for r in data:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"  {name}.jsonl → {len(data)}행 저장: {path}")


# ──────────────────────────────────────────────
# LLM2: RAG 챗봇
# 데이터셋: Hypersniper/unity_api_2022_3 (메인)
#           vishnuOI/unity-dev-instructions (보조, 질문 다양성)
# ──────────────────────────────────────────────

LLM2_SYSTEM = (
    "당신은 게임 개발 전문 AI 어시스턴트입니다.\n"
    "제공된 참고 문서를 바탕으로 질문에 한국어로 답변하세요.\n"
    "참고 문서에 없는 내용은 모른다고 솔직하게 말하세요.\n"
    "인디 개발자나 주니어 개발자가 이해할 수 있도록 친절하게 설명하세요."
)


def format_llm2_hypersniper(row: dict) -> dict | None:
    """
    Hypersniper/unity_api_2022_3 컬럼 구조:
    topic, question, answer, api

    핵심: api 컬럼을 RAG 컨텍스트로 사용
    → 실제 서비스에서 VectorDB 청크를 받는 구조와 동일하게 학습
    """
    question = (row.get("question") or "").strip()
    answer   = (row.get("answer")   or "").strip()
    api      = (row.get("api")      or "").strip()
    topic    = (row.get("topic")    or "").strip()

    if not question or not answer:
        return None

    # api 컬럼: 너무 길면 자름 (1200자 제한)
    api_context = api[:1200] if api else f"Unity {topic} 관련 문서"

    user_prompt = (
        f"[참고 문서]\n{api_context}\n\n"
        f"[질문]\n{question}"
    )

    return {
        "text": to_qwen_chat(
            system=LLM2_SYSTEM,
            user=user_prompt,
            assistant=answer,
        )
    }


def format_llm2_vishnuoi(row: dict) -> dict | None:
    """
    vishnuOI/unity-dev-instructions 보조 데이터
    api 컬럼이 없으므로 컨텍스트 없는 Q&A로 포맷
    → 질문 스타일 다양성 보강 목적
    """
    instruction = (row.get("instruction") or "").strip()
    response    = (row.get("response")    or "").strip()

    if not instruction or not response:
        return None

    user_prompt = (
        f"[참고 문서]\n관련 Unity 문서를 참고하세요.\n\n"
        f"[질문]\n{instruction[:800]}"
    )

    return {
        "text": to_qwen_chat(
            system=LLM2_SYSTEM,
            user=user_prompt,
            assistant=response[:800],
        )
    }


def prepare_llm2():
    """LLM2 파인튜닝 데이터 준비"""
    output_dir = DATA_DIR / "llm2"
    output_dir.mkdir(parents=True, exist_ok=True)

    records = []

    # ── 메인: Hypersniper (RAG 패턴 학습) ──
    print("Loading Hypersniper/unity_api_2022_3 ...")
    ds_hyper = load_dataset("Hypersniper/unity_api_2022_3", split="train")
    print(f"  원본 행 수: {len(ds_hyper)}")

    hyper_records = []
    for row in ds_hyper:
        formatted = format_llm2_hypersniper(row)
        if formatted:
            hyper_records.append(formatted)

    print(f"  변환 완료: {len(hyper_records)}행")
    records.extend(hyper_records)

    # ── 보조: vishnuOI (질문 다양성 보강, 20%만 샘플링) ──
    print("Loading vishnuOI/unity-dev-instructions (20% 샘플) ...")
    ds_vishnu = load_dataset("vishnuOI/unity-dev-instructions", split="train")
    sample_size = int(len(ds_vishnu) * 0.2)
    ds_vishnu_sample = ds_vishnu.shuffle(seed=42).select(range(sample_size))
    print(f"  샘플 행 수: {len(ds_vishnu_sample)}")

    vishnu_records = []
    for row in ds_vishnu_sample:
        formatted = format_llm2_vishnuoi(row)
        if formatted:
            vishnu_records.append(formatted)

    print(f"  변환 완료: {len(vishnu_records)}행")
    records.extend(vishnu_records)

    # ── 셔플 후 train / eval 분리 (9:1) ──
    import random
    random.seed(42)
    random.shuffle(records)

    split_idx    = int(len(records) * 0.9)
    train_records = records[:split_idx]
    eval_records  = records[split_idx:]

    for name, data in [("train", train_records), ("eval", eval_records)]:
        path = output_dir / f"{name}.jsonl"
        with open(path, "w", encoding="utf-8") as f:
            for r in data:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"  {name}.jsonl → {len(data)}행 저장: {path}")

    print(f"\n최종 구성:")
    print(f"  Hypersniper (RAG 패턴): {len(hyper_records)}행")
    print(f"  vishnuOI   (질문 다양성): {len(vishnu_records)}행")
    print(f"  총합: {len(records)}행")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GameDoc AI 파인튜닝 데이터 준비")
    parser.add_argument(
        "--target",
        choices=["llm1", "llm2", "all"],
        default="all",
        help="어떤 LLM용 데이터를 준비할지 선택"
    )
    args = parser.parse_args()

    if args.target in ("llm1", "all"):
        print("\n=== LLM1 데이터 준비 (분류·요약) ===")
        prepare_llm1()

    if args.target in ("llm2", "all"):
        print("\n=== LLM2 데이터 준비 (RAG 챗봇) ===")
        prepare_llm2()

    print("\n완료!")
