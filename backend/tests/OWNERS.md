# 테스트 소유권 & 디렉터리 가이드

> 분배 축은 **코드 소유권**(자기가 설계·구현한 코드는 자기가 테스트)이다.
> "유닛 vs API"가 아니라 "누가 만든 코드냐"로 나눈다.
> 작성 규칙·스타일은 `tests/test_reference_sample.py`(레퍼런스 샘플)를 복사해서 따른다.

## 팀 ↔ 핵심 영역
| 팀 | 핵심 영역 |
|----|----------|
| 김윤 | RAG / VectorDB / 챗(SSE) |
| 남정희 | RDB / OCR / 요약 LLM / 문서 |
| 조형우 | 인증 / 권한·승인 라우트 |
| 최원익 | 알림, 파일 요약, 삭제 및 수정 리스트 조회 등 일부 백엔드 라우트 |

> 파인튜닝(Colab/QLora)은 pytest 범위 밖 → C·D 소유권은 백엔드 라우트/로직에 한정.

## 디렉터리 구조 (실제 트리)
```
tests/
  conftest.py              공용 fixture (변경 시 협의)   [남정희]
  test_reference_sample.py 레퍼런스 샘플                 [남정희]
  support/                 재사용 코드(가짜객체·빌더)
    fake_embedder.py       FakeEmbedder(결정적 벡터)      [김윤]
    fake_ollama.py         Ollama 응답/스트림 빌더         [김윤, 남정희]
    factories.py           데이터 빌더(→ fixtures/ 로드)  [남정희]
  fixtures/                정적 데이터 파일(샘플PDF·골든응답)
  unit/<도메인>/            단위 테스트 (mock, 빠름)
  integration/<도메인>/     통합 테스트 (실제 의존성, 느림)
```
- **API(엔드포인트) 테스트는 별도 `api/` 폴더 없이 해당 도메인 폴더 안에** 둔다(라우트 작성자 소유).
- 마커: 파일 상단에 `pytestmark = pytest.mark.unit` 또는 `integration`. 실행은 `pytest -m unit`.

## 도메인별 소유권
| 도메인 폴더 | 소유 | 대상 코드 | unit | integration |
|------------|------|----------|------|-------------|
| `rag/` | **김윤** | rag_service, query_pipeline, reranker, embed_service, flag_model, chunker, chat_prompt, vector_docs | ✅ | ✅ Qdrant(`:memory:`) |
| `chat/` | **김윤** | chat.py(세션 CRUD + `POST /v1/chat` SSE), chat_service | ✅ | ✅ SSE API |
| `ocr/` | **남정희** | services/ocr/* (extractor·pipline·quality·preprocessor·engines) | ✅ | ✅ 샘플 PDF 실제 처리 |
| `summarize/` | **남정희** | summary_service, summary_prompt | ✅ | — |
| `rdb/` | **남정희** | RDB 리포지토리/스키마 | — | ✅ testcontainers+schema.sql (선택, Docker 부담 시 생략) |
| `document/` | **최원익, 남정희** | document.py, document_service, crud/document | ✅ | ✅ (RDB 연동) |
| `auth/` | **조형우** | auth.py, utils/jwt (인증·OAuth·권한분기) | ✅ | (선택) |
| `summary_routes/` | **최원익** | summary.py (문서 요약 CRUD 라우트) | ✅ | — |
| `admin/` | **조형우** | admin.py + superAdmin.py (권한분기·승인흐름) | ✅ | — |
| `notification/` | **최원익** | notification.py, crud/notification | ✅ | — |

> 요약 주의: **요약 LLM 서비스/프롬프트 = B(`summarize/`)**, **요약 문서 라우트 = D(`summary_routes/`)**.
> 코드 소유권 원칙대로 갈린다.

## 꼭 단위 테스트할 "진짜 로직" (주로 조형우, 일부 남정희)
- 권한 분기: 슈퍼관리자 / 관리자 / 일반인 (`superAdmin.py`, 의존성 가드) — C(`admin/`)
- 공용문서 전환 승인 흐름: 일반인 요청→관리자 승인/거절 / 관리자 즉시전환 — 승인측 `admin.py`=C(`admin/`), `document.py request-public`=B(`document/`)
- → API로만 간접 커버 금지. 서비스/로직 계층 단위 테스트 필수.

## 외부 의존성 처리 (전 팀 공통)
- Ollama(LLM): httpx 직접 호출 → **respx** 로 mock. 공용 fixture `mock_ollama_generate` 사용. (SSE는 스트림 헬퍼 별도)
- Embedding(bge-m3): `FakeEmbedder`(결정적 벡터) — unit·integration 공통.
- Qdrant: unit=클라이언트 mock / integration=`QdrantClient(":memory:")`.
- PostgreSQL: unit=리포지토리 mock / integration=testcontainers+schema.sql(선택).
- OCR: unit=mock 또는 샘플 / integration=샘플 PDF 실제 처리.

## 실패 시 처리
깨진 테스트 주인이 먼저 본다. 원인이 남의 서비스 계층이면 그 사람에게 알린다(프로세스화 X, 가볍게).
