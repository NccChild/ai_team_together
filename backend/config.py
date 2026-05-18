"""
应用配置文件
所有配置项集中管理，支持环境变量覆盖
"""

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
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "ai_team_password")
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

# ===========================================
# 任务状态配置
# ===========================================
TASK_STATUS = {
    "not_started": "未开始",
    "in_progress": "进行中",
    "submitted": "已提交",
    "need_revision": "需修改",
    "completed": "已完成",
    "overdue": "已延期"
}

# ===========================================
# 任务类型配置
# ===========================================
TASK_TYPES = {
    "key_task": "重点攻关任务",
    "support_task": "支撑服务任务",
    "skill_task": "能力提升任务",
    "temp_task": "临时协同任务"
}

# ===========================================
# 任务难度配置
# ===========================================
TASK_DIFFICULTY = {
    "low": "低",
    "medium": "中",
    "high": "高"
}

# ===========================================
# 评价等级配置
# ===========================================
EVALUATION_LEVELS = {
    "excellent": "优秀",
    "qualified": "合格",
    "need_revision": "需修改",
    "unqualified": "不合格"
}

# ===========================================
# 评价积分配置
# ===========================================
EVALUATION_SCORES = {
    "excellent": 3,
    "qualified": 2,
    "need_revision": 1,
    "unqualified": 0
}

# ===========================================
# 加分项配置
# ===========================================
BONUS_ITEMS = {
    "high_difficulty": "高难度任务",
    "key_task": "重点攻关任务",
    "high_value": "成果可复用价值高"
}

# ===========================================
# 成果类型配置
# ===========================================
DELIVERY_TYPES = {
    "plan_material": "方案材料",
    "tech_report": "技术报告",
    "test_record": "测试记录",
    "model_evaluation": "模型评估",
    "prompt_template": "Prompt模板",
    "code_tool": "代码工具",
    "case_analysis": "案例分析",
    "learning_material": "学习材料"
}

# ===========================================
# 能力标签配置
# ===========================================
SKILL_TAGS = {
    "plan_preparation": "方案编制",
    "material_writing": "材料撰写",
    "data_governance": "数据治理",
    "model_training": "模型训练",
    "model_evaluation": "模型评测",
    "prompt_design": "Prompt设计",
    "frontend_development": "前端开发",
    "backend_development": "后端开发",
    "system_testing": "系统测试",
    "project_management": "项目管理"
}

# ===========================================
# 人员状态配置
# ===========================================
MEMBER_STATUS = {
    "active": "在用",
    "inactive": "停用"
}

# ===========================================
# 周次状态配置
# ===========================================
WEEK_STATUS = {
    "current": "当前周",
    "upcoming": "未开始",
    "history": "历史周"
}
