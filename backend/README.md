# Backend — Save Point

FastAPI 기반 백엔드. OCR·요약/분류·RAG 파이프라인, 인증(JWT + OAuth), 실시간 presence(Redis Pub/Sub + SSE), 관리자 기능을 제공합니다.

프로젝트 전체 소개는 [루트 README](../README.md)를 참고하세요.

---

## 🛠 요구 사항

- Python **3.11+**
- [uv](https://docs.astral.sh/uv/) (패키지 매니저)
- 외부 인프라: PostgreSQL 17 · Qdrant · Redis · MinIO · Ollama
  - 로컬에서 전부 띄우는 게 번거로우면 루트에서 `docker compose up -d`로 한 번에 실행 가능

---

## 🚀 로컬 실행

### 1. 의존성 설치

```bash
cd backend
uv sync
```

`uv sync`는 [pyproject.toml](./pyproject.toml)의 의존성을 `uv.lock` 기준으로 설치합니다.
`torch`는 CPU 백엔드로 고정(`tool.uv.torch-backend = "cpu"`)되어 있어 로컬에서도 가볍게 돌아갑니다.

### 2. 환경 변수 준비

`env/` 폴더 아래 환경별 파일을 두고, 실행 시 `APP_ENV`로 선택합니다.

```
env/
├── .env.dev     # 로컬 개발 (기본값)
└── .env.prod    # 배포용 (docker-compose)
```

주요 항목 (전체 목록은 [app/config.py](./app/config.py) 참고):

| 카테고리 | 키 | 설명 |
|---|---|---|
| Auth | `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` | JWT 서명·만료 |
| DB | `DATABASE_URL` | `postgresql+asyncpg://...` |
| MinIO | `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_USE_SSL` | 원본 파일 저장 |
| Qdrant | `QDRANT_HOST`, `QDRANT_PORT`, `QDRANT_COLLECTION_NAME` | 벡터 DB |
| Embed | `EMBED_MODEL`, `EMBED_DIM`, `CHUNK_SIZE`, `CHUNK_OVERLAP` | BGE-M3, 1024차원 |
| Ollama | `OLLAMA_GENERATE_URL`, `OLLAMA_CHAT_URL`, `OLLAMA_EMBED_URL` | LLM 서빙 엔드포인트 |
| Model | `CHAT_MODEL`, `NEW_CHAT_MODEL`, `SUMMARY_MODEL`, `JUDGE_MODEL`, `REWRITE_MODEL` | 각 파이프라인용 모델 태그 |
| Rerank | `RERANK_MODEL`, `RERANK_URL` | 비어 있으면 로컬 모델, 값이 있으면 RunPod 원격 |
| Redis | `REDIS_URL`, `PRESENCE_TTL`, `HEARTBEAT_INTERVAL` | 실시간 presence |
| OAuth | `GOOGLE_*`, `KAKAO_*`, `NAVER_*` | 소셜 로그인 |
| CORS | `FRONTEND_URL` | 쉼표로 여러 개 등록 가능 |

### 3. 서버 실행

```bash
# 개발 모드 (APP_ENV=dev, .env.dev 로드)
APP_ENV=dev uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 프로덕션 모드
APP_ENV=prod uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. DB 마이그레이션

현재는 애플리케이션 시작 시 SQLAlchemy `Base.metadata.create_all()`로 테이블을 생성합니다 ([app/db/rdb.py](./app/db/rdb.py) 참고).

DDL 원본이 필요하다면 [`docs/schema.sql`](../docs/schema.sql) · [`docs/erd.dbml`](../docs/erd.dbml)을 참고하세요.

---

## 📖 API 문서

서버 실행 후:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- OpenAPI JSON: <http://localhost:8000/openapi.json>

라우터별 prefix:

| 라우터 | 파일 | 주요 역할 |
|---|---|---|
| `/auth` | [app/api/auth.py](./app/api/auth.py) | 로그인·회원가입·소셜 로그인·토큰 재발급·비밀번호 재설정 |
| `/document` | [app/api/document.py](./app/api/document.py) | 문서 업로드·목록·조회·삭제 |
| `/chat` | [app/api/chat.py](./app/api/chat.py) | 채팅 세션·메시지·SSE 스트리밍 |
| `/summary` | [app/api/summary.py](./app/api/summary.py) | 요약·분류 결과 조회 |
| `/notification` | [app/api/notification.py](./app/api/notification.py) | 사용자 알림 |
| `/admin` | [app/api/admin.py](./app/api/admin.py) | 문서 승인·반려, 관리자 기능 |
| `/superAdmin` | [app/api/superAdmin.py](./app/api/superAdmin.py) | 사용자 관리·역할 변경 |

---

## 📂 폴더 구조

```
backend/
├── main.py                          # FastAPI 진입점 + lifespan(모델 프리로드, presence 워커)
├── check_db.py                      # DB 연결 헬스체크 스크립트
├── pyproject.toml                   # 의존성 & pytest 설정
├── dockerfile
├── env/                             # 환경 변수 (.env.dev / .env.prod)
│
├── app/
│   ├── config.py                    # Pydantic Settings 로더
│   ├── dependencies.py              # 공통 DI (current_user 등)
│   │
│   ├── api/                         # FastAPI 라우터 (엔드포인트만)
│   ├── crud/                        # DB 접근 레이어 (raw SQL/ORM 쿼리)
│   ├── db/
│   │   ├── rdb.py                   # SQLAlchemy async engine
│   │   └── vector_db.py             # Qdrant client + 컬렉션 초기화
│   ├── models/                      # SQLAlchemy 모델 (user, document, chat_* 등)
│   ├── schemas/                     # Pydantic 스키마 (요청/응답 DTO)
│   │
│   ├── pipelines/
│   │   ├── ingest_pipeline.py       # 업로드 → OCR → 요약/분류 → 임베딩 → Qdrant
│   │   └── query_pipeline.py        # 질문 → Rewrite → Retrieve → Rerank → LLM
│   │
│   ├── services/
│   │   ├── ocr/                     # 페이지별 신호 측정 + 엔진 선택 (PaddleOCR / Surya)
│   │   ├── summary_service.py       # 요약/분류 (single-shot / Map-Reduce 분기)
│   │   ├── embed_service.py         # BGE-M3 임베딩
│   │   ├── reranker.py              # bge-reranker-v2-m3 (로컬/RunPod 스위칭)
│   │   ├── query_rewriter.py        # gemma2:2b 기반 질문 재작성
│   │   ├── rag_service.py           # RAG 파이프라인 오케스트레이션
│   │   ├── chat_service.py          # 채팅 세션·메시지 관리
│   │   └── document_service.py      # 문서 업로드·삭제·권한
│   │
│   ├── llm/
│   │   ├── ollama_client.py         # Ollama HTTP 클라이언트 (streaming 포함)
│   │   ├── chat_prompt.py           # 챗봇 시스템 프롬프트
│   │   └── summary_prompt.py        # 요약/분류 프롬프트 (+ prompt injection 방어)
│   │
│   ├── presence/                    # Redis TTL + Pub/Sub 기반 실시간 접속자
│   │   ├── keys.py
│   │   ├── pubsub.py                # 구독 매니저 (프로세스당 1구독)
│   │   ├── expiry_worker.py         # TTL 만료 감시 + 오프라인 전파
│   │   └── service.py               # heartbeat (30s throttle)
│   │
│   └── utils/
│       ├── jwt.py                   # 토큰 인코딩/디코딩
│       ├── minio_client.py
│       ├── redis_client.py
│       ├── chunker.py               # 문서 청킹
│       ├── file_handler.py
│       ├── profiler.py
│       └── logger.py                # Loguru 설정
│
├── finetuning/                      # QLoRA 파인튜닝 스크립트
│   ├── prepare_dataset.py           # 요약/분류 데이터셋 (Teacher: Gemini 2.5 Flash Lite)
│   ├── prepare_chatbot_dataset.py   # RAG SFT 데이터셋 (Behavioral Distillation)
│   ├── train_lora.py                # LoRA 학습 진입점
│   ├── summary_ft/                  # 요약/분류 학습 설정
│   └── chat_ft/                     # 챗봇 학습 설정
│
├── scripts/                         # 운영/실험 스크립트
└── tests/                           # pytest (unit / integration)
    ├── unit/
    ├── integration/
    ├── fixtures/
    └── support/
```

---

## 🧪 테스트

```bash
# 전체
uv run pytest

# 마커별 (pyproject.toml에 정의)
uv run pytest -m unit          # mock 기반, 빠름
uv run pytest -m integration   # Qdrant :memory: / testcontainers PG 등, 느림
```

`asyncio_mode = "auto"`로 설정되어 있어 `async def` 테스트는 별도 데코레이터 없이 실행됩니다.

---

## 🐳 Docker

루트에서 통합 실행:

```bash
docker compose up -d backend
```

이미지는 [`dockerfile`](./dockerfile)로 빌드되며, `env/.env.prod`를 자동으로 로드합니다.

---

## 🔗 관련 문서

- [루트 README](../README.md) — 프로젝트 전체 소개
- [Frontend README](../frontend/README.md)
- [ERD (dbml)](../docs/erd.dbml) · [Schema (sql)](../docs/schema.sql)
