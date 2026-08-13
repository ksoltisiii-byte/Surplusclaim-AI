#!/usr/bin/env bash
# SurplusClaim AI — launch all services (claim engine :7100, dashboard :3000,
# website :4000, intake :5000). Idempotent — safe to run again.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

# Seed demo workflow data (idempotent) so the dashboard has live numbers.
echo "[start] seeding demo data…"
node scripts/seed-demo.js || echo "[start] WARNING: seed step failed (continuing anyway)"

kill_port() {
  local port="$1" pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "[start] freeing port $port (pid(s): $(echo $pids | tr '\n' ' '))"
    kill $pids 2>/dev/null || true
    sleep 1
  fi
}

# start_one <name> <dir> <port> [cmd] [health_path]
start_one() {
  local name="$1" dir="$2" port="$3"
  local cmd="${4:-node server.js}"
  local health_path="${5:-/api/health}"
  local log="$LOG_DIR/$name.log"
  # Already healthy? Skip.
  if curl -sf "http://127.0.0.1:$port$health_path" >/dev/null 2>&1; then
    echo "[start] $name already running on :$port"
    return 0
  fi
  kill_port "$port"
  echo "[start] launching $name on :$port (log: $log)"
  (cd "$dir" && setsid nohup bash -lc "$cmd" >>"$log" 2>&1 < /dev/null & echo $! >"$LOG_DIR/$name.launch.pid")
  for i in $(seq 1 15); do
    if curl -sf "http://127.0.0.1:$port$health_path" >/dev/null 2>&1; then
      # Record the real listening pid (setsid may fork, so don't trust $!).
      lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 >"$LOG_DIR/$name.pid"
      echo "[start]   ok — $name on :$port"
      return 0
    fi
    sleep 1
  done
  echo "[start]   FAILED — $name did not come up on :$port (see $log)"
  tail -20 "$log" 2>/dev/null
  return 1
}

start_one claim-engine claim-forms 7100 "python3 server.py" "/health"
start_one dashboard dashboard 3000
start_one website website 4000
start_one intake intake 5000

echo
echo "[start] done. Services:"
echo "  Claim engine:       http://127.0.0.1:7100  (POST /generate)"
echo "  Dashboard (public): http://127.0.0.1:3000  (API: /api/health)"
echo "  Website:            http://127.0.0.1:4000  (partner portal: /partner.html)"
echo "  E-sign intake:      http://127.0.0.1:5000"
echo "  Logs: $LOG_DIR"
