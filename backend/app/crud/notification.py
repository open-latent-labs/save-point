import math
import secrets
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update


def _generate_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))


from app.models.notification import Notification
from app.models.approval_log import ApprovalLog
from app.config import settings



async def notification_list(db: AsyncSession, user_id: str):
    items_result = await db.execute(
        select(Notification, ApprovalLog.document_id)
        .join(ApprovalLog, Notification.ref_id == ApprovalLog.id)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    notifications = items_result.all()

    return {
        "items": [
            {
                "id": n.id,
                "type": n.type.value if n.type else None,
                "ref_id": n.ref_id,
                "message": n.message,
                "is_read": n.is_read,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "document_id": document_id,
            }
            for n, document_id in notifications
        ]
    }


async def notification_count(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == user_id)
        .where(Notification.is_read == False)
    )
    return result.scalar_one_or_none()


async def notification_read(notification_id: str, user_id: str, db: AsyncSession):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == user_id)
        .values(is_read=True)
    )
    await db.commit()
    