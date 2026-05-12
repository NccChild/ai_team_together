"""任务管理路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import TaskCreate, TaskUpdate, TaskStatusUpdate, DeliveryCreate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import task_service

router = APIRouter()


@router.get("/tasks", response_model=ResponseModel, summary="获取任务列表")
def get_tasks(
    keyword: Optional[str] = Query(None, description="任务名称模糊搜索"),
    week_id: Optional[int] = Query(None, description="周次ID筛选"),
    assignee_id: Optional[int] = Query(None, description="责任人筛选"),
    task_type: Optional[str] = Query(None, description="任务类型筛选"),
    difficulty: Optional[str] = Query(None, description="难度筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    is_overdue: Optional[bool] = Query(None, description="是否延期筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = task_service.get_task_list(
        db, keyword=keyword, week_id=week_id, assignee_id=assignee_id,
        task_type=task_type, difficulty=difficulty, status=status,
        is_overdue=is_overdue, page=page, page_size=page_size
    )
    return success_list_response(result)


@router.post("/tasks", response_model=ResponseModel, status_code=201, summary="创建任务")
def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    result = task_service.create_task(db, task_data)
    return success_response(result, message="任务创建成功")


@router.get("/tasks/{task_id}", response_model=ResponseModel, summary="获取任务详情")
def get_task(task_id: int, db: Session = Depends(get_db)):
    result = task_service.get_task_by_id(db, task_id)
    return success_response(result)


@router.put("/tasks/{task_id}", response_model=ResponseModel, summary="更新任务")
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    result = task_service.update_task(db, task_id, task_data)
    return success_response(result, message="任务更新成功")


@router.delete("/tasks/{task_id}", response_model=ResponseModel, summary="删除任务")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task_service.delete_task(db, task_id)
    return success_response(None, message="任务删除成功")


@router.put("/tasks/{task_id}/status", response_model=ResponseModel, summary="更新任务状态")
def update_task_status(task_id: int, status_data: TaskStatusUpdate, db: Session = Depends(get_db)):
    result = task_service.update_task_status(db, task_id, status_data.status)
    return success_response(result, message="状态更新成功")


@router.post("/tasks/{task_id}/deliveries", response_model=ResponseModel, status_code=201, summary="提交成果")
def create_delivery(task_id: int, delivery_data: DeliveryCreate, db: Session = Depends(get_db)):
    result = task_service.create_delivery(db, task_id, delivery_data)
    return success_response(result, message="成果提交成功")


@router.get("/tasks/{task_id}/deliveries", response_model=ResponseModel, summary="获取任务成果列表")
def get_task_deliveries(task_id: int, db: Session = Depends(get_db)):
    result = task_service.get_task_deliveries(db, task_id)
    return success_response(result)


@router.get("/tasks/{task_id}/evaluations", response_model=ResponseModel, summary="获取任务评价列表")
def get_task_evaluations(task_id: int, db: Session = Depends(get_db)):
    result = task_service.get_task_evaluations(db, task_id)
    return success_response(result)
