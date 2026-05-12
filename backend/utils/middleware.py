"""请求中间件"""

import uuid
import time
import logging
import contextvars
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

_trace_id_var: contextvars.ContextVar = contextvars.ContextVar("trace_id", default="")


def get_trace_id() -> str:
    return _trace_id_var.get()


class TraceMiddleware(BaseHTTPMiddleware):
    """为每个请求生成 UUID 作为 trace_id"""

    async def dispatch(self, request, call_next):
        trace_id = uuid.uuid4().hex[:12]
        _trace_id_var.set(trace_id)
        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response


class RequestLogMiddleware(BaseHTTPMiddleware):
    """记录每个 API 请求的访问日志"""

    async def dispatch(self, request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = (time.time() - start) * 1000

        query = "?" + str(request.url.query) if request.url.query else ""
        logger.info(
            "%s %s%s → %s | %.0fms",
            request.method, request.url.path, query,
            response.status_code, elapsed
        )
        return response
