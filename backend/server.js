import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env");

function loadEnvFile() {
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/^['\"]|['\"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env file
  }
}

loadEnvFile();

const requestedPort = Number(process.env.PORT ?? 3001);
const startPort = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
const host = process.env.HOST ?? "127.0.0.1";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function createAuthenticatedClient(token) {
  if (!supabaseUrl || !supabaseKey || !token) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getAuthenticatedUserId(token) {
  if (!token) {
    return null;
  }

  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));

    // Extract user ID from the token
    // Supabase tokens have 'sub' field for user ID
    return decoded.sub || decoded.user_id || null;
  } catch (error) {
    return null;
  }
}

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function createAppHandler() {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, {
        ok: true,
        service: "node-backend",
        message: "Node.js backend is running",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ── POST /api/translate ──────────────────────────────────────────────────
    if (req.method === "POST" && url.pathname === "/api/translate") {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch {
        sendJson(res, { ok: false, error: "Invalid JSON body" }, 400);
        return;
      }

      const { text, sourceLang, targetLang } = body ?? {};

      if (!text || typeof text !== "string" || !text.trim()) {
        sendJson(res, { ok: true, translation: "" });
        return;
      }

      if (sourceLang === targetLang) {
        sendJson(res, { ok: true, translation: text });
        return;
      }

      const openAiKey = process.env.OPENAI_API_KEY || "";

      // ── Try OpenAI first if key available ──
      if (openAiKey) {
        try {
          const prompt = `Translate the following text from ${String(sourceLang).toUpperCase()} to ${String(targetLang).toUpperCase()}. Respond only with the translated text, nothing else.\n\n${text}`;
          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 512,
              temperature: 0.3,
            }),
          });
          if (aiRes.ok) {
            const aiJson = await aiRes.json();
            const translation = aiJson?.choices?.[0]?.message?.content?.trim();
            if (translation) {
              sendJson(res, { ok: true, translation });
              return;
            }
          }
        } catch (e) {
          console.error("OpenAI translate failed", e);
        }
      }

      // ── Fall back to MyMemory (free, no key needed) ──
      try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceLang}|${targetLang}`;
        const mmRes = await fetch(mmUrl);
        if (mmRes.ok) {
          const mmJson = await mmRes.json();
          const translation = mmJson?.responseData?.translatedText;
          if (translation && !translation.toLowerCase().includes("mymemory warning")) {
            sendJson(res, { ok: true, translation });
            return;
          }
        }
      } catch (e) {
        console.error("MyMemory translate failed", e);
      }

      // ── Last resort: echo with tag ──
      sendJson(res, { ok: true, translation: `[${sourceLang}→${targetLang}] ${text}` });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/profile") {
      if (!supabase) {
        sendJson(res, { ok: false, error: "Supabase is not configured" }, 500);
        return;
      }

      const authHeader = req.headers.authorization ?? req.headers.Authorization;
      const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : "";
      const userId = token ? getAuthenticatedUserId(token) : null;

      if (!userId) {
        sendJson(res, { ok: false, error: "Authentication required" }, 401);
        return;
      }

      try {
        const client = createAuthenticatedClient(token);
        const { data, error } = await client.from("profiles").select("display_name, preferred_language").eq("id", userId).maybeSingle();

        if (error) {
          sendJson(res, { ok: false, error: error.message }, 500);
          return;
        }

        sendJson(res, {
          ok: true,
          message: "Profile API ready",
          profile: {
            displayName: data?.display_name ?? "",
            language: data?.preferred_language ?? "en",
          },
        });
      } catch (error) {
        sendJson(res, { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/profile") {
      if (!supabase) {
        sendJson(res, { ok: false, error: "Supabase is not configured" }, 500);
        return;
      }

      const authHeader = req.headers.authorization ?? req.headers.Authorization;
      const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : "";
      const userId = token ? getAuthenticatedUserId(token) : null;

      if (!userId) {
        sendJson(res, { ok: false, error: "Authentication required" }, 401);
        return;
      }

      try {
        const body = await parseJsonBody(req);
        const client = createAuthenticatedClient(token);
        const { data, error } = await client.from("profiles").upsert({
          id: userId,
          display_name: body.displayName,
          preferred_language: body.preferredLanguage,
        });

        if (error) {
          sendJson(res, { ok: false, error: error.message }, 500);
          return;
        }

        sendJson(res, {
          ok: true,
          message: "Profile data received",
          data,
        });
      } catch (error) {
        sendJson(res, { ok: false, error: "Invalid JSON body" }, 400);
      }
      return;
    }

    sendJson(res, { ok: false, error: "Not found" }, 404);
  };
}

function startServer(port) {
  const server = createServer(createAppHandler());

  server.once("error", (error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Node.js backend listening on http://${host}:${port}`);
  });
}

startServer(startPort);
