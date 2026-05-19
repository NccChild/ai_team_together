"""
Request ID 中间件
为每个请求分配唯一 ID，注入 request.state 和日志上下文
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from backend.utils.logging_context import set_request_id, clear_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """为每个请求生成唯一 request_id，注入日志上下文"""

    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id
        set_request_id(request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        clear_request_id()
        return response
