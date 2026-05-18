"""
周计划管理路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from backend.database import get_db
from backend.schemas import (
    WeekCreate, WeekUpdate, WeekResponse, ResponseModel
)
from backend.utils.response import success_response, success_list_response
from backend.utils.exceptions import ResourceNotFoundException, DuplicateResourceException, ValidationException
from backend.models import Week, Task
from backend.utils.datetime_utils import get_current_week, format_date
from backend.config import DEFAULT_PAGE_SIZE

router = APIRouter()

@router.get("/weeks", response_model=ResponseModel, summary="获取周次列表")
def get_weeks(
    status: Optional[str] = Query(None, description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取周次列表"""
    query = db.query(Week)

    if status:
        query = query.filter(Week.status == status)

    # 按开始日期降序排列
    query = query.order_by(Week.start_date.desc())

    total = query.count()
    offset = (page - 1) * page_size
    weeks = query.offset(offset).limit(page_size).all()

    items = [{
        "id": w.id,
        "name": w.name,
        "start_date": w.start_date,
        "end_date": w.end_date,
        "status": w.status,
        "remark": w.remark,
        "created_at": w.created_at,
        "updated_at": w.updated_at
    } for w in weeks]

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.get("/weeks/current", response_model=ResponseModel, summary="获取当前周")
def get_current_week_info(db: Session = Depends(get_db)):
    """获取当前周信息"""
    start, end = get_current_week()
    start_str = format_date(start)
    end_str = format_date(end)

    # 查找当前周
    current_week = db.query(Week).filter(
        Week.start_date <= start,
        Week.end_date >= end
    ).first()

    if current_week:
        return success_response({
            "id": current_week.id,
            "name": current_week.name,
            "start_date": current_week.start_date,
            "end_date": current_week.end_date,
            "status": current_week.status,
            "remark": current_week.remark
        })

    # 如果不存在当前周，创建它
    week_name = f"{start.year}年第{start.isocalendar()[1]}周"
    new_week = Week(
        name=week_name,
        start_date=start,
        end_date=end,
        status="current"
    )
    db.add(new_week)
    db.commit()
    db.refresh(new_week)

    return success_response({
        "id": new_week.id,
        "name": new_week.name,
        "start_date": new_week.start_date,
        "end_date": new_week.end_date,
        "status": new_week.status,
        "remark": new_week.remark
    })

@router.post("/weeks", response_model=ResponseModel, status_code=201, summary="创建周次")
def create_week(week_data: WeekCreate, db: Session = Depends(get_db)):
    """创建新的周次"""
    # 检查名称是否已存在
    existing_name = db.query(Week).filter(Week.name == week_data.name).first()
    if existing_name:
        raise DuplicateResourceException("周次名称", week_data.name)

    # 检查时间冲突
    existing = db.query(Week).filter(
        Week.start_date <= week_data.end_date,
        Week.end_date >= week_data.start_date
    ).first()
    if existing:
        raise DuplicateResourceException("周次时间", week_data.name)

    # 不允许创建早于当前周的周次
    from datetime import date as date_type
    today = date_type.today()
    if week_data.start_date < today:
        # 检查是否为当前周
        current_start, current_end = get_current_week()
        if week_data.start_date < current_start:
            raise ValidationException("不允许创建早于当前周的周次")

    week = Week(**week_data.model_dump())
    db.add(week)
    db.commit()
    db.refresh(week)

    return success_response({
        "id": week.id,
        "name": week.name,
        "start_date": week.start_date,
        "end_date": week.end_date,
        "status": week.status,
        "remark": week.remark
    }, message="周次创建成功")

@router.get("/weeks/{week_id}", response_model=ResponseModel, summary="获取周次详情")
def get_week(week_id: int, db: Session = Depends(get_db)):
    """获取周次详情"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    return success_response({
        "id": week.id,
        "name": week.name,
        "start_date": week.start_date,
        "end_date": week.end_date,
        "status": week.status,
        "remark": week.remark,
        "created_at": week.created_at,
        "updated_at": week.updated_at
    })

@router.put("/weeks/{week_id}", response_model=ResponseModel, summary="更新周次")
def update_week(
    week_id: int,
    week_data: WeekUpdate,
    db: Session = Depends(get_db)
):
    """更新周次信息"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    for field, value in week_data.model_dump(exclude_unset=True).items():
        setattr(week, field, value)

    db.commit()
    db.refresh(week)

    return success_response({
        "id": week.id,
        "name": week.name,
        "start_date": week.start_date,
        "end_date": week.end_date,
        "status": week.status,
        "remark": week.remark
    }, message="周次更新成功")

@router.get("/weeks/{week_id}/tasks", response_model=ResponseModel, summary="获取周次任务列表")
def get_week_tasks(week_id: int, db: Session = Depends(get_db)):
    """获取指定周次的所有任务"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    tasks = db.query(Task).filter(Task.week_id == week_id).order_by(Task.deadline).all()

    items = []
    for t in tasks:
        items.append({
            "id": t.id,
            "name": t.name,
            "task_type": t.task_type,
            "difficulty": t.difficulty,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.name if t.assignee else None,
            "collaborator_ids": t.collaborator_ids,
            "week_id": t.week_id,
            "deadline": t.deadline,
            "delivery_requirement": t.delivery_requirement,
            "status": t.status,
            "is_overdue": t.is_overdue,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        })

    return success_response({"items": items, "total": len(items)})

@router.get("/weeks/{week_id}/summary", response_model=ResponseModel, summary="获取周次汇总")
def get_week_summary(week_id: int, db: Session = Depends(get_db)):
    """获取周次统计汇总"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    tasks = db.query(Task).filter(Task.week_id == week_id).all()

    total = len(tasks)
    completed = len([t for t in tasks if t.status == "completed"])
    overdue = len([t for t in tasks if t.is_overdue])
    excellent = 0

    for task in tasks:
        for eval in task.evaluations:
            if eval.level == "excellent":
                excellent += 1
                break

    total_score = sum(sum([e.final_score for e in t.evaluations]) for t in tasks)

    return success_response({
        "week_id": week_id,
        "week_name": week.name,
        "total_tasks": total,
        "completed_tasks": completed,
        "overdue_tasks": overdue,
        "excellent_count": excellent,
        "total_score": total_score
    })
