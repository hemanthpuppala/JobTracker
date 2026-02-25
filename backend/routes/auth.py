from fastapi import APIRouter, Cookie, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from pathlib import Path
from ..config import UI_PASSWORD, VALENTINE_PASSWORD

router = APIRouter()

valentine_correct_streak: dict[str, int] = {}

LOGIN_PAGE = """<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login - Job Tracker</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0f0f0f;color:#e8e8e8;min-height:100vh;display:flex;align-items:center;justify-content:center}
.login{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:2rem;width:90%;max-width:340px}
h2{font-size:1.1rem;margin-bottom:1rem;text-align:center}h2 span{color:#7c4dff}
input{width:100%;padding:.6rem;background:#252525;border:1px solid #2a2a2a;border-radius:6px;color:#e8e8e8;font-size:.9rem;margin-bottom:1rem}
button{width:100%;padding:.6rem;background:#7c4dff;color:#fff;border:none;border-radius:6px;font-size:.9rem;cursor:pointer}
button:hover{background:#651fff}.err{color:#ef5350;font-size:.8rem;margin-bottom:.5rem;text-align:center}
</style></head><body><div class="login"><h2>Job<span>Tracker</span></h2>
ERRMSG<form method="POST" action="/login"><input type="password" name="password" placeholder="Password" autofocus>
<button type="submit">Login</button></form></div></body></html>"""


def check_auth(auth_token: str | None) -> bool:
    return auth_token == UI_PASSWORD


@router.get("/login", response_class=HTMLResponse)
async def login_page():
    return LOGIN_PAGE.replace("ERRMSG", "")


@router.post("/login")
async def login_submit(password: str = Form(...)):
    if password == UI_PASSWORD:
        resp = RedirectResponse("/", status_code=302)
        resp.set_cookie("auth_token", UI_PASSWORD, httponly=True, max_age=30 * 24 * 3600)
        return resp
    return HTMLResponse(
        LOGIN_PAGE.replace("ERRMSG", '<p class="err">Wrong password</p>'),
        status_code=401,
    )


@router.get("/valentine", response_class=HTMLResponse)
async def valentine_page():
    return Path(Path(__file__).parent.parent.parent / "valentine_lock.html").read_text()


@router.post("/valentine/check")
async def valentine_check(request: Request):
    body = await request.json()
    ip = request.client.host if request.client else "unknown"
    month = str(body.get("month", ""))
    day = str(body.get("day", ""))
    year = str(body.get("year", ""))
    correct = (
        month == VALENTINE_PASSWORD["month"]
        and day == VALENTINE_PASSWORD["day"]
        and year == VALENTINE_PASSWORD["year"]
    )
    if not correct:
        valentine_correct_streak[ip] = 0
        return {"status": "wrong", "message": "wrong"}
    streak = valentine_correct_streak.get(ip, 0) + 1
    valentine_correct_streak[ip] = streak
    if streak < 3:
        return {"status": "fake_wrong", "streak": streak}
    valentine_correct_streak[ip] = 0
    return {"status": "unlocked"}


@router.get("/valentine/{filename}")
async def valentine_assets(filename: str):
    file_path = Path(__file__).parent.parent.parent / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
