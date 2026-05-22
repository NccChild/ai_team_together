"""
Pydantic 数据校验模型定义
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date

# ===========================================
# 认证相关模型
# ===========================================

class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")

class LoginResponse(BaseModel):
    """登录响应模型"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    user: Optional[Dict[str, Any]] = Field(..., description="用户信息")

class UserInfo(BaseModel):
    """用户信息模型"""
    id: int
    username: str
    name: str
    role: str
    email: Optional[str] = None
    unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TokenData(BaseModel):
    """Token数据模型"""
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None

# ===========================================
# 通用响应模型
# ===========================================

class ResponseModel(BaseModel):
    """统一响应模型"""
    code: Union[int, str] = 200
    message: str = "success"
    data: Optional[Any] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat() + "Z")

class ListResponse(BaseModel):
    """列表响应模型"""
    items: List[Any] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0

# ===========================================
# 人员管理模型
# ===========================================

class MemberBase(BaseModel):
    """人员基础模型"""
    name: str
    unit: str
    contact: Optional[str] = None
    email: Optional[str] = None
    skill_tags: Optional[List[str]] = []
    is_backbone: bool = False

class MemberCreate(MemberBase):
    """创建人员请求模型"""
    username: str = Field(..., description="登录用户名")
    password: str = Field(..., description="登录密码")

class MemberUpdate(MemberBase):
    """更新人员请求模型"""
    pass

class MemberResponse(MemberBase):
    """人员响应模型"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MemberStatusUpdate(BaseModel):
    """更新人员状态"""
    status: str = Field(..., description="状态: active/inactive")

class PasswordResetRequest(BaseModel):
    """密码重置请求"""
    new_password: str = Field(..., min_length=6, description="新密码")

# ===========================================
# 周次管理模型
# ===========================================

class WeekBase(BaseModel):
    """周次基础模型"""
    name: str
    start_date: date
    end_date: date
    status: str = "upcoming"
    remark: Optional[str] = None

class WeekCreate(WeekBase):
    """创建周次请求模型"""
    pass

class WeekUpdate(BaseModel):
    """更新周次请求模型"""
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    remark: Optional[str] = None

class WeekResponse(WeekBase):
    """周次响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 任务管理模型
# ===========================================

class TaskBase(BaseModel):
    """任务基础模型"""
    name: str
    description: Optional[str] = None
    task_type: str
    difficulty: str
    assignee_id: int
    collaborator_ids: Optional[List[int]] = []
    week_id: int
    deadline: date
    delivery_requirement: Optional[str] = None

class TaskCreate(TaskBase):
    """创建任务请求模型"""
    creator_id: Optional[int] = None

class TaskUpdate(BaseModel):
    """更新任务请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    difficulty: Optional[str] = None
    assignee_id: Optional[int] = None
    collaborator_ids: Optional[List[int]] = None
    week_id: Optional[int] = None
    deadline: Optional[date] = None
    delivery_requirement: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    """更新任务状态"""
    status: str

class TaskResponse(BaseModel):
    """任务响应模型"""
    id: int
    name: str
    description: Optional[str] = None
    task_type: str
    difficulty: str
    assignee_id: int
    assignee_name: Optional[str] = None
    collaborator_ids: Optional[List[int]] = None
    week_id: int
    week_name: Optional[str] = None
    deadline: date
    delivery_requirement: Optional[str] = None
    status: str
    is_overdue: bool
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 成果提交模型
# ===========================================

class DeliveryBase(BaseModel):
    """成果基础模型"""
    name: str
    description: Optional[str] = None
    link: Optional[str] = None
    delivery_type: Optional[str] = None
    update_description: Optional[str] = None

class DeliveryCreate(DeliveryBase):
    """创建成果请求模型"""
    task_id: int
    submitter_id: int

class DeliveryUpdate(BaseModel):
    """更新成果请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    delivery_type: Optional[str] = None
    update_description: Optional[str] = None

class DeliveryResponse(DeliveryBase):
    """成果响应模型"""
    id: int
    task_id: int
    submitter_id: int
    submitter_name: Optional[str] = None
    submitted_at: datetime
    is_latest: bool

    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 评价管理模型
# ===========================================

class EvaluationBase(BaseModel):
    """评价基础模型"""
    level: str
    comment: Optional[str] = None
    bonus_score: int = 0

class EvaluationCreate(EvaluationBase):
    """创建评价请求模型"""
    task_id: int
    evaluator_id: int
    member_id: int

class EvaluationUpdate(BaseModel):
    """更新评价请求模型"""
    level: Optional[str] = None
    comment: Optional[str] = None
    base_score: Optional[int] = None
    bonus_score: Optional[int] = None
    final_score: Optional[int] = None

class EvaluationResponse(EvaluationBase):
    """评价响应模型"""
    id: int
    task_id: int
    evaluator_id: int
    evaluator_name: Optional[str] = None
    member_id: int
    member_name: Optional[str] = None
    base_score: int
    final_score: int
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 周报分析模型
# ===========================================

class WeeklyReportBase(BaseModel):
    """周报基础模型"""
    work_content: Optional[str] = None
    main_results: Optional[str] = None
    problems: Optional[str] = None
    next_week_plan: Optional[str] = None
    raw_text: Optional[str] = None

class WeeklyReportCreate(WeeklyReportBase):
    """创建周报请求模型"""
    week_id: int
    member_id: int

class WeeklyReportUpdate(WeeklyReportBase):
    """更新周报请求模型"""
    pass

class WeeklyReportResponse(WeeklyReportBase):
    """周报响应模型"""
    id: int
    week_id: int
    week_name: Optional[str] = None
    member_id: int
    member_name: Optional[str] = None
    submitted_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WeeklyReportAnalysisResponse(BaseModel):
    """周报分析结果响应模型"""
    id: int
    weekly_report_id: int
    main_work: Optional[List[str]] = None
    matched_tasks: Optional[List[Dict[str, Any]]] = None
    delivery_status: Optional[Dict[str, Any]] = None
    quality_assessment: Optional[str] = None
    problems_found: Optional[List[str]] = None
    next_week_items: Optional[List[str]] = None
    candidate_tasks: Optional[List[Dict[str, Any]]] = None
    contribution_summary: Optional[str] = None
    risk_alerts: Optional[List[str]] = None
    analyzed_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===========================================
# 成果库模型
# ===========================================

class AchievementResponse(BaseModel):
    """成果库响应模型"""
    id: int
    delivery_id: Optional[int] = None
    task_id: Optional[int] = None
    task_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    link: Optional[str] = None
    achievement_type: Optional[str] = None
    member_id: int
    member_name: Optional[str] = None
    week_id: Optional[int] = None
    week_name: Optional[str] = None
    is_excellent: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AchievementUpdate(BaseModel):
    """更新成果库"""
    is_excellent: bool


class AchievementCreate(BaseModel):
    """新增成果"""
    name: str
    description: Optional[str] = None
    link: Optional[str] = None
    achievement_type: Optional[str] = None
    member_id: int
    week_id: Optional[int] = None

# ===========================================
# 统计模型
# ===========================================

class DashboardStats(BaseModel):
    """首页看板统计数据"""
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    pending_evaluation: int = 0
    need_revision: int = 0
    overdue_tasks: int = 0

class MemberRanking(BaseModel):
    """成员积分排行"""
    member_id: int
    member_name: str
    unit: str
    weekly_score: int = 0
    total_score: int = 0
    excellent_count: int = 0
    rank: int = 0

class WeekSummary(BaseModel):
    """周统计汇总"""
    week_id: int
    week_name: str
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    excellent_count: int = 0
    total_score: int = 0

class MemberStats(BaseModel):
    """个人统计"""
    member_id: int
    member_name: str
    unit: str
    weekly_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    need_revision_tasks: int = 0
    excellent_tasks: int = 0
    weekly_score: int = 0
    total_score: int = 0
    delivery_count: int = 0

# ===========================================
# 字典模型
# ===========================================

class DictionaryItem(BaseModel):
    """字典项"""
    value: str
    label: str

class DictionaryResponse(BaseModel):
    """字典响应模型"""
    type: str
    items: List[DictionaryItem]
