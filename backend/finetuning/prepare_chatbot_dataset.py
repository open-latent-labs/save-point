import json
import random
import re
import sys
import os
import time
from typing import List, Dict, Optional

import asyncio
import logging
import requests

# backend/ 디렉토리를 경로에 추가해 app.* 임포트 가능하게 함
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from qdrant_client.models import (
    Filter, FieldCondition, MatchValue,
    SparseVector, FusionQuery, Fusion, Prefetch,
)

import httpx

from app.db.rdb import AsyncSessionLocal
from app.db.vector_db import get_qdrant_client
from app.models.document_chunk import DocumentChunk
from app.models.document import Document
from app.models.enums import DocumentAccess
from app.config import get_settings as _get_settings
from app.services.rag_service import embed_query_sparse
from app.services.reranker import rerank as _rerank

_settings = _get_settings()

_EMBED_TIMEOUT = 300  # 원격 Ollama 경유 시 충분한 타임아웃

async def embed_query_dense(query: str) -> list[float]:
    async with httpx.AsyncClient(timeout=_EMBED_TIMEOUT) as client:
        response = await client.post(
            _settings.ollama_embed_url,
            json={"model": _settings.embed_model, "input": query},
        )
        response.raise_for_status()
        return response.json()["embeddings"][0]

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-5s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("dataset")

# 스크립트 전체에서 단일 이벤트 루프를 유지해 AsyncQdrantClient 싱글톤과 루프 불일치 방지
_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)

OLLAMA_URL = "https://140bg4xem5soaw-11434.proxy.runpod.net/api/chat"
TEACHER = "qwen3.5:9b"
TOP_K = 4                 # 컨텍스트로 넣을 청크 수 (추론 때와 동일하게)
QUESTIONS_PER_CHUNK = 3
REFUSAL_RATIO = 0.18      # 전체 샘플 중 거절 샘플 목표 비율
OUT_PATH = "rag_sft_dataset.jsonl"
TMP_PATH = "rag_sft_dataset.tmp.jsonl"   # 완료 전 중간 저장용
CKPT_PATH = "rag_sft_dataset.ckpt.json"  # 진행 상황 체크포인트
SEED = 42
TARGET_USER_ID = "LGOUVRQP6ERBO3JZXH255LK91H"
random.seed(SEED)

SYSTEM_PROMPT = (
    "너는 게임 개발 기술 문서를 근거로 개발자의 질문에 한국어로 답하는 어시스턴트야.\n"
    "규칙:\n"
    "1) 반드시 [참고 문서]에 적힌 내용만 근거로 답한다. 추측하거나 외부 지식을 끌어오지 않는다.\n"
    "2) 답변은 한국어로 작성한다. 코드/식별자/API 이름은 원문(영어) 그대로 둔다.\n"
    "3) 가독성을 위해 마크다운을 적극 활용한다. 코드·스니펫은 코드 블록(``` 또는 인라인 `)으로 원문 그대로 보존하고, "
    "비교·속성·옵션처럼 정리가 필요한 내용은 표로, 나열 항목은 목록으로 작성한다. "
    "헤더·표·목록은 자유롭게 쓰되 이모지(emoji)는 사용하지 않는다. "
    "다만 단순한 한두 문장 답변에까지 형식을 억지로 넣지는 않는다.\n"
    "4) 답변 본문에 문서 번호([1] 등)를 쓰지 않는다.\n"
    "5) 참고 문서로 답할 수 없으면 정확히 다음 문장만 출력한다: "
    "'제공된 문서에서 해당 내용을 찾을 수 없습니다. 질문과 관련하여 참고가 될만한 문서를 찾아서 업로드 해주세요'"
)

def ollama_chat(messages: List[Dict], temperature: float = 0.3, think: bool = False) -> str:
    """Ollama /api/chat 호출. thinking 흔적은 제거한 최종 텍스트만 반환."""
    payload = {
        "model": TEACHER,
        "messages": messages,
        "stream": False,
        "think": think,
        "options": {"temperature": temperature, "top_p": 0.95, "num_ctx": 12000},
    }
    for attempt in range(3):
        try:
            r = requests.post(OLLAMA_URL, json=payload, timeout=300)
            r.raise_for_status()
            content = r.json()["message"]["content"]
            # 일부 빌드는 <think>...</think> 를 content 안에 넣기도 하므로 방어적으로 제거
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            return content
        except Exception as e:  # noqa: BLE001
            log.warning(f"Ollama 호출 실패 (시도 {attempt+1}/3): {e}")
            time.sleep(2)
    log.error("Ollama 호출 3회 모두 실패 → 빈 문자열 반환")
    return ""


def parse_json_array(text: str) -> list:
    """모델 출력에서 JSON 배열만 안전하게 추출."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        m = re.search(r"\[.*\]", text, flags=re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:  # noqa: BLE001
                return []
        return []

def _has_japanese(s: str) -> bool:
    """히라가나·카타카나 포함 여부 (일본어 판정)."""
    return bool(re.search(r'[぀-ヿ]', s))

def _has_chinese(s: str) -> bool:
    """CJK 문자 비율이 30% 초과 시 중국어로 판정.
    한국어 한자(한자 혼용)와 구분하기 위해 비율 기준을 사용."""
    cjk = len(re.findall(r'[一-鿿]', s))
    return len(s) > 0 and cjk / len(s) > 0.3

def _is_non_korean(s: str) -> bool:
    return _has_japanese(s) or _has_chinese(s)

async def _load_chunks_async() -> List[Dict]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(
                DocumentChunk.id,
                DocumentChunk.chunk_text_en,
                DocumentChunk.vector_point_id,
                Document.filename,
            )
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(
                DocumentChunk.is_indexed == True,
                # (
                #     (Document.access_type == DocumentAccess.PUBLIC)
                #     |
                #     (
                #         (Document.access_type == DocumentAccess.PRIVATE)
                #         &
                #         (Document.uploaded_by_id == TARGET_USER_ID)
                #     )
                # ),
                Document.uploaded_by_id == TARGET_USER_ID,
                Document.deleted_at == None,
            )
        )
        rows = result.all()
    return [
        {
            "chunk_id": str(row.vector_point_id or row.id),
            "text": row.chunk_text_en,
            "source": row.filename or "",
        }
        for row in rows
        if row.chunk_text_en
    ]


def load_chunks() -> List[Dict]:
    """
    PostgreSQL document_chunks 테이블에서 인덱싱된 PUBLIC 문서 청크를 읽어옴.
    반환 형식: [{"chunk_id": str, "text": str(영문), "source": str}, ...]
    """
    return _loop.run_until_complete(_load_chunks_async())


async def _retrieve_topk_async(question: str, k: int) -> List[Dict]:
    dense_vector = await embed_query_dense(question)
    sparse_vector = await embed_query_sparse(question)

    user_filter = Filter(
        must=[
            FieldCondition(key="user_id", match=MatchValue(value=TARGET_USER_ID)),
        ],
        must_not=[
            FieldCondition(key="deleted_file", match=MatchValue(value="yes")),
        ],
    )

    client = get_qdrant_client()
    results = await client.query_points(
        collection_name=_settings.qdrant_collection_name,
        prefetch=[
            Prefetch(query=dense_vector, using="dense", limit=20),
            Prefetch(
                query=SparseVector(
                    indices=sparse_vector["indices"],
                    values=sparse_vector["values"],
                ),
                using="sparse",
                limit=20,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        query_filter=user_filter,
        limit=k * 4,  # 리랭킹 후보를 넉넉히 확보
    )

    candidates = []
    for r in results.points:
        payload = r.payload or {}          # None이면 {} → 이후 타입이 dict로 확정
        candidates.append({
            "chunk_text":  payload.get("chunk_text", ""),
            "document_id": payload.get("document_id", ""),
            "filename":    payload.get("filename", ""),
            "chunk_index": payload.get("chunk_index", 0),
        })

    if not candidates:
        return []

    reranked = await _rerank(question, candidates, top_k=k)

    return [
        {
            "chunk_id": f"{r['document_id']}_{r['chunk_index']}",
            "text": r["chunk_text"],
        }
        for r in reranked
    ]


def retrieve_topk(question: str, k: int = TOP_K) -> List[Dict]:
    """
    BGE-M3 dense+sparse → Qdrant RRF → ko-reranker 파이프라인으로 상위 k개 청크 반환.
    추론 파이프라인(query_pipeline.py)과 동일한 retriever를 사용해 학습/추론 분포를 맞춤.
    반환 형식: [{"chunk_id": str, "text": str}, ...]
    """
    return _loop.run_until_complete(_retrieve_topk_async(question, k))


# ---------------------------------------------------------------------------
# Stage 1: 질문 생성
# ---------------------------------------------------------------------------
def gen_questions(chunk_text: str, n: int = QUESTIONS_PER_CHUNK) -> List[str]:
    prompt = (
        f"다음 영문 기술 문서를 읽고, 이 문서 '안에서' 답할 수 있는 한국어 질문을 {n}개 만들어.\n"
        "- 사실 확인, 사용법(how-to), 차이점, '왜' 등 유형을 섞을 것\n"
        "- 문서에 없는 내용을 묻지 말 것\n"
        '- 다른 설명 없이 JSON 배열로만 출력: ["질문1", "질문2", ...]\n\n'
        f"문서:\n{chunk_text}"
    )
    out = ollama_chat([{"role": "user", "content": prompt}], temperature=0.7)
    qs = parse_json_array(out)
    return [q for q in qs if isinstance(q, str) and len(q) > 5 and not _is_non_korean(q)][:n]


# ---------------------------------------------------------------------------
# Stage 3: 근거 기반 답변 생성
# ---------------------------------------------------------------------------
def build_user_msg(question: str, contexts: List[str]) -> str:
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts))
    return f"[참고 문서]\n{ctx}\n\n[질문]\n{question}"


def _strip_citations(text: str) -> str:
    """답변 본문에 새어든 단독 인용 마커([1], [2] 등)만 제거.
    - array[0] 같은 코드 인덱스: 앞 문자가 식별자/]/) 이므로 보존
    - [2023] 같은 연도/버전(3자리 이상): 1~2자리로 한정해 보존"""
    return re.sub(r'(?<![\w가-힣\]\)])\s*\[\d{1,2}\]', '', text)


def gen_answer(question: str, contexts: List[str]) -> str:
    user = build_user_msg(question, contexts)
    msgs = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]
    # 답변은 충실성을 위해 낮은 temperature + thinking 켜기
    answer = ollama_chat(msgs, temperature=0.2, think=True)
    return _strip_citations(answer)


# ---------------------------------------------------------------------------
# Stage 5: 품질 필터 (faithfulness LLM-as-judge)
# ---------------------------------------------------------------------------
REFUSAL_TEXT = "제공된 문서에서 해당 내용을 찾을 수 없습니다. 질문과 관련하여 참고가 될만한 문서를 찾아서 업로드 해주세요"


def judge_faithful(question: str, contexts: List[str], answer: str) -> bool:
    if answer.strip() == REFUSAL_TEXT:
        return True  # 거절 샘플은 별도 검증
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts))
    prompt = (
        "아래 답변이 참고 문서에 충실한지 판단해.\n"
        "- 핵심 주장(사실·수치·동작·API 등)이 참고 문서로 뒷받침되면 YES.\n"
        "- 문서 내용을 자연스럽게 풀어 쓰거나 정리·부연·요약한 것은 허용한다(YES).\n"
        "- 문서에 없는 사실을 새로 지어내거나 문서와 모순되는 내용이 있으면 NO.\n"
        "- 한국어가 아니면 NO.\n"
        "오직 YES 또는 NO 한 단어로만 답해.\n\n"
        f"참고 문서:\n{ctx}\n\n질문: {question}\n\n답변: {answer}"
    )
    verdict = ollama_chat([{"role": "user", "content": prompt}], temperature=0.0)
    return verdict.strip().upper().startswith("YES")


def _is_answerable(question: str, contexts: List[str]) -> bool:
    """이 질문이 주어진 참고 문서만으로 답할 수 있는지 판정.
    거절 샘플의 distractor 컨텍스트에 실제 답이 섞여 있는지 검사하는 데 쓴다."""
    ctx = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(contexts))
    prompt = (
        "아래 질문이 참고 문서의 내용만으로 답할 수 있는지 판단해.\n"
        "문서에 답의 근거가 있으면 YES, 없으면 NO.\n"
        "오직 YES 또는 NO 한 단어로만 답해.\n\n"
        f"참고 문서:\n{ctx}\n\n질문: {question}"
    )
    verdict = ollama_chat([{"role": "user", "content": prompt}], temperature=0.0)
    return verdict.strip().upper().startswith("YES")


# ---------------------------------------------------------------------------
# 샘플 조립
# ---------------------------------------------------------------------------
def make_record(question: str, contexts: List[str], answer: str) -> Dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_msg(question, contexts)},
            {"role": "assistant", "content": answer},
        ]
    }


def gen_refusal_questions(n: int) -> List[str]:
    """코퍼스가 다루지 않을 가능성이 높은 out-of-scope 질문을 생성.

    특정 청크에서 뽑지 않고 게임개발/Unity 전반에서 폭넓게 만들어, 실제 retriever로
    검색했을 때 답이 안 나오는 것만 거절 샘플로 채택한다. (코퍼스가 작을수록 대부분
    질문이 커버 밖이라 거절 샘플이 잘 만들어짐)
    """
    prompt = (
        f"Unity 및 게임 개발 전반에 걸친 다양한 한국어 질문 {n}개를 만들어.\n"
        "- 렌더링, 물리, 애니메이션, 네트워킹, 에디터 확장, 빌드, 셰이더, 오디오, "
        "입력 시스템 등 서로 다른 주제를 폭넓게 섞을 것\n"
        "- 구체적이고 그럴듯한 질문일 것\n"
        '- 다른 설명 없이 JSON 배열로만 출력: ["질문1", "질문2", ...]'
    )
    out = ollama_chat([{"role": "user", "content": prompt}], temperature=0.8)
    qs = parse_json_array(out)
    return [q for q in qs if isinstance(q, str) and len(q) > 5][:n]


def make_refusal_record(question: str) -> Optional[Dict]:
    """실제 retriever가 뽑은 topK로 컨텍스트를 구성한 거절 샘플.

    추론 시점과 동일하게 실제 검색 결과를 컨텍스트로 쓰되, 그 컨텍스트로 질문에
    답할 수 있으면(answerable) None을 반환해 폐기한다. 즉 '문서에 답이 없는
    상황에서만' 거절을 학습시킨다.
    """
    retrieved = retrieve_topk(question, k=TOP_K)
    contexts = [r["text"] for r in retrieved]
    
    if not contexts:
        return None
    if _is_answerable(question, contexts):
        return None  # 검색 결과로 답이 가능 → 거절 샘플로 부적합
    return make_record(question, contexts, REFUSAL_TEXT)


# ---------------------------------------------------------------------------
# 체크포인트 헬퍼
# ---------------------------------------------------------------------------
def _load_ckpt() -> tuple:
    """저장된 체크포인트를 읽어 (done_chunk_ids, seen_q, record_count) 반환."""
    if not os.path.exists(CKPT_PATH):
        log.info("체크포인트 없음 → 처음부터 시작")
        return set(), set(), 0
    with open(CKPT_PATH, encoding="utf-8") as f:
        d = json.load(f)
    log.info(
        f"체크포인트 재개 → 완료 청크 {len(d['done_chunk_ids'])}개 · "
        f"처리 질문 {len(d['seen_q'])}개 · 기존 샘플 {d['record_count']}개"
    )
    return set(d["done_chunk_ids"]), set(d["seen_q"]), d["record_count"]


def _save_ckpt(done_chunk_ids: set, seen_q: set, record_count: int) -> None:
    """현재 진행 상황을 체크포인트 파일에 저장."""
    with open(CKPT_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {
                "done_chunk_ids": list(done_chunk_ids),
                "seen_q": list(seen_q),
                "record_count": record_count,
            },
            f,
            ensure_ascii=False,
        )


# ---------------------------------------------------------------------------
# 메인 루프
# ---------------------------------------------------------------------------
def main():
    log.info("=" * 60)
    log.info("데이터셋 생성 시작")

    log.info("PostgreSQL에서 청크 로드 중...")
    chunks = load_chunks()
    log.info(f"청크 {len(chunks)}개 로드 완료")

    done_chunk_ids, seen_q, record_count = _load_ckpt()
    remaining = [c for c in chunks if c["chunk_id"] not in done_chunk_ids]
    log.info(f"처리 대상: {len(remaining)}/{len(chunks)}개 청크")

    # 중간 저장 파일에 append 모드로 열기 (재실행 시 이어서 씀)
    with open(TMP_PATH, "a", encoding="utf-8") as out_f:
        for ci, chunk in enumerate(chunks):
            if chunk["chunk_id"] in done_chunk_ids:
                continue

            log.info(f"[청크 {ci+1}/{len(chunks)}] '{chunk['source']}' 처리 시작")

            t0 = time.time()
            questions = gen_questions(chunk["text"])
            log.info(
                f"[청크 {ci+1}/{len(chunks)}] 질문 {len(questions)}개 생성 "
                f"({time.time() - t0:.1f}s)"
            )

            for qi, q in enumerate(questions):
                q_label = f"청크{ci+1}-Q{qi+1}"

                if q in seen_q:
                    log.info(f"  [{q_label}] 중복 질문 → 건너뜀")
                    continue
                seen_q.add(q)

                log.info(f"  [{q_label}] {q[:70]}")

                # Stage 2: 벡터 검색
                log.info(f"  [{q_label}] Stage2 벡터 검색 중...")
                t0 = time.time()
                retrieved = retrieve_topk(q, k=TOP_K)
                contexts = [r["text"] for r in retrieved]
                if not contexts:
                    log.warning(
                        f"  [{q_label}] Stage2 검색 결과 없음 → 건너뜀 "
                        f"({time.time() - t0:.1f}s)"
                    )
                    _save_ckpt(done_chunk_ids, seen_q, record_count)
                    continue

                # 출처 청크를 컨텍스트에 강제 포함 → 백본 질문의 답 가능성 보장
                # (질문은 이 청크에서 생성됐으므로 답의 근거가 반드시 들어가야 함)
                if chunk["text"] not in contexts:
                    contexts = [chunk["text"]] + contexts[: TOP_K - 1]
                random.shuffle(contexts)  # 위치 편향 방지

                log.info(
                    f"  [{q_label}] Stage2 완료 → {len(contexts)}개 청크 "
                    f"({time.time() - t0:.1f}s)"
                )

                # Stage 3: 답변 생성
                log.info(f"  [{q_label}] Stage3 답변 생성 중...")
                t0 = time.time()
                answer = gen_answer(q, contexts)
                if not answer:
                    log.warning(
                        f"  [{q_label}] Stage3 빈 답변 → 건너뜀 "
                        f"({time.time() - t0:.1f}s)"
                    )
                    _save_ckpt(done_chunk_ids, seen_q, record_count)
                    continue
                if _is_non_korean(answer):
                    log.warning(
                        f"  [{q_label}] Stage3 비한국어 답변 감지 → 건너뜀 "
                        f"({time.time() - t0:.1f}s)"
                    )
                    _save_ckpt(done_chunk_ids, seen_q, record_count)
                    continue
                if answer.strip() == REFUSAL_TEXT:
                    # 백본 질문인데 teacher가 거절 → 거절 샘플로 쓰지 않고 폐기
                    # (거절은 의도한 out-of-scope 경로에서만 생성)
                    log.warning(
                        f"  [{q_label}] Stage3 백본 거절 → 건너뜀 "
                        f"({time.time() - t0:.1f}s)"
                    )
                    _save_ckpt(done_chunk_ids, seen_q, record_count)
                    continue
                log.info(
                    f"  [{q_label}] Stage3 완료 → {len(answer)}자 "
                    f"({time.time() - t0:.1f}s)"
                )

                # Stage 5: 충실성 검증
                log.info(f"  [{q_label}] Stage5 충실성 검증 중...")
                t0 = time.time()
                if not judge_faithful(q, contexts, answer):
                    log.warning(
                        f"  [{q_label}] Stage5 FAIL → 건너뜀 "
                        f"({time.time() - t0:.1f}s)"
                    )
                    _save_ckpt(done_chunk_ids, seen_q, record_count)
                    continue
                log.info(
                    f"  [{q_label}] Stage5 PASS ({time.time() - t0:.1f}s)"
                )

                rec = make_record(q, contexts, answer)
                out_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                out_f.flush()  # OS 버퍼 즉시 반영
                record_count += 1
                _save_ckpt(done_chunk_ids, seen_q, record_count)
                log.info(f"  [{q_label}] 레코드 저장 완료 (누적 {record_count}개)")

            done_chunk_ids.add(chunk["chunk_id"])
            _save_ckpt(done_chunk_ids, seen_q, record_count)
            log.info(
                f"[청크 {ci+1}/{len(chunks)}] 완료 · 누적 샘플 {record_count}개"
            )

    # Stage 4: 거절 샘플 생성 (out-of-scope 질문 + 실제 검색 + answerable 게이트)
    log.info("Stage4 거절 샘플 생성 중...")
    with open(TMP_PATH, encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]

    target_refusals = int(record_count * REFUSAL_RATIO / (1 - REFUSAL_RATIO))
    added = 0
    attempts = 0
    max_attempts = target_refusals * 6 + 30  # 무한 루프 방지
    while added < target_refusals and attempts < max_attempts:
        batch = gen_refusal_questions(n=min(20, target_refusals - added + 5))
        if not batch:
            attempts += 5
            continue
        for q in batch:
            if added >= target_refusals:
                break
            attempts += 1
            rec = make_refusal_record(q)
            if rec is None:  # 검색 결과 없음 or answerable → 거절 부적합
                continue
            records.append(rec)
            added += 1
            log.info(f"  거절 샘플 {added}/{target_refusals}: {q[:60]}")
    if added < target_refusals:
        log.warning(
            f"거절 샘플 {added}/{target_refusals}개만 생성됨 "
            f"(시도 {attempts}회 소진) — 코퍼스가 작거나 대부분 answerable일 수 있음"
        )
    else:
        log.info(f"거절 샘플 {added}/{target_refusals}개 추가 완료")

    log.info("최종 파일 셔플 및 저장 중...")
    random.shuffle(records)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    os.remove(CKPT_PATH)
    os.remove(TMP_PATH)

    log.info("=" * 60)
    log.info(f"완료: 총 {len(records)}개 샘플 → {OUT_PATH}")
    log.info("주의: 검증셋은 위 코퍼스에 안 들어간 '미사용 문서'에서 따로 생성하세요.")


if __name__ == "__main__":
    main()