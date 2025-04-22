from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import EmailStr, BaseModel
from typing import Optional
from backend.app.db.schema import UserRead
from backend.app.db.crud import create_user, get_user, update_user, get_user_by_username, get_user_by_email
from backend.app.core.config import settings
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

router = APIRouter()

SECRET_KEY = "supersecretkey"  # Cambia esto en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class UserRegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    last_login: Optional[datetime] = None

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(user_id)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserRead, status_code=201)
def register_user(user: UserRegisterIn):
    if get_user_by_username(user.username) or get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")
    hashed_password = get_password_hash(user.password)
    user_data = {
        "username": user.username,
        "email": user.email,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    user_id = create_user(user_data)
    user_data["_id"] = user_id
    return user_data

@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/profile", response_model=UserRead)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserRead)
async def update_profile(update: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if update.email is not None:
        update_data["email"] = update.email
    if update.last_login is not None:
        update_data["last_login"] = update.last_login
    if update_data:
        update_user(str(current_user["_id"]), update_data)
        current_user.update(update_data)
    return current_user
