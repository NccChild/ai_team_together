"""
统一响应格式工具
"""

from typing import Any, Dict, Optional
from datetime import datetime

def success_response(
    data: Any,
    message: str = "success",
    code: int = 200
) -> Dict[str, Any]:
    """
    统一成功响应格式

    Args:
        data: 响应数据
        message: 成功消息
        code: 状态码

    Returns:
        统一格式的响应字典
    """
    return {
        "code": code,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat() + "Z"
    }

def success_list_response(
    result: Dict[str, Any],
    message: str = "success"
) -> Dict[str, Any]:
    """
    统一列表响应格式

    Args:
        result: 包含 items, total, page, page_size, total_pages 的字典
        message: 成功消息

    Returns:
        统一格式的分页响应字典
    """
    return {
        "code": 200,
        "message": message,
        "data": {
            "items": result.get("items", []),
            "total": result.get("total", 0),
            "page": result.get("page", 1),
            "page_size": result.get("page_size", 20),
            "total_pages": result.get("total_pages", 0)
        },
        "timestamp": datetime.now().isoformat() + "Z"
    }

def error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    统一错误响应格式

    Args:
        code: 错误码
        message: 错误消息
        details: 错误详情

    Returns:
        统一格式的错误响应字典
    """
    return {
        "code": code,
        "message": message,
        "error": details or {},
        "timestamp": datetime.now().isoformat() + "Z"
    }
