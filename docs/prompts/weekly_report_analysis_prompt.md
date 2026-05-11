---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022100c4243fa4fc05135e95f18f0a3a2c90c245def4353abef56ddc91d65661dadbc10220098c06da6c7b5f93f1f83cec3b2d3e990439004cef6fe10c38ae0047e65412d9
    ReservedCode2: 304402201377ef612ee3013671da7665207d202727048f39d98254d915c56cf9da0dc9e402206ef561a908a2f55138e4e87066d02763967a7b792aca8684ffc16f42d4554738
---

# 个人周报结构化分析 Prompt

## 功能说明

此 Prompt 用于对成员提交的周报进行结构化抽取和智能分析，辅助识别工作成果、任务闭环情况、风险问题和下周计划。

## Prompt 模板

```
你是一个专业的周报分析助手。请分析以下周报内容，提取结构化信息。

成员姓名：{member_name}
本周任务安排：
{task_info}

周报内容：
{report_content}

请以JSON格式输出分析结果，包含以下字段：
- main_work: 本周主要工作（数组）
- matched_tasks: 对应的系统任务（数组，包含任务名称和匹配理由）
- delivery_status: 成果交付情况（对象，包含是否有明确成果、判断理由）
- quality_assessment: 工作质量初步判断（字符串）
- problems_found: 存在问题（数组）
- next_week_items: 下周计划（数组）
- candidate_tasks: 可转为下周任务的事项（数组）
- contribution_summary: 个人贡献摘要（字符串，适合汇报使用）
- risk_alerts: 风险提示（数组）

只输出JSON，不要有其他文字。
```

## 使用场景

在 `backend/services/llm_service.py` 中的 `analyze_weekly_report` 方法使用。

## 输出示例

```json
{
  "main_work": [
    "完成了首页看板组件开发",
    "优化了模型Prompt模板"
  ],
  "matched_tasks": [
    {
      "task_name": "开发首页看板组件",
      "matched": true,
      "reason": "周报明确提到完成看板开发"
    }
  ],
  "delivery_status": {
    "has_deliverable": true,
    "reason": "有明确的代码交付物"
  },
  "quality_assessment": "良好",
  "problems_found": [
    "任务延期1天"
  ],
  "next_week_items": [
    "继续优化前端性能"
  ],
  "candidate_tasks": [],
  "contribution_summary": "张三本周按时完成了首页看板组件开发，并优化了模型Prompt模板。",
  "risk_alerts": [
    "部分任务延期需要注意"
  ]
}
```

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-05-08 | 初始版本 |
