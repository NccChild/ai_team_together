"""
任务管理路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.database import get_db
from backend.schemas import (
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse,
    DeliveryCreate, DeliveryResponse, EvaluationResponse,
    ResponseModel
)
from backend.utils.response import success_response, success_list_response
from backend.utils.exceptions import ResourceNotFoundException, ValidationException
from backend.models import Task, Member, Week, Delivery, Evaluation
from backend.utils.datetime_utils import is_overdue as check_overdue
from backend.config import DEFAULT_PAGE_SIZE, TASK_STATUS, EVALUATION_SCORES

router = APIRouter()

# 状态流转规则
VALID_STATUS_TRANSITIONS = {
    "not_started": ["in_progress"],
    "in_progress": ["submitted"],
    "submitted": ["need_revision", "completed"],
    "need_revision": ["submitted"],
    "completed": [],  # 已完成状态不允许变更
    "overdue": ["in_progress", "submitted"]
}

@router.get("/tasks", response_model=ResponseModel, summary="获取任务列表")
def get_tasks(
    keyword: Optional[str] = Query(None, description="任务名称模糊搜索"),
    week_id: Optional[int] = Query(None, description="周次ID筛选"),
    assignee_id: Optional[int] = Query(None, description="责任人筛选"),
    task_type: Optional[str] = Query(None, description="任务类型筛选"),
    difficulty: Optional[str] = Query(None, description="难度筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    is_overdue: Optional[bool] = Query(None, description="是否延期筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取任务列表，支持多条件筛选和分页"""
    query = db.query(Task)

    if keyword:
        query = query.filter(Task.name.like(f"%{keyword}%"))
    if week_id:
        query = query.filter(Task.week_id == week_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if difficulty:
        query = query.filter(Task.difficulty == difficulty)
    if status:
        query = query.filter(Task.status == status)
    if is_overdue is not None:
        query = query.filter(Task.is_overdue == is_overdue)

    query = query.order_by(Task.created_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    tasks = query.offset(offset).limit(page_size).all()

    items = []
    for t in tasks:
        # 检查并更新延期状态
        if t.status not in ["completed", "submitted"] and not t.is_overdue:
            if check_overdue(t.deadline, t.status):
                t.is_overdue = True
                db.commit()

        items.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "task_type": t.task_type,
            "difficulty": t.difficulty,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.name if t.assignee else None,
            "collaborator_ids": t.collaborator_ids,
            "week_id": t.week_id,
            "week_name": t.week.name if t.week else None,
            "deadline": t.deadline,
            "delivery_requirement": t.delivery_requirement,
            "status": t.status,
            "is_overdue": t.is_overdue,
            "creator_id": t.creator_id,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        })

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.post("/tasks", response_model=ResponseModel, status_code=201, summary="创建任务")
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    """创建新任务"""
    # 验证责任人存在
    assignee = db.query(Member).filter(Member.id == task_data.assignee_id).first()
    if not assignee:
        raise ResourceNotFoundException("人员", task_data.assignee_id)

    # 验证周次存在
    week = db.query(Week).filter(Week.id == task_data.week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", task_data.week_id)

    # 检查延期状态
    overdue = is_overdue(task_data.deadline, "not_started")

    task = Task(
        **task_data.model_dump(),
        status="not_started",
        is_overdue=overdue
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return success_response({
        "id": task.id,
        "name": task.name,
        "status": task.status,
        "is_overdue": task.is_overdue
    }, message="任务创建成功")

@router.get("/tasks/{task_id}", response_model=ResponseModel, summary="获取任务详情")
def get_task(task_id: int, db: Session = Depends(get_db)):
    """获取任务详情，包含成果和评价记录"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    # 更新延期状态
    if task.status not in ["completed", "submitted"] and not task.is_overdue:
        if check_overdue(task.deadline, task.status):
            task.is_overdue = True
            db.commit()

    # 获取成果列表
    deliveries = []
    for d in task.deliveries:
        deliveries.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "link": d.link,
            "delivery_type": d.delivery_type,
            "submitter_id": d.submitter_id,
            "submitter_name": d.submitter.name if d.submitter else None,
            "submitted_at": d.submitted_at,
            "is_latest": d.is_latest,
            "update_description": d.update_description
        })

    # 获取评价列表
    evaluations = []
    for e in task.evaluations:
        evaluations.append({
            "id": e.id,
            "level": e.level,
            "comment": e.comment,
            "base_score": e.base_score,
            "bonus_score": e.bonus_score,
            "final_score": e.final_score,
            "evaluator_id": e.evaluator_id,
            "member_id": e.member_id,
            "member_name": e.member.name if e.member else None,
            "evaluated_at": e.evaluated_at
        })

    return success_response({
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "task_type": task.task_type,
        "difficulty": task.difficulty,
        "assignee_id": task.assignee_id,
        "assignee_name": task.assignee.name if task.assignee else None,
        "collaborator_ids": task.collaborator_ids,
        "week_id": task.week_id,
        "week_name": task.week.name if task.week else None,
        "deadline": task.deadline,
        "delivery_requirement": task.delivery_requirement,
        "status": task.status,
        "is_overdue": task.is_overdue,
        "creator_id": task.creator_id,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "deliveries": deliveries,
        "evaluations": evaluations
    })

@router.put("/tasks/{task_id}", response_model=ResponseModel, summary="更新任务")
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    """更新任务信息"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    if task.status == "completed":
        raise ValidationException("已完成任务不允许修改")

    update_data = task_data.model_dump(exclude_unset=True)

    # 如果更新了截止日期，重新检查延期状态
    if "deadline" in update_data:
        update_data["is_overdue"] = check_overdue(update_data["deadline"], task.status)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return success_response({
        "id": task.id,
        "name": task.name,
        "status": task.status
    }, message="任务更新成功")

@router.delete("/tasks/{task_id}", response_model=ResponseModel, summary="删除任务")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """删除任务（仅允许删除无成果和评价的任务）"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    # 检查是否有成果
    if task.deliveries:
        raise ValidationException("任务已有成果提交，不允许删除")

    # 检查是否有评价
    if task.evaluations:
        raise ValidationException("任务已有评价记录，不允许删除")

    db.delete(task)
    db.commit()

    return success_response(None, message="任务删除成功")

@router.put("/tasks/{task_id}/status", response_model=ResponseModel, summary="更新任务状态")
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db)
):
    """更新任务状态，校验状态流转合法性"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    new_status = status_data.status

    # 校验状态流转
    valid_from = VALID_STATUS_TRANSITIONS.get(task.status, [])
    if task.status == "overdue":
        valid_from = ["in_progress", "submitted"]

    if new_status not in valid_from:
        raise ValidationException(
            f"无效的状态流转：从 {TASK_STATUS.get(task.status, task.status)} 不能变更为 {TASK_STATUS.get(new_status, new_status)}"
        )

    task.status = new_status

    # 如果是已完成或已提交，清除延期标记
    if new_status in ["completed", "submitted"]:
        task.is_overdue = False

    db.commit()
    db.refresh(task)

    return success_response({
        "id": task.id,
        "status": task.status,
        "is_overdue": task.is_overdue
    }, message="状态更新成功")

@router.post("/tasks/{task_id}/deliveries", response_model=ResponseModel, status_code=201, summary="提交成果")
def create_delivery(
    task_id: int,
    delivery_data: DeliveryCreate,
    db: Session = Depends(get_db)
):
    """为任务提交成果"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    # 将之前的最新成果标记为非最新
    for d in task.deliveries:
        d.is_latest = False

    # 创建新成果
    delivery = Delivery(
        task_id=task_id,
        name=delivery_data.name,
        description=delivery_data.description,
        link=delivery_data.link,
        delivery_type=delivery_data.delivery_type,
        submitter_id=delivery_data.submitter_id,
        update_description=delivery_data.update_description,
        is_latest=True
    )
    db.add(delivery)

    # 更新任务状态为已提交
    task.status = "submitted"
    task.is_overdue = False

    db.commit()
    db.refresh(delivery)

    return success_response({
        "id": delivery.id,
        "name": delivery.name,
        "submitted_at": delivery.submitted_at
    }, message="成果提交成功")

@router.get("/tasks/{task_id}/deliveries", response_model=ResponseModel, summary="获取任务成果列表")
def get_task_deliveries(task_id: int, db: Session = Depends(get_db)):
    """获取任务的成果提交记录"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    deliveries = [{
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "link": d.link,
        "delivery_type": d.delivery_type,
        "submitter_id": d.submitter_id,
        "submitter_name": d.submitter.name if d.submitter else None,
        "submitted_at": d.submitted_at,
        "is_latest": d.is_latest,
        "update_description": d.update_description
    } for d in task.deliveries]

    return success_response({"items": deliveries, "total": len(deliveries)})

@router.get("/tasks/{task_id}/evaluations", response_model=ResponseModel, summary="获取任务评价列表")
def get_task_evaluations(task_id: int, db: Session = Depends(get_db)):
    """获取任务的所有评价记录"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    evaluations = [{
        "id": e.id,
        "level": e.level,
        "comment": e.comment,
        "base_score": e.base_score,
        "bonus_score": e.bonus_score,
        "final_score": e.final_score,
        "evaluator_id": e.evaluator_id,
        "member_id": e.member_id,
        "member_name": e.member.name if e.member else None,
        "evaluated_at": e.evaluated_at
    } for e in task.evaluations]

    return success_response({"items": evaluations, "total": len(evaluations)})
