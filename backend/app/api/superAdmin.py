from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_super_admin
from app.schemas.superAdmin import ChangeRoleRequest, ChangeBanRequest, UserListQuery
from app.crud.superAdmin import change_role as crud_change_role
from app.crud.superAdmin import ban_user as crud_ban_user
from app.crud.superAdmin import unban_user as crud_unban_user
from app.crud.superAdmin import all_user_list as crud_all_user_list
from app.crud.superAdmin import dashboard_num as crud_dashboard_num
from app.crud.superAdmin import get_user_role_log as crud_get_user_role_log


router = APIRouter(
    prefix="/superAdmin",
    tags=["superAdmin"],
    dependencies=[Depends(require_super_admin)],
)

@router.post("/change_role")
async def change_role(body: ChangeRoleRequest, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_super_admin)):
    return await crud_change_role(db, body, payload["sub"])

@router.post("/ban_user")
async def ban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_super_admin)):
    return await crud_ban_user(db, body, payload["sub"])

@router.post("/unban_user")
async def unban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_super_admin)):
    return await crud_unban_user(db, body, payload["sub"])

@router.get("/all_user_list")
async def all_user_list(body: Annotated[UserListQuery, Query()],
                        db: AsyncSession = Depends(get_db)):
    return await crud_all_user_list(db, body)

@router.post("/dashboard_num")
async def dashboard_num(db: AsyncSession = Depends(get_db)):
    return await crud_dashboard_num(db)

@router.get("/user_role_log/{user_id}")
async def user_role_log(user_id: str, db: AsyncSession = Depends(get_db)):
    return await crud_get_user_role_log(db, user_id)
