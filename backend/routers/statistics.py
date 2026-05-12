"""统计汇总路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import ResponseModel
from backend.utils.response import success_response
from backend.services import statistics_service

router = APIRouter()


@router.get("/statistics/dashboard", response_model=ResponseModel, summary="获取首页看板数据")
def get_dashboard_stats(
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    result = statistics_service.get_dashboard_stats(db, week_id=week_id)
    return success_response(result)


@router.get("/statistics/ranking", response_model=ResponseModel, summary="获取积分排行")
def get_ranking(
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    result = statistics_service.get_ranking(db, week_id=week_id)
    return success_response(result)


@router.get("/statistics/week/{week_id}", response_model=ResponseModel, summary="获取周统计汇总")
def get_week_stats(week_id: int, db: Session = Depends(get_db)):
    result = statistics_service.get_week_stats(db, week_id)
    return success_response(result)


@router.get("/statistics/member/{member_id}", response_model=ResponseModel, summary="获取个人统计")
def get_member_stats(
    member_id: int,
    week_id: Optional[int] = Query(None, description="周次ID，默认当前周"),
    db: Session = Depends(get_db)
):
    result = statistics_service.get_member_stats(db, member_id, week_id=week_id)
    return success_response(result)


@router.get("/statistics/task-distribution", response_model=ResponseModel, summary="获取任务状态分布")
def get_task_distribution(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    result = statistics_service.get_task_distribution(db, week_id=week_id)
    return success_response(result)
