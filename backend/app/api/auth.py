import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import SignupRequest, SignupResponse

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _generate_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))


@router.post("/signup", response_model=SignupResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    logger.info("=== 회원가입 요청 수신 ===")
    logger.info(f"이름     : {body.name}")
    logger.info(f"아이디   : {body.username}")
    logger.info(f"이메일   : {body.email}")
    logger.info(f"비밀번호 : {'*' * len(body.password)}")

    # 이메일 중복 확인
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        logger.warning(f"이메일 중복: {body.email}")
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    # 아이디 중복 확인
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        logger.warning(f"아이디 중복: {body.username}")
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    user = User(
        id=_generate_id(),
        email=body.email,
        username=body.username,
        password=pwd_context.hash(body.password),
        role=UserRole.USER,
    )
    db.add(user)
    await db.flush()

    logger.success(f"DB 저장 완료 — id={user.id}, email={user.email}, role={user.role}")

    return SignupResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role.value,
    )
