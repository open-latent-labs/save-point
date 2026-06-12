from app.config import get_settings

settings = get_settings()

# (이거 받아서) -> 이거 반환해요 :: 미리 반환값 표시해주는 문법
def split_into_chunks(raw_text: str) -> list[str]:
    words = raw_text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + settings.chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += settings.chunk_size - settings.chunk_overlap

    return chunks #청크 조각 담긴 리스트 반환 