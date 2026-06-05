from pydantic import BaseModel
from app.config import get_settings

settings = get_settings()

class ChunkMetadata(BaseModel):
    document_id: str
    user_id: str
    access_type: str
    filename: str
    page_number: int
    chunk_index: int
    chunk_text: str


class ChunkInput(BaseModel):
    raw_text: str
    metadata: ChunkMetadata

# (이거 받아서) -> 이거 반환해요 :: 미리 반환값 표시해주는 문법
def chunk_text(raw_text: str) -> list[str]:
    words = raw_text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + settings.chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += settings.chunk_size - settings.chunk_overlap

    return chunks #청크 조각 담긴 리스트 반환 