import WebSocket from "ws";

import { PYTHON_SERVER_URL } from "../config.js";

function sendJson(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function localModelSocketUrl() {
  return PYTHON_SERVER_URL.replace(/^http/, "ws").replace(/\/$/, "") + "/ws/live";
}

/**
 * Relay browser/extension audio to QuickVoice's local Whisper + NLLB service.
 * Every client now uses the same models and language decisions as mobile.
 */
export function handleLiveConnection(clientSocket) {
  const modelSocket = new WebSocket(localModelSocketUrl());
  const pending = [];
  let clientClosed = false;

  modelSocket.on("open", () => {
    while (pending.length && modelSocket.readyState === WebSocket.OPEN) {
      modelSocket.send(pending.shift());
    }
  });

  modelSocket.on("message", (data) => {
    if (!clientClosed && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(data.toString());
    }
  });

  modelSocket.on("error", () => {
    sendJson(clientSocket, {
      type: "error",
      text: "QuickVoice local model server is unavailable.",
    });
  });

  modelSocket.on("close", () => {
    if (!clientClosed) sendJson(clientSocket, { type: "closed" });
  });

  clientSocket.on("message", (data) => {
    const payload = data.toString();
    if (modelSocket.readyState === WebSocket.OPEN) {
      modelSocket.send(payload);
    } else if (modelSocket.readyState === WebSocket.CONNECTING) {
      pending.push(payload);
    }
  });

  clientSocket.on("close", () => {
    clientClosed = true;
    pending.length = 0;
    modelSocket.close();
  });

  clientSocket.on("error", () => {
    clientClosed = true;
    pending.length = 0;
    modelSocket.close();
  });
}
