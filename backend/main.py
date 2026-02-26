from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .db import init_tables, SessionLocal
from .seed import seed_resume_data
from .config import UI_PASSWORD
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


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount routes
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(resume_data.router)
app.include_router(resume_generate.router)
app.include_router(ats.router)


@app.get("/")
async def index(auth_token: str = Cookie(None)):
    if auth_token != UI_PASSWORD:
        return RedirectResponse("/login")
    return RedirectResponse("http://localhost:18383")


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


if __name__ == "__main__":
    import uvicorn
    print("Backend running on http://localhost:13952")
    uvicorn.run(app, host="0.0.0.0", port=13952, access_log=False, log_level="warning")
