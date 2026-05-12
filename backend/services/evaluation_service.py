"""评价管理服务"""

from sqlalchemy.orm import Session
from typing import Optional
from backend.models import Evaluation, Task
from backend.utils.exceptions import ResourceNotFoundException, ValidationException
from backend.config import EVALUATION_SCORES


def get_evaluation_list(
    db: Session,
    task_id: Optional[int] = None,
    member_id: Optional[int] = None,
    level: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
    query = db.query(Evaluation)

    if task_id:
        query = query.filter(Evaluation.task_id == task_id)
    if member_id:
        query = query.filter(Evaluation.member_id == member_id)
    if level:
        query = query.filter(Evaluation.level == level)

    query = query.order_by(Evaluation.evaluated_at.desc())

    total = query.count()
    evaluations = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_evaluation_to_dict(e) for e in evaluations],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    }


def create_evaluation(db: Session, data) -> dict:
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", data.task_id)

    if task.status != "submitted":
        raise ValidationException("只能评价已提交的任务")

    base_score = EVALUATION_SCORES.get(data.level, 0)
    final_score = base_score + (data.bonus_score or 0)
    new_status = "completed" if data.level in ["excellent", "qualified"] else "need_revision"

    evaluation = Evaluation(
        task_id=data.task_id,
        level=data.level,
        comment=data.comment,
        base_score=base_score,
        bonus_score=data.bonus_score or 0,
        final_score=final_score,
        evaluator_id=data.evaluator_id,
        member_id=data.member_id
    )
    db.add(evaluation)

    task.status = new_status
    if new_status == "completed":
        task.is_overdue = False

    db.commit()
    db.refresh(evaluation)

    return {
        "id": evaluation.id,
        "level": evaluation.level,
        "base_score": evaluation.base_score,
        "bonus_score": evaluation.bonus_score,
        "final_score": evaluation.final_score,
        "task_status": task.status
    }


def get_pending_evaluations(db: Session) -> dict:
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

    return {"items": items, "total": len(items)}


def get_evaluation_by_id(db: Session, evaluation_id: int) -> dict:
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise ResourceNotFoundException("评价", evaluation_id)
    return _evaluation_to_dict(evaluation)


def update_evaluation(db: Session, evaluation_id: int, data) -> dict:
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise ResourceNotFoundException("评价", evaluation_id)

    update_data = data.model_dump(exclude_unset=True)

    if "level" in update_data:
        base_score = EVALUATION_SCORES.get(update_data["level"], 0)
        bonus_score = update_data.get("bonus_score", evaluation.bonus_score)
        update_data["base_score"] = base_score
        update_data["final_score"] = base_score + bonus_score

    for field, value in update_data.items():
        setattr(evaluation, field, value)

    task = evaluation.task
    if task:
        task.status = "completed" if evaluation.level in ["excellent", "qualified"] else "need_revision"

    db.commit()
    db.refresh(evaluation)

    return {"id": evaluation.id, "level": evaluation.level, "final_score": evaluation.final_score}


def _evaluation_to_dict(e: Evaluation) -> dict:
    return {
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
    }
