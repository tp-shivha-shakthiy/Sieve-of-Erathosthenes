#!/usr/bin/env bash
set -e

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

echo "Starting FastAPI backend on :8000 ..."
cd "$ROOT/backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd "$ROOT"

echo "Starting React dev server on :5173 ..."
cd "$ROOT/frontend"
npm run dev -- --host 127.0.0.1 &
FRONTEND_PID=$!
cd "$ROOT"

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
