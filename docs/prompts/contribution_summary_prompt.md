---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 304502210092fe64bf9ce518eca356fe32a4a54abc740e8f3003d5bf02a85a0793d589502e02206b9f5715974d0709513fb698674ceb12ab41ef24b6fc19ec8efde6eee952a374
    ReservedCode2: 30450220525deacaa9ae28d430d03cc6307d0114689ab271b7625f60e1f909f25380b93c02210095ec03f69dd227feabf1be9c4d8a0e2d38c2676554578fc594ee16cd21ab87d6
---

# 个人贡献摘要生成 Prompt

## 功能说明

此 Prompt 用于自动生成个人周度贡献摘要，支撑专班内部通报和领导汇报。

## Prompt 模板

```
请根据以下周报内容，生成一份简洁的个人贡献摘要。

成员姓名：{member_name}
周次：{week_name}

周报内容：
{report_content}

请生成一段适合汇报使用的个人贡献表述，要求：
1. 语言简洁专业
2. 突出主要成果
3. 适合在会议中口头汇报
4. 控制在100字以内

只输出贡献摘要，不要有其他说明。
```

## 使用场景

在 `backend/services/llm_service.py` 中生成贡献摘要时使用。

## 输出示例

> 张三本周完成了首页看板组件的开发，优化了模型Prompt模板，整体进度符合预期。

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-05-08 | 初始版本 |
