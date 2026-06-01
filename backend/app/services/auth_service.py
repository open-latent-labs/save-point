from sqlalchemy.orm import Session
from app.db.models import User
from app.schemas.auth_schema import UserCreate
from app.core.security import hash_password

def get_user(db: Session, id: int):
    return db.query(User).filter(User.id == id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    db_user = User(
        email=user.email,
        password=hash_password(user.password),
        name=user.name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, id: int):
    db_user = get_user(db, id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user