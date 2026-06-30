"""문서 CRUD 통합 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/crud/document.py (request_public / bookmark / pin 등)

외부 의존성: RDB. 무거운 컨테이너 대신 인메모리 SQLite 세션(db_session fixture)으로
동일 모델/쿼리를 검증한다. (fixture는 같은 폴더 conftest.py 참고)
"""
import pytest
from fastapi import HTTPException

from app.crud.document import bookmark, pin, request_public
from app.models.document import Document
from app.models.enums import DocumentStatus, UserRole
from tests.support.factories import make_document, make_user

pytestmark = pytest.mark.integration


# ── 공용문서 전환 요청: 일반 유저가 요청하면 PENDING 상태가 된다 ────────────
async def test_request_public_by_normal_user_sets_status_pending(db_session):
    """일반 유저가 request_public 하면 문서가 승인 대기(PENDING)로 바뀐다."""
    # Arrange: 일반 유저 + 본인이 올린 DONE 상태 문서
    user = make_user(role=UserRole.USER)
    doc = make_document(uploaded_by_id=user.id, status=DocumentStatus.DONE)
    db_session.add_all([user, doc])
    await db_session.commit()

    # Act
    await request_public(db_session, doc.id, user.id)

    # Assert: 핵심 한 가지 — 상태가 PENDING 으로 전이됐는가
    refreshed = await db_session.get(Document, doc.id)
    assert refreshed.status == DocumentStatus.PENDING


# ── 엣지: 관리자가 요청하면 대기 없이 바로 APPROVED 된다 ────────────────────
async def test_request_public_by_admin_directly_approves(db_session):
    """관리자가 request_public 하면 PENDING 을 건너뛰고 즉시 APPROVED 된다."""
    # Arrange: ADMIN 유저 + 본인 문서
    admin = make_user(role=UserRole.ADMIN)
    doc = make_document(uploaded_by_id=admin.id, status=DocumentStatus.DONE)
    db_session.add_all([admin, doc])
    await db_session.commit()

    # Act
    await request_public(db_session, doc.id, admin.id)

    # Assert
    refreshed = await db_session.get(Document, doc.id)
    assert refreshed.status == DocumentStatus.APPROVED


# ── 북마크: 북마크가 없던 문서를 누르면 is_bookmarked=True 가 된다 ──────────
async def test_bookmark_new_document_returns_bookmarked_true(db_session):
    """북마크가 없던 문서에 bookmark 를 호출하면 추가되어 True 를 돌려준다."""
    # Arrange
    user = make_user()
    doc = make_document(uploaded_by_id=user.id)
    db_session.add_all([user, doc])
    await db_session.commit()

    # Act
    result = await bookmark(db_session, doc.id, user.id)

    # Assert
    assert result["is_bookmarked"] is True


# ── 엣지: 고정(pin)은 최대 3개까지, 4번째는 400 ─────────────────────────────
async def test_pin_over_three_documents_raises_400(db_session):
    """이미 3개를 고정한 상태에서 4번째 고정을 시도하면 HTTPException(400)."""
    # Arrange: 유저 1명 + 문서 4개, 그중 3개를 먼저 고정
    user = make_user()
    docs = [make_document(uploaded_by_id=user.id) for _ in range(4)]
    db_session.add_all([user, *docs])
    await db_session.commit()
    for doc in docs[:3]:
        await pin(db_session, doc.id, user.id)

    # Act / Assert
    with pytest.raises(HTTPException) as exc:
        await pin(db_session, docs[3].id, user.id)

    assert exc.value.status_code == 400
