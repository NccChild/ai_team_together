# 快速启动指南

## 环境要求

- Python 3.8+
- Node.js 16+ 和 pnpm
- MySQL 数据库

## 快速启动 (5分钟)

### 1. 配置后端

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 初始化数据库用户
python init_users.py

# 启动后端服务
python main.py
```

后端将在 http://localhost:8000 运行

### 2. 配置前端

```bash
# 进入前端目录
cd frontend

# 修改环境配置（可选，开发环境已默认配置）
# cp .env.example .env.local

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

前端将在 http://localhost:5173 运行

### 3. 测试登录

打开浏览器访问 http://localhost:5173

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | guanli | guanli666 |

管理员登录后可在"团队管理"页面创建普通成员账号。

## 主要改动概览

```
✅ 已实现的功能：
├── 用户认证系统
│   ├── JWT 令牌管理
│   ├── 密码加密存储
│   └── Token 自动恢复
├── 用户登录
│   ├── 登录页面
│   ├── 错误提示
│   └── 登出功能
├── 权限管理
│   ├── 路由保护
│   ├── 角色识别
│   └── 自动重定向
└── 用户界面
    ├── 显示当前用户
    ├── 显示用户角色
    └── 显示单位信息
```

## 可选配置

### 修改 API 地址（开发使用示例）

创建 `frontend/.env.local` 文件：

```env
# 本地开发
VITE_API_BASE_URL=http://localhost:8000

# Docker 环境
# VITE_API_BASE_URL=http://172.20.10.2:8000

# 生产环境
# VITE_API_BASE_URL=https://api.example.com
```

### 修改 JWT 密钥（生产必需）

编辑 `backend/utils/security.py`：

```python
# 改为从环境变量读取（安全做法）
import os
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
```

## 常见命令

### 后端

```bash
# 运行服务
python main.py

# 或使用 uvicorn
uvicorn backend.main:app --reload

# 初始化数据库
python init_users.py

# 查看 API 文档
# 访问 http://localhost:8000/docs
```

### 前端

```bash
# 开发模式
pnpm run dev

# 构建
pnpm run build

# 生产构建
pnpm run build:prod

# 预览构建结果
pnpm run preview

# 代码检查
pnpm lint
```

## 项目结构

```
┌─ backend/                    后端服务
│  ├─ routers/auth.py         ✨ 新增：认证路由
│  ├─ utils/security.py       ✨ 新增：认证工具
│  ├─ init_users.py           ✨ 新增：初始化脚本
│  └─ ...
└─ frontend/                   前端应用
   ├─ src/
   │  ├─ contexts/AuthContext.tsx    ✨ 新增：认证状态
   │  ├─ components/
   │  │  ├─ ProtectedRoute.tsx       ✨ 新增：路由保护
   │  │  └─ Layout.tsx               📝 更新：用户信息
   │  ├─ pages/
   │  │  ├─ Login.tsx                ✨ 新增：登录页
   │  │  └─ Unauthorized.tsx         ✨ 新增：权限页
   │  └─ App.tsx                     📝 更新：路由配置
   └─ ...
```

## API 测试

使用 curl 测试登录接口：

```bash
# 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"guanli","password":"guanli666"}'

# 获取当前用户（用返回的 token 替换 YOUR_TOKEN）
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 故障排查

### 后端无法启动
```bash
# 检查依赖是否安装
pip list | grep fastapi

# 检查数据库连接
# 查看 backend/config.py 中的 DATABASE_URL
```

### 前端请求失败
```bash
# 检查 API_BASE_URL 是否正确
# 查看浏览器控制台错误信息
# 检查后端是否运行
```

### 登录提示错误
```bash
# 确保已运行 init_users.py
# 检查数据库中是否有用户记录
python init_users.py
```

## 下一步

- 📖 详细文档：查看 [LOGIN_GUIDE.md](./LOGIN_GUIDE.md)
- 📋 完整报告：查看 [IMPLEMENTATION_REPORT.md](./IMPLEMENTATION_REPORT.md)
- 🚀 开始优化不同角色的界面差异

---

**快速链接：**
- 前端：http://localhost:5173
- 后端：http://localhost:8000
- 文档：http://localhost:8000/docs
