"""
评价管理路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import (
    EvaluationCreate, EvaluationUpdate, EvaluationResponse, ResponseModel
)
from backend.utils.response import success_response, success_list_response
from backend.utils.exceptions import ResourceNotFoundException, ValidationException
from backend.models import Evaluation, Task
from backend.config import DEFAULT_PAGE_SIZE, EVALUATION_SCORES

router = APIRouter()

@router.get("/evaluations", response_model=ResponseModel, summary="获取评价列表")
def get_evaluations(
    task_id: Optional[int] = Query(None, description="任务ID筛选"),
    member_id: Optional[int] = Query(None, description="被评价成员筛选"),
    level: Optional[str] = Query(None, description="评价等级筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取评价列表"""
    query = db.query(Evaluation)

    if task_id:
        query = query.filter(Evaluation.task_id == task_id)
    if member_id:
        query = query.filter(Evaluation.member_id == member_id)
    if level:
        query = query.filter(Evaluation.level == level)

    query = query.order_by(Evaluation.evaluated_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    evaluations = query.offset(offset).limit(page_size).all()

    items = []
    for e in evaluations:
        items.append({
            "id": e.id,
            "task_id": e.task_id,
            "task_name": e.task.name if e.task else None,
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

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.post("/evaluations", response_model=ResponseModel, status_code=201, summary="创建评价")
def create_evaluation(eval_data: EvaluationCreate, db: Session = Depends(get_db)):
    """为任务创建评价"""
    # 验证任务存在
    task = db.query(Task).filter(Task.id == eval_data.task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", eval_data.task_id)

    # 验证任务状态为已提交
    if task.status != "submitted":
        raise ValidationException("只能评价已提交的任务")

    # 计算基础积分
    base_score = EVALUATION_SCORES.get(eval_data.level, 0)
    bonus_score = eval_data.bonus_score
    final_score = base_score + bonus_score

    # 根据评价等级更新任务状态
    new_status = "completed" if eval_data.level in ["excellent", "qualified"] else "need_revision"

    # 创建评价记录
    evaluation = Evaluation(
        task_id=eval_data.task_id,
        level=eval_data.level,
        comment=eval_data.comment,
        base_score=base_score,
        bonus_score=bonus_score,
        final_score=final_score,
        evaluator_id=eval_data.evaluator_id,
        member_id=eval_data.member_id
    )
    db.add(evaluation)

    # 更新任务状态
    task.status = new_status
    if new_status == "completed":
        task.is_overdue = False

    db.commit()
    db.refresh(evaluation)

    return success_response({
        "id": evaluation.id,
        "level": evaluation.level,
        "base_score": evaluation.base_score,
        "bonus_score": evaluation.bonus_score,
        "final_score": evaluation.final_score,
        "task_status": task.status
    }, message="评价创建成功")

@router.get("/evaluations/pending", response_model=ResponseModel, summary="获取待评价任务列表")
def get_pending_evaluations(db: Session = Depends(get_db)):
    """获取所有已提交待评价的任务"""
    tasks = db.query(Task).filter(Task.status == "submitted").order_by(Task.updated_at).all()

    items = []
    for t in tasks:
        latest_delivery = None
        for d in t.deliveries:
            if d.is_latest:
                latest_delivery = d
                break

        items.append({
            "task_id": t.id,
            "task_name": t.name,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.name if t.assignee else None,
            "deadline": t.deadline,
            "submitted_at": latest_delivery.submitted_at if latest_delivery else None,
            "week_name": t.week.name if t.week else None
        })

    return success_response({"items": items, "total": len(items)})

@router.get("/evaluations/{evaluation_id}", response_model=ResponseModel, summary="获取评价详情")
def get_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    """获取评价详情"""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise ResourceNotFoundException("评价", evaluation_id)

    return success_response({
        "id": evaluation.id,
        "task_id": evaluation.task_id,
        "task_name": evaluation.task.name if evaluation.task else None,
        "level": evaluation.level,
        "comment": evaluation.comment,
        "base_score": evaluation.base_score,
        "bonus_score": evaluation.bonus_score,
        "final_score": evaluation.final_score,
        "evaluator_id": evaluation.evaluator_id,
        "member_id": evaluation.member_id,
        "member_name": evaluation.member.name if evaluation.member else None,
        "evaluated_at": evaluation.evaluated_at
    })

@router.put("/evaluations/{evaluation_id}", response_model=ResponseModel, summary="更新评价")
def update_evaluation(
    evaluation_id: int,
    eval_data: EvaluationUpdate,
    db: Session = Depends(get_db)
):
    """更新评价"""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise ResourceNotFoundException("评价", evaluation_id)

    update_data = eval_data.model_dump(exclude_unset=True)

    # 如果更新了等级，重新计算积分
    if "level" in update_data:
        base_score = EVALUATION_SCORES.get(update_data["level"], 0)
        bonus_score = update_data.get("bonus_score", evaluation.bonus_score)
        update_data["base_score"] = base_score
        update_data["final_score"] = base_score + bonus_score

    for field, value in update_data.items():
        setattr(evaluation, field, value)

    # 更新关联任务状态
    task = evaluation.task
    if task:
        task.status = "completed" if evaluation.level in ["excellent", "qualified"] else "need_revision"

    db.commit()
    db.refresh(evaluation)

    return success_response({
        "id": evaluation.id,
        "level": evaluation.level,
        "final_score": evaluation.final_score
    }, message="评价更新成功")
