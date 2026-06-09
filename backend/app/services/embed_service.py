# embed_chunks
import httpx
from app.config import get_settings

# store_vectors
from qdrant_client.models import PointStruct
from app.db.vector_db import get_qdrant_client
from app.utils.chunker import ChunkMetadata, ChunkResult
import uuid

settings = get_settings()

# 임베딩
async def embed_chunks(chunks: list[str]) -> list[list[float]]:
    vectors = []

    # 비동기 HTTP 클라이언트를 열고, with 블록이 끝나면 자동 연결 해제.
    # httpx -> requests의 비동기 버전
    async with httpx.AsyncClient() as client:
        for chunk in chunks:
            response = await client.post(
                # Ollama가 로컬에서 HTTP 서버로 떠있음.
                # 임베딩 요청(POST)은 해당 경로로 보내야 함.
                f"{settings.ollama_base_url}/api/embed",
                json={
                    "model": settings.embed_model,
                    "input": chunk,
                },
            )

            data = response.json()
            vectors.append(data["embeddings"][0])

    return vectors #나중에 여기에 값이 제대로 있는지 테스트 후 아래 저장 함수 호출

# 벡터 저장
async def store_vectors(chunks: list[str], vectors: list[list[float]], metadata: ChunkMetadata,) -> list[ChunkResult]:
    # qdrant 세션 시작/클라이언트 가져오기
    client = get_qdrant_client()

    point_ids = [str(uuid.uuid4()) for _ in chunks]

    # 청크-벡터 묶음 리스트 만들기 (리스트 컴프리헨션)
    points = [
        PointStruct(
            # 포인트 고유 ID, 각 벡터 구분에 사용.
            # UUID 또는 unsigned int만 지원.
            id=point_id, 
            vector=vector,
            payload={
                "document_id": metadata.document_id,
                "user_id": metadata.user_id,
                "access_type": metadata.access_type,
                "filename": metadata.filename,
                "page_number": metadata.page_number,
                "chunk_index": i,
                "chunk_text": chunk,
            },
        )
        # zip -> 두 리스트를 인덱스 기준으로 묶어줌
        # enumerate -> 인덱스 번호 붙여줌
        # 결과 → [(0, ("청크1 텍스트", [0.1, 0.2])), (1, ("청크2 텍스트", [0.3, 0.4]))]
        for i, (point_id, chunk, vector) in enumerate(zip(point_ids, chunks, vectors))
    ]

    await client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points, # 같은 아이디면 덮어쓰고 없으면 추가함
    )

    # RDB 저장용 청크 정보
    return [ 
        ChunkResult(
            vector_point_id=point_id,
            chunk_index=i,
            chunk_text=chunk,
            page_number=metadata.page_number,
        )
        for i, (point_id, chunk) in enumerate(zip(point_ids, chunks))
    ]