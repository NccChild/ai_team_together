"""周计划管理路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import WeekCreate, WeekUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import week_service

router = APIRouter()


@router.get("/weeks", response_model=ResponseModel, summary="获取周次列表")
def get_weeks(
    status: Optional[str] = Query(None, description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = week_service.get_week_list(db, status=status, page=page, page_size=page_size)
    return success_list_response(result)


@router.get("/weeks/current", response_model=ResponseModel, summary="获取当前周")
def get_current_week_info(db: Session = Depends(get_db)):
    result = week_service.get_current_week_info(db)
    return success_response(result)


@router.post("/weeks", response_model=ResponseModel, status_code=201, summary="创建周次")
def create_week(week_data: WeekCreate, db: Session = Depends(get_db)):
    result = week_service.create_week(db, week_data)
    return success_response(result, message="周次创建成功")


@router.get("/weeks/{week_id}", response_model=ResponseModel, summary="获取周次详情")
def get_week(week_id: int, db: Session = Depends(get_db)):
    result = week_service.get_week_by_id(db, week_id)
    return success_response(result)


@router.put("/weeks/{week_id}", response_model=ResponseModel, summary="更新周次")
def update_week(week_id: int, week_data: WeekUpdate, db: Session = Depends(get_db)):
    result = week_service.update_week(db, week_id, week_data)
    return success_response(result, message="周次更新成功")


@router.get("/weeks/{week_id}/tasks", response_model=ResponseModel, summary="获取周次任务列表")
def get_week_tasks(week_id: int, db: Session = Depends(get_db)):
    result = week_service.get_week_tasks(db, week_id)
    return success_response(result)


@router.get("/weeks/{week_id}/summary", response_model=ResponseModel, summary="获取周次汇总")
def get_week_summary(week_id: int, db: Session = Depends(get_db)):
    result = week_service.get_week_summary(db, week_id)
    return success_response(result)
