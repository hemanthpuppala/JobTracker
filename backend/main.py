from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .db import init_tables, SessionLocal
from .seed import seed_resume_data
from .config import CORS_ORIGINS, STATIC_DIR, PORT
from .routes import auth, jobs, resume_data, resume_generate, ats
from .services.websocket import connected_clients


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_tables()
    session = SessionLocal()
    try:
        seed_resume_data(session)
    finally:
        session.close()
    yield


app = FastAPI(title="ResumeForge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount API routes
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(resume_data.router)
app.include_router(resume_generate.router)
app.include_router(ats.router)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except Exception:
        if ws in connected_clients:
            connected_clients.remove(ws)


# Serve built frontend — must be AFTER API routes
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA — return index.html for all non-API, non-asset routes."""
        file = STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    print(f"ResumeForge running on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, access_log=False, log_level="warning")
