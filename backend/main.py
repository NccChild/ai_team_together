"""
FastAPI 应用入口
人工智能专班任务与成果跟踪小工具后端服务
"""

import sys
import os

# 将项目根目录加入 Python 路径，确保 `backend.xxx` 导入正确
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env"))

# 初始化日志系统（必须在其他模块之前）
import logging
from backend.utils.logging_config import setup_logging, TraceFilter
setup_logging()
# 为所有 handler 添加 trace_id 过滤器
for handler in logging.getLogger().handlers:
    handler.addFilter(TraceFilter())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.utils.middleware import TraceMiddleware, RequestLogMiddleware
from backend.config import APP_NAME, APP_VERSION
from backend.database import engine
from backend.models import Base
from backend.routers.members import router as members_router
from backend.routers.weeks import router as weeks_router
from backend.routers.tasks import router as tasks_router
from backend.routers.evaluations import router as evaluations_router
from backend.routers.statistics import router as statistics_router
from backend.routers.weekly_reports import router as weekly_reports_router
from backend.routers.achievements import router as achievements_router
from backend.routers.dictionaries import router as dictionaries_router
from backend.routers.export import router as export_router
from backend.utils.exceptions import register_exception_handlers

# 创建数据库表
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-Id"],
)

# 注册请求中间件（先 trace_id，再 access log）
app.add_middleware(TraceMiddleware)
app.add_middleware(RequestLogMiddleware)

# 注册异常处理器
register_exception_handlers(app)

# 注册路由
app.include_router(members_router, prefix="/api/v1", tags=["人员管理"])
app.include_router(weeks_router, prefix="/api/v1", tags=["周计划"])
app.include_router(tasks_router, prefix="/api/v1", tags=["任务管理"])
app.include_router(evaluations_router, prefix="/api/v1", tags=["评价管理"])
app.include_router(statistics_router, prefix="/api/v1", tags=["统计汇总"])
app.include_router(weekly_reports_router, prefix="/api/v1", tags=["周报分析"])
app.include_router(achievements_router, prefix="/api/v1", tags=["成果库"])
app.include_router(dictionaries_router, prefix="/api/v1", tags=["基础字典"])
app.include_router(export_router, prefix="/api/v1", tags=["导出功能"])

@app.get("/")
async def root():
    """根路径返回服务信息"""
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy"}

# 后端服务启动入口
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
