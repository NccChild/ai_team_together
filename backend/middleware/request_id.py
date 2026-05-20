"""
Request ID 中间件
为每个请求分配唯一 ID，记录请求日志，注入日志上下文
"""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from backend.utils.logging_context import set_request_id, clear_request_id

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """为每个请求生成唯一 request_id，记录请求日志"""

    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id
        set_request_id(request_id)

        start = time.time()
        client_ip = request.client.host if request.client else "unknown"
        logger.info("--> %s %s [%s]", request.method, request.url.path, client_ip)

        try:
            response = await call_next(request)
            elapsed = time.time() - start
            response.headers["X-Request-ID"] = request_id
            logger.info("<-- %s %s %d [%.3fs]", request.method, request.url.path, response.status_code, elapsed)
            return response
        finally:
            clear_request_id()
