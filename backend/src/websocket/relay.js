import { createClient } from "@supabase/supabase-js";
import { WebSocketServer } from "ws";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { handleLiveConnection } from "./live.js";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

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

function sendJson(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

async function verifyToken(token) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const token = url.searchParams.get("token");
    if (!token) {
      sendJson(ws, { type: "error", text: "Authentication required. Provide a token query parameter." });
      ws.close(4001, "Authentication required");
      return;
    }

    const user = await verifyToken(token);
    if (!user) {
      sendJson(ws, { type: "error", text: "Invalid or expired token." });
      ws.close(4001, "Invalid or expired token");
      return;
    }

    if (url.pathname === "/ws/live") {
      handleLiveConnection(ws);
      return;
    }

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
