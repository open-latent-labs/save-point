"""결정적 가짜 임베더 [담당: 김윤] — 실제 bge-m3/Ollama 없이 RAG 테스트를 재현 가능하게.

실제 코드의 임베딩 경로는 두 갈래라 가짜도 둘을 제공한다.
  1) Dense  : Ollama HTTP(`ollama_embed_url`) → {"embeddings": [[...], ...]}
              → `FakeEmbedder.dense()` / `embeddings_body()` (respx 응답용)
  2) Sparse : FlagEmbedding `get_flag_model().encode(...)` → {"lexical_weights": [...]}
              → `FakeFlagModel` (get_flag_model 패치용)

핵심 성질: **같은 입력 → 항상 같은 벡터** (hashlib 사용, 프로세스 간에도 동일).
숫자 자체는 의미 없고 "결정적이라 검색/유사도 단언이 재현된다"는 점만 보장한다.

사용 예)
    emb = FakeEmbedder(dim=8)
    v = emb.dense("hello")            # list[float], 길이 8, 동일 입력 동일 출력
    body = emb.embeddings_body(["a"]) # {"embeddings": [[...]]}  ← respx로 embed 응답
    monkeypatch.setattr("app.services.rag_service.get_flag_model",
                        lambda: FakeFlagModel())
"""
from __future__ import annotations

import hashlib
import struct


def _hash_floats(text: str, dim: int) -> list[float]:
    """text로부터 [-1, 1] 범위의 결정적 float dim개를 생성."""
    out: list[float] = []
    counter = 0
    while len(out) < dim:
        digest = hashlib.sha256(f"{text}#{counter}".encode("utf-8")).digest()
        for i in range(0, len(digest), 4):
            if len(out) >= dim:
                break
            (n,) = struct.unpack(">I", digest[i : i + 4])
            out.append(n / 0xFFFFFFFF * 2 - 1)  # 0..1 → -1..1
        counter += 1
    return out


def _l2_normalize(vec: list[float]) -> list[float]:
    norm = sum(x * x for x in vec) ** 0.5
    if norm == 0:
        return vec
    return [x / norm for x in vec]


class FakeEmbedder:
    """결정적 dense/sparse 벡터 생성기.

    dim 기본값은 설정의 embed_dim(미가용 시 1024). 테스트에선 작은 dim(예: 8)을 권장.
    """

    def __init__(self, dim: int | None = None, *, normalize: bool = True):
        if dim is None:
            try:
                from app.config import get_settings

                dim = get_settings().embed_dim
            except Exception:
                dim = 1024
        self.dim = dim
        self.normalize = normalize

    # ── Dense ───────────────────────────────────────────────────────────────
    def dense(self, text: str) -> list[float]:
        vec = _hash_floats(text, self.dim)
        return _l2_normalize(vec) if self.normalize else vec

    def dense_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.dense(t) for t in texts]

    def embeddings_body(self, texts: str | list[str]) -> dict:
        """Ollama embed API 응답 형태({"embeddings": [...]})로 반환 — respx 응답용."""
        if isinstance(texts, str):
            texts = [texts]
        return {"embeddings": self.dense_batch(texts)}

    # ── Sparse ──────────────────────────────────────────────────────────────
    def lexical_weights(self, text: str) -> dict[str, float]:
        """FlagEmbedding의 lexical_weights({token_id: weight}) 흉내. 토큰=공백 분리."""
        weights: dict[str, float] = {}
        for token in text.lower().split():
            token_id = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16) % 250002
            raw = int(hashlib.sha256(("w" + token).encode("utf-8")).hexdigest(), 16) % 1000
            weights[str(token_id)] = round(raw / 1000 + 0.001, 4)
        return weights

    def sparse(self, text: str) -> dict:
        """rag_service가 만드는 최종 형태({"indices": [...], "values": [...]})."""
        lw = self.lexical_weights(text)
        return {
            "indices": [int(k) for k in lw],
            "values": [float(v) for v in lw.values()],
        }


class FakeFlagModel:
    """get_flag_model() 대체용 가짜 모델. encode()가 lexical_weights를 돌려준다.

    실제 코드는 model.encode(..., return_sparse=True)의 output["lexical_weights"]만 읽는다.
    """

    def __init__(self, embedder: FakeEmbedder | None = None):
        self._embedder = embedder or FakeEmbedder()

    def encode(
        self,
        sentences,
        return_dense: bool = False,
        return_sparse: bool = False,
        return_colbert_vecs: bool = False,
        **_kwargs,
    ) -> dict:
        if isinstance(sentences, str):
            sentences = [sentences]
        output: dict = {}
        if return_sparse:
            output["lexical_weights"] = [self._embedder.lexical_weights(s) for s in sentences]
        if return_dense:
            output["dense_vecs"] = self._embedder.dense_batch(sentences)
        return output
