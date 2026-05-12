"""Excel导出路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.services import export_service

router = APIRouter()


@router.get("/export/week-plan", summary="导出周计划表")
def export_week_plan(
    week_id: int = Query(..., description="周次ID"),
    db: Session = Depends(get_db)
):
    return export_service.export_week_plan(db, week_id)


@router.get("/export/week-evaluation", summary="导出周评价汇总")
def export_week_evaluation(
    week_id: int = Query(..., description="周次ID"),
    db: Session = Depends(get_db)
):
    return export_service.export_week_evaluation(db, week_id)


@router.get("/export/member-statistics", summary="导出个人贡献统计")
def export_member_statistics(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    return export_service.export_member_statistics(db, week_id)


@router.get("/export/achievements", summary="导出不优秀成果清单")
def export_achievements(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    return export_service.export_achievements(db, week_id)
