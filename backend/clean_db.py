"""
数据库清理脚本
清空所有旧数据并重建表结构，然后创建默认管理员
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import sessionmaker
from backend.database import engine
from backend.models import Base, Member
from backend.utils.security import get_password_hash

DEFAULT_ADMIN = {
    "username": "guanli",
    "password": "guanli666",
    "name": "管理员",
    "role": "admin",
    "unit": "系统管理",
    "email": "admin@example.com",
    "contact": "",
}


def clean_and_init():
    print("=" * 50)
    print("即将清空数据库所有表和数据！")
    print(f"数据库: {engine.url.render_as_string(hide_password=True)}")
    print("=" * 50)

    confirm = input("确认清空? 输入 yes 继续: ")
    if confirm.strip().lower() != "yes":
        print("已取消")
        return

    # 删除所有表
    print("\n删除所有旧表...")
    Base.metadata.drop_all(bind=engine)
    print("已删除所有表")

    # 重新创建所有表
    print("重新创建所有表...")
    Base.metadata.create_all(bind=engine)
    print("所有表创建完成")

    # 创建默认管理员
    print("创建默认管理员...")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        admin = Member(
            username=DEFAULT_ADMIN["username"],
            password_hash=get_password_hash(DEFAULT_ADMIN["password"]),
            name=DEFAULT_ADMIN["name"],
            role=DEFAULT_ADMIN["role"],
            unit=DEFAULT_ADMIN["unit"],
            email=DEFAULT_ADMIN["email"],
            contact=DEFAULT_ADMIN["contact"],
            status="active",
        )
        db.add(admin)
        db.commit()

        print(f"\n[OK] 清理并初始化完成！")
        print(f"  用户名: {DEFAULT_ADMIN['username']}")
        print(f"  密码: {DEFAULT_ADMIN['password']}")
        print(f"  角色: {DEFAULT_ADMIN['role']}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] 创建管理员失败: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    clean_and_init()
