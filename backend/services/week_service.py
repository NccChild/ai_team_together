"""周次管理服务"""

from sqlalchemy.orm import Session
from typing import Optional
from backend.models import Week, Task
from backend.utils.exceptions import ResourceNotFoundException, DuplicateResourceException
from backend.utils.datetime_utils import get_current_week, format_date


def get_week_list(
    db: Session,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
    query = db.query(Week)

    if status:
        query = query.filter(Week.status == status)

    query = query.order_by(Week.start_date.desc())

    total = query.count()
    weeks = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_week_to_dict(w) for w in weeks],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    }


def get_current_week_info(db: Session) -> dict:
    start, end = get_current_week()

    current_week = db.query(Week).filter(
        Week.start_date <= start,
        Week.end_date >= end
    ).first()

    if current_week:
        return _week_to_dict(current_week)

    week_name = f"{start.year}年第{start.isocalendar()[1]}周"
    new_week = Week(name=week_name, start_date=start, end_date=end, status="current")
    db.add(new_week)
    db.commit()
    db.refresh(new_week)
    return _week_to_dict(new_week)


def create_week(db: Session, data) -> dict:
    existing = db.query(Week).filter(
        Week.start_date <= data.end_date,
        Week.end_date >= data.start_date
    ).first()
    if existing:
        raise DuplicateResourceException("周次", data.name)

    week = Week(**data.model_dump())
    db.add(week)
    db.commit()
    db.refresh(week)
    return _week_to_dict(week)


def get_week_by_id(db: Session, week_id: int) -> dict:
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)
    return _week_to_dict(week)


def update_week(db: Session, week_id: int, data) -> dict:
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(week, field, value)

    db.commit()
    db.refresh(week)
    return _week_to_dict(week)


def get_week_tasks(db: Session, week_id: int) -> dict:
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise ResourceNotFoundException("周次", week_id)

    tasks = db.query(Task).filter(Task.week_id == week_id).order_by(Task.deadline).all()

    items = [_task_to_dict(t) for t in tasks]
    return {"items": items, "total": len(items)}


def get_week_summary(db: Session, week_id: int) -> dict:
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

    return {
        "week_id": week_id,
        "week_name": week.name,
        "total_tasks": total,
        "completed_tasks": completed,
        "overdue_tasks": overdue,
        "excellent_count": excellent,
        "total_score": total_score
    }


def _week_to_dict(w: Week) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "start_date": w.start_date,
        "end_date": w.end_date,
        "status": w.status,
        "remark": w.remark,
        "created_at": w.created_at if hasattr(w, 'created_at') else None,
        "updated_at": w.updated_at if hasattr(w, 'updated_at') else None
    }


def _task_to_dict(t: Task) -> dict:
    return {
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
    }
