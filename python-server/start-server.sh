#!/bin/bash
# Start the QuickVoice AI server fully detached.
#
# nohup alone was not enough: the server kept receiving a termination signal
# whenever the shell that launched it went away, which looked like random
# crashes mid-conversation ("no QuickVoice server reachable"). setsid puts it in
# its own session so no controlling terminal can signal it. macOS has no setsid
# binary, so Python provides it.
cd "$(dirname "$0")"
LOG=${QUICKVOICE_LOG:-/tmp/python-server.log}
PORT=${QUICKVOICE_PORT:-8000}

# Wait for the port to actually be free before binding.
#
# Killing the old server and starting a new one immediately looked like it
# worked: the old process was gone from `kill`, but the socket was still held
# for a moment. The new instance then failed with "[Errno 48] address already
# in use" and exited during startup, leaving nothing listening at all. Because
# the failure was buried in the log after a normal-looking "Application
# shutdown complete", it read as the server randomly dying minutes later.
for _ in $(seq 1 30); do
  if ! lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT is still in use after 30s -- refusing to start a second server" >&2
  echo "stop it first:  lsof -tiTCP:$PORT -sTCP:LISTEN | xargs kill" >&2
  exit 1
fi
exec .venv312/bin/python3 -c '
import os, sys
os.setsid()                      # detach: new session, no controlling terminal
log = open(sys.argv[1], "ab", buffering=0)
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)
os.execv(sys.argv[2], sys.argv[2:])
' "$LOG" "$(pwd)/.venv312/bin/uvicorn" app.main:app --host 0.0.0.0 --port "$PORT"
