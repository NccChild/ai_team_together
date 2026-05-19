"""
成果库路由
"""

from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import AchievementResponse, AchievementUpdate, AchievementCreate, ResponseModel
from backend.utils.response import success_response, success_list_response, error_response
from backend.utils.exceptions import ResourceNotFoundException
from backend.utils.security import verify_token
from backend.models import Achievement, Delivery, Task, Member
from backend.config import DEFAULT_PAGE_SIZE

router = APIRouter()

@router.get("/achievements", response_model=ResponseModel, summary="获取成果库列表")
def get_achievements(
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    achievement_type: Optional[str] = Query(None, description="成果类型筛选"),
    member_id: Optional[int] = Query(None, description="提交人筛选"),
    week_id: Optional[int] = Query(None, description="周次筛选"),
    is_excellent: Optional[bool] = Query(None, description="优秀成果筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取成果库列表"""
    # 从已完成任务的成果中查询
    query = db.query(Achievement)

    if keyword:
        query = query.filter(Achievement.name.like(f"%{keyword}%"))
    if achievement_type:
        query = query.filter(Achievement.achievement_type == achievement_type)
    if member_id:
        query = query.filter(Achievement.member_id == member_id)
    if week_id:
        query = query.filter(Achievement.week_id == week_id)
    if is_excellent is not None:
        query = query.filter(Achievement.is_excellent == is_excellent)

    query = query.order_by(Achievement.created_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    achievements = query.offset(offset).limit(page_size).all()

    items = []
    for a in achievements:
        items.append({
            "id": a.id,
            "delivery_id": a.delivery_id,
            "task_id": a.task_id,
            "task_name": a.task.name if a.task else None,
            "name": a.name,
            "description": a.description,
            "link": a.link,
            "achievement_type": a.achievement_type,
            "member_id": a.member_id,
            "member_name": a.member.name if a.member else None,
            "week_id": a.week_id,
            "week_name": a.week.name if a.week else None,
            "is_excellent": a.is_excellent,
            "created_at": a.created_at
        })

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.get("/achievements/summary", response_model=ResponseModel, summary="获取成果统计概览")
def get_achievements_summary(db: Session = Depends(get_db)):
    """获取成果统计概览（成果总数、优秀成果数）"""
    query = db.query(Achievement)
    total = query.count()
    excellent_count = query.filter(Achievement.is_excellent == True).count()

    return success_response({
        "total": total,
        "excellent_count": excellent_count,
    })

@router.get("/achievements/{achievement_id}", response_model=ResponseModel, summary="获取成果详情")
def get_achievement(achievement_id: int, db: Session = Depends(get_db)):
    """获取成果详情"""
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise ResourceNotFoundException("成果", achievement_id)

    return success_response({
        "id": achievement.id,
        "delivery_id": achievement.delivery_id,
        "task_id": achievement.task_id,
        "task_name": achievement.task.name if achievement.task else None,
        "name": achievement.name,
        "description": achievement.description,
        "link": achievement.link,
        "achievement_type": achievement.achievement_type,
        "member_id": achievement.member_id,
        "member_name": achievement.member.name if achievement.member else None,
        "week_id": achievement.week_id,
        "week_name": achievement.week.name if achievement.week else None,
        "is_excellent": achievement.is_excellent,
        "created_at": achievement.created_at,
        "updated_at": achievement.updated_at
    })

@router.put("/achievements/{achievement_id}/excellent", response_model=ResponseModel, summary="标记优秀成果")
def mark_excellent(
    achievement_id: int,
    update_data: AchievementUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """标记或取消标记优秀成果（仅管理员可操作）"""
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
        return error_response(code="FORBIDDEN", message="只有管理员可以标记优秀成果")

    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise ResourceNotFoundException("成果", achievement_id)

    achievement.is_excellent = update_data.is_excellent
    db.commit()
    db.refresh(achievement)

    return success_response({
        "id": achievement.id,
        "is_excellent": achievement.is_excellent
    }, message="标记成功")

@router.post("/achievements", response_model=ResponseModel, summary="新增成果")
def create_achievement(
    achievement_data: AchievementCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """新增成果（所有登录用户可操作）"""
    if not authorization:
        return error_response(code="NO_TOKEN", message="缺少认证令牌")
    try:
        scheme, token = authorization.split()
    except ValueError:
        return error_response(code="INVALID_HEADER", message="无效的 Authorization header 格式")
    token_data = verify_token(token)
    if not token_data:
        return error_response(code="INVALID_TOKEN", message="令牌无效或已过期")

    achievement = Achievement(
        name=achievement_data.name,
        description=achievement_data.description,
        link=achievement_data.link,
        achievement_type=achievement_data.achievement_type,
        member_id=achievement_data.member_id,
        week_id=achievement_data.week_id,
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)

    return success_response({
        "id": achievement.id,
        "name": achievement.name,
        "description": achievement.description,
        "link": achievement.link,
        "achievement_type": achievement.achievement_type,
        "member_id": achievement.member_id,
        "member_name": achievement.member.name if achievement.member else None,
        "week_id": achievement.week_id,
        "week_name": achievement.week.name if achievement.week else None,
        "is_excellent": achievement.is_excellent,
        "created_at": achievement.created_at,
    }, message="新增成功")

def sync_task_to_achievements(task_id: int, db: Session):
    """将已完成任务的成果同步到成果库（内部函数）"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.status != "completed":
        return

    latest_delivery = None
    for d in task.deliveries:
        if d.is_latest:
            latest_delivery = d
            break

    if not latest_delivery:
        return

    existing = db.query(Achievement).filter(
        Achievement.task_id == task.id
    ).first()

    if not existing:
        achievement = Achievement(
            delivery_id=latest_delivery.id,
            task_id=task.id,
            name=latest_delivery.name,
            description=latest_delivery.description,
            link=latest_delivery.link,
            achievement_type=latest_delivery.delivery_type,
            member_id=task.assignee_id,
            week_id=task.week_id
        )
        db.add(achievement)
        db.commit()
