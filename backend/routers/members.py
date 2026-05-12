"""人员管理路由"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import MemberCreate, MemberUpdate, MemberStatusUpdate, ResponseModel
from backend.utils.response import success_response, success_list_response
from backend.config import DEFAULT_PAGE_SIZE
from backend.services import member_service

router = APIRouter()


@router.get("/members", response_model=ResponseModel, summary="获取人员列表")
def get_members(
    keyword: Optional[str] = Query(None, description="姓名模糊搜索"),
    unit: Optional[str] = Query(None, description="所属单位筛选"),
    skill_tag: Optional[str] = Query(None, description="能力标签筛选"),
    is_backbone: Optional[bool] = Query(None, description="是否骨干筛选"),
    status: Optional[str] = Query("active", description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    result = member_service.get_member_list(
        db, keyword=keyword, unit=unit, skill_tag=skill_tag,
        is_backbone=is_backbone, status=status, page=page, page_size=page_size
    )
    return success_list_response(result)


@router.post("/members", response_model=ResponseModel, status_code=201, summary="创建人员")
def create_member(member_data: MemberCreate, db: Session = Depends(get_db)):
    result = member_service.create_member(db, member_data)
    return success_response(result, message="人员创建成功")


@router.get("/members/{member_id}", response_model=ResponseModel, summary="获取人员详情")
def get_member(member_id: int, db: Session = Depends(get_db)):
    result = member_service.get_member_by_id(db, member_id)
    return success_response(result)


@router.put("/members/{member_id}", response_model=ResponseModel, summary="更新人员信息")
def update_member(member_id: int, member_data: MemberUpdate, db: Session = Depends(get_db)):
    result = member_service.update_member(db, member_id, member_data)
    return success_response(result, message="人员更新成功")


@router.put("/members/{member_id}/status", response_model=ResponseModel, summary="更新人员状态")
def update_member_status(member_id: int, status_data: MemberStatusUpdate, db: Session = Depends(get_db)):
    result = member_service.update_member_status(db, member_id, status_data.status)
    return success_response(result, message="状态更新成功")
