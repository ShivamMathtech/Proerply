import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from .config import settings
from .db import engine
from . import auth, learner, studio, payments, calls


@asynccontextmanager
async def lifespan(app):
    if not inspect(engine).has_table("users"):
        raise RuntimeError(
            "Database not initialized. Run: python -m alembic upgrade head, then python -m app.seed"
        )
    yield


app = FastAPI(
    title="Proerply API",
    version="1.0.0",
    description="Database-backed learning, administration, hosted checkout and WebRTC signaling.",
    lifespan=lifespan,
)


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        messages = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > 1024 * 1024:
                return await JSONResponse(
                    {"detail": "Request exceeds the 1 MB limit."}, status_code=413
                )(scope, receive, send)
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def buffered_receive():
            return messages.pop(0) if messages else await receive()

        await self.app(scope, buffered_receive, send)


app.add_middleware(BodyLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    if (
        request.method not in ("GET", "HEAD", "OPTIONS")
        and origin
        and origin not in settings.origins
    ):
        return JSONResponse({"detail": "Origin is not allowed."}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc):
    logging.getLogger("proerply").error(
        "Database operation failed (%s)", type(exc).__name__
    )
    return JSONResponse(
        {"detail": "The database could not complete this request. Please retry."},
        status_code=503,
    )


@app.get("/api/v1/health", tags=["Health"])
def health():
    with engine.connect() as con:
        con.execute(text("SELECT 1"))
    return {"status": "ok", "mode": "api", "version": "1.0.0"}


for router in [
    auth.router,
    learner.router,
    studio.router,
    payments.router,
    calls.router,
]:
    app.include_router(router, prefix="/api/v1")
