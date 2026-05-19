"""
统计汇总路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from backend.database import get_db
from backend.utils.response import success_response, success_list_response
from backend.schemas import ResponseModel
from backend.models import Task, Member, Evaluation, Week, Achievement
from backend.utils.datetime_utils import get_current_week, format_date

router = APIRouter()

@router.get("/statistics/dashboard", response_model=ResponseModel, summary="获取首页看板数据")
def get_dashboard_stats(
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    """获取首页看板统计数据"""
    # 获取当前周
    if week_id:
        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            week_id = None

    if not week_id:
        start, end = get_current_week()
        week = db.query(Week).filter(
            Week.start_date <= start,
            Week.end_date >= end
        ).first()

    if not week:
        return success_response({
            "total_tasks": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0,
            "pending_evaluation": 0,
            "need_revision": 0,
            "overdue_tasks": 0,
            "week_id": None,
            "week_name": None
        })

    # 统计任务
    tasks = db.query(Task).filter(Task.week_id == week.id).all()

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    in_progress_tasks = len([t for t in tasks if t.status in ["not_started", "in_progress"]])
    pending_evaluation = len([t for t in tasks if t.status == "submitted"])
    need_revision = len([t for t in tasks if t.status == "need_revision"])
    overdue_tasks = len([t for t in tasks if t.is_overdue])

    return success_response({
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_evaluation": pending_evaluation,
        "need_revision": need_revision,
        "overdue_tasks": overdue_tasks,
        "week_id": week.id,
        "week_name": week.name
    })

@router.get("/statistics/ranking", response_model=ResponseModel, summary="获取积分排行")
def get_ranking(
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    """获取成员积分排行"""
    # 获取当前周
    if not week_id:
        start, end = get_current_week()
        week = db.query(Week).filter(
            Week.start_date <= start,
            Week.end_date >= end
        ).first()
        week_id = week.id if week else None

    if not week_id:
        return success_response({"items": [], "total": 0})

    # 获取所有活跃成员（排除管理员）
    members = db.query(Member).filter(
        Member.status == "active",
        Member.role != "admin"
    ).all()

    ranking = []
    for member in members:
        # 本周积分
        weekly_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(
            Task.assignee_id == member.id,
            Task.week_id == week_id
        ).scalar()

        # 累计积分
        total_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(Task.assignee_id == member.id).scalar()

        # 优秀任务数
        excellent_count = db.query(func.count(Evaluation.id)).join(
            Task, Evaluation.task_id == Task.id
        ).filter(
            Task.assignee_id == member.id,
            Evaluation.level == "excellent"
        ).scalar()

        ranking.append({
            "member_id": member.id,
            "member_name": member.name,
            "unit": member.unit,
            "weekly_score": int(weekly_score or 0),
            "total_score": int(total_score or 0),
            "excellent_count": excellent_count or 0
        })

    # 按本周积分降序排列
    ranking.sort(key=lambda x: (-x["weekly_score"], -x["total_score"]))

    # 添加排名
    for i, r in enumerate(ranking):
        r["rank"] = i + 1

    return success_response({"items": ranking, "total": len(ranking)})

@router.get("/statistics/week/{week_id}", response_model=ResponseModel, summary="获取周统计汇总")
def get_week_stats(week_id: int, db: Session = Depends(get_db)):
    """获取指定周次的统计汇总"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        return success_response({"error": "周次不存在"})

    tasks = db.query(Task).filter(Task.week_id == week_id).all()

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    overdue_tasks = len([t for t in tasks if t.is_overdue])

    # 统计优秀任务数
    excellent_count = 0
    total_score = 0
    for task in tasks:
        for eval in task.evaluations:
            total_score += eval.final_score
            if eval.level == "excellent":
                excellent_count += 1
                break

    # 按人员统计
    member_stats = {}
    for task in tasks:
        assignee_id = task.assignee_id
        if assignee_id not in member_stats:
            member_stats[assignee_id] = {
                "member_id": assignee_id,
                "member_name": task.assignee.name if task.assignee else None,
                "unit": task.assignee.unit if task.assignee else None,
                "total": 0,
                "completed": 0,
                "overdue": 0,
                "score": 0
            }
        member_stats[assignee_id]["total"] += 1
        if task.status == "completed":
            member_stats[assignee_id]["completed"] += 1
        if task.is_overdue:
            member_stats[assignee_id]["overdue"] += 1
        for eval in task.evaluations:
            member_stats[assignee_id]["score"] += eval.final_score

    return success_response({
        "week_id": week_id,
        "week_name": week.name,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "excellent_count": excellent_count,
        "total_score": total_score,
        "member_stats": list(member_stats.values())
    })

@router.get("/statistics/member/{member_id}", response_model=ResponseModel, summary="获取个人统计")
def get_member_stats(
    member_id: int,
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    """获取指定成员的个人统计"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return success_response({"error": "成员不存在"})

    # 获取当前周
    if not week_id:
        start, end = get_current_week()
        week = db.query(Week).filter(
            Week.start_date <= start,
            Week.end_date >= end
        ).first()
        week_id = week.id if week else None

    base_query = db.query(Task).filter(Task.assignee_id == member_id)

    # 本周任务统计
    if week_id:
        weekly_tasks = base_query.filter(Task.week_id == week_id).all()
    else:
        weekly_tasks = []

    weekly_completed = len([t for t in weekly_tasks if t.status == "completed"])
    weekly_overdue = len([t for t in weekly_tasks if t.is_overdue])
    weekly_need_revision = len([t for t in weekly_tasks if t.status == "need_revision"])

    # 本周优秀任务
    weekly_excellent = 0
    weekly_score = 0
    for task in weekly_tasks:
        for eval in task.evaluations:
            weekly_score += eval.final_score
            if eval.level == "excellent":
                weekly_excellent += 1
                break

    # 累计统计
    total_tasks = base_query.count()
    total_completed = base_query.filter(Task.status == "completed").count()
    total_overdue = base_query.filter(Task.is_overdue == True).count()
    total_score = db.query(func.coalesce(func.sum(Evaluation.final_score), 0)).join(
        Task, Evaluation.task_id == Task.id
    ).filter(Task.assignee_id == member_id).scalar()

    total_excellent = db.query(func.count(Evaluation.id)).join(
        Task, Evaluation.task_id == Task.id
    ).filter(
        Task.assignee_id == member_id,
        Evaluation.level == "excellent"
    ).scalar()

    delivery_count = db.query(Achievement).filter(Achievement.member_id == member_id).count()

    return success_response({
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
    })

@router.get("/statistics/task-distribution", response_model=ResponseModel, summary="获取任务状态分布")
def get_task_distribution(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    """获取任务状态分布统计"""
    query = db.query(Task)
    if week_id:
        query = query.filter(Task.week_id == week_id)

    tasks = query.all()

    distribution = {
        "not_started": 0,
        "in_progress": 0,
        "submitted": 0,
        "need_revision": 0,
        "completed": 0,
        "overdue": 0
    }

    for task in tasks:
        if task.is_overdue and task.status != "completed":
            distribution["overdue"] += 1
        else:
            distribution[task.status] += 1

    return success_response(distribution)
