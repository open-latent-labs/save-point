"""요약 문서 라우트 단위 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/api/summary.py + app/crud/summary.py (요약 문서 조회/수정/삭제)
외부 의존성: DB=AsyncMock, vector_docs.update_document_payload=patch
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.enums import Category, DocumentAccess, DocumentStatus

pytestmark = pytest.mark.unit


# ── 공용 fixture ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    return db


def _make_document(**overrides):
    doc = MagicMock()
    defaults = {
        "id": "doc-1",
        "filename": "sample.pdf",
        "extension": ".pdf",
        "file_size": 1024,
        "access_type": DocumentAccess.PRIVATE,
        "status": DocumentStatus.DONE,
        "created_at": None,
        "deleted_by_id": None,
        "deleted_at": None,
    }
    defaults.update(overrides)
    for key, value in defaults.items():
        setattr(doc, key, value)
    return doc


def _make_summary_result(**overrides):
    summary = MagicMock()
    defaults = {"category": Category.SCRIPTING, "summary_ko": "요약 내용"}
    defaults.update(overrides)
    for key, value in defaults.items():
        setattr(summary, key, value)
    return summary


def _one_or_none_result(value):
    result = MagicMock()
    result.one_or_none.return_value = value
    return result


def _scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _scalars_all_result(values):
    result = MagicMock()
    result.scalars.return_value.all.return_value = values
    return result


# ════════════════════════════════════════════════════════════════════════════
#  document_content — 요약 문서 조회
# ════════════════════════════════════════════════════════════════════════════

# ── 조회: 문서 id로 요약 문서를 가져온다 ────────────────────────────────────
async def test_document_content_returns_summary(mock_db):
    """존재하는 document_id로 요약 본문을 조회한다."""
    from app.crud.summary import document_content

    # Arrange
    doc = _make_document()
    summary = _make_summary_result()
    mock_db.execute.return_value = _one_or_none_result((doc, summary))

    # Act
    result = await document_content(mock_db, "doc-1")

    # Assert
    assert result["summary"]["summary"] == "요약 내용"


# ── 조회 엣지: 존재하지 않는 문서는 None을 반환한다 ─────────────────────────
async def test_document_content_missing_document_returns_none(mock_db):
    """document_id에 해당하는 문서가 없으면 None을 반환한다."""
    from app.crud.summary import document_content

    # Arrange
    mock_db.execute.return_value = _one_or_none_result(None)

    # Act
    result = await document_content(mock_db, "ghost")

    # Assert
    assert result is None


# ── 조회 엣지: user_id가 있으면 북마크/핀 여부를 함께 반환한다 ──────────────
async def test_document_content_with_user_sets_bookmark_flag(mock_db):
    """user_id가 북마크한 문서를 조회하면 is_bookmarked가 True다."""
    from app.crud.summary import document_content

    # Arrange
    doc = _make_document()
    summary = _make_summary_result()
    mock_db.execute.side_effect = [
        _one_or_none_result((doc, summary)),
        _scalar_result(MagicMock()),  # 북마크 존재
        _scalar_result(None),  # 핀 없음
    ]

    # Act
    result = await document_content(mock_db, "doc-1", user_id="user-1")

    # Assert
    assert result["document"]["is_bookmarked"] is True


# ════════════════════════════════════════════════════════════════════════════
#  delete_documnet — 문서 삭제
# ════════════════════════════════════════════════════════════════════════════

# ── 삭제: 본인 문서를 삭제한다 ──────────────────────────────────────────────
async def test_delete_document_owner_removes_doc(mock_db):
    """소유자가 자신의 문서를 삭제하면 정상 처리된다."""
    from app.crud.summary import delete_documnet

    # Arrange
    doc = _make_document()
    mock_db.execute.side_effect = [
        _scalar_result(doc),
        _scalars_all_result([]),
        _scalars_all_result([]),
    ]

    with patch("app.crud.summary.update_document_payload", AsyncMock()):
        # Act
        result = await delete_documnet(mock_db, "doc-1", user_id="owner-1")

    # Assert
    assert result == {"deleted": True}


# ── 삭제 엣지: 존재하지 않는 문서는 None을 반환한다 ─────────────────────────
async def test_delete_document_missing_doc_returns_none(mock_db):
    """document_id에 해당하는 문서가 없으면 None을 반환한다."""
    from app.crud.summary import delete_documnet

    # Arrange
    mock_db.execute.return_value = _scalar_result(None)

    # Act
    result = await delete_documnet(mock_db, "ghost", user_id="owner-1")

    # Assert
    assert result is None


# ════════════════════════════════════════════════════════════════════════════
#  document_update_access — 요약 본문 수정
# ════════════════════════════════════════════════════════════════════════════

# ── 수정: 요약 본문을 새 내용으로 바꾼다 ────────────────────────────────────
async def test_document_update_access_updates_summary_content(mock_db):
    """document_update_access 호출 시 summary_ko가 새 내용으로 바뀐다."""
    from app.crud.summary import document_update_access

    # Arrange
    summary = _make_summary_result()
    mock_db.execute.return_value = _scalar_result(summary)

    # Act
    await document_update_access(mock_db, "doc-1", "새로운 요약")

    # Assert
    assert summary.summary_ko == "새로운 요약"


# ── 수정 엣지: 존재하지 않는 문서는 None을 반환한다 ─────────────────────────
async def test_document_update_access_missing_doc_returns_none(mock_db):
    """document_id에 해당하는 요약이 없으면 None을 반환한다."""
    from app.crud.summary import document_update_access

    # Arrange
    mock_db.execute.return_value = _scalar_result(None)

    # Act
    result = await document_update_access(mock_db, "ghost", "새로운 요약")

    # Assert
    assert result is None
