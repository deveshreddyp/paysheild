import logging
import time
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger("fraud_engine.middleware")

async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Minimal unified logging format
    status = response.status_code
    method = request.method
    path = request.url.path
    latency = round(process_time * 1000, 2)
    
    logger.info(f"{method} {path} - {status} - {latency}ms")
    return response

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    simplified_errors = []
    
    for err in errors:
        loc = ".".join([str(l) for l in err.get("loc", [])])
        simplified_errors.append(f"{loc}: {err.get('msg')}")
        
    logger.warning(f"Validation Error payload: {exc.body}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Invalid transaction payload",
            "details": simplified_errors
        }
    )

async def custom_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred in the fraud engine"
        }
    )
