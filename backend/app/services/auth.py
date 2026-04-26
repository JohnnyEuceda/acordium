from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import User
from app.repositories.users import UserRepository


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)
        self.settings = get_settings()

    def register(self, email: str, password: str) -> User:
        if self.users.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        return self.users.create(email=email, password_hash=password_context.hash(password))

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not password_context.verify(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        return user

    def create_access_token(self, user: User) -> str:
        expires = datetime.now(UTC) + timedelta(minutes=self.settings.access_token_expire_minutes)
        payload = {"sub": str(user.id), "email": user.email, "exp": expires}
        return jwt.encode(payload, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm)

    def user_from_token(self, token: str) -> User:
        credentials_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, self.settings.jwt_secret, algorithms=[self.settings.jwt_algorithm])
            user_id = payload.get("sub")
        except JWTError as exc:
            raise credentials_error from exc
        if not user_id:
            raise credentials_error
        user = self.users.get(user_id)
        if not user:
            raise credentials_error
        return user
