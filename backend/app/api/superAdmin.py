from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_super_admin
from app.schemas.superAdmin import ChangeRoleRequest, ChangeBanRequest, UserListQuery
from app.crud.superAdmin import change_role 
from app.crud.superAdmin import ban_user 
from app.crud.superAdmin import unban_user 
from app.crud.superAdmin import all_user_list 
from app.crud.superAdmin import dashboard_num


router = APIRouter(
    prefix="/superAdmin",
    tags=["superAdmin"],
    dependencies=[Depends(require_super_admin)],
)

@router.post("/change_role")
async def change_role(body: ChangeRoleRequest, db: AsyncSession = Depends(get_db)):
    result = await change_role(db, body)
    return result

@router.post("/ban_user")
async def ban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db)):
    result = await ban_user(db, body)
    return result

@router.post("/unban_user")
async def unban_user(body: ChangeBanRequest, db: AsyncSession = Depends(get_db)):
    result = await unban_user(db, body)
    return result


@router.get("/all_user_list")
async def all_user_list(body: Annotated[UserListQuery, Query()],
                        db: AsyncSession = Depends(get_db)):
    result = await all_user_list(db, body)
    return result


@router.post("/dashboard_num")
async def dashboard_num(db: AsyncSession = Depends(get_db)):
    result = await dashboard_num(db)
    return result
