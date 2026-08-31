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
exec .venv312/bin/python3 -c '
import os, sys
os.setsid()                      # detach: new session, no controlling terminal
log = open(sys.argv[1], "ab", buffering=0)
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)
os.execv(sys.argv[2], sys.argv[2:])
' "$LOG" "$(pwd)/.venv312/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000
