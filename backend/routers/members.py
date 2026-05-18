"""
人员管理路由
"""

from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.database import get_db
from backend.schemas import (
    MemberCreate, MemberUpdate, MemberResponse, MemberStatusUpdate,
    ListResponse, ResponseModel, PasswordResetRequest
)
from backend.utils.response import success_response, success_list_response, error_response
from backend.utils.exceptions import ResourceNotFoundException, DuplicateResourceException
from backend.utils.security import get_password_hash, verify_token
from backend.models import Member
from backend.config import DEFAULT_PAGE_SIZE

router = APIRouter()

@router.get("/members", response_model=ResponseModel, summary="获取人员列表")
def get_members(
    keyword: Optional[str] = Query(None, description="姓名模糊搜索"),
    unit: Optional[str] = Query(None, description="所属单位筛选"),
    skill_tag: Optional[str] = Query(None, description="能力标签筛选"),
    is_backbone: Optional[bool] = Query(None, description="是否骨干筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取专班成员列表，支持多条件筛选和分页查询"""
    query = db.query(Member).filter(Member.role != "admin")

    # 应用筛选条件
    if keyword:
        query = query.filter(Member.name.like(f"%{keyword}%"))
    if unit:
        query = query.filter(Member.unit == unit)
    if is_backbone is not None:
        query = query.filter(Member.is_backbone == is_backbone)
    if status:
        query = query.filter(Member.status == status)
    if skill_tag:
        query = query.filter(Member.skill_tags.contains([skill_tag]))

    # 获取总数
    total = query.count()

    # 分页查询
    offset = (page - 1) * page_size
    members = query.offset(offset).limit(page_size).all()

    # 转换为响应格式
    items = []
    for m in members:
        items.append({
            "id": m.id,
            "name": m.name,
            "unit": m.unit,
            "contact": m.contact,
            "email": m.email,
            "skill_tags": m.skill_tags or [],
            "is_backbone": m.is_backbone,
            "status": m.status,
            "created_at": m.created_at,
            "updated_at": m.updated_at
        })

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.post("/members", response_model=ResponseModel, status_code=201, summary="创建人员")
def create_member(
    member_data: MemberCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """创建新的专班成员（仅管理员可操作）"""
    # 验证管理员权限
    if not authorization:
        return error_response(code="NO_TOKEN", message="缺少认证令牌")

    try:
        scheme, token = authorization.split()
    except ValueError:
        return error_response(code="INVALID_HEADER", message="无效的 Authorization header 格式")

    token_data = verify_token(token)
    if not token_data:
        return error_response(code="INVALID_TOKEN", message="令牌无效或已过期")
    if token_data.role != "admin":
        return error_response(code="FORBIDDEN", message="只有管理员可以创建新成员")
    
    # 检查用户名是否已存在（用户名必须唯一）
    existing_user = db.query(Member).filter(Member.username == member_data.username).first()
    if existing_user:
        raise DuplicateResourceException("用户名", member_data.username)
    
    # 创建人员记录
    member = Member(
        name=member_data.name,
        username=member_data.username,
        password_hash=get_password_hash(member_data.password),
        role="member",  # 新创建的成员默认为普通成员
        unit=member_data.unit,
        contact=member_data.contact,
        email=member_data.email,
        skill_tags=member_data.skill_tags,
        is_backbone=member_data.is_backbone,
        status="active"
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return success_response({
        "id": member.id,
        "name": member.name,
        "username": member.username,
        "role": member.role,
        "unit": member.unit,
        "contact": member.contact,
        "email": member.email,
        "skill_tags": member.skill_tags or [],
        "is_backbone": member.is_backbone,
        "status": member.status,
        "created_at": member.created_at,
        "updated_at": member.updated_at
    }, message="成员创建成功")

@router.get("/members/{member_id}", response_model=ResponseModel, summary="获取人员详情")
def get_member(member_id: int, db: Session = Depends(get_db)):
    """根据ID获取人员详情"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    return success_response({
        "id": member.id,
        "name": member.name,
        "unit": member.unit,
        "contact": member.contact,
        "email": member.email,
        "skill_tags": member.skill_tags or [],
        "is_backbone": member.is_backbone,
        "status": member.status,
        "created_at": member.created_at,
        "updated_at": member.updated_at
    })

@router.put("/members/{member_id}", response_model=ResponseModel, summary="更新人员信息")
def update_member(
    member_id: int,
    member_data: MemberUpdate,
    db: Session = Depends(get_db)
):
    """更新人员信息"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    # 更新字段
    for field, value in member_data.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)

    return success_response({
        "id": member.id,
        "name": member.name,
        "unit": member.unit,
        "contact": member.contact,
        "email": member.email,
        "skill_tags": member.skill_tags or [],
        "is_backbone": member.is_backbone,
        "status": member.status,
        "created_at": member.created_at,
        "updated_at": member.updated_at
    }, message="人员更新成功")

@router.get("/members/check-username/{username}", response_model=ResponseModel, summary="检查用户名是否已存在")
def check_username(username: str, db: Session = Depends(get_db)):
    """检查用户名是否已被使用"""
    existing = db.query(Member).filter(Member.username == username).first()
    return success_response({"exists": existing is not None})

@router.put("/members/{member_id}/status", response_model=ResponseModel, summary="更新人员状态")
def update_member_status(
    member_id: int,
    status_data: MemberStatusUpdate,
    db: Session = Depends(get_db)
):
    """更新人员状态（停用/启用）"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    member.status = status_data.status
    db.commit()
    db.refresh(member)

    return success_response({
        "id": member.id,
        "status": member.status
    }, message="状态更新成功")

@router.put("/members/{member_id}/password", response_model=ResponseModel, summary="重置成员密码")
def reset_member_password(
    member_id: int,
    password_data: PasswordResetRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """重置成员密码（仅管理员可操作）"""
    if not authorization:
        return error_response(code="NO_TOKEN", message="缺少认证令牌")
    try:
        scheme, token = authorization.split()
    except ValueError:
        return error_response(code="INVALID_HEADER", message="无效的 Authorization header 格式")
    token_data = verify_token(token)
    if not token_data:
        return error_response(code="INVALID_TOKEN", message="令牌无效或已过期")
    if token_data.role != "admin":
        return error_response(code="FORBIDDEN", message="只有管理员可以重置密码")

    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    member.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return success_response({"id": member.id}, message="密码重置成功")
