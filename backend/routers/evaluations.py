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
from backend.models import Evaluation, Task, Member, Achievement
from backend.utils.security import get_current_user
from backend.schemas import TokenData
from backend.config import DEFAULT_PAGE_SIZE, EVALUATION_SCORES
from backend.services.llm_service import LLMService

router = APIRouter()

@router.get("/evaluations", response_model=ResponseModel, summary="获取评价列表")
def get_evaluations(
    task_id: Optional[int] = Query(None, description="任务ID筛选"),
    member_id: Optional[int] = Query(None, description="被评价成员筛选"),
    level: Optional[str] = Query(None, description="评价等级筛选"),
    week_id: Optional[int] = Query(None, description="周次ID筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """获取评价列表（成员只能查看自己的评价）"""
    query = db.query(Evaluation).join(Task, Evaluation.task_id == Task.id)

    # 权限控制：成员强制只看自己的评价
    if current_user.role != "admin":
        query = query.filter(Evaluation.member_id == current_user.user_id)
    elif member_id:
        query = query.filter(Evaluation.member_id == member_id)

    if task_id:
        query = query.filter(Evaluation.task_id == task_id)
    if level:
        query = query.filter(Evaluation.level == level)
    if week_id:
        query = query.filter(Task.week_id == week_id)

    query = query.order_by(Evaluation.evaluated_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    evaluations = query.offset(offset).limit(page_size).all()

    # 批量查询评价人姓名
    evaluator_ids = list(set(e.evaluator_id for e in evaluations))
    evaluators = {}
    if evaluator_ids:
        members = db.query(Member).filter(Member.id.in_(evaluator_ids)).all()
        evaluators = {m.id: m.name for m in members}

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
            "evaluator_name": evaluators.get(e.evaluator_id),
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

@router.post("/evaluations", response_model=ResponseModel, status_code=201, summary="创建评价（AI生成）")
def create_evaluation(eval_data: EvaluationCreate, db: Session = Depends(get_db)):
    """为已完成任务创建AI评价（仅管理员可操作）"""
    # 验证任务存在
    task = db.query(Task).filter(Task.id == eval_data.task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", eval_data.task_id)

    # 验证任务状态为已完成
    if task.status != "completed":
        raise ValidationException("只能评价已完成的任务")

    # 验证该任务还没有评价（每个任务只评价一次）
    existing_eval = db.query(Evaluation).filter(Evaluation.task_id == eval_data.task_id).first()
    if existing_eval:
        raise ValidationException("该任务已经评价过了，如需修改请使用编辑功能")

    # 获取任务成果（从成果库读取）
    achievements = db.query(Achievement).filter(
        Achievement.task_id == task.id
    ).order_by(Achievement.created_at.desc()).all()

    deliveries = []
    for a in achievements:
        deliveries.append({
            "name": a.name,
            "description": a.description,
            "link": a.link,
            "delivery_type": a.achievement_type
        })

    # 调用大模型生成评价
    member = task.assignee
    member_name = member.name if member else "未知"
    task_info = {
        "name": task.name,
        "description": task.description,
        "task_type": task.task_type,
        "difficulty": task.difficulty,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "delivery_requirement": task.delivery_requirement
    }

    try:
        llm_service = LLMService()
        ai_result = llm_service.evaluate_task(
            task_info=task_info,
            member_name=member_name,
            deliveries=deliveries
        )
        level = ai_result.get("level", "qualified")
        comment = ai_result.get("comment", "")
        bonus_score = ai_result.get("bonus_score", 0)
    except Exception as e:
        # AI调用失败时使用默认值
        level = "qualified"
        comment = f"（AI评价生成失败：{str(e)}）请手动编辑评价意见"
        bonus_score = 0

    base_score = EVALUATION_SCORES.get(level, 0)
    final_score = base_score + bonus_score

    evaluation = Evaluation(
        task_id=eval_data.task_id,
        level=level,
        comment=comment,
        base_score=base_score,
        bonus_score=bonus_score,
        final_score=final_score,
        evaluator_id=eval_data.evaluator_id,
        member_id=task.assignee_id
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return success_response({
        "id": evaluation.id,
        "level": evaluation.level,
        "comment": evaluation.comment,
        "base_score": evaluation.base_score,
        "bonus_score": evaluation.bonus_score,
        "final_score": evaluation.final_score,
        "task_status": task.status
    }, message="AI评价生成成功")

@router.get("/evaluations/pending", response_model=ResponseModel, summary="获取待评价任务列表")
def get_pending_evaluations(db: Session = Depends(get_db)):
    """获取所有已提交待评价的任务"""
    tasks = db.query(Task).filter(Task.status == "submitted").order_by(Task.updated_at).all()

    items = []
    for t in tasks:
        latest_achievement = db.query(Achievement).filter(
            Achievement.task_id == t.id
        ).order_by(Achievement.created_at.desc()).first()

        items.append({
            "task_id": t.id,
            "task_name": t.name,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.name if t.assignee else None,
            "deadline": t.deadline,
            "submitted_at": latest_achievement.created_at if latest_achievement else None,
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
