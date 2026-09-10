#!/bin/bash
#
# Start QuickVoice and print the link to share with your team.
#
#   ./start-quickvoice.sh          start everything, print the link
#   ./start-quickvoice.sh --stop   stop everything
#   ./start-quickvoice.sh --status show what is running and the current link
#
# Everything runs on this Mac. The link only works while this stays running.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$ROOT/inter_app/python-server"
WEB="$ROOT/inter_app/apps/web"
RUN="/tmp/qv-tunnels"
mkdir -p "$RUN"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
info()  { printf "  %s\n" "$1"; }

port_pid() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1; }

stop_all() {
  info "stopping tunnels..."
  pkill -f "cloudflared tunnel" 2>/dev/null
  for p in 8000 3000; do
    pid=$(port_pid "$p")
    [ -n "$pid" ] && { info "stopping port $p (pid $pid)"; kill "$pid" 2>/dev/null; }
  done
  sleep 1
  green "QuickVoice stopped."
}

status() {
  for p in 8000:"model server" 3000:website; do
    port="${p%%:*}"; name="${p##*:}"
    pid=$(port_pid "$port")
    [ -n "$pid" ] && info "$name (port $port): running, pid $pid" || info "$name (port $port): NOT running"
  done
  n=$(pgrep -f "cloudflared tunnel" | wc -l | tr -d ' ')
  info "tunnels running: $n"
  [ -f "$RUN/web.url" ] && green "Share this: $(cat "$RUN/web.url")/interpreter"
  [ -f "$RUN/teammate-env.txt" ] && {
    echo "  --- teammate frontend settings (current) ---"
    sed 's/^/  /' "$RUN/teammate-env.txt"
  }
}

case "${1:-}" in
  --stop)   stop_all; exit 0 ;;
  --status) status;   exit 0 ;;
esac

# ── 1. model server ──────────────────────────────────────────────────────────
if [ -n "$(port_pid 8000)" ]; then
  info "model server already running"
else
  info "starting model server (loads Whisper + translation, ~30s)..."
  ( cd "$SERVER" && QUICKVOICE_LOG="$SERVER/logs/server.log" LANG=en_US.UTF-8 ./start-server.sh >/dev/null 2>&1 & )
  for i in $(seq 1 60); do
    sleep 2
    curl -s -m 3 http://localhost:8000/health >/dev/null 2>&1 && break
  done
  [ -z "$(port_pid 8000)" ] && { red "model server failed. Check $SERVER/logs/server.log"; exit 1; }
  info "model server up"
fi

# ── 2. tunnel for the model server ───────────────────────────────────────────
pkill -f "cloudflared tunnel" 2>/dev/null; sleep 1
info "opening tunnel for the model server..."
: > "$RUN/ai.log"
nohup cloudflared tunnel --url http://localhost:8000 > "$RUN/ai.log" 2>&1 &
AI=""
# Wait for a *registered* connection, not just a printed URL. cloudflared prints
# the address before it finishes connecting, and a tunnel that never registers
# leaves a name that resolves in DNS with nothing behind it -- which handed out
# a dead link once already.
for i in $(seq 1 45); do
  if grep -q "Registered tunnel connection" "$RUN/ai.log" 2>/dev/null; then
    AI=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$RUN/ai.log" | head -1)
    [ -n "$AI" ] && break
  fi
  sleep 2
done
[ -z "$AI" ] && { red "tunnel failed. Check $RUN/ai.log"; exit 1; }
echo "$AI" > "$RUN/ai.url"
info "model server public at $AI"

# ── 3. website ───────────────────────────────────────────────────────────────
# The address above changes every run, so it is passed in as a plain env var the
# website reads at request time. That is why this needs no rebuild.
cd "$WEB" || exit 1
if [ ! -d ".next" ] || [ "${1:-}" = "--rebuild" ]; then
  info "building the website (one time, ~1 min)..."
  npm run build >/dev/null 2>&1 || { red "build failed. Run 'npm run build' in $WEB to see why."; exit 1; }
fi
pid=$(port_pid 3000); [ -n "$pid" ] && kill "$pid" 2>/dev/null; sleep 2
info "starting the website..."
# Production mode on purpose: 'npm run dev' opens a hot-reload socket that the
# tunnel cannot carry, which reloads the page under the user and wipes typing.
QUICKVOICE_AI_PUBLIC_URL="$AI" nohup npm run start > "$RUN/web.log" 2>&1 &
for i in $(seq 1 45); do
  sleep 2
  curl -s -o /dev/null -m 3 http://localhost:3000/interpreter && break
done
[ -z "$(port_pid 3000)" ] && { red "website failed. Check $RUN/web.log"; exit 1; }

# ── 4. tunnel for the website ────────────────────────────────────────────────
info "opening tunnel for the website..."
: > "$RUN/web-tunnel.log"
nohup cloudflared tunnel --url http://localhost:3000 > "$RUN/web-tunnel.log" 2>&1 &
SITE=""
# Wait for a *registered* connection, not just a printed URL. cloudflared prints
# the address before it finishes connecting, and a tunnel that never registers
# leaves a name that resolves in DNS with nothing behind it -- which handed out
# a dead link once already.
for i in $(seq 1 45); do
  if grep -q "Registered tunnel connection" "$RUN/web-tunnel.log" 2>/dev/null; then
    SITE=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$RUN/web-tunnel.log" | head -1)
    [ -n "$SITE" ] && break
  fi
  sleep 2
done
[ -z "$SITE" ] && { red "website tunnel failed. Check $RUN/web-tunnel.log"; exit 1; }
echo "$SITE" > "$RUN/web.url"

# ── 5. prove it actually works before claiming success ───────────────────────
info "checking..."
TOK=$(curl -s -m 30 -X POST "$SITE/api/qv-token" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token') or '')" 2>/dev/null)
OUT=$(curl -s -m 60 -X POST "$AI/translate" -H "Content-Type: application/json" \
      -H "x-api-key: $TOK" -d '{"text":"Where is the station?","source":"en","target":"ja"}' \
      | python3 -c "import sys,json;print(json.load(sys.stdin).get('text',''))" 2>/dev/null)

echo
if [ -n "$OUT" ]; then
  green "QuickVoice is ready."
  echo
  green "  Share this link:  $SITE/interpreter"
  echo
  info "translation test: 'Where is the station?' -> $OUT"
else
  red "Started, but the translation test failed."
  info "site: $SITE/interpreter"
  info "check $SERVER/logs/server.log"
fi
echo
KEY=$(grep "^QUICKVOICE_API_KEY=" "$SERVER/.env" 2>/dev/null | cut -d= -f2)
if [ -n "$KEY" ]; then
  echo "  ---- for a teammate building the frontend, paste into apps/web/.env.local ----"
  echo "  QUICKVOICE_AI_INTERNAL_URL=$AI"
  echo "  QUICKVOICE_AI_PUBLIC_URL=$AI"
  echo "  QUICKVOICE_API_KEY=$KEY"
  echo "  ---------------------------------------------------------------------------"
  # Also left in a file, because the URLs change on every start and are easy to
  # lose in scrollback.
  { echo "QUICKVOICE_AI_INTERNAL_URL=$AI"
    echo "QUICKVOICE_AI_PUBLIC_URL=$AI"
    echo "QUICKVOICE_API_KEY=$KEY"; } > "$RUN/teammate-env.txt"
  info "also saved to $RUN/teammate-env.txt"
  echo
fi
info "Keep this Mac awake and on Wi-Fi. The link dies when you stop it."
info "Stop with: $0 --stop"
