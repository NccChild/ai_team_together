"""
数据库连接和会话管理
使用 SQLAlchemy 的连接池模式
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_RECYCLE

# 创建数据库引擎，配置连接池
engine = create_engine(
    DATABASE_URL,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_recycle=DB_POOL_RECYCLE,
    pool_pre_ping=True,  # 连接前检测连接有效性
    echo=False  # 生产环境设为 False 关闭 SQL 日志
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建 ORM 基类
Base = declarative_base()

def get_db():
    """
    获取数据库会话的依赖函数

    使用方式：
    @router.get("/items")
    def get_items(db: Session = Depends(get_db)):
        ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)
