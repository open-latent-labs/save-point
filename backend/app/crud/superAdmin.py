from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException

from app.models.user import User
from app.models.enums import UserRole, UserBan
from app.models.user_role_log import UserRoleLog
from app.schemas.superAdmin import ChangeRoleRequest, ChangeBanRequest, UserResponse, UserListQuery


async def change_role(db: AsyncSession, body: ChangeRoleRequest, user_id: str):
    result = await db.execute(select(User).where(User.id == body.id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role == "ADMIN":
        user.role = UserRole.USER

        user_role_log = UserRoleLog(
            target_user_id = body.id,
            changed_by_user_id = user_id,
            before_role = UserRole.ADMIN,
            after_role = UserRole.USER,
            reason = "ADMIN에서 USER로 변경",
        )
        db.add(user_role_log)
        await db.flush()  # DB가 approval_log.id(BIGINT Identity)를 할당하도록


    else:
        user.role = UserRole.ADMIN

        user_role_log = UserRoleLog(
            target_user_id = body.id,
            changed_by_user_id = user_id,
            before_role = UserRole.USER,
            after_role = UserRole.ADMIN,
            reason = "USER에서 ADMIN으로 변경",
        )
        db.add(user_role_log)
        await db.flush()

    await db.commit()
    await db.refresh(user)

    return user

async def ban_user(db: AsyncSession, body: ChangeBanRequest):
    result = await db.execute(select(User).where(User.id == body.id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.ban = UserBan.BAN

    await db.commit()
    await db.refresh(user)

    return user

async def unban_user(db: AsyncSession, body: ChangeBanRequest):
    result = await db.execute(select(User).where(User.id == body.id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.ban = UserBan.UNBAN

    await db.commit()
    await db.refresh(user)

    return user

async def all_user_list(db: AsyncSession, body: UserListQuery):
    page = body.page
    size = body.size
    role = body.role
    is_active = body.is_active

    role_filter = {"USER": UserRole.USER, "ADMIN": UserRole.ADMIN}.get(role)

    offset = (page - 1) * size

    conditions = [User.role != UserRole.SUPER_ADMIN]
    if role_filter is not None:
        conditions.append(User.role == role_filter)
    if is_active is not None:
        conditions.append(User.is_active == is_active)

    total_result = await db.execute(select(func.count()).select_from(User).where(*conditions))
    total = total_result.scalar()

    result = await db.execute(select(User).where(*conditions).offset(offset).limit(size))
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": size,
        "total_pages": (total + size - 1) // size,
        "users": [UserResponse.model_validate(u) for u in users],
    }
    

async def dashboard_num(db: AsyncSession):
    total_result = await db.execute(select(func.count()).select_from(User))
    total = total_result.scalar()

    active_result = await db.execute(select(func.count()).select_from(User).where(User.is_active == True))
    active = active_result.scalar()

    blocked_result = await db.execute(select(func.count()).select_from(User).where(User.is_active == False))
    blocked = blocked_result.scalar()

    admin_result = await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
    admin = admin_result.scalar()

    return {
        "total": total,
        "active": active,
        "admin": admin,
        "blocked":blocked,
    }