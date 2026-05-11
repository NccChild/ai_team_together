"""
成果库路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import AchievementResponse, AchievementUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.utils.exceptions import ResourceNotFoundException
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
    db: Session = Depends(get_db)
):
    """标记或取消标记优秀成果"""
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

@router.post("/achievements/sync", response_model=ResponseModel, summary="同步成果到成果库")
def sync_achievements(
    task_id: Optional[int] = Query(None, description="任务ID"),
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    """将已完成的成果同步到成果库"""
    # 查询已完成的任务
    query = db.query(Task).filter(Task.status == "completed")

    if task_id:
        query = query.filter(Task.id == task_id)
    if week_id:
        query = query.filter(Task.week_id == week_id)

    tasks = query.all()

    synced_count = 0
    for task in tasks:
        # 获取该任务的最新成果
        latest_delivery = None
        for d in task.deliveries:
            if d.is_latest:
                latest_delivery = d
                break

        if not latest_delivery:
            continue

        # 检查是否已存在
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
            synced_count += 1

    db.commit()

    return success_response({"synced_count": synced_count}, message=f"成功同步{synced_count}条成果")
