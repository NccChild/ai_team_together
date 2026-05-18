# 登录和权限分离功能使用指南

## 功能概述

已成功实现登录界面和权限分离功能，支持两种用户角色：
- **管理员 (admin)** - 系统管理员
- **队员 (member)** - 普通成员

## 快速开始

### 1. 后端依赖安装

```bash
cd /data/usershare/ai_team_task_platform/backend
pip install -r requirements.txt
```

### 2. 初始化数据库和用户

```bash
python init_users.py
```

这将创建默认管理员账户：

| 账户类型 | 用户名 | 密码 | 角色 |
|---------|--------|------|------|
| 管理员 | guanli | guanli666 | admin |

管理员登录后可在"团队管理"页面创建普通成员账号。

### 3. 启动后端服务

```bash
python main.py
```

或使用 uvicorn:
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 4. 启动前端服务

```bash
cd /data/usershare/ai_team_task_platform/frontend
pnpm install
pnpm run dev
```

## 核心功能说明

### 登录流程

1. **访问登录页面** → `/login`
2. **输入用户名和密码** → 提交
3. **验证成功** → 获取 JWT token 和用户信息
4. **自动重定向** → 进入 `/dashboard`

### 认证机制

- 使用 **JWT (JSON Web Tokens)** 进行认证
- Token 保存在 localStorage 中
- 所有后续请求的 Authorization header 中包含 token
- Token 有效期：24小时

### 权限路由保护

所有 `/` 下的路由都被 `ProtectedRoute` 组件保护：
- 未登录用户自动重定向到 `/login`
- 已登录但权限不足的用户重定向到 `/unauthorized`

### 用户界面差异

当前版本中，不同用户登录后进入相同的界面，但在顶部状态栏中显示用户的实际角色：

![用户信息显示]
- 显示当前登录用户名
- 显示用户所属单位
- 显示用户角色（管理员/队长/队员）
- 支持登出功能

## 后端 API 接口

### 登录接口

**POST** `/api/v1/auth/login`

请求体：
```json
{
  "username": "guanli",
  "password": "guanli666"
}
```

响应示例：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "guanli",
      "name": "管理员",
      "role": "admin",
      "email": "admin@example.com",
      "unit": "系统管理"
    }
  },
  "timestamp": "2026-05-13T10:30:00Z"
}
```

### 获取当前用户接口

**GET** `/api/v1/auth/me`

请求头：
```
Authorization: Bearer <token>
```

## 文件结构

### 后端新增文件
- `backend/routers/auth.py` - 认证路由
- `backend/utils/security.py` - 认证工具
- `backend/init_users.py` - 用户初始化脚本

### 后端修改文件
- `backend/requirements.txt` - 添加认证依赖
- `backend/models.py` - 更新 Member 模型
- `backend/schemas.py` - 添加认证 schema
- `backend/main.py` - 注册认证路由

### 前端新增文件
- `src/contexts/AuthContext.tsx` - 认证状态管理
- `src/components/ProtectedRoute.tsx` - 受保护的路由组件
- `src/pages/Login.tsx` - 登录页面
- `src/pages/Login.module.css` - 登录页面样式
- `src/pages/Unauthorized.tsx` - 未授权页面

### 前端修改文件
- `src/App.tsx` - 添加登录路由和权限保护
- `src/components/Layout.tsx` - 集成认证和用户信息
- `src/pages/index.ts` - 导出新页面

## 后续优化方向

### 1. 前端界面差异
虽然当前已经能正确识别用户角色，但不同用户的界面还没有显著差异。后续可以：
- 根据用户角色显示不同的菜单项
- 为不同角色提供不同的功能和权限
- 自定义每个角色的仪表板

### 2. 后端权限控制
- 为 API 端点添加权限验证装饰器
- 确保不同角色只能访问对应的资源
- 实现细粒度的权限管理

### 3. 安全增强
- 使用环境变量管理 JWT 密钥
- 实现 token 刷新机制
- 添加请求速率限制
- 实现登录日志审计

### 4. 用户管理
- 实现用户注册功能
- 支持修改密码
- 实现忘记密码功能
- 添加用户角色管理界面

## 故障排查

### 登录失败

1. **检查用户是否存在**
   ```bash
   python -c "from backend.models import Member; from backend.database import SessionLocal; db = SessionLocal(); print(db.query(Member).all())"
   ```

2. **确保初始化脚本已运行**
   ```bash
   python init_users.py
   ```

3. **检查数据库连接**
   - 确保 MySQL 服务运行中
   - 检查 backend/config.py 中的 DATABASE_URL

### Token 验证失败

1. **检查 Authorization header 格式**
   ```
   Authorization: Bearer <token>
   ```

2. **验证 token 是否过期**
   - 当前设置为 24 小时有效期

3. **检查浏览器 localStorage**
   - 打开开发者工具 → Application → localStorage
   - 查看 `auth_token` 是否存在

## 测试场景

### 场景 1：管理员登录
1. 输入用户名: `guanli`, 密码: `guanli666`
2. 点击登录
3. 验证：进入仪表板，顶部显示"管理员"身份

### 场景 2：登出
1. 点击用户菜单 → "退出登录"
2. 验证：重定向到登录页面，localStorage 清空

### 场景 3：直接访问受保护路由（未登录）
1. 清空 localStorage 或无痕浏览
2. 直接访问 `http://localhost:5173/dashboard`
3. 验证：重定向到登录页面

## 常见问题 (FAQ)

**Q: 如何添加新用户？**
A: 管理员登录后，在"团队管理"页面创建。也可编辑 `backend/init_users.py` 中 `DEFAULT_ADMIN` 配置后重新运行。

**Q: 密码是如何安全存储的？**
A: 使用 bcrypt 算法进行密码加密，存储的是密码哈希值。

**Q: 如何修改 JWT 密钥？**
A: 编辑 `backend/utils/security.py` 中的 `SECRET_KEY` 变量（生产环境应使用环境变量）。

**Q: Token 过期后怎么办？**
A: 用户需要重新登录获取新的 token。后续可实现 refresh token 机制。
