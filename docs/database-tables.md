# 数据库表结构文档

## 基本信息

- **数据库**: MySQL 8.0
- **数据库名**: `ai_team_task_platform`
- **字符集**: `utf8mb4` / `utf8mb4_unicode_ci`
- **ORM**: SQLAlchemy (declarative_base)
- **表创建**: 应用启动时由 `Base.metadata.create_all()` 自动创建
- **模型定义**: [backend/models.py](../backend/models.py)

---

## 表概览（共 8 张表）

| 表名 | 说明 |
|---|---|
| `members` | 团队成员 |
| `weeks` | 周次管理 |
| `tasks` | 任务管理 |
| `deliveries` | 成果提交 |
| `evaluations` | 任务评价 |
| `weekly_reports` | 个人周报 |
| `weekly_report_analysis` | LLM 周报分析结果 |
| `achievements` | 成果库 |

---

## 1. members — 团队成员表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 成员 ID |
| `name` | String(50) | NOT NULL | 姓名 |
| `username` | String(50) | NOT NULL, UNIQUE, INDEX | 登录用户名 |
| `password_hash` | String(255) | NOT NULL | 密码哈希 |
| `role` | String(20) | NOT NULL, 默认 `member` | 角色：`admin` / `member` |
| `unit` | String(100) | NOT NULL | 所属单位 |
| `contact` | String(50) | 可空 | 联系方式 |
| `email` | String(100) | 可空 | 电子邮箱 |
| `skill_tags` | JSON | 可空 | 能力标签列表 |
| `is_backbone` | Boolean | 默认 false | 是否骨干 |
| `status` | String(20) | 默认 `active` | 状态：`active` / `inactive` |
| `created_at` | DateTime | server_default=now() | 创建时间 |
| `updated_at` | DateTime | server_default=now(), onupdate=now() | 更新时间 |

---

## 2. weeks — 周次表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 周次 ID |
| `name` | String(50) | NOT NULL | 周次名称 |
| `start_date` | Date | NOT NULL | 开始日期 |
| `end_date` | Date | NOT NULL | 结束日期 |
| `status` | String(20) | 默认 `upcoming` | 状态：`current` / `upcoming` / `history` |
| `remark` | Text | 可空 | 备注 |
| `created_at` | DateTime | server_default=now() | 创建时间 |
| `updated_at` | DateTime | server_default=now(), onupdate=now() | 更新时间 |

---

## 3. tasks — 任务表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 任务 ID |
| `name` | String(200) | NOT NULL | 任务名称 |
| `description` | Text | 可空 | 任务描述 |
| `task_type` | String(50) | NOT NULL | 类型：`key_task` / `support_task` / `skill_task` / `temp_task` |
| `difficulty` | String(20) | NOT NULL | 难度：`low` / `medium` / `high` |
| `assignee_id` | Integer | NOT NULL, FK → `members.id` | 责任人 ID |
| `collaborator_ids` | JSON | 可空 | 协作人 ID 列表 |
| `week_id` | Integer | NOT NULL, FK → `weeks.id` | 所属周次 |
| `deadline` | Date | NOT NULL | 截止日期 |
| `delivery_requirement` | Text | 可空 | 交付物要求 |
| `status` | String(20) | 默认 `not_started` | 状态：`not_started` / `in_progress` / `submitted` / `need_revision` / `completed` / `overdue` |
| `is_overdue` | Boolean | 默认 false | 是否延期 |
| `creator_id` | Integer | 可空 | 创建人 ID |
| `created_at` | DateTime | server_default=now() | 创建时间 |
| `updated_at` | DateTime | server_default=now(), onupdate=now() | 更新时间 |

---

## 4. deliveries — 成果提交表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 成果 ID |
| `task_id` | Integer | NOT NULL, FK → `tasks.id` | 关联任务 ID |
| `name` | String(200) | NOT NULL | 成果名称 |
| `description` | Text | 可空 | 成果说明 |
| `link` | String(500) | 可空 | 成果链接 |
| `delivery_type` | String(50) | 可空 | 成果类型 |
| `submitter_id` | Integer | NOT NULL, FK → `members.id` | 提交人 ID |
| `submitted_at` | DateTime | server_default=now() | 提交时间 |
| `is_latest` | Boolean | 默认 true | 是否最新成果 |
| `update_description` | Text | 可空 | 修改说明 |

---

## 5. evaluations — 任务评价表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 评价 ID |
| `task_id` | Integer | NOT NULL, FK → `tasks.id` | 被评价任务 ID |
| `level` | String(20) | NOT NULL | 等级：`excellent` / `qualified` / `need_revision` / `unqualified` |
| `comment` | Text | 可空 | 评价意见 |
| `base_score` | Integer | 默认 0 | 基础积分 |
| `bonus_score` | Integer | 默认 0 | 加分 |
| `final_score` | Integer | 默认 0 | 最终积分 |
| `evaluator_id` | Integer | NOT NULL | 评价人 ID |
| `member_id` | Integer | NOT NULL, FK → `members.id` | 被评价成员 ID |
| `evaluated_at` | DateTime | server_default=now() | 评价时间 |
| `created_at` | DateTime | server_default=now() | 创建时间 |

---

## 6. weekly_reports — 个人周报表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 周报 ID |
| `week_id` | Integer | NOT NULL, FK → `weeks.id` | 周次 ID |
| `member_id` | Integer | NOT NULL, FK → `members.id` | 成员 ID |
| `work_content` | Text | 可空 | 本周工作 |
| `main_results` | Text | 可空 | 主要成果 |
| `problems` | Text | 可空 | 存在问题 |
| `next_week_plan` | Text | 可空 | 下周计划 |
| `raw_text` | Text | 可空 | LLM 原始文本 |
| `submitted_at` | DateTime | server_default=now() | 提交时间 |
| `updated_at` | DateTime | server_default=now(), onupdate=now() | 更新时间 |

---

## 7. weekly_report_analysis — LLM 周报分析结果表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 分析 ID |
| `weekly_report_id` | Integer | NOT NULL, FK → `weekly_reports.id` (一对一) | 周报 ID |
| `main_work` | JSON | 可空 | 本周主要工作 |
| `matched_tasks` | JSON | 可空 | 对应系统任务 |
| `delivery_status` | JSON | 可空 | 成果交付情况 |
| `quality_assessment` | String(50) | 可空 | 工作质量判断 |
| `problems_found` | JSON | 可空 | 存在问题 |
| `next_week_items` | JSON | 可空 | 下周计划项 |
| `candidate_tasks` | JSON | 可空 | 候选任务 |
| `contribution_summary` | Text | 可空 | 贡献摘要 |
| `risk_alerts` | JSON | 可空 | 风险提示 |
| `analyzed_at` | DateTime | server_default=now() | 分析时间 |
| `created_at` | DateTime | server_default=now() | 创建时间 |

---

## 8. achievements — 成果库表

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | Integer | PK, 自增 | 成果 ID |
| `delivery_id` | Integer | 可空, FK → `deliveries.id` | 关联成果 ID |
| `task_id` | Integer | 可空, FK → `tasks.id` | 关联任务 ID |
| `name` | String(200) | NOT NULL | 成果名称 |
| `description` | Text | 可空 | 成果说明 |
| `link` | String(500) | 可空 | 成果链接 |
| `achievement_type` | String(50) | 可空 | 成果类型 |
| `member_id` | Integer | NOT NULL, FK → `members.id` | 提交人 ID |
| `week_id` | Integer | 可空, FK → `weeks.id` | 周次 ID |
| `is_excellent` | Boolean | 默认 false | 是否优秀成果 |
| `created_at` | DateTime | server_default=now() | 创建时间 |
| `updated_at` | DateTime | server_default=now(), onupdate=now() | 更新时间 |

---

## 外键关系图

```
members ──┐
          ├──→ tasks (assignee_id)
          ├──→ deliveries (submitter_id)
          ├──→ evaluations (member_id)
          ├──→ weekly_reports (member_id)
          └──→ achievements (member_id)

weeks ──┐
        ├──→ tasks (week_id)
        ├──→ weekly_reports (week_id)
        └──→ achievements (week_id)

tasks ──┐
        ├──→ deliveries (task_id)
        ├──→ evaluations (task_id)
        └──→ achievements (task_id)

deliveries ──→ achievements (delivery_id)

weekly_reports ──→ weekly_report_analysis (weekly_report_id, 一对一)
```

---

## 枚举值汇总

| 枚举 | 可选值 |
|---|---|
| UserRoleEnum | `admin`, `member` |
| TaskStatusEnum | `not_started`, `in_progress`, `submitted`, `need_revision`, `completed`, `overdue` |
| TaskTypeEnum | `key_task`, `support_task`, `skill_task`, `temp_task` |
| DifficultyEnum | `low`, `medium`, `high` |
| EvaluationLevelEnum | `excellent`, `qualified`, `need_revision`, `unqualified` |
