"""
SQLAlchemy ORM 模型定义
"""

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum

class TaskStatusEnum(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    NEED_REVISION = "need_revision"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class TaskTypeEnum(str, enum.Enum):
    KEY_TASK = "key_task"
    SUPPORT_TASK = "support_task"
    SKILL_TASK = "skill_task"
    TEMP_TASK = "temp_task"

class DifficultyEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class EvaluationLevelEnum(str, enum.Enum):
    EXCELLENT = "excellent"
    QUALIFIED = "qualified"
    NEED_REVISION = "need_revision"
    UNQUALIFIED = "unqualified"

class Member(Base):
    """专班成员模型"""
    __tablename__ = 'members'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='成员ID')
    name = Column(String(50), nullable=False, comment='成员姓名')
    unit = Column(String(100), nullable=False, comment='所属单位')
    contact = Column(String(50), nullable=True, comment='联系方式')
    email = Column(String(100), nullable=True, comment='电子邮箱')
    skill_tags = Column(JSON, nullable=True, comment='能力标签列表')
    is_backbone = Column(Boolean, default=False, comment='是否骨干')
    status = Column(String(20), default='active', comment='状态: active/inactive')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment='更新时间')

    # 关系定义
    assigned_tasks = relationship('Task', back_populates='assignee', foreign_keys='Task.assignee_id')
    submitted_deliveries = relationship('Delivery', back_populates='submitter')
    evaluations_received = relationship('Evaluation', back_populates='member')

class Week(Base):
    """周次模型"""
    __tablename__ = 'weeks'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='周次ID')
    name = Column(String(50), nullable=False, comment='周次名称')
    start_date = Column(Date, nullable=False, comment='周开始日期')
    end_date = Column(Date, nullable=False, comment='周结束日期')
    status = Column(String(20), default='upcoming', comment='状态: current/upcoming/history')
    remark = Column(Text, nullable=True, comment='备注')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    tasks = relationship('Task', back_populates='week')
    weekly_reports = relationship('WeeklyReport', back_populates='week')

class Task(Base):
    """任务模型"""
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='任务ID')
    name = Column(String(200), nullable=False, comment='任务名称')
    description = Column(Text, nullable=True, comment='任务描述')
    task_type = Column(String(50), nullable=False, comment='任务类型')
    difficulty = Column(String(20), nullable=False, comment='任务难度')
    assignee_id = Column(Integer, ForeignKey('members.id'), nullable=False, comment='责任人ID')
    collaborator_ids = Column(JSON, nullable=True, comment='协作人ID列表')
    week_id = Column(Integer, ForeignKey('weeks.id'), nullable=False, comment='所属周次ID')
    deadline = Column(Date, nullable=False, comment='截止时间')
    delivery_requirement = Column(Text, nullable=True, comment='交付物要求')
    status = Column(String(20), default='not_started', comment='任务状态')
    is_overdue = Column(Boolean, default=False, comment='是否延期')
    creator_id = Column(Integer, nullable=True, comment='创建人ID')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    week = relationship('Week', back_populates='tasks')
    assignee = relationship('Member', back_populates='assigned_tasks', foreign_keys=[assignee_id])
    deliveries = relationship('Delivery', back_populates='task', order_by='Delivery.submitted_at.desc()')
    evaluations = relationship('Evaluation', back_populates='task', order_by='Evaluation.evaluated_at.desc()')

class Delivery(Base):
    """成果提交模型"""
    __tablename__ = 'deliveries'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='成果ID')
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False, comment='关联任务ID')
    name = Column(String(200), nullable=False, comment='成果名称')
    description = Column(Text, nullable=True, comment='成果说明')
    link = Column(String(500), nullable=True, comment='成果链接')
    delivery_type = Column(String(50), nullable=True, comment='成果类型')
    submitter_id = Column(Integer, ForeignKey('members.id'), nullable=False, comment='提交人ID')
    submitted_at = Column(DateTime, server_default=func.now(), comment='提交时间')
    is_latest = Column(Boolean, default=True, comment='是否为最新成果')
    update_description = Column(Text, nullable=True, comment='修改说明')

    # 关系定义
    task = relationship('Task', back_populates='deliveries')
    submitter = relationship('Member', back_populates='submitted_deliveries')

class Evaluation(Base):
    """任务评价模型"""
    __tablename__ = 'evaluations'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='评价ID')
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False, comment='被评价任务ID')
    level = Column(String(20), nullable=False, comment='评价等级')
    comment = Column(Text, nullable=True, comment='评价意见')
    base_score = Column(Integer, default=0, comment='基础积分')
    bonus_score = Column(Integer, default=0, comment='加分积分')
    final_score = Column(Integer, default=0, comment='最终积分')
    evaluator_id = Column(Integer, nullable=False, comment='评价人ID')
    member_id = Column(Integer, ForeignKey('members.id'), nullable=False, comment='被评价成员ID')
    evaluated_at = Column(DateTime, server_default=func.now(), comment='评价时间')
    created_at = Column(DateTime, server_default=func.now())

    # 关系定义
    task = relationship('Task', back_populates='evaluations')
    member = relationship('Member', back_populates='evaluations_received')

class WeeklyReport(Base):
    """个人周报表"""
    __tablename__ = 'weekly_reports'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='周报ID')
    week_id = Column(Integer, ForeignKey('weeks.id'), nullable=False, comment='周次ID')
    member_id = Column(Integer, ForeignKey('members.id'), nullable=False, comment='成员ID')
    work_content = Column(Text, nullable=True, comment='本周工作')
    main_results = Column(Text, nullable=True, comment='主要成果')
    problems = Column(Text, nullable=True, comment='存在问题')
    next_week_plan = Column(Text, nullable=True, comment='下周计划')
    raw_text = Column(Text, nullable=True, comment='原始文本')
    submitted_at = Column(DateTime, server_default=func.now(), comment='提交时间')
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    week = relationship('Week', back_populates='weekly_reports')
    analysis = relationship('WeeklyReportAnalysis', back_populates='weekly_report', uselist=False)

class WeeklyReportAnalysis(Base):
    """大模型周报分析结果表"""
    __tablename__ = 'weekly_report_analysis'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='分析ID')
    weekly_report_id = Column(Integer, ForeignKey('weekly_reports.id'), nullable=False, comment='周报ID')
    main_work = Column(JSON, nullable=True, comment='本周主要工作')
    matched_tasks = Column(JSON, nullable=True, comment='对应系统任务')
    delivery_status = Column(JSON, nullable=True, comment='成果交付情况')
    quality_assessment = Column(String(50), nullable=True, comment='工作质量判断')
    problems_found = Column(JSON, nullable=True, comment='存在问题')
    next_week_items = Column(JSON, nullable=True, comment='下周计划')
    candidate_tasks = Column(JSON, nullable=True, comment='候选任务')
    contribution_summary = Column(Text, nullable=True, comment='贡献摘要')
    risk_alerts = Column(JSON, nullable=True, comment='风险提示')
    analyzed_at = Column(DateTime, server_default=func.now(), comment='分析时间')
    created_at = Column(DateTime, server_default=func.now())

    # 关系定义
    weekly_report = relationship('WeeklyReport', back_populates='analysis')

class Achievement(Base):
    """成果库模型（复用 deliveries 数据）"""
    __tablename__ = 'achievements'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='成果ID')
    delivery_id = Column(Integer, ForeignKey('deliveries.id'), nullable=True, comment='关联成果ID')
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True, comment='关联任务ID')
    name = Column(String(200), nullable=False, comment='成果名称')
    description = Column(Text, nullable=True, comment='成果说明')
    link = Column(String(500), nullable=True, comment='成果链接')
    achievement_type = Column(String(50), nullable=True, comment='成果类型')
    member_id = Column(Integer, ForeignKey('members.id'), nullable=False, comment='提交人ID')
    week_id = Column(Integer, ForeignKey('weeks.id'), nullable=True, comment='周次ID')
    is_excellent = Column(Boolean, default=False, comment='是否优秀成果')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
