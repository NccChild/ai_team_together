"""
初始化数据脚本
创建默认管理员账户
"""
import sys
from pathlib import Path

# 添加项目根目录到路径（必须在 import backend 之前）
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import sessionmaker
from backend.database import engine
from backend.models import Base, Member
from backend.utils.security import get_password_hash

# 创建所有表
Base.metadata.create_all(bind=engine)

# 创建会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# 默认管理员
DEFAULT_ADMIN = {
    "username": "guanli",
    "password": "guanli666",
    "name": "管理员",
    "role": "admin",
    "unit": "系统管理",
    "email": "admin@example.com",
    "contact": "",
}


def init_users():
    """初始化默认管理员"""
    try:
        user_data = DEFAULT_ADMIN

        existing_user = db.query(Member).filter(
            Member.username == user_data["username"]
        ).first()

        if existing_user:
            print(f"管理员 {user_data['username']} 已存在，跳过创建")
        else:
            new_user = Member(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                name=user_data["name"],
                role=user_data["role"],
                unit=user_data["unit"],
                email=user_data["email"],
                contact=user_data["contact"],
                status="active",
            )

            db.add(new_user)
            print(f"创建管理员: {user_data['username']} ({user_data['name']})")

        db.commit()
        print("\n[SUCCESS] 管理员初始化成功！")
        print(f"  用户名: {user_data['username']}, 密码: {user_data['password']}, 角色: {user_data['role']}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] 初始化失败: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    init_users()
