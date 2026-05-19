"""
协程安全的 request_id 上下文
用于在日志格式中动态注入当前请求 ID
"""

import contextvars

_request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


def set_request_id(request_id: str):
    _request_id_var.set(request_id)


def get_request_id() -> str:
    return _request_id_var.get()


def clear_request_id():
    _request_id_var.set("")
