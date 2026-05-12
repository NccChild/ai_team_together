# API 接口说明

## 架构概览

```
前端 (React + Axios)                    后端 (FastAPI)
─────────────────────                  ─────────────────
src/api/
├── request.ts        ApiClient 封装    main.py             /api/v1 前缀注册
├── index.ts          接口调用定义       routers/
└── types/index.ts    类型定义           ├── members.py      人员管理
                                          ├── weeks.py        周次管理
                                          ├── tasks.py        任务管理
                                          ├── evaluations.py  评价管理
                                          ├── statistics.py   统计汇总
                                          ├── weekly_reports  周报分析
                                          ├── achievements.py 成果库
                                          ├── dictionaries.py 基础字典
                                          └── export.py       导出功能
```

---

## 基础配置

### 前端 API 地址

定义在 `ai-team-task-platform/src/api/request.ts`：

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
```

环境变量在 `ai-team-task-platform/.env`：

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 后端路由前缀

在 `backend/main.py` 中，所有业务路由统一挂载在 `/api/v1` 下：

```python
app.include_router(members_router, prefix="/api/v1")
app.include_router(weeks_router, prefix="/api/v1")
# ... 其他 router 同理
```

---

## 请求与响应规范

### 前端请求封装 (`ApiClient`)

前端所有 API 调用通过 `apiClient` 单例发起，内部基于 Axios，提供了 5 个方法：

| 方法 | HTTP | 用法 |
|------|------|------|
| `apiClient.get<T>(url, params)` | GET | 查询参数通过 `params` 对象传入 |
| `apiClient.post<T>(url, data)` | POST | `data` 为请求体 |
| `apiClient.put<T>(url, data)` | PUT | `data` 为请求体 |
| `apiClient.delete<T>(url)` | DELETE | |
| `apiClient.download(url, filename, params)` | GET | 以 blob 形式下载文件 |

所有方法自动解包响应，返回 `response.data.data`（即后端 `ApiResponse.data` 字段）。

导出接口（`exportApi`）不走 Axios，直接使用 `window.open()` 打开下载链接：

```ts
window.open(`${baseURL}/export/week-plan?week_id=${weekId}`);
```

### 响应拦截

```ts
// 响应拦截器检查 code !== 200 则 reject
if (data.code !== 200) {
    return Promise.reject(new Error(data.message));
}
```

### 后端统一响应格式

后端通过 `backend/utils/response.py` 生成统一格式响应：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-05-12T10:30:00Z"
}
```

分页响应 `data` 字段为：

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

### 前端对等类型

```ts
// src/types/index.ts
interface ApiResponse<T> {
  code: number; message: string; data: T; timestamp: string;
}
interface PageResponse<T> {
  items: T[]; total: number; page: number; page_size: number; total_pages: number;
}
```

---

## API 端点清单

所有接口挂载在 `http://localhost:8000/api/v1` 下。

### 1. 人员管理 `/members`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/members` | 人员列表 | `keyword?`, `unit?`, `skill_tag?`, `is_backbone?`, `status?`, `page`, `page_size` |
| POST | `/members` | 新增人员 | body: `MemberCreate` |
| GET | `/members/{id}` | 人员详情 | path: `id` |
| PUT | `/members/{id}` | 更新人员 | path: `id`, body: `MemberUpdate` |
| PUT | `/members/{id}/status` | 变更状态 | path: `id`, body: `{status: "active"\|"inactive"}` |

### 2. 周次管理 `/weeks`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/weeks` | 周次列表 | `status?`, `page`, `page_size` |
| GET | `/weeks/current` | 当前周 | — |
| POST | `/weeks` | 新增周次 | body: `WeekCreate` |
| GET | `/weeks/{id}` | 周次详情 | path: `id` |
| PUT | `/weeks/{id}` | 更新周次 | path: `id`, body: `WeekUpdate` |
| GET | `/weeks/{id}/tasks` | 周任务列表 | path: `id` |
| GET | `/weeks/{id}/summary` | 周汇总 | path: `id` |

### 3. 任务管理 `/tasks`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/tasks` | 任务列表 | `keyword?`, `week_id?`, `assignee_id?`, `task_type?`, `difficulty?`, `status?`, `is_overdue?`, `page`, `page_size` |
| POST | `/tasks` | 创建任务 | body: `TaskCreate` |
| GET | `/tasks/{id}` | 任务详情 | path: `id` |
| PUT | `/tasks/{id}` | 更新任务 | path: `id`, body: `TaskUpdate` |
| DELETE | `/tasks/{id}` | 删除任务 | path: `id` |
| PUT | `/tasks/{id}/status` | 更新任务状态 | path: `id`, body: `{status}` |
| POST | `/tasks/{id}/deliveries` | 提交成果 | path: `id`, body: `DeliveryCreate` |
| GET | `/tasks/{id}/deliveries` | 查看成果 | path: `id` |
| GET | `/tasks/{id}/evaluations` | 查看评价 | path: `id` |

### 4. 评价管理 `/evaluations`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/evaluations` | 评价列表 | `task_id?`, `member_id?`, `level?`, `page`, `page_size` |
| POST | `/evaluations` | 创建评价 | body: `EvaluationCreate` |
| GET | `/evaluations/pending` | 待评价任务 | — |
| GET | `/evaluations/{id}` | 评价详情 | path: `id` |
| PUT | `/evaluations/{id}` | 更新评价 | path: `id`, body: `EvaluationUpdate` |

### 5. 统计汇总 `/statistics`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/statistics/dashboard` | 看板数据 | `week_id?` |
| GET | `/statistics/ranking` | 积分排行 | `week_id?` |
| GET | `/statistics/week/{id}` | 周度统计 | path: `id` |
| GET | `/statistics/member/{id}` | 个人统计 | path: `id`, `week_id?` |
| GET | `/statistics/task-distribution` | 任务分布 | `week_id?` |

### 6. 周报分析 `/weekly-reports`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/weekly-reports` | 周报列表 | `week_id?`, `member_id?`, `page`, `page_size` |
| POST | `/weekly-reports` | 提交周报 | body: `WeeklyReportCreate` |
| GET | `/weekly-reports/{id}` | 周报详情 | path: `id` |
| PUT | `/weekly-reports/{id}` | 更新周报 | path: `id`, body: `WeeklyReportUpdate` |
| POST | `/weekly-reports/{id}/analyze` | 大模型分析 | path: `id` |
| GET | `/weekly-reports/summary` | 团队周报汇总 | `week_id?` |

### 7. 成果库 `/achievements`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/achievements` | 成果列表 | `keyword?`, `achievement_type?`, `member_id?`, `week_id?`, `is_excellent?`, `page`, `page_size` |
| GET | `/achievements/{id}` | 成果详情 | path: `id` |
| PUT | `/achievements/{id}/excellent` | 标记优秀成果 | path: `id`, body: `{is_excellent}` |
| POST | `/achievements/sync` | 同步成果 | `task_id?`, `week_id?` |

### 8. 基础字典 `/dictionaries`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/dictionaries` | 全部字典 | — |
| GET | `/dictionaries/{type}` | 按类型获取 | path: `type` (task_type / task_difficulty / ...) |

### 9. 导出功能 `/export`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/export/week-plan` | 导出周计划 Excel | `week_id` 必填 |
| GET | `/export/week-evaluation` | 导出周评价 Excel | `week_id` 必填 |
| GET | `/export/member-statistics` | 导出人员统计 Excel | `week_id?` |
| GET | `/export/achievements` | 导出成果 Excel | `week_id?` |

> 导出接口直接返回 `.xlsx` 文件流，前端通过 `window.open()` 触发下载。

---

## 前端页面调用关系

| 页面 | 调用的 API |
|------|-----------|
| Dashboard | `statisticsApi.getDashboard`, `statisticsApi.getRanking`, `weekApi.getCurrent`, `evaluationApi.getPending` |
| Members | `memberApi.getList/create/update/updateStatus`, `dictionaryApi.getAll` |
| Tasks | `taskApi.getList/getById/create/update/delete/updateStatus/createDelivery`, `memberApi.getList`, `weekApi.getList`, `dictionaryApi.getAll` |
| Weeks | `weekApi.getList/getTasks/getSummary/create`, `exportApi.exportWeekPlan/exportWeekEvaluation` |
| Evaluations | `evaluationApi.getPending/create`, `dictionaryApi.getAll`, `memberApi.getList`, `weekApi.getList` |
| Statistics | `statisticsApi.getRanking`, `weekApi.getList` |
| WeeklyReports | `weeklyReportApi.getList/create/analyze/getById`, `memberApi.getList`, `weekApi.getList` |
| Achievements | `achievementApi.getList/sync/markExcellent`, `memberApi.getList`, `weekApi.getList`, `dictionaryApi.getAll` |

---

## 已知问题

1. **`statisticsApi.getMemberStats` 模板字符串 bug**：前端 `src/api/index.ts` 中路径使用了普通字符串 `'/statistics/member/${memberId}'` 而非模板字面量，`memberId` 不会被替换。
2. **认证拦截器未实现**：`request.ts` 中请求拦截器预留了 Token 注入位置但未实现，后续需补充。
