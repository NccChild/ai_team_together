"""成果库路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import AchievementUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import achievement_service

router = APIRouter()


@router.get("/achievements", response_model=ResponseModel, summary="获取成果库列表")
def get_achievements(
    keyword: Optional[str] = Query(None, description="关键词搜索"),
    achievement_type: Optional[str] = Query(None, description="成果类型筛选"),
    member_id: Optional[int] = Query(None, description="提交人筛选"),
    week_id: Optional[int] = Query(None, description="周次筛选"),
    is_excellent: Optional[bool] = Query(None, description="优秀成果筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = achievement_service.get_achievement_list(
        db, keyword=keyword, achievement_type=achievement_type,
        member_id=member_id, week_id=week_id, is_excellent=is_excellent,
        page=page, page_size=page_size
    )
    return success_list_response(result)


@router.get("/achievements/{achievement_id}", response_model=ResponseModel, summary="获取成果详情")
def get_achievement(achievement_id: int, db: Session = Depends(get_db)):
    result = achievement_service.get_achievement_by_id(db, achievement_id)
    return success_response(result)


@router.put("/achievements/{achievement_id}/excellent", response_model=ResponseModel, summary="标记优秀成果")
def mark_excellent(achievement_id: int, update_data: AchievementUpdate, db: Session = Depends(get_db)):
    result = achievement_service.mark_excellent(db, achievement_id, update_data.is_excellent)
    return success_response(result, message="标记成功")


@router.post("/achievements/sync", response_model=ResponseModel, summary="同步成果到成果库")
def sync_achievements(
    task_id: Optional[int] = Query(None, description="任务ID"),
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    result = achievement_service.sync_achievements(db, task_id=task_id, week_id=week_id)
    return success_response(result, message=f"成功同步{result['synced_count']}条成果")
