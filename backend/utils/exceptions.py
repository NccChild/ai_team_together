"""
自定义异常类
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from datetime import datetime
import traceback
import logging

logger = logging.getLogger(__name__)

class BusinessException(Exception):
    """业务异常基类"""

    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)

class ResourceNotFoundException(BusinessException):
    """资源不存在异常"""

    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            code="404",
            message=f"{resource_type}不存在",
            details={"resource_type": resource_type, "resource_id": resource_id}
        )

class DuplicateResourceException(BusinessException):
    """资源重复异常"""

    def __init__(self, resource_type: str, identifier: str):
        super().__init__(
            code="409",
            message=f"{resource_type}已存在",
            details={"resource_type": resource_type, "identifier": identifier}
        )

class ValidationException(BusinessException):
    """数据校验异常"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="422",
            message=message,
            details=details or {}
        )

def register_exception_handlers(app):
    """注册全局异常处理器"""

    @app.exception_handler(BusinessException)
    async def business_exception_handler(request: Request, exc: BusinessException):
        """处理业务异常"""
        request_id = getattr(request.state, "request_id", "")
        logger.warning("Business exception: code=%s message=%s details=%s request_id=%s",
                       exc.code, exc.message, exc.details, request_id)
        return JSONResponse(
            status_code=200,  # 业务异常返回 200，通过 code 区分
            content={
                "code": exc.code,
                "message": exc.message,
                "error": exc.details,
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """处理 HTTP 异常"""
        request_id = getattr(request.state, "request_id", "")
        logger.warning("HTTP exception: status=%s detail=%s request_id=%s",
                       exc.status_code, exc.detail, request_id)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": str(exc.status_code),
                "message": exc.detail,
                "error": {},
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """处理未捕获的异常"""
        request_id = getattr(request.state, "request_id", "")
        logger.error("Unhandled exception: request_id=%s", request_id, exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "code": "500",
                "message": "服务器内部错误",
                "error": {"detail": str(exc) if logger.level == logging.DEBUG else "请联系管理员"},
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        )
