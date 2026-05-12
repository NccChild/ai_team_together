"""周报分析路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import WeeklyReportCreate, WeeklyReportUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import weekly_report_service

router = APIRouter()


@router.get("/weekly-reports", response_model=ResponseModel, summary="获取周报列表")
def get_weekly_reports(
    week_id: Optional[int] = Query(None, description="周次ID筛选"),
    member_id: Optional[int] = Query(None, description="成员ID筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = weekly_report_service.get_weekly_report_list(
        db, week_id=week_id, member_id=member_id, page=page, page_size=page_size
    )
    return success_list_response(result)


@router.post("/weekly-reports", response_model=ResponseModel, status_code=201, summary="创建周报")
def create_weekly_report(report_data: WeeklyReportCreate, db: Session = Depends(get_db)):
    result, message = weekly_report_service.create_or_update_weekly_report(db, report_data)
    return success_response(result, message=message)


@router.get("/weekly-reports/{report_id}", response_model=ResponseModel, summary="获取周报详情")
def get_weekly_report(report_id: int, db: Session = Depends(get_db)):
    result = weekly_report_service.get_weekly_report_by_id(db, report_id)
    return success_response(result)


@router.put("/weekly-reports/{report_id}", response_model=ResponseModel, summary="更新周报")
def update_weekly_report(report_id: int, report_data: WeeklyReportUpdate, db: Session = Depends(get_db)):
    result = weekly_report_service.update_weekly_report(db, report_id, report_data)
    return success_response(result, message="周报更新成功")


@router.post("/weekly-reports/{report_id}/analyze", response_model=ResponseModel, summary="调用大模型分析周报")
def analyze_weekly_report(report_id: int, db: Session = Depends(get_db)):
    result = weekly_report_service.analyze_weekly_report(db, report_id)
    return success_response(result, message="分析完成")


@router.get("/weekly-reports/summary", response_model=ResponseModel, summary="获取专班周报汇总")
def get_team_summary(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    result = weekly_report_service.get_team_summary(db, week_id=week_id)
    return success_response(result)
