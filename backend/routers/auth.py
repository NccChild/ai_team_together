"""
认证相关API路由
处理用户登录、令牌验证等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Member
from backend.schemas import LoginRequest, LoginResponse, UserInfo
from backend.utils.security import verify_password, create_access_token, verify_token
from backend.utils.response import success_response, error_response
from datetime import timedelta

router = APIRouter()


@router.post("/auth/login", response_model=dict)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    用户登录接口
    
    Args:
        login_data: 登录请求数据
        db: 数据库连接
    
    Returns:
        登录响应，包含访问令牌和用户信息
    """
    # 查找用户
    member = db.query(Member).filter(Member.username == login_data.username).first()
    
    if not member:
        return error_response(code="INVALID_CREDENTIALS", message="用户名或密码错误")
    
    # 检查用户状态
    if member.status != "active":
        return error_response(code="USER_INACTIVE", message="用户账户已禁用")
    
    # 验证密码
    if not verify_password(login_data.password, member.password_hash):
        return error_response(code="INVALID_CREDENTIALS", message="用户名或密码错误")
    
    # 创建令牌
    access_token_expires = timedelta(minutes=24 * 60)  # 24小时
    access_token = create_access_token(
        data={
            "user_id": member.id,
            "username": member.username,
            "role": member.role,
        },
        expires_delta=access_token_expires
    )
    
    # 返回响应
    user_info = {
        "id": member.id,
        "username": member.username,
        "name": member.name,
        "role": member.role,
        "email": member.email,
        "unit": member.unit,
    }
    
    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_info,
        }
    )


@router.get("/auth/me", response_model=dict)
async def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    获取当前登录用户信息
    
    Args:
        authorization: Authorization header 的值
        db: 数据库连接
    
    Returns:
        当前用户信息
    """
    if not authorization:
        return error_response(code="NO_TOKEN", message="缺少认证令牌")
    
    # 提取 token（格式: "Bearer token"）
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return error_response(code="INVALID_SCHEME", message="无效的认证方案")
    except ValueError:
        return error_response(code="INVALID_HEADER", message="无效的 Authorization header 格式")
    
    # 验证令牌
    token_data = verify_token(token)
    
    if token_data is None:
        return error_response(code="INVALID_TOKEN", message="令牌无效或已过期")
    
    # 获取用户信息
    member = db.query(Member).filter(Member.id == token_data.user_id).first()
    
    if not member:
        return error_response(code="USER_NOT_FOUND", message="用户不存在")
    
    user_info = {
        "id": member.id,
        "username": member.username,
        "name": member.name,
        "role": member.role,
        "email": member.email,
        "unit": member.unit,
    }
    
    return success_response(data=user_info)
