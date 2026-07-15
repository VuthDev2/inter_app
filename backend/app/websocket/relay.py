import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room, []).append(ws)

    def disconnect(self, room: str, ws: WebSocket):
        self.rooms.setdefault(room, []).append(ws)
        if ws in self.rooms[room]:
            self.rooms[room].remove(ws)
        if not self.rooms[room]:
            del self.rooms[room]

    async def broadcast(self, room: str, message: dict, sender: WebSocket | None = None):
        for ws in self.rooms.get(room, []):
            if ws != sender:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/ws/{room}")
async def websocket_endpoint(ws: WebSocket, room: str):
    await manager.connect(room, ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            msg["room"] = room
            await manager.broadcast(room, msg, sender=ws)
    except WebSocketDisconnect:
        manager.disconnect(room, ws)
    except Exception:
        manager.disconnect(room, ws)
