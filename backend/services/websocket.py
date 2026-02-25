import json
from fastapi import WebSocket

connected_clients: list[WebSocket] = []


async def broadcast(message: dict):
    msg = json.dumps(message)
    for ws in list(connected_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            connected_clients.remove(ws)
