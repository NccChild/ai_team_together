"""
周报分析路由
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import (
    WeeklyReportCreate, WeeklyReportUpdate, WeeklyReportResponse,
    WeeklyReportAnalysisResponse, ResponseModel
)
from backend.utils.response import success_response, success_list_response
from backend.utils.exceptions import ResourceNotFoundException
from backend.models import WeeklyReport, WeeklyReportAnalysis, Week, Member, Task
from backend.config import DEFAULT_PAGE_SIZE
from backend.services.llm_service import LLMService

router = APIRouter()

@router.get("/weekly-reports", response_model=ResponseModel, summary="获取周报列表")
def get_weekly_reports(
    week_id: Optional[int] = Query(None, description="周次ID筛选"),
    member_id: Optional[int] = Query(None, description="成员ID筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """获取周报列表"""
    query = db.query(WeeklyReport)

    if week_id:
        query = query.filter(WeeklyReport.week_id == week_id)
    if member_id:
        query = query.filter(WeeklyReport.member_id == member_id)

    query = query.order_by(WeeklyReport.submitted_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    reports = query.offset(offset).limit(page_size).all()

    items = []
    for r in reports:
        items.append({
            "id": r.id,
            "week_id": r.week_id,
            "week_name": r.week.name if r.week else None,
            "member_id": r.member_id,
            "member_name": r.member.name if hasattr(r, 'member') and r.member else None,
            "work_content": r.work_content,
            "main_results": r.main_results,
            "problems": r.problems,
            "next_week_plan": r.next_week_plan,
            "raw_text": r.raw_text,
            "submitted_at": r.submitted_at,
            "updated_at": r.updated_at,
            "has_analysis": r.analysis is not None
        })

    return success_list_response({
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    })

@router.post("/weekly-reports", response_model=ResponseModel, status_code=201, summary="创建周报")
def create_weekly_report(report_data: WeeklyReportCreate, db: Session = Depends(get_db)):
    """创建或更新周报"""
    # 检查是否已存在该周次该成员的周报
    existing = db.query(WeeklyReport).filter(
        WeeklyReport.week_id == report_data.week_id,
        WeeklyReport.member_id == report_data.member_id
    ).first()

    if existing:
        # 更新现有周报
        for field, value in report_data.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        report_id = existing.id
        message = "周报更新成功"
    else:
        # 创建新周报
        report = WeeklyReport(**report_data.model_dump())
        db.add(report)
        db.commit()
        db.refresh(report)
        report_id = report.id
        message = "周报创建成功"

    return success_response({"id": report_id}, message=message)


@router.get("/weekly-reports/summary", response_model=ResponseModel, summary="获取专班周报汇总")
def get_team_summary(
    week_id: Optional[int] = Query(None, description="周次ID"),
    db: Session = Depends(get_db)
):
    """获取专班周报汇总，用于生成专班周报草稿"""
    week = None
    if week_id:
        week = db.query(Week).filter(Week.id == week_id).first()
    else:
        from backend.utils.datetime_utils import get_current_week
        start, end = get_current_week()
        week = db.query(Week).filter(
            Week.start_date <= start,
            Week.end_date >= end
        ).first()
        if week:
            week_id = week.id

    if not week_id:
        return success_response({"week_name": None, "items": [], "total": 0})

    reports = db.query(WeeklyReport).filter(
        WeeklyReport.week_id == week_id
    ).all()

    items = []
    for r in reports:
        item = {
            "report_id": r.id,
            "member_id": r.member_id,
            "member_name": r.member.name if hasattr(r, 'member') and r.member else None,
            "work_content": r.work_content,
            "main_results": r.main_results,
            "problems": r.problems,
            "next_week_plan": r.next_week_plan
        }

        if r.analysis:
            item["analysis"] = {
                "main_work": r.analysis.main_work,
                "contribution_summary": r.analysis.contribution_summary,
                "risk_alerts": r.analysis.risk_alerts
            }

        items.append(item)

    # 调用大模型生成专班周报草稿
    week_name = week.name if week else None
    llm_service = LLMService()
    summary = llm_service.generate_team_summary(items, week_name)

    return success_response({
        "week_id": week_id,
        "week_name": week_name,
        "items": items,
        "total": len(items),
        "summary_text": summary.get("summary_text", ""),
        "summary_generated": summary.get("generated", False)
    })


@router.get("/weekly-reports/{report_id}", response_model=ResponseModel, summary="获取周报详情")
def get_weekly_report(report_id: int, db: Session = Depends(get_db)):
    """获取周报详情，包含分析结果"""
    report = db.query(WeeklyReport).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise ResourceNotFoundException("周报", report_id)

    result = {
        "id": report.id,
        "week_id": report.week_id,
        "week_name": report.week.name if report.week else None,
        "member_id": report.member_id,
        "member_name": report.member.name if hasattr(report, 'member') and report.member else None,
        "work_content": report.work_content,
        "main_results": report.main_results,
        "problems": report.problems,
        "next_week_plan": report.next_week_plan,
        "raw_text": report.raw_text,
        "submitted_at": report.submitted_at,
        "updated_at": report.updated_at
    }

    # 添加分析结果
    if report.analysis:
        result["analysis"] = {
            "id": report.analysis.id,
            "main_work": report.analysis.main_work,
            "matched_tasks": report.analysis.matched_tasks,
            "delivery_status": report.analysis.delivery_status,
            "quality_assessment": report.analysis.quality_assessment,
            "problems_found": report.analysis.problems_found,
            "next_week_items": report.analysis.next_week_items,
            "candidate_tasks": report.analysis.candidate_tasks,
            "contribution_summary": report.analysis.contribution_summary,
            "risk_alerts": report.analysis.risk_alerts,
            "analyzed_at": report.analysis.analyzed_at
        }

    return success_response(result)

@router.put("/weekly-reports/{report_id}", response_model=ResponseModel, summary="更新周报")
def update_weekly_report(
    report_id: int,
    report_data: WeeklyReportUpdate,
    db: Session = Depends(get_db)
):
    """更新周报内容"""
    report = db.query(WeeklyReport).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise ResourceNotFoundException("周报", report_id)

    for field, value in report_data.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    # 删除旧的分析结果（如果有）
    if report.analysis:
        db.delete(report.analysis)

    db.commit()
    db.refresh(report)

    return success_response({"id": report.id}, message="周报更新成功")

@router.post("/weekly-reports/{report_id}/analyze", response_model=ResponseModel, summary="调用大模型分析周报")
def analyze_weekly_report(report_id: int, db: Session = Depends(get_db)):
    """调用大模型对周报进行结构化分析"""
    report = db.query(WeeklyReport).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise ResourceNotFoundException("周报", report_id)

    # 获取该成员的任务列表用于交叉核验
    tasks = db.query(Task).filter(
        Task.week_id == report.week_id,
        Task.assignee_id == report.member_id
    ).all()

    task_info = [{
        "id": t.id,
        "name": t.name,
        "status": t.status,
        "deadline": t.deadline.isoformat() if t.deadline else None
    } for t in tasks]

    # 调用大模型分析
    llm_service = LLMService()
    analysis_result = llm_service.analyze_weekly_report(
        report_content=report.raw_text or report.work_content or "",
        member_name=report.member.name if hasattr(report, 'member') and report.member else "未知",
        tasks=task_info
    )

    # 保存分析结果
    # 删除旧的分析结果
    if report.analysis:
        db.delete(report.analysis)
        db.flush()

    analysis = WeeklyReportAnalysis(
        weekly_report_id=report_id,
        main_work=analysis_result.get("main_work"),
        matched_tasks=analysis_result.get("matched_tasks"),
        delivery_status=analysis_result.get("delivery_status"),
        quality_assessment=analysis_result.get("quality_assessment"),
        problems_found=analysis_result.get("problems_found"),
        next_week_items=analysis_result.get("next_week_items"),
        candidate_tasks=analysis_result.get("candidate_tasks"),
        contribution_summary=analysis_result.get("contribution_summary"),
        risk_alerts=analysis_result.get("risk_alerts")
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return success_response({
        "id": analysis.id,
        "contribution_summary": analysis.contribution_summary,
        "risk_alerts": analysis.risk_alerts
    }, message="分析完成")
