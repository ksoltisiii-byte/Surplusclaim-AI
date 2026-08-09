#!/usr/bin/env bash
# SurplusClaim AI — stop the three Node services started by scripts/start.sh.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"
for name in dashboard website intake; do
  pidfile="$LOG_DIR/$name.pid"
  pid=""
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
  fi
  # Fall back to whatever is listening on the service port.
  port="$(python3 -c "import json;print(json.load(open('$ROOT/config.json'))['services']['$name']['port'])" 2>/dev/null || true)"
  if [ -z "$pid" ] && [ -n "$port" ]; then
    pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  fi
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null && echo "[stop] stopped $name (pid $pid)"
  else
    echo "[stop] $name not running"
  fi
  rm -f "$pidfile" "$LOG_DIR/$name.launch.pid"
done
