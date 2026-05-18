---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 30450221008baaf129aa42ef59ff78df81fc390fd8c1ee01f4f11a785d8e33ea80b3172b1c022077430c8a22ecce940083f8193c90bf39831fce7a210d01da67005d0ab3ce407a
    ReservedCode2: 30450221008069400b416b13e7a344bfa8ecc4f9034cef4e7bbfc5a748685f7d539f0c80540220058a80fa3b797a0984d188d5b9635df2ca0214bfc384974ed205220091217177
---

# 人工智能专班任务与成果跟踪小工具

## 部署说明

### 一、环境要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Python | 3.10+ | 后端运行环境 |
| Node.js | 18+ | 前端运行环境 |
| MySQL | 8.0+ | 数据库 |
| Docker | 20.10+ | 可选，用于数据库部署 |

### 二、数据库准备

#### 方式一：使用 Docker 启动 MySQL

```bash
# 进入项目根目录
cd ai_team_task_platform

# 启动 MySQL 容器
docker-compose up -d

# 查看容器状态
docker-compose ps
```

#### 方式二：本地安装 MySQL

1. 安装 MySQL 8.0
2. 创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS ai_team_task_platform
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'ai_team_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ai_team_task_platform.* TO 'ai_team_user'@'%';
FLUSH PRIVILEGES;
```

### 三、后端部署

#### 1. 进入后端目录

```bash
cd backend
```

#### 2. 创建虚拟环境

```bash
# Linux/Mac
python -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

#### 3. 安装依赖

```bash
pip install -r requirements.txt
```

#### 4. 配置环境变量

创建 `.env` 文件或设置环境变量：

```bash
# 数据库配置
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=ai_team_user
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=ai_team_task_platform

# 大模型配置（可选）
export LLM_PROVIDER=qwen
export LLM_API_KEY=your_api_key
export LLM_BASE_URL=https://api.openai.com/v1
export LLM_MODEL_NAME=qwen-turbo

# 服务配置
export APP_HOST=0.0.0.0
export APP_PORT=8000
```

#### 5. 初始化数据库（可选）

```bash
python init_db.py
```

这将创建示例数据用于测试。

#### 6. 启动服务

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后，访问：
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### 四、前端部署

#### 1. 进入前端目录

```bash
cd frontend
```

或

```bash
cd frontend
```

#### 2. 安装依赖

```bash
pnpm install
```

#### 3. 配置 API 地址

创建 `.env` 文件：

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 4. 启动开发服务器

```bash
pnpm dev
```

前端启动后，访问：http://localhost:5173

#### 5. 构建生产版本

```bash
pnpm build
```

构建产物在 `dist` 目录。

### 五、使用 Docker Compose 部署全部服务（可选）

```bash
# 启动所有服务（数据库 + 后端）
docker-compose -f docker-compose.full.yml up -d
```

### 六、常见问题

#### 1. 数据库连接失败

- 检查 MySQL 服务是否启动
- 检查端口 3306 是否被占用
- 验证用户名密码是否正确
- 检查防火墙设置

#### 2. 前端无法调用后端接口

- 检查后端服务是否启动
- 检查 CORS 配置
- 检查 API 地址是否正确

#### 3. 依赖安装失败

- 尝试更新 pip：`pip install --upgrade pip`
- 使用国内镜像源：`pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`

### 七、联系支持

如有问题，请联系项目负责人。

---

**版本**：v1.0.0
**更新时间**：2026年5月
