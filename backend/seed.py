"""
더미 데이터 시드 스크립트
Usage: uv run python seed.py
"""
import asyncio
from datetime import datetime, timezone, timedelta

from passlib.context import CryptContext
from python_ulid import ULID
from sqlalchemy import select

from app.db.rdb import AsyncSessionLocal
from app.models.document import Document
from app.models.enums import (
    Category, DocumentAccess, DocumentStatus, UserBan, UserRole,
)
from app.models.summary_llm_result import SummaryLlmResult
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def new_id() -> str:
    return str(ULID())


# ── 유저 정의 ────────────────────────────────────────────────────
USERS = [
    {
        "name": "테스트유저01",
        "user_id": "testuser01",
        "email": "user001@gamedocs.ai",
        "password": "Admin1234!",
        "role": UserRole.ADMIN,
    },
    {
        "name": "테스트유저04",
        "user_id": "testuser04",
        "email": "user004@gamedocs.ai",
        "password": "User1234!",
        "role": UserRole.USER,
    },
]

# ── 문서 정의 ────────────────────────────────────────────────────
# admin(user001): DONE 상태 — "바로 공용 등록" 버튼이 활성화되는 상태
ADMIN_DOCS = [
    {
        "filename": "Unity_Shader_Programming_Guide.pdf",
        "extension": "pdf",
        "file_size": 1_234_567,
        "status": DocumentStatus.DONE,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.ENGINE_REFERENCE,
        "summary": "Unity 셰이더 프로그래밍의 기초부터 고급 기법까지 다루는 레퍼런스 문서입니다.",
    },
    {
        "filename": "Unreal_Performance_Optimization.pdf",
        "extension": "pdf",
        "file_size": 2_345_678,
        "status": DocumentStatus.DONE,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.ARCHITECTURE,
        "summary": "언리얼 엔진 5 환경에서의 CPU/GPU 병목 분석 및 최적화 전략을 설명합니다.",
    },
    {
        "filename": "Game_Architecture_Patterns.md",
        "extension": "md",
        "file_size": 45_678,
        "status": DocumentStatus.DONE,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.ARCHITECTURE,
        "summary": "ECS, 컴포넌트 패턴, 서비스 로케이터 등 게임 아키텍처 패턴을 정리한 문서입니다.",
    },
]

# user04: PENDING 상태 — 관리자 승인 문서함에 나타나는 상태
USER04_DOCS = [
    {
        "filename": "Postmortem_RPG_2024.pdf",
        "extension": "pdf",
        "file_size": 3_456_789,
        "status": DocumentStatus.PENDING,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.POSTMORTEM,
        "summary": "2024년 출시된 인디 RPG 개발 과정의 포스트모템 보고서입니다.",
    },
    {
        "filename": "Bug_Analysis_Rendering_Pipeline.docx",
        "extension": "docx",
        "file_size": 567_890,
        "status": DocumentStatus.PENDING,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.BUG_ANALYSIS,
        "summary": "렌더링 파이프라인에서 발생한 Z-fighting 및 깜빡임 버그의 원인 분석 보고서입니다.",
    },
    {
        "filename": "Godot_Tutorial_TileMap.txt",
        "extension": "txt",
        "file_size": 23_456,
        "status": DocumentStatus.PENDING,
        "access_type": DocumentAccess.PRIVATE,
        "category": Category.TUTORIAL,
        "summary": "Godot 4의 TileMap2D를 활용한 2D 맵 제작 튜토리얼입니다.",
    },
]


async def create_user(session, data: dict) -> User:
    existing = await session.execute(select(User).where(User.email == data["email"]))
    user = existing.scalar_one_or_none()
    if user:
        print(f"  [SKIP] 유저 이미 존재: {data['email']}")
        return user

    user = User(
        id=new_id(),
        name=data["name"],
        user_id=data["user_id"],
        email=data["email"],
        password=pwd_context.hash(data["password"]),
        role=data["role"],
        ban=UserBan.UNBAN,
        is_active=True,
    )
    session.add(user)
    print(f"  [CREATE] 유저: {data['email']} ({data['role'].value})")
    return user


async def create_doc(session, user: User, doc_data: dict, offset_days: int) -> None:
    doc_id = new_id()
    created = datetime.now(timezone.utc) - timedelta(days=offset_days)

    doc = Document(
        id=doc_id,
        filename=doc_data["filename"],
        extension=doc_data["extension"],
        file_size=doc_data["file_size"],
        status=doc_data["status"],
        access_type=doc_data["access_type"],
        uploaded_by_id=user.id,
        created_at=created,
        updated_at=created,
    )
    session.add(doc)

    summary = SummaryLlmResult(
        document_id=doc_id,
        category=doc_data["category"],
        summary_ko=doc_data["summary"],
        model_name="gemma2:9b",
        model_version="1.0",
        processed_at=created + timedelta(minutes=2),
    )
    session.add(summary)
    print(f"  [CREATE] 문서: {doc_data['filename']} (status={doc_data['status'].value})")


async def seed():
    async with AsyncSessionLocal() as session:
        print("\n=== 유저 생성 ===")
        admin = await create_user(session, USERS[0])
        user04 = await create_user(session, USERS[1])
        await session.flush()

        print("\n=== admin 문서 생성 (DONE — 바로 공용 등록 가능) ===")
        for i, doc in enumerate(ADMIN_DOCS):
            await create_doc(session, admin, doc, offset_days=10 - i)

        print("\n=== user04 문서 생성 (PENDING — 승인 대기중) ===")
        for i, doc in enumerate(USER04_DOCS):
            await create_doc(session, user04, doc, offset_days=5 - i)

        await session.commit()

    print("\n✓ 시드 완료\n")
    print("  테스트유저01 (ADMIN)  — user001@gamedocs.ai / Admin1234!")
    print("  테스트유저04 (USER)   — user004@gamedocs.ai / User1234!")


if __name__ == "__main__":
    asyncio.run(seed())
