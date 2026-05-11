---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022002379f38f1f1f482796d6a314d2fe6124cfd4170da22c432ccc72af2535bdeb4022100e93c1c0919a5b549aba370a8579d8ae784d3cc1c89ddbfc4c5a022fc58768ce6
    ReservedCode2: 30450221008ab9352ad9fd117178e835b3206d0dea35fbf3117fec192e681ad26c96ad8c1b022039f0700294981d853af2221db107d8f12cbc0512669b7c231389764da48c4eb5
---

# 周报风险识别 Prompt

## 功能说明

此 Prompt 用于识别周报中的风险和问题，包括任务未闭环、成果缺失、描述不一致等情况。

## Prompt 模板

```
请分析以下周报，识别潜在风险和问题。

成员姓名：{member_name}
系统任务记录：
{tasks}

周报内容：
{report_content}

请以JSON格式输出风险识别结果：
- overdue_without_explanation: 任务延期但周报未说明（数组）
- task_not_mentioned: 系统有任务但周报未提及（数组）
- delivery_missing: 任务称已完成但无明确交付物（数组）
- vague_description: 描述过于笼统无法判断实际产出（数组）
- other_risks: 其他风险（数组）

只输出JSON。
```

## 使用场景

在 `backend/services/llm_service.py` 中进行任务交叉核验时使用。

## 输出示例

```json
{
  "overdue_without_explanation": [
    {
      "task_name": "测试报告编写",
      "overdue_days": 2,
      "issue": "任务已延期但周报未提及"
    }
  ],
  "task_not_mentioned": [],
  "delivery_missing": [],
  "vague_description": [
    {
      "content": "完成了部分工作",
      "issue": "无法判断具体产出"
    }
  ],
  "other_risks": []
}
```

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-05-08 | 初始版本 |
