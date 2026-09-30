@echo off
setlocal
set "ROOT=%~dp0"

echo Starting FastAPI backend on :8000 ...
start "Backend" cmd /k "cd /d ""%ROOT%backend"" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting React dev server on :5173 ...
start "Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev -- --host 127.0.0.1"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Keep the Backend window open. It displays any startup error instead of closing silently.
