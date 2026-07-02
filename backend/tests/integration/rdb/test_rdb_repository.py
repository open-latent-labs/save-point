"""RDB 리포지토리 통합 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: RDB 스키마/모델 매핑 (app/models/*, app/db/rdb.py)

외부 의존성: 인메모리 SQLite AsyncSession(db_session fixture, 같은 폴더 conftest.py).
무거운 testcontainers PostgreSQL 대신 동일한 SQLAlchemy 모델을 SQLite에 올려
모델 매핑·기본값·제약(UNIQUE / Enum / FK CASCADE)이 의도대로 동작하는지 검증한다.
"""
import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.models.document import Document
from app.models.enums import DocumentStatus, NotificationType, UserBan, UserRole
from app.models.notification import Notification
from app.models.user import User
from tests.support.factories import make_document, make_user, new_id

pytestmark = pytest.mark.integration


# ── 왕복: 유저 1건 저장 후 조회하면 같은 값이 나온다 ────────────────────────
async def test_insert_and_fetch_user_roundtrips(db_session):
    """User를 저장하고 PK로 다시 읽으면 저장한 email이 그대로 조회된다."""
    # Arrange
    user = make_user(email="roundtrip@example.com")
    db_session.add(user)
    await db_session.commit()

    # Act
    fetched = await db_session.get(User, user.id)

    # Assert
    assert fetched.email == "roundtrip@example.com"


# ── 기본값: 명시하지 않은 컬럼은 모델 기본값으로 채워진다 ───────────────────
async def test_user_defaults_applied_on_insert(db_session):
    """role/ban/ask_count를 지정하지 않고 저장하면 기본값이 적용된다."""
    # Arrange: role만 기본(USER)로 두고 나머지 기본값 확인
    user = make_user()
    db_session.add(user)
    await db_session.commit()

    # Act
    fetched = await db_session.get(User, user.id)

    # Assert: 핵심 한 가지 — ban 기본값이 UNBAN 이다
    assert fetched.ban is UserBan.UNBAN


# ── 제약(UNIQUE): 같은 email로 두 번 저장하면 무결성 오류가 난다 ────────────
async def test_duplicate_email_raises_integrity_error(db_session):
    """email은 unique 제약이라 중복 저장 시 IntegrityError가 발생한다."""
    # Arrange: 첫 유저 저장
    db_session.add(make_user(email="dup@example.com"))
    await db_session.commit()

    # Act / Assert: 같은 email의 두 번째 유저 저장 → 무결성 위반
    db_session.add(make_user(email="dup@example.com"))
    with pytest.raises(IntegrityError):
        await db_session.commit()


# ── 매핑(Enum): status Enum이 그대로 저장·복원된다 ──────────────────────────
async def test_document_status_enum_roundtrips(db_session):
    """Document.status에 넣은 Enum 값이 조회 시 같은 Enum으로 복원된다."""
    # Arrange: 업로더 유저 + APPROVED 상태 문서
    user = make_user()
    doc = make_document(uploaded_by_id=user.id, status=DocumentStatus.APPROVED)
    db_session.add_all([user, doc])
    await db_session.commit()

    # Act
    fetched = await db_session.get(Document, doc.id)

    # Assert
    assert fetched.status is DocumentStatus.APPROVED


# ── 제약(FK CASCADE): 유저를 지우면 그 유저의 알림도 함께 삭제된다 ──────────
async def test_deleting_user_cascades_to_notifications(db_session):
    """notifications.user_id는 ON DELETE CASCADE라 유저 삭제 시 알림도 지워진다."""
    # Arrange: 유저 1명 + 그 유저의 알림 1건
    user = make_user()
    noti = Notification(
        id=new_id(),
        user_id=user.id,
        type=NotificationType.DOCUMENT_APPROVED,
        ref_id=1,
        message="문서가 승인되었습니다.",
    )
    db_session.add_all([user, noti])
    await db_session.commit()

    # Act: DB 레벨 DELETE로 유저 삭제(ORM 파이썬-cascade가 아닌 FK 제약을 검증)
    await db_session.execute(delete(User).where(User.id == user.id))
    await db_session.commit()

    # Assert: 핵심 한 가지 — 남은 알림이 0건이다
    remaining = (await db_session.execute(select(Notification))).scalars().all()
    assert remaining == []
