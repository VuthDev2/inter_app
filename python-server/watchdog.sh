#!/bin/bash
#
# Keep the model server alive.
#
#   ./watchdog.sh          run in the foreground (Ctrl-C to stop)
#   ./watchdog.sh --stop   stop the watchdog and the server
#
# The server has an intermittent exit that has not been root-caused: it stops
# cleanly, with no traceback and no crash report, roughly once every few minutes
# under load. Every individual suspect (unauthenticated uploads, oversized
# uploads, request bursts, voice-model loading) was tested and none reproduce it.
#
# Until that is understood, this turns a dead demo into a ~30 second gap: it
# checks health every 10 seconds and restarts the server when it stops
# answering. Restarts are logged so the real frequency stays visible instead of
# being papered over.

set -uo pipefail
cd "$(dirname "$0")" || exit 1
LOG="$(pwd)/logs/server.log"
WLOG="$(pwd)/logs/watchdog.log"
PIDFILE="/tmp/qv-watchdog.pid"
mkdir -p logs

if [ "${1:-}" = "--stop" ]; then
  [ -f "$PIDFILE" ] && { kill "$(cat "$PIDFILE")" 2>/dev/null; rm -f "$PIDFILE"; echo "watchdog stopped"; }
  lsof -tiTCP:8000 -sTCP:LISTEN 2>/dev/null | xargs -I{} kill {} 2>/dev/null
  echo "server stopped"
  exit 0
fi

echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

start_server() {
  QUICKVOICE_LOG="$LOG" LANG=en_US.UTF-8 ./start-server.sh >/dev/null 2>&1 &
  for _ in $(seq 1 60); do
    sleep 2
    curl -s -m 3 http://localhost:8000/health >/dev/null 2>&1 && return 0
  done
  return 1
}

restarts=0
started_at=$(date +%s)

if ! curl -s -m 3 http://localhost:8000/health >/dev/null 2>&1; then
  echo "$(date '+%H:%M:%S') starting server" | tee -a "$WLOG"
  start_server || { echo "$(date '+%H:%M:%S') FAILED to start — see $LOG" | tee -a "$WLOG"; exit 1; }
fi
echo "$(date '+%H:%M:%S') watching (health check every 10s)" | tee -a "$WLOG"

while true; do
  sleep 10
  if ! curl -s -m 5 http://localhost:8000/health >/dev/null 2>&1; then
    restarts=$((restarts + 1))
    up=$(( ($(date +%s) - started_at) / 60 ))
    echo "$(date '+%H:%M:%S') server stopped answering (restart #$restarts, ${up}m since watchdog start) — restarting" | tee -a "$WLOG"
    # Kill any half-dead instance so the port is free; start-server.sh waits for
    # the port itself, which is what stopped the "address already in use"
    # failures that used to leave nothing running at all.
    lsof -tiTCP:8000 -sTCP:LISTEN 2>/dev/null | xargs -I{} kill -9 {} 2>/dev/null
    if start_server; then
      echo "$(date '+%H:%M:%S') back up" | tee -a "$WLOG"
    else
      echo "$(date '+%H:%M:%S') restart FAILED — see $LOG" | tee -a "$WLOG"
    fi
  fi
done
