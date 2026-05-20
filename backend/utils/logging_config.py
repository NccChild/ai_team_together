"""
统一日志配置
按天滚动写入文件，保留 3 天
日志只写文件，不写数据库
"""

import logging
import os
from logging.handlers import TimedRotatingFileHandler
from backend.utils.logging_context import get_request_id

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
LOG_FORMAT = "%(asctime)s | %(levelname)-5s | %(request_id)s | %(name)s:%(lineno)d | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class RequestIDFilter(logging.Filter):
    """从当前协程上下文读取 request_id 注入日志记录"""

    def filter(self, record):
        rid = get_request_id()
        record.request_id = rid if rid else "-"
        return True


def setup_logging():
    """初始化日志配置，应在应用启动时调用"""
    os.makedirs(LOG_DIR, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # 清除已有 handlers，防止重复注册
    root_logger.handlers.clear()

    # ---- 文件日志：app.log（INFO 及以上） ----
    app_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, "app.log"),
        when="midnight",
        backupCount=3,
        encoding="utf-8",
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    app_handler.addFilter(RequestIDFilter())
    root_logger.addHandler(app_handler)

    # ---- 文件日志：error.log（ERROR 及以上，分开便于查错） ----
    error_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, "error.log"),
        when="midnight",
        backupCount=3,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    error_handler.addFilter(RequestIDFilter())
    root_logger.addHandler(error_handler)

    # ---- 控制台输出（开发时可见） ----
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    console_handler.addFilter(RequestIDFilter())
    root_logger.addHandler(console_handler)

    # 关闭第三方库的调试日志
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
