#!/usr/bin/env bash
set -e

# ──────────────────────────────────────────────────────────────
# Start script for the Skillstack FastAPI backend
# ──────────────────────────────────────────────────────────────
# Usage:
#   ./start.sh              — start server on port 8000
#   ./start.sh --port 8001  — start server on custom port
# ──────────────────────────────────────────────────────────────

PORT=8000

while [[ $# -gt 0 ]]; do
  case "$1" in
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
  wait
}
trap cleanup INT TERM

echo "Server running on http://localhost:$PORT (PID: $SERVER_PID)"
wait
