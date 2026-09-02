# Working on the frontend without running the AI

You do not need the AI models on your machine. They are ~750MB and only run well
on Apple Silicon. Point at the shared model server instead and build the UI
normally.

## Setup

```bash
cd apps/web
npm install
```

Create `apps/web/.env.local`:

```bash
# Ask for these two — the URL changes whenever the server restarts, and the key
# is a shared secret, so it is not in git.
QUICKVOICE_AI_INTERNAL_URL=https://<current-ai-url>.trycloudflare.com
QUICKVOICE_AI_PUBLIC_URL=https://<current-ai-url>.trycloudflare.com
QUICKVOICE_API_KEY=<ask for this>

# Auth backend and database, unchanged
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://thdcfkgdhjrlesgfgfic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask for this>
```

Then:

```bash
npm run dev
```

Open http://localhost:3000/interpreter. Hot reload works normally here — the
production-build rule only applies to the shared tunnel, where the hot-reload
socket cannot survive.

## Check it is wired up

```bash
curl -s -X POST http://localhost:3000/api/qv-token
```

You should get `{"token":"...","expiresAt":...,"aiBaseUrl":"https://..."}`.
If `token` is null, `QUICKVOICE_API_KEY` is missing. If you get a 502, the URL
is wrong or the server is not running right now.

## How the pieces fit

- Your browser never holds the master key. `/api/qv-token` runs on your Next.js
  server, trades the key for a token that expires in an hour, and hands the
  browser only the token.
- The browser then calls the model server directly for `/translate`, `/tts`, and
  the `/ws/live` socket, using that token.
- `aiBaseUrl` comes back in that same response, so when the server's address
  changes you only edit `.env.local` and restart — no rebuild.

## Gotchas

- **The AI URL changes on every server restart.** A dead address shows up as a
  502 from `/api/qv-token`. Ask for the current one.
- **The server may simply be off.** It runs on one Mac. `curl <ai-url>/health`
  answers `{"ok":true,...}` when it is up.
- **`http://localhost:3000` is allowed by CORS; a LAN IP like
  `http://192.168.x.x:3000` is not.** Use localhost, or ask for your origin to
  be added.
- **"Too many requests" (429)** is the rate limiter: 120/min per caller, burst
  30. It clears in seconds.
- **One GPU serves everyone.** Around 3 requests/second shared across everybody
  testing at once.

## What you can change safely

Anything under `apps/web/src`. The model server is a separate process in
`python-server/` and does not need to be touched to work on the UI.
