"""统一日志配置"""

import logging
import os
from logging.handlers import TimedRotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")

_log_initialized = False


def setup_logging():
    global _log_initialized
    if _log_initialized:
        return
    _log_initialized = True

    os.makedirs(LOG_DIR, exist_ok=True)

    # 根 logger 级别
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # 文件 handler：按天轮转，保留 30 天
    file_handler = TimedRotatingFileHandler(
        filename=os.path.join(LOG_DIR, "app.log"),
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        "%(asctime)s | %(trace_id)s | %(levelname)-5s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # 控制台 handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-5s | %(name)s | %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # 第三方库日志降到 WARNING
    for lib in ("uvicorn", "sqlalchemy", "httpx"):
        logging.getLogger(lib).setLevel(logging.WARNING)


class TraceFilter(logging.Filter):
    """将当前请求的 trace_id 注入日志记录"""

    def filter(self, record):
        from backend.utils.middleware import get_trace_id
        record.trace_id = get_trace_id() or "-"
        return True
