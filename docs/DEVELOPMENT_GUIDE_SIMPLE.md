---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 304402202e7fed553cc842f21eac721f160f48c3eec7c9a7938b50b10e4b58bd9d11a421022027d2a15f6f1fde86c32031c65c798e2627e9e955517c03cd743bd73716875551
    ReservedCode2: 30440220317791148e1828d159013489c68b1f5d1fab5ca581b9e7109f8c44478c2cbb5a022010b1ade447d8dd820e8de8baedd7c9ff4cd1fe272c9758bc8203388e85ab98cf
---

# 人工智能专班任务与成果跟踪小工具 — 后端开发规范

> **文档版本**：v1.0
> **创建日期**：2026年5月7日
> **负责人**：赵晓详
> **最后更新**：2026年5月7日

## 一、文档说明

本文档作为人工智能专班任务与成果跟踪小工具的后端开发规范，旨在统一后端代码的组织方式、命名规则、接口设计、数据库操作、错误处理、日志记录等开发标准，确保团队成员编写的代码风格一致、易于维护和协作。文档面向所有后端开发人员，包括赵晓详（核心接口开发与集成统筹）、郭琛虎（基础框架与数据模型）、蒋来来（人员管理与字典接口）、王书波（大模型周报分析）。本文档是接口规范文档和数据库设计文档的补充，三份文档共同构成后端开发的完整技术规范体系。在开始开发之前，请先阅读需求说明文档了解业务背景，阅读接口规范文档了解接口设计，阅读数据库设计文档了解数据模型。

---

## 二、目录结构规范

### 2.1 项目目录结构

后端项目采用简洁的目录结构，考虑到系统为轻量化工具，第一版不强制采用复杂的 MVC 分层架构，而是将主要业务逻辑集中在 service 层，必要时按功能模块拆分文件。完整的目录结构如下所示，所有代码、配置、文档均放在 `ai_team_task_platform` 目录下。

```
ai_team_task_platform/
├── backend/                          # 后端工程根目录
│   ├── main.py                       # 应用入口，FastAPI 实例创建和路由注册
│   ├── config.py                     # 配置文件，所有配置项集中管理
│   ├── database.py                   # 数据库连接和会话管理
│   ├── models.py                     # SQLAlchemy ORM 模型定义
│   ├── schemas.py                    # Pydantic 数据校验模型
│   ├── service.py                    # 业务逻辑层（可按模块拆分）
│   ├── routers/                      # 路由模块目录
│   │   ├── __init__.py
│   │   ├── members.py               # 人员管理路由
│   │   ├── weeks.py                 # 周计划管理路由
│   │   ├── tasks.py                  # 任务管理路由
│   │   ├── deliveries.py             # 成果提交路由
│   │   ├── evaluations.py           # 评价管理路由
│   │   ├── statistics.py            # 统计汇总路由
│   │   ├── weekly_reports.py        # 周报分析路由
│   │   ├── achievements.py          # 成果库路由
│   │   ├── dictionaries.py          # 字典接口路由
│   │   └── export.py                # 导出功能路由
│   ├── utils/                        # 工具函数目录
│   │   ├── __init__.py
│   │   ├── response.py              # 统一响应格式工具
│   │   ├── exceptions.py            # 自定义异常类
│   │   ├── pagination.py           # 分页工具
│   │   └── datetime_utils.py       # 日期时间工具
│   ├── services/                     # 业务逻辑目录（复杂模块拆分）
│   │   ├── __init__.py
│   │   └── llm_service.py           # 大模型服务（王书波负责）
│   ├── init_db.py                    # 数据库初始化脚本
│   ├── requirements.txt              # Python 依赖清单
│   └── README.md                     # 后端说明文档
├── frontend/                         # 前端工程目录
├── docs/                             # 文档目录
│   ├── API_SPEC.md                  # 接口规范文档
│   ├── DATABASE_DESIGN.md           # 数据库设计文档
│   ├── DEVELOPMENT_GUIDE.md         # 本文档
│   ├── 需求说明.md                   # 需求说明
│   └── prompts/                      # 大模型 Prompt 模板
│       ├── weekly_report_analysis_prompt.md
│       ├── contribution_summary_prompt.md
│       ├── risk_check_prompt.md
│       └── team_weekly_summary_prompt.md
├── deploy/                           # 部署脚本目录
├── README.md                         # 项目总体说明
└── TASKS.md                          # 任务分解文档
```

### 2.2 目录职责说明

各目录的职责划分如下，后端开发人员应按照职责划分将代码放置在正确的位置。`main.py` 是应用入口，负责创建 FastAPI 实例、注册路由、中间件配置和服务启动。`config.py` 集中管理所有配置项，包括数据库连接、大模型接口、服务端口等，禁止在代码中硬编码配置值。`database.py` 管理数据库连接和会话，提供 get_db 函数供路由层获取数据库会话。`models.py` 定义所有 SQLAlchemy ORM 模型，遵循数据库设计文档的表结构定义。`schemas.py` 定义所有 Pydantic 模型，用于请求参数校验和响应数据格式化。`service.py` 集中编写业务逻辑，当逻辑复杂时可拆分为 `services/` 目录下的独立文件。`routers/` 目录存放各模块的路由定义，每个路由文件对应一个功能模块。`utils/` 目录存放通用工具函数，如响应格式化、分页处理、异常定义等。

### 2.3 模块文件组织原则

每个功能模块的代码组织遵循以下原则：路由文件（routers/）仅负责接收请求参数调用 service 层方法，返回响应结果，不包含业务逻辑；service 层（或 service.py）包含所有业务逻辑，如数据校验、业务规则处理、多表关联查询等；模型定义统一放在 models.py，除非模块特别复杂否则不单独拆分模型文件；Pydantic schemas 统一放在 schemas.py，按模块分组定义请求和响应模型。遵循这些原则可以保持代码结构清晰，便于后续维护和代码审查。

---

## 三、代码组织规范

### 3.1 main.py 入口文件规范

应用入口文件 `main.py` 负责初始化 FastAPI 应用、配置中间件、注册路由和启动服务。标准写法如下所示，应包含 CORS 中间件配置、路由注册、异常处理器注册等基础配置。应用标题和版本号应与 config.py 中的配置保持一致，便于后续版本管理和 API 文档展示。

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import APP_NAME, APP_VERSION
from backend.database import engine
from backend.models import Base
from backend.routers import (
    members, weeks, tasks, deliveries, evaluations,
    statistics, weekly_reports, achievements, dictionaries, export
)
from backend.utils.exceptions import register_exception_handlers

# 创建数据库表（如使用 ORM 自动创建）
Base.metadata.create_all(bind=engine)

# 创建 FastAPI 应用实例
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="人工智能专班任务与成果跟踪小工具后端接口"
)

# 配置 CORS 中间件，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册异常处理器
register_exception_handlers(app)

# 注册路由
app.include_router(members.router, prefix="/api/v1", tags=["人员管理"])
app.include_router(weeks.router, prefix="/api/v1", tags=["周计划"])
app.include_router(tasks.router, prefix="/api/v1", tags=["任务管理"])
app.include_router(deliveries.router, prefix="/api/v1", tags=["成果提交"])
app.include_router(evaluations.router, prefix="/api/v1", tags=["评价管理"])
app.include_router(statistics.router, prefix="/api/v1", tags=["统计汇总"])
app.include_router(weekly_reports.router, prefix="/api/v1", tags=["周报分析"])
app.include_router(achievements.router, prefix="/api/v1", tags=["成果库"])
app.include_router(dictionaries.router, prefix="/api/v1", tags=["基础字典"])
app.include_router(export.router, prefix="/api/v1", tags=["导出功能"])

@app.get("/")
async def root():
    return {"message": f"{APP_NAME} API", "version": APP_VERSION}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 3.2 config.py 配置管理规范

所有配置项必须集中管理在 `config.py` 文件中，禁止在业务代码中硬编码配置值。配置项分为应用配置、数据库配置、大模型配置三类。敏感配置（如数据库密码、API Key）应优先从环境变量读取，环境变量未设置时使用默认值。生产环境部署时应通过环境变量或专门的配置文件提供敏感信息。

```python
import os
from typing import Optional

# ===========================================
# 应用配置
# ===========================================
APP_NAME = "AI Team Task Platform"
APP_VERSION = "1.0.0"
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))

# ===========================================
# MySQL 数据库配置
# ===========================================
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "ai_team_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "your_password")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "ai_team_task_platform")

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
)

# 数据库连接池配置
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))

# ===========================================
# 大模型配置
# ===========================================
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "qwen")  # qwen, deepseek, minimax
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "qwen-turbo")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))

# ===========================================
# 分页配置
# ===========================================
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
```

### 3.3 database.py 数据库连接规范

数据库连接采用 SQLAlchemy 的连接池模式，通过 `get_db` 函数提供数据库会话。每个请求应获取独立的会话，并在请求结束后正确关闭会话。使用 FastAPI 的依赖注入机制可以自动管理会话的生命周期。标准写法如下所示，应配置连接池参数以支持高并发访问。

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_RECYCLE

# 创建数据库引擎，配置连接池
engine = create_engine(
    DATABASE_URL,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_recycle=DB_POOL_RECYCLE,
    pool_pre_ping=True,  # 连接前检测连接有效性
    echo=False  # 生产环境设为 False 关闭 SQL 日志
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建 ORM 基类
Base = declarative_base()

def get_db():
    """
    获取数据库会话的依赖函数

    使用方式：
    @router.get("/items")
    def get_items(db: Session = Depends(get_db)):
        ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 四、模型与 Schema 规范

### 4.1 SQLAlchemy 模型定义规范

所有数据模型定义在 `models.py` 文件中，模型类名使用 PascalCase 命名（首字母大写），表名使用小写字母和下划线（snake_case）。模型应继承 declarative_base 创建的 Base 类。字段定义使用 Column 类，明确指定类型和约束。关系定义使用 relationship 函数。模型文件开头应导入必要的依赖，模型类之间如有依赖关系应合理安排定义顺序或使用前向引用。

```python
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

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
    status = Column(String(20), default='active', comment='状态')
    created_at = Column(DateTime, server_default=func.now(), comment='创建时间')
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment='更新时间')

    # 关系定义
    assigned_tasks = relationship('Task', back_populates='assignee', foreign_keys='Task.assignee_id')
    submitted_deliveries = relationship('Delivery', back_populates='submitter')

class Week(Base):
    """周次模型"""
    __tablename__ = 'weeks'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='周次ID')
    name = Column(String(50), nullable=False, comment='周次名称')
    start_date = Column(Date, nullable=False, comment='周开始日期')
    end_date = Column(Date, nullable=False, comment='周结束日期')
    status = Column(String(20), default='upcoming', comment='状态')
    remark = Column(Text, nullable=True, comment='备注')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 关系定义
    tasks = relationship('Task', back_populates='week')
    weekly_reports = relationship('WeeklyReport', back_populates='week')
```

### 4.2 Pydantic Schema 定义规范

所有请求参数和响应数据应使用 Pydantic 模型定义，存放在 `schemas.py` 文件中。Schema 类名使用 PascalCase 命名，应继承 BaseModel 类。请求模型（用于接收前端数据）添加 Config 类配置 `orm_mode = True` 以支持从 ORM 对象直接创建。响应模型中的时间字段使用 `datetime` 类型。列表字段使用 `List[Type]` 语法。必填字段直接定义属性，可选字段使用 `Optional[Type] = None`。

```python
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

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
    pass

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

class MemberListResponse(BaseModel):
    """人员列表响应模型"""
    items: List[MemberResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
```

### 4.3 嵌套 Schema 定义规范

当响应数据包含关联对象时，应定义嵌套的 Schema 以展示完整结构。嵌套深度不宜超过两层，避免响应结构过于复杂。对于需要展示关联数据的场景，可在响应模型中定义嵌套的对象结构，也可在 service 层处理后返回扁平化的数据结构。

```python
class DeliveryInTaskResponse(BaseModel):
    """任务详情中的成果信息"""
    id: int
    name: str
    description: str
    link: Optional[str]
    type: Optional[str]
    submitter_id: int
    submitter_name: str
    submitted_at: datetime
    is_latest: bool

    model_config = ConfigDict(from_attributes=True)

class EvaluationInTaskResponse(BaseModel):
    """任务详情中的评价信息"""
    id: int
    level: str
    comment: str
    base_score: int
    bonus_score: int
    final_score: int
    evaluator_id: int
    evaluator_name: str
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskDetailResponse(TaskResponse):
    """任务详情响应模型（包含成果和评价列表）"""
    deliveries: List[DeliveryInTaskResponse] = []
    evaluations: List[EvaluationInTaskResponse] = []
```

---

## 五、路由与业务逻辑规范

### 5.1 路由文件结构规范

每个功能模块的路由定义放在 `routers/` 目录下的独立文件中。路由文件应包含路由定义、前缀标签和依赖导入。路由函数使用 `async def` 定义，应合理使用依赖注入获取数据库会话和请求参数。标准的路由文件结构如下所示，应保持与接口规范文档中定义的接口路径一致。

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.schemas import MemberCreate, MemberUpdate, MemberResponse, MemberListResponse
from backend.services import MemberService
from backend.utils.response import success_response, success_list_response

router = APIRouter()

@router.get("/members", response_model=MemberListResponse, summary="获取人员列表")
def get_members(
    keyword: Optional[str] = Query(None, description="姓名模糊搜索"),
    unit: Optional[str] = Query(None, description="所属单位筛选"),
    status: Optional[str] = Query("active", description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页记录数"),
    db: Session = Depends(get_db)
):
    """
    获取专班成员列表

    支持按姓名、单位、状态筛选，支持分页查询
    """
    service = MemberService(db)
    result = service.get_members(
        keyword=keyword,
        unit=unit,
        status=status,
        page=page,
        page_size=page_size
    )
    return success_list_response(result)

@router.post("/members", response_model=MemberResponse, status_code=201, summary="创建人员")
def create_member(
    member_data: MemberCreate,
    db: Session = Depends(get_db)
):
    """创建新的专班成员"""
    service = MemberService(db)
    member = service.create_member(member_data)
    return success_response(member, message="人员创建成功")

@router.get("/members/{member_id}", response_model=MemberResponse, summary="获取人员详情")
def get_member(member_id: int, db: Session = Depends(get_db)):
    """根据ID获取人员详情"""
    service = MemberService(db)
    member = service.get_member(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="人员不存在")
    return success_response(member)
```

### 5.2 Service 层组织规范

业务逻辑统一封装在 service 层，可在 `service.py` 文件中集中编写或按模块拆分到 `services/` 目录。Service 类的初始化接受 db 会话对象，实例方法封装具体业务逻辑。Service 层负责数据校验、数据库操作、业务规则处理等。禁止在路由层直接编写复杂的业务逻辑代码。

```python
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_, func
from backend.models import Member, Task, Delivery
from backend.schemas import MemberCreate, MemberUpdate
from backend.utils.exceptions import BusinessException

class MemberService:
    """人员管理服务"""

    def __init__(self, db: Session):
        self.db = db

    def get_members(
        self,
        keyword: Optional[str] = None,
        unit: Optional[str] = None,
        status: str = "active",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """获取人员列表，支持筛选和分页"""
        query = self.db.query(Member)

        # 应用筛选条件
        if keyword:
            query = query.filter(Member.name.like(f"%{keyword}%"))
        if unit:
            query = query.filter(Member.unit == unit)
        if status:
            query = query.filter(Member.status == status)

        # 获取总数
        total = query.count()

        # 分页查询
        offset = (page - 1) * page_size
        members = query.offset(offset).limit(page_size).all()

        return {
            "items": members,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

    def create_member(self, member_data: MemberCreate) -> Member:
        """创建人员"""
        # 检查姓名是否重复
        existing = self.db.query(Member).filter(Member.name == member_data.name).first()
        if existing:
            raise BusinessException("E003", "该姓名已存在")

        # 创建人员记录
        member = Member(
            name=member_data.name,
            unit=member_data.unit,
            contact=member_data.contact,
            email=member_data.email,
            skill_tags=member_data.skill_tags,
            is_backbone=member_data.is_backbone
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member
```

### 5.3 业务逻辑处理规范

业务逻辑处理应遵循以下原则：所有数据操作前应进行必要的校验，如必填字段检查、格式校验、关联数据存在性检查等；业务规则校验失败应抛出自定义异常，而非直接返回错误信息；数据库操作应合理使用事务，确保数据一致性；查询操作应使用索引字段进行过滤，避免全表扫描；分页查询应同时返回总数和分页数据。

业务规则示例代码展示了常见的数据校验逻辑：

```python
class TaskService:
    """任务管理服务"""

    def update_task_status(self, task_id: int, new_status: str) -> Task:
        """更新任务状态，校验状态流转合法性"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise BusinessException("404", "任务不存在")

        # 定义合法的状态流转规则
        valid_transitions = {
            "not_started": ["in_progress"],
            "in_progress": ["submitted"],
            "submitted": ["need_revision", "completed"],
            "need_revision": ["submitted"],
            "completed": [],  # 已完成状态不允许变更
        }

        # 校验状态流转是否合法
        if new_status not in valid_transitions.get(task.status, []):
            raise BusinessException(
                "E001",
                f"无效的状态流转：从 {task.status} 不能变更为 {new_status}"
            )

        # 执行状态更新
        task.status = new_status
        self.db.commit()
        self.db.refresh(task)
        return task
```

---

## 六、异常处理规范

### 6.1 自定义异常类定义

应定义统一的异常类体系，区分业务异常和系统异常。业务异常（如数据不存在、业务规则校验失败）使用自定义异常类，返回友好的错误信息。系统异常（如数据库错误、外部服务调用失败）由全局异常处理器统一处理，记录日志并返回通用错误信息。

`utils/exceptions.py` 文件应包含以下异常定义：

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from datetime import datetime
import traceback
import logging

logger = logging.getLogger(__name__)

class BusinessException(Exception):
    """业务异常基类"""

    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)

class ResourceNotFoundException(BusinessException):
    """资源不存在异常"""

    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            code="404",
            message=f"{resource_type}不存在",
            details={"resource_type": resource_type, "resource_id": resource_id}
        )

class DuplicateResourceException(BusinessException):
    """资源重复异常"""

    def __init__(self, resource_type: str, identifier: str):
        super().__init__(
            code="409",
            message=f"{resource_type}已存在",
            details={"resource_type": resource_type, "identifier": identifier}
        )

def register_exception_handlers(app):
    """注册全局异常处理器"""

    @app.exception_handler(BusinessException)
    async def business_exception_handler(request: Request, exc: BusinessException):
        """处理业务异常"""
        return JSONResponse(
            status_code=200,  # 业务异常返回 200，通过 code 区分
            content={
                "code": exc.code,
                "message": exc.message,
                "error": exc.details,
                "timestamp": datetime.now().isoformat()
            }
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """处理 HTTP 异常"""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": str(exc.status_code),
                "message": exc.detail,
                "error": {},
                "timestamp": datetime.now().isoformat()
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """处理未捕获的异常"""
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "code": "500",
                "message": "服务器内部错误",
                "error": {"detail": str(exc) if logger.level == logging.DEBUG else "请联系管理员"},
                "timestamp": datetime.now().isoformat()
            }
        )
```

### 6.2 异常使用规范

在业务代码中应合理使用异常处理机制。数据不存在时应抛出 ResourceNotFoundException；数据重复时应抛出 DuplicateResourceException；业务规则校验失败时应抛出 BusinessException；外部服务调用失败时应捕获异常并转换为业务异常返回。禁止在路由层直接返回 HTTPException 而不经过异常处理器统一处理。

```python
# 正确示例
@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    service = TaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise ResourceNotFoundException("任务", task_id)
    return success_response(task)

# 错误示例（不应在路由层直接处理）
@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    service = TaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")  # 不推荐
    return success_response(task)
```

---

## 七、响应格式规范

### 7.1 统一响应工具函数

为保持响应格式一致，应定义统一的响应工具函数。所有接口返回数据应通过这些工具函数封装，确保响应结构统一。工具函数定义在 `utils/response.py` 文件中。

```python
from typing import Any, Dict, List, Optional
from datetime import datetime

def success_response(
    data: Any,
    message: str = "success",
    code: int = 200
) -> Dict[str, Any]:
    """
    统一成功响应格式

    Args:
        data: 响应数据
        message: 成功消息
        code: 状态码

    Returns:
        统一格式的响应字典
    """
    return {
        "code": code,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat() + "Z"
    }

def success_list_response(
    result: Dict[str, Any],
    message: str = "success"
) -> Dict[str, Any]:
    """
    统一列表响应格式

    Args:
        result: 包含 items, total, page, page_size, total_pages 的字典
        message: 成功消息

    Returns:
        统一格式的分页响应字典
    """
    return {
        "code": 200,
        "message": message,
        "data": {
            "items": result.get("items", []),
            "total": result.get("total", 0),
            "page": result.get("page", 1),
            "page_size": result.get("page_size", 20),
            "total_pages": result.get("total_pages", 0)
        },
        "timestamp": datetime.now().isoformat() + "Z"
    }

def error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    统一错误响应格式

    Args:
        code: 错误码
        message: 错误消息
        details: 错误详情

    Returns:
        统一格式的错误响应字典
    """
    return {
        "code": code,
        "message": message,
        "error": details or {},
        "timestamp": datetime.now().isoformat() + "Z"
    }
```

### 7.2 响应格式示例

各类接口的响应格式应遵循接口规范文档中定义的统一格式。单条数据查询返回包含 data 字段的响应；列表查询返回包含 items、total、page、page_size、total_pages 的响应；操作类接口（如创建、更新、删除）返回包含 data=null 和操作成功消息的响应；错误响应返回包含 code、message、error 的响应。

---

## 八、日志记录规范

### 8.1 日志配置规范

后端应配置统一的日志记录机制，用于问题排查和运行监控。日志配置应在应用启动时初始化，配置日志级别、格式、输出位置等。生产环境日志级别应设为 INFO 或 WARNING，开发环境可设为 DEBUG。

`backend/utils/logging_config.py` 文件定义日志配置：

```python
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging(log_level: str = "INFO", log_file: str = None):
    """
    配置应用日志

    Args:
        log_level: 日志级别
        log_file: 日志文件路径（可选）
    """
    # 定义日志格式
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # 创建根日志记录器
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # 清除已有的处理器
    logger.handlers.clear()

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(logging.Formatter(log_format, date_format))
    logger.addHandler(console_handler)

    # 文件处理器（如果指定了日志文件）
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        logger.addHandler(file_handler)

    return logger
```

### 8.2 日志记录规范

日志记录应遵循以下原则：使用合适的日志级别，DEBUG 用于调试信息，INFO 用于正常流程记录，WARNING 用于警告信息，ERROR 用于错误信息；日志信息应包含足够的上下文，便于问题排查；禁止记录敏感信息（如密码、密钥、个人隐私数据）；关键业务操作应记录操作日志，包括操作人、操作时间、操作内容、操作结果。

```python
import logging

logger = logging.getLogger(__name__)

class TaskService:
    def create_task(self, task_data: TaskCreate, operator_id: int):
        """创建任务"""
        logger.info(f"User {operator_id} creating task: {task_data.name}")

        try:
            task = Task(**task_data.dict())
            self.db.add(task)
            self.db.commit()
            self.db.refresh(task)

            logger.info(f"Task created successfully: task_id={task.id}, operator={operator_id}")
            return task

        except Exception as e:
            logger.error(f"Failed to create task: {e}", exc_info=True)
            raise
```

---

## 九、命名规范

### 9.1 文件命名规范

Python 文件使用小写字母和下划线命名（snake_case）。模块级别文件（与包同级）使用小写字母和下划线。测试文件使用 `test_` 前缀或 `_test.py` 后缀。包目录必须包含 `__init__.py` 文件。

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| Python 文件 | snake_case.py | database.py, task_service.py |
| 包目录 | snake_case/ | routers/, utils/, services/ |
| 测试文件 | test_*.py | test_task_service.py |
| 配置目录 | snake_case/ | backend/, frontend/ |

### 9.2 变量命名规范

变量命名遵循 PEP 8 规范，使用小写字母和下划线（snake_case）。常量使用大写字母和下划线。全局变量添加 g_ 前缀以避免命名冲突。类实例属性使用小写字母和下划线，私有属性使用单下划线前缀。避免使用单字母变量名（循环计数器除外）。

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 普通变量 | snake_case | task_id, member_name, page_size |
| 常量 | UPPER_SNAKE_CASE | MAX_PAGE_SIZE, DEFAULT_STATUS |
| 全局变量 | g_variable_name | g_current_user, g_request_id |
| 类属性 | self.snake_case | self.db, self.config |
| 私有属性 | self._private_var | self._cache, self._session |

### 9.3 函数命名规范

函数命名使用小写字母和下划线（snake_case）。公开方法使用描述性的动词短语，如 `get_member`、`create_task`、`update_status`。私有方法使用单下划线前缀，如 `_validate_data`、`_build_query`。异步函数使用 `async_` 前缀。回调函数使用 `_on_` 前缀。

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 公开方法 | verb_noun | get_member, create_task, update_status |
| 私有方法 | _verb_noun | _validate_data, _build_query |
| 异步方法 | async_verb_noun | async_fetch_data, async_save_result |
| 回调方法 | _on_event | _on_success, _on_error |
| 工具函数 | snake_case | format_datetime, calculate_page |

### 9.4 类命名规范

类命名使用 PascalCase（首字母大写）。异常类添加 `Exception` 后缀。基类添加 `Base` 或 `Abstract` 前缀。接口类添加 `Interface` 后缀（如有）。

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 普通类 | PascalCase | MemberService, TaskService |
| 异常类 | PascalCase + Exception | BusinessException, ValidationException |
| 基类 | Base + PascalCase | BaseModel, BaseService |
| 枚举类 | PascalCase | TaskStatus, EvaluationLevel |

### 9.5 数据库命名规范

数据库相关命名遵循数据库设计文档的约定。表名使用小写字母和下划线（snake_case），单数形式。字段名使用小写字母和下划线。索引名使用 `idx_` 前缀加字段名。外键名使用 `fk_` 前缀加关联表名。

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 表名 | snake_case（单数） | members, tasks, evaluations |
| 字段名 | snake_case | member_name, task_status, created_at |
| 索引名 | idx_ + field_name | idx_name, idx_status, idx_date_range |
| 外键名 | fk_ + table_table | fk_tasks_members |

---

## 十、Git 协作规范

### 10.1 分支命名规范

所有开发人员在开发前必须基于任务创建独立的 feature 分支，分支命名应清晰表达分支内容和负责人。分支命名格式为 `feature/{负责人拼音}-{功能模块}`，功能模块使用英文短横线分隔。禁止在 main 分支直接开发，所有代码必须通过 Pull Request 合并。

| 分支类型 | 命名格式 | 示例 |
|----------|----------|------|
| 主分支 | main | main |
| 功能分支 | feature/{人名}-{模块} | feature/zhaoxiaoxiang-core-backend-integration |
| 热修复分支 | hotfix/{问题描述} | hotfix/fix-login-error |
| 发布分支 | release/{版本号} | release/v1.0.0 |

### 10.2 提交信息规范

提交信息应清晰描述本次提交的内容，使用规范的前缀开头。提交信息格式为 `{type}: {description}`，type 表示提交类型，description 简要描述修改内容。每行不超过 72 个字符。提交信息应使用中文或英文，避免中英混杂。

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat: 添加任务创建接口 |
| fix | 问题修复 | fix: 修复任务状态流转校验问题 |
| docs | 文档更新 | docs: 更新接口文档 |
| style | 代码格式 | style: 格式化代码 |
| refactor | 重构 | refactor: 重构数据库连接模块 |
| test | 测试相关 | test: 添加任务接口测试用例 |
| chore | 构建/工具 | chore: 更新依赖版本 |

### 10.3 Pull Request 规范

开发完成后应创建 Pull Request 请求合并代码，PR 标题使用 feat:、fix: 等前缀开头。PR 描述应说明本次完成的功能、主要修改文件、是否影响其他模块、是否已本地测试。建议在 PR 描述中关联相关任务，如 `Closes #12`。代码合并仅由梁伟晔、王硕负责，其他人员不得合并代码。

PR 描述模板：

```markdown
## 功能说明
简要描述本次提交的功能或修改内容

## 主要修改
- 修改文件1：xxx
- 修改文件2：xxx
- 新增文件：xxx

## 影响范围
说明本次修改是否影响其他模块

## 测试情况
- [ ] 本地测试通过
- [ ] 接口测试通过
- [ ] 边界条件测试通过

## 关联任务
Closes #12
```

### 10.4 代码审查重点

代码审查时应关注以下要点：是否完成需求文档中要求的功能；是否破坏已有功能；是否提交无关文件（如 node_modules、dist、.venv、__pycache__）；代码是否符合本规范的命名和结构要求；是否正确处理异常和错误情况；是否对统计数据和导出功能产生影响；SQL 查询是否使用了索引字段。

---

## 十一、测试规范

### 11.1 测试文件组织

后端测试文件组织在 `backend/tests/` 目录下（需创建）。测试文件使用 `test_` 前缀命名，每个模块对应一个测试文件。测试文件应与源码目录结构保持一致，便于查找和管理。

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # pytest 配置和 fixtures
│   ├── test_members.py          # 人员管理测试
│   ├── test_tasks.py            # 任务管理测试
│   ├── test_evaluations.py      # 评价管理测试
│   └── test_statistics.py       # 统计汇总测试
```

### 11.2 测试用例编写规范

测试用例应使用 pytest 框架编写，每个测试函数以 `test_` 开头。测试函数应描述测试场景，函数名应清晰表达测试目的。使用 fixture 管理测试数据，避免测试之间的数据依赖。每个接口至少编写正向测试用例和异常测试用例。

```python
import pytest
from sqlalchemy.orm import Session
from backend.models import Member
from backend.services import MemberService
from backend.schemas import MemberCreate
from backend.utils.exceptions import DuplicateResourceException

@pytest.fixture
def member_service(db: Session) -> MemberService:
    return MemberService(db)

def test_create_member_success(member_service: MemberService):
    """测试创建成员成功"""
    member_data = MemberCreate(
        name="测试成员",
        unit="测试单位",
        is_backbone=False
    )

    member = member_service.create_member(member_data)

    assert member.id is not None
    assert member.name == "测试成员"
    assert member.unit == "测试单位"
    assert member.status == "active"

def test_create_member_duplicate(member_service: MemberService, sample_member: Member):
    """测试创建重复成员应抛出异常"""
    member_data = MemberCreate(
        name=sample_member.name,
        unit="其他单位"
    )

    with pytest.raises(DuplicateResourceException) as exc_info:
        member_service.create_member(member_data)

    assert exc_info.value.code == "409"
```

### 11.3 核心流程测试

系统应包含核心业务流程的集成测试，验证周计划、周交付、周评价的完整闭环。测试流程应覆盖以下场景：从创建人员到创建任务、提交成果、进行评价、查看统计的全流程；周报录入和大模型分析流程；导出功能的基本验证。

```python
def test_task_complete_flow(db: Session, sample_member: Member, sample_week: Week):
    """测试任务完整生命周期"""
    # 1. 创建任务
    task_service = TaskService(db)
    task_data = TaskCreate(
        name="测试任务",
        task_type="key_task",
        difficulty="high",
        assignee_id=sample_member.id,
        week_id=sample_week.id,
        deadline=date.today(),
        delivery_requirement="提交设计方案"
    )
    task = task_service.create_task(task_data)
    assert task.status == "not_started"

    # 2. 开始任务
    task = task_service.update_status(task.id, "in_progress")
    assert task.status == "in_progress"

    # 3. 提交成果
    delivery_service = DeliveryService(db)
    delivery_data = DeliveryCreate(
        task_id=task.id,
        name="设计方案V1",
        description="初版设计方案",
        submitter_id=sample_member.id
    )
    delivery = delivery_service.create_delivery(delivery_data)
    task = task_service.get_task(task.id)
    assert task.status == "submitted"

    # 4. 评价任务
    evaluation_service = EvaluationService(db)
    eval_data = EvaluationCreate(
        task_id=task.id,
        level="excellent",
        comment="方案完整",
        evaluator_id=1
    )
    evaluation = evaluation_service.create_evaluation(eval_data)
    task = task_service.get_task(task.id)
    assert task.status == "completed"
    assert evaluation.final_score == 4  # 基础分3 + 高难度加分1
```

---

## 十二、部署与运行规范

### 12.1 本地运行要求

开发人员在本地启动后端服务前应完成以下准备工作。首先安装 Python 3.10 或更高版本，然后创建虚拟环境并安装依赖，最后配置数据库连接参数。启动命令如下所示：

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（仅首次执行）
python -m venv .venv

# 激活虚拟环境
# Linux/Mac
source .venv/bin/activate
# Windows
.venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（或修改 config.py 默认值）
# Linux/Mac
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=ai_team_user
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=ai_team_task_platform

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 12.2 依赖管理规范

Python 依赖统一管理在 `requirements.txt` 文件中。依赖文件应锁定版本号，避免不同开发环境出现版本差异。依赖文件按功能分组，使用注释分隔。常用的依赖包括 fastapi、uvicorn、sqlalchemy、pymysql、pydantic 等。

`requirements.txt` 文件内容：

```text
# Web框架
fastapi==0.109.0
uvicorn[standard]==0.27.0

# 数据库
sqlalchemy==2.0.25
pymysql==1.1.0
cryptography==42.0.0

# 数据验证
pydantic==2.5.0
pydantic-settings==2.1.0

# HTTP客户端（用于调用大模型API）
httpx==0.26.0

# Excel导出
openpyxl==3.1.2

# 日志
python-json-logger==2.0.7

# 测试
pytest==7.4.0
pytest-asyncio==0.23.0
httpx==0.26.0
```

### 12.3 生产环境注意事项

生产环境部署时应注意以下事项：使用生产级别的数据库连接池配置；关闭 DEBUG 模式和 SQL 日志输出；配置合适的日志级别和日志轮转策略；敏感配置通过环境变量提供，不提交到代码仓库；配置反向代理（如 Nginx）处理静态文件和负载均衡；配置健康检查接口用于服务监控。

---

## 十三、文档维护

### 13.1 文档更新记录

| 版本 | 日期 | 更新内容 | 更新人 |
|------|------|----------|--------|
| v1.0 | 2026-05-07 | 初始版本，定义后端开发规范 | 赵晓详 |

### 13.2 规范执行检查清单

代码提交前应检查以下要点：代码是否符合命名规范；是否使用了统一的响应格式；是否正确处理异常情况；是否添加了必要的日志记录；是否提交了无关文件（如 node_modules、__pycache__、.venv）；是否更新了相关的接口文档或数据库文档；是否在本地测试通过。

---

## 十四、附录

### 14.1 常用命令速查

| 操作 | 命令 |
|------|------|
| 创建虚拟环境 | `python -m venv .venv` |
| 激活虚拟环境 | `source .venv/bin/activate` |
| 安装依赖 | `pip install -r requirements.txt` |
| 启动服务 | `uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| 运行测试 | `pytest backend/tests/ -v` |
| 生成 requirements.txt | `pip freeze > requirements.txt` |

### 14.2 API 文档访问

FastAPI 自动生成 API 文档，服务启动后可访问以下地址查看：交互式 API 文档地址为 http://localhost:8000/docs（使用 Swagger UI）；备用 API 文档地址为 http://localhost:8000/redoc（使用 ReDoc）。

### 14.3 常见问题处理

数据库连接失败时，应检查 MySQL 服务是否启动、配置文件中的连接参数是否正确、数据库用户是否有访问权限。网络超时错误可能由大模型 API 服务不稳定导致，可检查网络连接和 API Key 配置。依赖安装失败时，可尝试更新 pip 版本或使用国内镜像源。

---

*本文档由赵晓详创建，作为人工智能专班任务与成果跟踪小工具的后端开发规范。如有疑问或建议，请联系文档负责人。*
