"""成果库服务"""

from sqlalchemy.orm import Session
from typing import Optional
from backend.models import Achievement, Task
from backend.utils.exceptions import ResourceNotFoundException


def get_achievement_list(
    db: Session,
    keyword: Optional[str] = None,
    achievement_type: Optional[str] = None,
    member_id: Optional[int] = None,
    week_id: Optional[int] = None,
    is_excellent: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
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
    achievements = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_achievement_to_dict(a) for a in achievements],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    }


def get_achievement_by_id(db: Session, achievement_id: int) -> dict:
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise ResourceNotFoundException("成果", achievement_id)
    return _achievement_to_dict(achievement)


def mark_excellent(db: Session, achievement_id: int, is_excellent: bool) -> dict:
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise ResourceNotFoundException("成果", achievement_id)

    achievement.is_excellent = is_excellent
    db.commit()
    db.refresh(achievement)
    return {"id": achievement.id, "is_excellent": achievement.is_excellent}


def sync_achievements(
    db: Session,
    task_id: Optional[int] = None,
    week_id: Optional[int] = None
) -> dict:
    query = db.query(Task).filter(Task.status == "completed")

    if task_id:
        query = query.filter(Task.id == task_id)
    if week_id:
        query = query.filter(Task.week_id == week_id)

    tasks = query.all()

    synced_count = 0
    for task in tasks:
        latest_delivery = None
        for d in task.deliveries:
            if d.is_latest:
                latest_delivery = d
                break

        if not latest_delivery:
            continue

        existing = db.query(Achievement).filter(Achievement.task_id == task.id).first()

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
    return {"synced_count": synced_count}


def _achievement_to_dict(a: Achievement) -> dict:
    return {
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
    }
