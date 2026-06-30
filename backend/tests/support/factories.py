# 테스트 객체/데이터 빌더 (코드).
# ※ 정적 데이터 파일(샘플 PDF, 골든 응답 JSON 등)은 tests/fixtures/ 에 두고,
#   여기서는 그 파일을 로드/가공하는 함수만 작성한다.
#   예) def load_sample_pdf() -> Path: return FIXTURES_DIR / "sample.pdf"
from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF
from ulid import ULID

from app.models.document import Document
from app.models.enums import DocumentAccess, DocumentStatus, UserRole
from app.models.user import User

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def new_id() -> str:
    """모델 PK(String(26))용 ULID 문자열."""
    return str(ULID())


# ── PDF 빌더 ────────────────────────────────────────────────────────────────
def make_text_pdf(text: str) -> bytes:
    """주어진 텍스트를 '선택 가능한 네이티브 텍스트'로 담은 PDF 바이트를 만든다.

    그림이 아닌 텍스트 레이어라, OCR 파이프라인이 무거운 엔진(paddle/surya)을
    거치지 않고 NATIVE 추출 경로를 타게 된다. 정적 바이너리를 저장소에 커밋하지
    않기 위해 테스트 시점에 결정적으로 생성한다.
    """
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for line in text.split("\n"):
        page.insert_text((72, y), line, fontsize=12)
        y += 18
    data = doc.tobytes()
    doc.close()
    return data


# ── ORM 모델 빌더 ────────────────────────────────────────────────────────────
def make_user(role: UserRole = UserRole.USER, **overrides) -> User:
    """기본값이 채워진 User 인스턴스. unique 컬럼(email/user_id)은 매번 새 값."""
    defaults = {
        "id": new_id(),
        "password": "x",
        "email": f"{new_id()}@example.com",
        "name": "tester",
        "user_id": new_id(),
        "role": role,
    }
    defaults.update(overrides)
    return User(**defaults)


def make_document(
    uploaded_by_id: str,
    status: DocumentStatus = DocumentStatus.DONE,
    access_type: DocumentAccess = DocumentAccess.PRIVATE,
    **overrides,
) -> Document:
    """기본값이 채워진 Document 인스턴스."""
    defaults = {
        "id": new_id(),
        "filename": "sample.pdf",
        "extension": ".pdf",
        "file_size": 1024,
        "uploaded_by_id": uploaded_by_id,
        "status": status,
        "access_type": access_type,
    }
    defaults.update(overrides)
    return Document(**defaults)
