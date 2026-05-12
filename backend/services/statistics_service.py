"""统计汇总服务"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from backend.models import Task, Member, Evaluation, Delivery, Week
from backend.utils.datetime_utils import get_current_week


def get_dashboard_stats(db: Session, week_id: Optional[int] = None) -> dict:
    week = _resolve_week(db, week_id)

    if not week:
        return {
            "total_tasks": 0, "completed_tasks": 0, "in_progress_tasks": 0,
            "pending_evaluation": 0, "need_revision": 0, "overdue_tasks": 0,
            "week_id": None, "week_name": None
        }

    tasks = db.query(Task).filter(Task.week_id == week.id).all()

    return {
        "total_tasks": len(tasks),
        "completed_tasks": len([t for t in tasks if t.status == "completed"]),
        "in_progress_tasks": len([t for t in tasks if t.status in ["not_started", "in_progress"]]),
        "pending_evaluation": len([t for t in tasks if t.status == "submitted"]),
        "need_revision": len([t for t in tasks if t.status == "need_revision"]),
        "overdue_tasks": len([t for t in tasks if t.is_overdue]),
        "week_id": week.id,
        "week_name": week.name
    }


def get_ranking(db: Session, week_id: Optional[int] = None) -> dict:
    if not week_id:
        start, end = get_current_week()
        week = db.query(Week).filter(Week.start_date <= start, Week.end_date >= end).first()
        week_id = week.id if week else None

    if not week_id:
        return {"items": [], "total": 0}

    members = db.query(Member).filter(Member.status == "active").all()

    ranking = []
    for member in members:
        weekly_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(Task.assignee_id == member.id, Task.week_id == week_id).scalar()

        total_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(Task.assignee_id == member.id).scalar()

        excellent_count = db.query(func.count(Evaluation.id)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(Task.assignee_id == member.id, Evaluation.level == "excellent").scalar()

        ranking.append({
            "member_id": member.id,
            "member_name": member.name,
            "unit": member.unit,
            "weekly_score": int(weekly_score or 0),
            "total_score": int(total_score or 0),
            "excellent_count": excellent_count or 0
        })

    ranking.sort(key=lambda x: (-x["weekly_score"], -x["total_score"]))
    for i, r in enumerate(ranking):
        r["rank"] = i + 1

    return {"items": ranking, "total": len(ranking)}


def get_week_stats(db: Session, week_id: int) -> dict:
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        return {"error": "周次不存在"}

    tasks = db.query(Task).filter(Task.week_id == week_id).all()

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    overdue_tasks = len([t for t in tasks if t.is_overdue])

    excellent_count = 0
    total_score = 0
    for task in tasks:
        for eval in task.evaluations:
            total_score += eval.final_score
            if eval.level == "excellent":
                excellent_count += 1
                break

    member_stats = {}
    for task in tasks:
        aid = task.assignee_id
        if aid not in member_stats:
            member_stats[aid] = {
                "member_id": aid,
                "member_name": task.assignee.name if task.assignee else None,
                "unit": task.assignee.unit if task.assignee else None,
                "total": 0, "completed": 0, "overdue": 0, "score": 0
            }
        member_stats[aid]["total"] += 1
        if task.status == "completed":
            member_stats[aid]["completed"] += 1
        if task.is_overdue:
            member_stats[aid]["overdue"] += 1
        for eval in task.evaluations:
            member_stats[aid]["score"] += eval.final_score

    return {
        "week_id": week_id,
        "week_name": week.name,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "excellent_count": excellent_count,
        "total_score": total_score,
        "member_stats": list(member_stats.values())
    }


def get_member_stats(db: Session, member_id: int, week_id: Optional[int] = None) -> dict:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return {"error": "成员不存在"}

    if not week_id:
        start, end = get_current_week()
        week = db.query(Week).filter(Week.start_date <= start, Week.end_date >= end).first()
        week_id = week.id if week else None

    base_query = db.query(Task).filter(Task.assignee_id == member_id)

    weekly_tasks = base_query.filter(Task.week_id == week_id).all() if week_id else []

    weekly_completed = len([t for t in weekly_tasks if t.status == "completed"])
    weekly_overdue = len([t for t in weekly_tasks if t.is_overdue])
    weekly_need_revision = len([t for t in weekly_tasks if t.status == "need_revision"])

    weekly_excellent = 0
    weekly_score = 0
    for task in weekly_tasks:
        for eval in task.evaluations:
            weekly_score += eval.final_score
            if eval.level == "excellent":
                weekly_excellent += 1

    total_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
        Task, Evaluation.task_id == Task.id
    ).filter(Task.assignee_id == member_id).scalar()

    total_excellent = db.query(func.count(Evaluation.id)).join(
        Task, Evaluation.task_id == Task.id
    ).filter(Task.assignee_id == member_id, Evaluation.level == "excellent").scalar()

    delivery_count = db.query(Delivery).filter(Delivery.submitter_id == member_id).count()

    return {
        "member_id": member_id,
        "member_name": member.name,
        "unit": member.unit,
        "weekly_tasks": len(weekly_tasks),
        "completed_tasks": weekly_completed,
        "overdue_tasks": weekly_overdue,
        "need_revision_tasks": weekly_need_revision,
        "excellent_tasks": weekly_excellent,
        "weekly_score": weekly_score,
        "total_score": int(total_score or 0),
        "delivery_count": delivery_count,
        "week_id": week_id
    }


def get_task_distribution(db: Session, week_id: Optional[int] = None) -> dict:
    query = db.query(Task)
    if week_id:
        query = query.filter(Task.week_id == week_id)

    tasks = query.all()

    distribution = {
        "not_started": 0, "in_progress": 0, "submitted": 0,
        "need_revision": 0, "completed": 0, "overdue": 0
    }

    for task in tasks:
        if task.is_overdue and task.status != "completed":
            distribution["overdue"] += 1
        else:
            distribution[task.status] += 1

    return distribution


def _resolve_week(db: Session, week_id: Optional[int] = None):
    if week_id:
        return db.query(Week).filter(Week.id == week_id).first()

    start, end = get_current_week()
    return db.query(Week).filter(Week.start_date <= start, Week.end_date >= end).first()
