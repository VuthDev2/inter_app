import http from "node:http";
import express from "express";
import cors from "cors";

import { HOST, PORT } from "./config.js";
import healthRouter from "./routes/health.js";
import transcribeRouter from "./routes/transcribe.js";
import translateRouter from "./routes/translate.js";
import emailRouter from "./routes/email.js";
import { setupWebSocket } from "./websocket/relay.js";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.use(healthRouter);
app.use(transcribeRouter);
app.use(translateRouter);
app.use(emailRouter);

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`[QuickVoice] Server running at http://${HOST}:${PORT}`);
});
