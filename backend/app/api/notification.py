from fastapi import APIRouter,  Depends
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.crud.notification import notification_list as crud_notification_list, notification_count, notification_read

router = APIRouter(prefix="/notification", tags=["notification"])


@router.post("/list")
async def get_notification_list(db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await crud_notification_list(db, user_id)

@router.post("/count")
async def get_notification_count(db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await notification_count(db, user_id)


@router.put("/read/{notification_id}")
async def get_notification_read(notification_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await notification_read(notification_id, user_id, db)