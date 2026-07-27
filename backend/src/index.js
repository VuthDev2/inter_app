import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { HOST, PORT, ALLOWED_ORIGINS } from "./config.js";
import healthRouter from "./routes/health.js";
import transcribeRouter from "./routes/transcribe.js";
import translateRouter from "./routes/translate.js";
import emailRouter from "./routes/email.js";
import { setupWebSocket } from "./websocket/relay.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Try again later." },
});
app.use(generalLimiter);

app.use(healthRouter);
app.use(transcribeRouter);
app.use(translateRouter);
app.use(emailRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found." });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`[QuickVoice] Server running at http://${HOST}:${PORT}`);
  console.log(`[QuickVoice] Access locally at http://localhost:${PORT}`);
});
