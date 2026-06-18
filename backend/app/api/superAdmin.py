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


router = APIRouter(
    prefix="/superAdmin",
    tags=["superAdmin"],
    dependencies=[Depends(require_super_admin)],
)

@router.post("/change_role")
async def change_role(body: ChangeRoleRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(require_super_admin)):
    return await crud_change_role(db,user_id ,body)

@router.post("/ban_user")
async def ban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db)):
    return await crud_ban_user(db, body)

@router.post("/unban_user")
async def unban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db)):
    return await crud_unban_user(db, body)

@router.get("/all_user_list")
async def all_user_list(body: Annotated[UserListQuery, Query()],
                        db: AsyncSession = Depends(get_db)):
    return await crud_all_user_list(db, body)

@router.post("/dashboard_num")
async def dashboard_num(db: AsyncSession = Depends(get_db)):
    return await crud_dashboard_num(db)
