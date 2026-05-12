"""任务管理服务"""

from sqlalchemy.orm import Session
from typing import Optional
from backend.models import Task, Member, Week, Delivery
from backend.utils.exceptions import ResourceNotFoundException, ValidationException
from backend.utils.datetime_utils import is_overdue as check_overdue
from backend.config import TASK_STATUS

VALID_STATUS_TRANSITIONS = {
    "not_started": ["in_progress"],
    "in_progress": ["submitted"],
    "submitted": ["need_revision", "completed"],
    "need_revision": ["submitted"],
    "completed": [],
    "overdue": ["in_progress", "submitted"]
}


def get_task_list(
    db: Session,
    keyword: Optional[str] = None,
    week_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    task_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
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
    tasks = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for t in tasks:
        if t.status not in ["completed", "submitted"] and not t.is_overdue:
            if check_overdue(t.deadline, t.status):
                t.is_overdue = True
                db.commit()
        items.append(_task_to_dict(t))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    }


def create_task(db: Session, data) -> dict:
    assignee = db.query(Member).filter(Member.id == data.assignee_id).first()
    if not assignee:
        raise ResourceNotFoundException("人员", data.assignee_id)

    week = db.query(Week).filter(Week.id == data.week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", data.week_id)

    overdue = check_overdue(data.deadline, "not_started")

    task = Task(**data.model_dump(), status="not_started", is_overdue=overdue)
    db.add(task)
    db.commit()
    db.refresh(task)

    return {"id": task.id, "name": task.name, "status": task.status, "is_overdue": task.is_overdue}


def get_task_by_id(db: Session, task_id: int) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    if task.status not in ["completed", "submitted"] and not task.is_overdue:
        if check_overdue(task.deadline, task.status):
            task.is_overdue = True
            db.commit()

    deliveries = [_delivery_to_dict(d) for d in task.deliveries]
    evaluations = [_evaluation_to_dict(e) for e in task.evaluations]

    result = _task_to_dict(task)
    result["deliveries"] = deliveries
    result["evaluations"] = evaluations
    return result


def update_task(db: Session, task_id: int, data) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    if task.status == "completed":
        raise ValidationException("已完成任务不允许修改")

    update_data = data.model_dump(exclude_unset=True)

    if "deadline" in update_data:
        update_data["is_overdue"] = check_overdue(update_data["deadline"], task.status)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return {"id": task.id, "name": task.name, "status": task.status}


def delete_task(db: Session, task_id: int):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    if task.deliveries:
        raise ValidationException("任务已有成果提交，不允许删除")
    if task.evaluations:
        raise ValidationException("任务已有评价记录，不允许删除")

    db.delete(task)
    db.commit()


def update_task_status(db: Session, task_id: int, new_status: str) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    valid_from = VALID_STATUS_TRANSITIONS.get(task.status, [])
    if task.status == "overdue":
        valid_from = ["in_progress", "submitted"]

    if new_status not in valid_from:
        raise ValidationException(
            f"无效的状态流转：从 {TASK_STATUS.get(task.status, task.status)} 不能变更为 {TASK_STATUS.get(new_status, new_status)}"
        )

    task.status = new_status
    if new_status in ["completed", "submitted"]:
        task.is_overdue = False

    db.commit()
    db.refresh(task)
    return {"id": task.id, "status": task.status, "is_overdue": task.is_overdue}


def create_delivery(db: Session, task_id: int, data) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    for d in task.deliveries:
        d.is_latest = False

    delivery = Delivery(
        task_id=task_id,
        name=data.name,
        description=data.description,
        link=data.link,
        delivery_type=data.delivery_type,
        submitter_id=data.submitter_id,
        update_description=data.update_description,
        is_latest=True
    )
    db.add(delivery)

    task.status = "submitted"
    task.is_overdue = False

    db.commit()
    db.refresh(delivery)
    return {"id": delivery.id, "name": delivery.name, "submitted_at": delivery.submitted_at}


def get_task_deliveries(db: Session, task_id: int) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    deliveries = [_delivery_to_dict(d) for d in task.deliveries]
    return {"items": deliveries, "total": len(deliveries)}


def get_task_evaluations(db: Session, task_id: int) -> dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ResourceNotFoundException("任务", task_id)

    evaluations = [_evaluation_to_dict(e) for e in task.evaluations]
    return {"items": evaluations, "total": len(evaluations)}


def _task_to_dict(t: Task) -> dict:
    return {
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
    }


def _delivery_to_dict(d: Delivery) -> dict:
    return {
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
    }


def _evaluation_to_dict(e) -> dict:
    return {
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
    }
