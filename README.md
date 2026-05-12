
# 人工智能专班任务与成果跟踪小工具

本项目用于支撑人工智能专班"周计划、周交付、周评价"管理闭环，面向专班内部约15人使用!

## 项目概述

系统不建设复杂权限体系，不作为正式绩效考核平台，重点实现任务安排、成果提交、质量评价、贡献统计、周报分析等轻量化功能。

系统建设目标是通过小工具支撑专班形成稳定运行机制，实现"任务有人干、成果有人交、质量有人评、贡献有记录"。

## 技术栈

| 类型 | 技术选型 |
|------|----------|
| 前端框架 | React + TypeScript + Vite |
| UI组件库 | Ant Design |
| 请求工具 | Axios |
| 后端框架 | FastAPI |
| 数据库 | MySQL 8.0 |
| ORM框架 | SQLAlchemy |
| 数据校验 | Pydantic |
| 大模型接口 | Qwen / DeepSeek / MiniMax |

## 目录结构

```
ai_team_task_platform/
├── backend/                    # 后端工程
│   ├── main.py               # 应用入口
│   ├── config.py             # 配置文件（数据库、大模型等）
│   ├── database.py           # 数据库连接与会话管理
│   ├── models.py             # ORM 模型
│   ├── schemas.py            # Pydantic 模型
│   ├── routers/              # 路由模块
│   ├── services/             # 业务逻辑
│   ├── utils/                # 工具函数
│   ├── init_db.py            # 数据库初始化（含示例数据）
│   └── requirements.txt      # Python 依赖
├── ai-team-task-platform/      # 前端工程（React）
├── deploy/                     # 部署脚本和配置
├── docs/                       # 文档目录
├── docker-compose.yml          # Docker Compose 配置
└── README.md                   # 项目说明
```

## 快速开始

> **注意**：项目 `.gitignore` 已忽略 `.venv/`、`.env` 等文件，不会上传到仓库。请自行创建虚拟环境和环境变量配置文件。

### 1. 启动 MySQL 数据库

项目使用 Docker 启动 MySQL 8.0，配置定义在 `docker-compose.yml`：

| 配置项 | 值 | 对应文件 |
|--------|-----|----------|
| 容器名称 | `ai_team_mysql_v1` | `docker-compose.yml` |
| 宿主机端口 | `3310` | `docker-compose.yml` → `config.py` (`MYSQL_PORT`) |
| 容器内端口 | `3306` | `docker-compose.yml` |
| 数据库名 | `ai_team_task_platform` | `docker-compose.yml` → `config.py` (`MYSQL_DATABASE`) |
| 应用用户 | `ai_team_user` | `docker-compose.yml` → `config.py` (`MYSQL_USER`) |
| 应用密码 | `ai_team_password` | `docker-compose.yml` → `config.py` (`MYSQL_PASSWORD`) |
| Root 密码 | `root_password` | `docker-compose.yml` |

```bash
# 启动 MySQL（在项目根目录执行）
docker compose up -d

# 验证数据库连接（可选）
docker exec -it ai_team_mysql_v1 mysql -u ai_team_user -pai_team_password ai_team_task_platform
```

> **注意**：`docker-compose.yml` 和 `backend/config.py` 中数据库账号密码已对齐，本地开发无需额外配置。如果使用本地 MySQL，需要自行建库并在 `backend/.env` 中覆盖连接信息。

### 2. 启动后端服务

```bash
# 在项目根目录执行

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate     # Windows

# 安装依赖
pip install -r backend/requirements.txt

# 启动服务（在项目根目录执行）
python backend/main.py
```

### 3. 启动前端服务

```bash
cd ai-team-task-platform

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 4. 访问应用

- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 功能模块

1. **首页看板** - 展示本周任务、完成情况、待评价、延期、积分排行
2. **人员管理** - 维护专班成员信息和能力标签
3. **任务管理** - 创建、分配、跟踪任务状态
4. **周计划管理** - 按周组织任务安排
5. **成果提交** - 记录任务完成后的交付内容
6. **周评价管理** - 对任务进行质量评价并形成积分
7. **统计汇总** - 按周、按人员统计任务和积分
8. **大模型周报分析** - 对成员周报进行结构化分析
9. **成果库** - 沉淀和查询已完成任务成果

## 开发说明

详细开发规范请参考：
- [需求说明](docs/需求说明.md)
- [开发指南](docs/DEVELOPMENT_GUIDE_SIMPLE.md)

## 许可证

内部使用项目
