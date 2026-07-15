import { WebSocketServer } from "ws";

class ConnectionManager {
  constructor() {
    this.rooms = new Map();
  }

  addClient(room, ws) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(ws);
  }

  removeClient(room, ws) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) return;
    roomSet.delete(ws);
    if (roomSet.size === 0) this.rooms.delete(room);
  }

  broadcast(room, message, sender) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) return;
    for (const ws of roomSet) {
      if (ws !== sender && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify(message));
        } catch {
          /* ignore */
        }
      }
    }
  }
}

const manager = new ConnectionManager();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const room = url.pathname.replace("/ws/", "");

    if (!room) {
      ws.close(4000, "Room path required");
      return;
    }

    manager.addClient(room, ws);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        msg.room = room;
        manager.broadcast(room, msg, ws);
      } catch {
        /* ignore invalid JSON */
      }
    });

    ws.on("close", () => manager.removeClient(room, ws));
    ws.on("error", () => manager.removeClient(room, ws));
  });

  return wss;
}
