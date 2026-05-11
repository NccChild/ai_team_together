-- 人工智能专班任务与成果跟踪小工具数据库初始化脚本
-- 创建数据库（如果不存在）

CREATE DATABASE IF NOT EXISTS ai_team_task_platform
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ai_team_task_platform;

-- 注意：实际的表结构将由后端 SQLAlchemy 自动创建
-- 这里仅用于初始化提示和注释

-- ============================================
-- 预计创建以下表：
-- 1. members - 专班成员表
-- 2. weeks - 周次表
-- 3. tasks - 任务表
-- 4. deliveries - 成果提交表
-- 5. evaluations - 任务评价表
-- 6. weekly_reports - 个人周报表
-- 7. weekly_report_analysis - 大模型周报分析结果表
-- 8. achievements - 成果库表
-- ============================================

-- 创建示例数据（可选，取消注释以启用）

-- INSERT INTO members (name, unit, contact, email, skill_tags, is_backbone, status)
-- VALUES
--   ('张三', '研发部', '13800138001', 'zhangsan@example.com', '["前端开发", "Prompt设计"]', true, 'active'),
--   ('李四', '研发部', '13800138002', 'lisi@example.com', '["后端开发", "模型训练"]', true, 'active'),
--   ('王五', '产品部', '13800138003', 'wangwu@example.com', '["方案编制", "项目管理"]', true, 'active'),
--   ('赵六', '测试部', '13800138004', 'zhaoliu@example.com', '["系统测试", "模型评测"]', false, 'active'),
--   ('钱七', '研发部', '13800138005', 'qianqi@example.com', '["数据治理", "材料撰写"]', false, 'active');
