#!/usr/bin/env bash
set -e

# ──────────────────────────────────────────────────────────────
# Start script for the Knowledge Dashboard FastAPI backend
# ──────────────────────────────────────────────────────────────
# Usage:
#   ./start.sh              — start server on port 8000
#   ./start.sh --tunnel     — start server + Cloudflare tunnel
#   ./start.sh --tunnel --port 8001
# ──────────────────────────────────────────────────────────────

PORT=8000
TUNNEL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tunnel) TUNNEL=true; shift ;;
    --port) PORT="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Activate venv
if [ -f venv/bin/activate ]; then
  source venv/bin/activate
elif [ -f .venv/bin/activate ]; then
  source .venv/bin/activate
else
  echo "No virtualenv found. Run: python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "=== Starting FastAPI backend on port $PORT ==="
uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload &
SERVER_PID=$!

# Cleanup on exit
cleanup() {
  echo "Shutting down..."
  kill "$SERVER_PID" 2>/dev/null || true
  if [ -n "$TUNNEL_PID" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  wait
}
trap cleanup INT TERM

if [ "$TUNNEL" = true ]; then
  sleep 2  # let server start first
  echo "=== Starting Cloudflare tunnel to localhost:$PORT ==="
  npx cloudflared tunnel --url "http://localhost:$PORT" &
  TUNNEL_PID=$!
  echo "Tunnel PID: $TUNNEL_PID — copy the *.trycloudflare.com URL"
  echo "Then set API_BASE in the SPA to that URL"
fi

echo "Server running on http://localhost:$PORT (PID: $SERVER_PID)"
wait
