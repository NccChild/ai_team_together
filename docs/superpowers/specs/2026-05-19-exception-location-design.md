# 异常定位机制完善方案

## 概述

为 AI Team Task Platform 前后端增加基于 Request ID 的全链路异常定位能力，日志写文件（不写数据库），在方便开发者排查问题的同时杜绝 SQL 注入风险。

## 目标

- 每次请求附带唯一 Request ID，贯穿全链路
- 后端日志按天滚动写入文件，保留 3 天
- 前端报错时展示 Request ID，方便开发者快速定位
- 所有日志只写文件，不涉及数据库写入

## 设计

### 1. Request ID 中间件

**文件：** `backend/middleware/request_id.py`（新增）

每条请求在入口处生成唯一 ID：
- 格式：UUID 十六进制前 8 位（例：`a1b2c3d4`）
- 存入 `request.state.request_id`
- 响应头添加 `X-Request-ID`
- 使用 `StarletteMiddleware` 接口实现，包裹所有请求

### 2. 日志配置

**文件：** `backend/utils/logging_config.py`（新增）

- 日志根目录：项目根下的 `logs/`
- 两个文件：
  - `logs/app.log` — INFO 及以上（含正常请求记录）
  - `logs/error.log` — ERROR 及以上（仅错误堆栈）
- 滚动策略：`TimedRotatingFileHandler` `when="midnight"` `backupCount=3`
- 日志格式：
  ```
  %(asctime)s | %(levelname)-5s | %(request_id)s | %(name)s:%(lineno)d | %(message)s
  ```
- 通过 `logging.Filter` 或自定义 `LoggerAdapter` 注入 `request_id`
- 控制台保留 StreamHandler 输出，但改为同样格式

**启动时机：** 在 `main.py` 应用启动时调用 `setup_logging()`

### 3. 异常处理器增强

**文件：** `backend/utils/exceptions.py`（修改）

三个异常处理器统一修改：
- 从 `request.state.request_id` 读取 request_id
- 响应体中增加 `request_id` 字段
- ERROR 级别日志输出完整堆栈，携带 request_id

BusinessException (200)：
```json
{ "code": "404", "message": "任务不存在", "error": {}, "request_id": "a1b2c3d4", "timestamp": "..." }
```

HTTPException (4xx/5xx)：
```json
{ "code": "401", "message": "未授权", "error": {}, "request_id": "a1b2c3d4", "timestamp": "..." }
```

未捕获异常 (500)：
```json
{ "code": "500", "message": "服务器内部错误", "error": {"detail": "..."}, "request_id": "a1b2c3d4", "timestamp": "..." }
```

### 4. Frontend 错误展示

**文件：** `frontend/src/api/request.ts`（修改）

响应拦截器增强：
- 成功响应也记录 `X-Request-ID`（可选日志）
- 错误响应时提取 `request_id` 附加到 Error 对象
- `console.group` 打印分组信息：标题包含 request_id，展开为完整错误栈

**文件：** `frontend/src/components/ErrorBoundary.tsx`（修改）

- 修复拼写 `searilizeError` → `serializeError`
- 显示 `request_id`（从 `(window as any).__lastRequestId` 或 props 传入）
- 增加复制按钮（`navigator.clipboard.writeText`）
- 文字改为中文

### 5. main.py 注册

**文件：** `backend/main.py`（修改）

- 添加 `RequestIDMiddleware`
- 在导入阶段调用 `setup_logging()`
- 将 `print()` 语句（如果有）替换为 logging

## 安全约束

- 日志只写入文件系统，不写入数据库
- 日志内容不记录请求 body / SQL 语句
- 不记录敏感字段（密码、token 等）
- 原有 ORM + FastAPI 类型校验 + Pydantic 三层注入防护不变

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/middleware/__init__.py` | 新增 | 空包文件 |
| `backend/middleware/request_id.py` | 新增 | Request ID 中间件 |
| `backend/utils/logging_config.py` | 新增 | 统一日志配置 |
| `backend/utils/exceptions.py` | 修改 | 增加 request_id 输出 |
| `backend/main.py` | 修改 | 注册中间件和日志 |
| `frontend/src/api/request.ts` | 修改 | 提取 request_id |
| `frontend/src/components/ErrorBoundary.tsx` | 修改 | 展示 request_id |
