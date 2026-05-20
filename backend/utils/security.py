"""
安全相关工具函数
密码加密、JWT令牌生成和验证
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Header, HTTPException
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import ValidationError
from backend.schemas import TokenData

# 密码加密配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
SECRET_KEY = "your-secret-key-change-this-in-production"  # 生产环境应使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24小时


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码
    
    Args:
        plain_password: 明文密码
        hashed_password: 密码哈希值
    
    Returns:
        密码是否正确
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:   #注册时，把用户密码变成一串乱码，存进数据库
    """
    获取密码哈希值
    
    Args:
        password: 明文密码
    
    Returns:
        密码哈希值
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建访问令牌
    
    Args:
        data: 要编码的数据
        expires_delta: 过期时间间隔
    
    Returns:
        JWT令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(authorization: Optional[str] = Header(None)) -> TokenData:
    """
    从请求头获取当前登录用户（FastAPI 依赖注入）
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="无效的认证方案")
    except ValueError:
        raise HTTPException(status_code=401, detail="无效的 Authorization header 格式")

    token_data = verify_token(token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")
    return token_data


def verify_token(token: str) -> Optional[TokenData]:  #接口鉴权用
    """
    验证令牌
    
    Args:
        token: JWT令牌
    
    Returns:
        令牌数据，如果验证失败则返回None
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        username: str = payload.get("username")
        role: str = payload.get("role")
        
        if user_id is None or username is None:
            return None
        
        token_data = TokenData(user_id=user_id, username=username, role=role)
        return token_data
    except (JWTError, ValidationError):
        return None
