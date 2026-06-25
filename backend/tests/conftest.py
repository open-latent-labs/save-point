# ════════════════════════════════════════════════════════════════════════════
#  루트 conftest — 모든 팀이 공유하는 fixture 모음
#  ⚠ 변경 시 팀원 간 협의 필요! (여기를 바꾸면 모두의 테스트에 영향)
# ════════════════════════════════════════════════════════════════════════════
#
#  [공용 자원 배치 규칙]
#   - tests/conftest.py          ← (여기) pytest fixture만. 팀원 모두 함께 쓰는 것.
#   - tests/support/             ← fixture 아닌 재사용 코드(가짜 객체·빌더)
#       · fake_embedder.py       ← FakeEmbedder (결정적 벡터)        [담당: 김윤]
#       · fake_ollama.py         ← Ollama 응답/스트림 빌더            [담당: 김윤, 남정희]
#       · factories.py           ← 데이터 빌더(정적파일은 fixtures/)  [담당: 남정희]
#   - tests/fixtures/            ← 정적 데이터 파일(샘플PDF·골든응답)
#   - tests/unit/<도메인>/        ← 단위 테스트 (소유권: OWNERS.md)
#   - tests/integration/<도메인>/ ← 통합 테스트
#
#  [확정된 외부 의존성 처리 — 테스트 작성 시 이 fixture/방침을 따를 것]
#   · Ollama(LLM)   : httpx 직접 호출이므로 respx로 가로챔 → mock_ollama_generate
#                     (chat SSE = generate_stream 은 스트리밍 헬퍼 별도, 추후 추가)
#   · Embedding     : FakeEmbedder(결정적 벡터)  (unit·integration 공통)
#   · Qdrant        : unit=클라이언트 mock / integration=QdrantClient(":memory:")
#   · PostgreSQL    : unit=리포지토리 mock / integration=testcontainers+schema.sql(선택)
#   · OCR(pymupdf)  : unit=mock 또는 샘플 / integration=샘플 PDF 실제 처리

import json

import httpx
import pytest

from app.config import get_settings


# ── 공용: Ollama /generate 호출 mock ────────────────────────────────────────
@pytest.fixture
def mock_ollama_generate(respx_mock):
    """Ollama `/generate`(요약·분류 등 단발 호출)를 가로채는 공용 헬퍼.

    httpx 호출을 respx가 가로채므로 실제 LLM 서버 없이 응답을 고정한다.
    반환된 함수에 LLM이 줄 "응답 문자열"을 넘기면 라우트가 등록된다.

        mock_ollama_generate(json.dumps({"category": "UI", "summary_ko": "..."}))
    """
    settings = get_settings()

    def _mock(response_text: str, status_code: int = 200):
        return respx_mock.post(settings.ollama_generate_url).mock(
            return_value=httpx.Response(status_code, json={"response": response_text})
        )

    return _mock


# ── 공용: OCR을 거친 듯한 영어 문서 텍스트 1개 (요약·임베딩·청킹 공용) ────────
@pytest.fixture
def sample_doc_text() -> str:
    """게임엔진(Unity) 영어 문서 한 토막. 문서 대부분이 영어라는 도메인 가정 반영."""
    return (
        "The Scripting API lets you control GameObject behaviour at runtime. "
        "Use MonoBehaviour callbacks such as Update and FixedUpdate to drive logic. "
        "Avoid heavy allocations inside Update to keep frame time stable."
    )


# ── 공용: 결정적 임베더 / FlagEmbedding 가짜 모델 ───────────────────────────
@pytest.fixture
def fake_embedder():
    """결정적 임베더(dense/sparse). 같은 입력 → 같은 벡터. (dim = 설정 embed_dim)"""
    from tests.support.fake_embedder import FakeEmbedder

    return FakeEmbedder()


@pytest.fixture
def fake_flag_model():
    """get_flag_model() 대체용 가짜 모델. monkeypatch로 주입해 sparse 경로를 테스트.

        monkeypatch.setattr("app.services.rag_service.get_flag_model",
                            lambda: fake_flag_model)
    """
    from tests.support.fake_embedder import FakeFlagModel

    return FakeFlagModel()


# ── 공용: Ollama chat(SSE 토큰 스트림) mock ─────────────────────────────────
@pytest.fixture
def mock_ollama_chat(respx_mock):
    """Ollama chat 스트림을 가로채 지정 토큰들을 NDJSON 스트림으로 돌려준다.

        mock_ollama_chat(["안", "녕"])   # generate_stream이 "안","녕" 순서로 yield
    """
    from tests.support import fake_ollama

    def _mock(tokens: list[str], status_code: int = 200):
        return fake_ollama.respond_chat_stream(respx_mock, tokens, status_code=status_code)

    return _mock


# ── 아래는 구현이 정해지면 채울 공용 fixture 자리 ──────────────────────────
#
# @pytest.fixture
# def client():
#     """FastAPI TestClient. main.py lifespan(init_db/qdrant/presence/모델로드)을
#     우회해야 하므로 의존성 오버라이드/lifespan 비활성화 설계 필요 → 요청 2·3."""
#     ...
#
# @pytest.fixture
# async def async_client():
#     """SSE 스트리밍 검증용 httpx.AsyncClient(ASGITransport). → 요청 2·3."""
#     ...
