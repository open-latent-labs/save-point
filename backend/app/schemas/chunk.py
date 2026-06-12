from pydantic import BaseModel

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

class ChunkResult(BaseModel):
    vector_point_id: str
    chunk_index: int
    chunk_text: str
    page_number: int