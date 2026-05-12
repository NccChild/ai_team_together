"""评价管理路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import EvaluationCreate, EvaluationUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import evaluation_service

router = APIRouter()


@router.get("/evaluations", response_model=ResponseModel, summary="获取评价列表")
def get_evaluations(
    task_id: Optional[int] = Query(None, description="任务ID筛选"),
    member_id: Optional[int] = Query(None, description="被评价成员筛选"),
    level: Optional[str] = Query(None, description="评价等级筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = evaluation_service.get_evaluation_list(
        db, task_id=task_id, member_id=member_id, level=level, page=page, page_size=page_size
    )
    return success_list_response(result)


@router.post("/evaluations", response_model=ResponseModel, status_code=201, summary="创建评价")
def create_evaluation(eval_data: EvaluationCreate, db: Session = Depends(get_db)):
    result = evaluation_service.create_evaluation(db, eval_data)
    return success_response(result, message="评价创建成功")


@router.get("/evaluations/pending", response_model=ResponseModel, summary="获取待评价任务列表")
def get_pending_evaluations(db: Session = Depends(get_db)):
    result = evaluation_service.get_pending_evaluations(db)
    return success_response(result)


@router.get("/evaluations/{evaluation_id}", response_model=ResponseModel, summary="获取评价详情")
def get_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    result = evaluation_service.get_evaluation_by_id(db, evaluation_id)
    return success_response(result)


@router.put("/evaluations/{evaluation_id}", response_model=ResponseModel, summary="更新评价")
def update_evaluation(evaluation_id: int, eval_data: EvaluationUpdate, db: Session = Depends(get_db)):
    result = evaluation_service.update_evaluation(db, evaluation_id, eval_data)
    return success_response(result, message="评价更新成功")
