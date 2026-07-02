"""권한/승인 단위 테스트 [담당: 조형우] — 스타일은 tests/test_reference_sample.py 참고.
대상:
  - app/crud/superAdmin.py  change_role, ban_user, unban_user
  - app/crud/admin.py       admin_approved_docs, admin_rejected_docs
외부 의존성: DB=AsyncMock, Redis=patch, update_document_payload=patch
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.enums import DocumentStatus, UserRole, UserBan
from app.schemas.superAdmin import ChangeBanRequest, ChangeRoleRequest

pytestmark = pytest.mark.unit


# ── 공용 fixture ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    return db


def _db_returns(mock_db, obj):
    """db.execute(...).scalar_one_or_none() 이 obj를 반환하도록 설정."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = obj
    mock_db.execute.return_value = result


def _make_user(role: UserRole, ban: UserBan = UserBan.UNBAN):
    user = MagicMock()
    user.id = "user-1"
    user.role = role
    user.ban = ban
    return user


def _make_doc(status: DocumentStatus = DocumentStatus.PENDING):
    doc = MagicMock()
    doc.id = "doc-1"
    doc.uploaded_by_id = "uploader-1"
    doc.status = status
    return doc


# ════════════════════════════════════════════════════════════════════════════
#  superAdmin.py — change_role
# ════════════════════════════════════════════════════════════════════════════

async def test_change_role_user_to_admin_promotes(mock_db):
    """body.role='USER'이면 대상 유저가 ADMIN으로 승격된다."""
    from app.crud.superAdmin import change_role

    # Arrange
    user = _make_user(UserRole.USER)
    _db_returns(mock_db, user)
    body = ChangeRoleRequest(id="user-1", role="USER")  # role != "ADMIN" → ADMIN으로 변경

    # Act
    await change_role(mock_db, body, user_id="super-1")

    # Assert
    assert user.role == UserRole.ADMIN


async def test_change_role_admin_to_user_demotes(mock_db):
    """body.role='ADMIN'이면 대상 유저가 USER로 강등된다."""
    from app.crud.superAdmin import change_role

    # Arrange
    user = _make_user(UserRole.ADMIN)
    _db_returns(mock_db, user)
    body = ChangeRoleRequest(id="user-1", role="ADMIN")  # role == "ADMIN" → USER로 변경

    # Act
    await change_role(mock_db, body, user_id="super-1")

    # Assert
    assert user.role == UserRole.USER


async def test_change_role_missing_user_raises_404(mock_db):
    """존재하지 않는 유저에 change_role 호출 시 HTTPException(404)."""
    from app.crud.superAdmin import change_role

    # Arrange
    _db_returns(mock_db, None)
    body = ChangeRoleRequest(id="ghost", role="USER")

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await change_role(mock_db, body, user_id="super-1")
    assert exc.value.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
#  superAdmin.py — ban_user / unban_user
# ════════════════════════════════════════════════════════════════════════════

async def test_ban_user_sets_ban_status(mock_db):
    """ban_user 호출 시 유저 ban 상태가 BAN으로 바뀐다."""
    from app.crud.superAdmin import ban_user

    # Arrange
    user = _make_user(UserRole.USER, ban=UserBan.UNBAN)
    _db_returns(mock_db, user)
    body = ChangeBanRequest(id="user-1", ban="UNBAN")

    # Act
    await ban_user(mock_db, body, user_id="super-1")

    # Assert
    assert user.ban == UserBan.BAN


async def test_unban_user_sets_unban_status(mock_db):
    """unban_user 호출 시 유저 ban 상태가 UNBAN으로 바뀐다."""
    from app.crud.superAdmin import unban_user

    # Arrange
    user = _make_user(UserRole.USER, ban=UserBan.BAN)
    _db_returns(mock_db, user)
    body = ChangeBanRequest(id="user-1", ban="BAN")

    # Act
    await unban_user(mock_db, body, user_id="super-1")

    # Assert
    assert user.ban == UserBan.UNBAN


# ════════════════════════════════════════════════════════════════════════════
#  admin.py — admin_approved_docs / admin_rejected_docs
# ════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_redis():
    """aioredis.from_url 패치 헬퍼."""
    redis = AsyncMock()
    redis.publish = AsyncMock()
    redis.aclose = AsyncMock()
    return redis


async def test_admin_approved_docs_sets_status_approved(mock_db, mock_redis):
    """admin_approved_docs 호출 시 문서 상태가 APPROVED로 전환된다."""
    from app.crud.admin import admin_approved_docs

    # Arrange
    doc = _make_doc(DocumentStatus.PENDING)
    _db_returns(mock_db, doc)

    with patch("app.crud.admin.update_document_payload", AsyncMock()), \
         patch("app.crud.admin.aioredis.from_url", return_value=mock_redis):

        # Act
        await admin_approved_docs(mock_db, "doc-1", "admin-1")

    # Assert
    assert doc.status == DocumentStatus.APPROVED


async def test_admin_approved_docs_missing_doc_raises_404(mock_db):
    """존재하지 않는 문서에 admin_approved_docs 호출 시 HTTPException(404)."""
    from app.crud.admin import admin_approved_docs

    # Arrange
    _db_returns(mock_db, None)

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await admin_approved_docs(mock_db, "ghost-doc", "admin-1")
    assert exc.value.status_code == 404


async def test_admin_rejected_docs_sets_status_rejected(mock_db, mock_redis):
    """admin_rejected_docs 호출 시 문서 상태가 REJECTED로 전환된다."""
    from app.crud.admin import admin_rejected_docs

    # Arrange
    doc = _make_doc(DocumentStatus.PENDING)
    _db_returns(mock_db, doc)

    with patch("app.crud.admin.aioredis.from_url", return_value=mock_redis):

        # Act
        await admin_rejected_docs(mock_db, "doc-1", "admin-1")

    # Assert
    assert doc.status == DocumentStatus.REJECTED


async def test_admin_rejected_docs_missing_doc_raises_404(mock_db):
    """존재하지 않는 문서에 admin_rejected_docs 호출 시 HTTPException(404)."""
    from app.crud.admin import admin_rejected_docs

    # Arrange
    _db_returns(mock_db, None)

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await admin_rejected_docs(mock_db, "ghost-doc", "admin-1")
    assert exc.value.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
#  superAdmin.py — ban_user / unban_user 엣지 케이스
# ════════════════════════════════════════════════════════════════════════════

async def test_ban_user_missing_user_raises_404(mock_db):
    """존재하지 않는 유저에 ban_user 호출 시 HTTPException(404)."""
    from app.crud.superAdmin import ban_user

    # Arrange
    _db_returns(mock_db, None)
    body = ChangeBanRequest(id="ghost", ban="UNBAN")

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await ban_user(mock_db, body, user_id="super-1")
    assert exc.value.status_code == 404


async def test_unban_user_missing_user_raises_404(mock_db):
    """존재하지 않는 유저에 unban_user 호출 시 HTTPException(404)."""
    from app.crud.superAdmin import unban_user

    # Arrange
    _db_returns(mock_db, None)
    body = ChangeBanRequest(id="ghost", ban="BAN")

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await unban_user(mock_db, body, user_id="super-1")
    assert exc.value.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
#  admin.py — admin_cancel_pending / admin_publish_docs
# ════════════════════════════════════════════════════════════════════════════

async def test_admin_cancel_pending_sets_status_done(mock_db):
    """admin_cancel_pending 호출 시 문서 상태가 DONE으로 전환된다."""
    from app.crud.admin import admin_cancel_pending

    # Arrange
    doc = _make_doc(DocumentStatus.PENDING)
    _db_returns(mock_db, doc)

    # Act
    await admin_cancel_pending(mock_db, "doc-1")

    # Assert
    assert doc.status == DocumentStatus.DONE


async def test_admin_cancel_pending_missing_doc_raises_404(mock_db):
    """존재하지 않는 문서에 admin_cancel_pending 호출 시 HTTPException(404)."""
    from app.crud.admin import admin_cancel_pending

    # Arrange
    _db_returns(mock_db, None)

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await admin_cancel_pending(mock_db, "ghost-doc")
    assert exc.value.status_code == 404


async def test_admin_publish_docs_returns_none_when_doc_missing(mock_db):
    """존재하지 않는 문서에 admin_publish_docs 호출 시 None을 반환한다."""
    from app.crud.admin import admin_publish_docs

    # Arrange
    _db_returns(mock_db, None)

    # Act
    result = await admin_publish_docs(mock_db, "ghost-doc", "admin-1")

    # Assert
    assert result is None
