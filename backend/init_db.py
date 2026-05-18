"""
数据库初始化脚本
创建示例数据用于测试
"""

from sqlalchemy.orm import Session
from backend.database import engine, SessionLocal, Base
from backend.models import Member, Week, Task, Delivery, Evaluation
from datetime import date, timedelta
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def init_database():
    """初始化数据库，创建示例数据"""
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成")

    db = SessionLocal()

    try:
        # 检查是否已有数据
        if db.query(Member).count() > 0:
            print("数据库已有数据，跳过初始化")
            return

        # 创建示例成员
        members = [
            Member(
                name="张三",
                unit="研发部",
                contact="13800138001",
                email="zhangsan@example.com",
                skill_tags=["前端开发", "Prompt设计"],
                is_backbone=True,
                status="active"
            ),
            Member(
                name="李四",
                unit="研发部",
                contact="13800138002",
                email="lisi@example.com",
                skill_tags=["后端开发", "模型训练"],
                is_backbone=True,
                status="active"
            ),
            Member(
                name="王五",
                unit="产品部",
                contact="13800138003",
                email="wangwu@example.com",
                skill_tags=["方案编制", "项目管理"],
                is_backbone=True,
                status="active"
            ),
            Member(
                name="赵六",
                unit="测试部",
                contact="13800138004",
                email="zhaoliu@example.com",
                skill_tags=["系统测试", "模型评测"],
                is_backbone=False,
                status="active"
            ),
            Member(
                name="钱七",
                unit="研发部",
                contact="13800138005",
                email="qianqi@example.com",
                skill_tags=["数据治理", "材料撰写"],
                is_backbone=False,
                status="active"
            )
        ]

        for m in members:
            db.add(m)
        db.commit()
        print(f"创建了 {len(members)} 个成员")

        # 创建当前周
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        current_week = Week(
            name=f"{start_of_week.year}年第{start_of_week.isocalendar()[1]}周",
            start_date=start_of_week,
            end_date=end_of_week,
            status="current",
            remark="当前周"
        )
        db.add(current_week)
        db.commit()
        print(f"创建了周次: {current_week.name}")

        # 创建一些示例任务
        tasks = [
            Task(
                name="开发首页看板组件",
                description="使用React和Ant Design开发首页统计看板",
                task_type="key_task",
                difficulty="medium",
                assignee_id=1,  # 张三
                week_id=current_week.id,
                deadline=end_of_week,
                delivery_requirement="完成可交互的看板组件",
                status="in_progress"
            ),
            Task(
                name="优化模型Prompt模板",
                description="针对专班任务场景优化Prompt模板",
                task_type="support_task",
                difficulty="high",
                assignee_id=2,  # 李四
                week_id=current_week.id,
                deadline=end_of_week - timedelta(days=2),
                delivery_requirement="输出优化后的Prompt模板文档"
            ),
            Task(
                name="编写周报分析功能PRD",
                description="编写大模型周报分析功能的详细需求文档",
                task_type="key_task",
                difficulty="medium",
                assignee_id=3,  # 王五
                week_id=current_week.id,
                deadline=end_of_week - timedelta(days=1),
                delivery_requirement="完整的PRD文档"
            ),
            Task(
                name="准备测试数据集",
                description="整理专班任务相关的测试数据集",
                task_type="skill_task",
                difficulty="low",
                assignee_id=4,  # 赵六
                week_id=current_week.id,
                deadline=end_of_week,
                delivery_requirement="整理好的测试数据集"
            )
        ]

        for t in tasks:
            db.add(t)
        db.commit()
        print(f"创建了 {len(tasks)} 个任务")

        print("\n数据库初始化完成！")
        print("-" * 50)
        print("示例账号：")
        print("  - 张三 (ID: 1, 研发部)")
        print("  - 李四 (ID: 2, 研发部)")
        print("  - 王五 (ID: 3, 产品部)")
        print("  - 赵六 (ID: 4, 测试部)")
        print("  - 钱七 (ID: 5, 研发部)")
        print(f"当前周次ID: {current_week.id}")

    except Exception as e:
        print(f"初始化失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
