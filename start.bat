@echo off
echo Starting FastAPI backend on :8000 ...
start "Backend" cmd /c "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting React dev server on :5173 ...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Close the console windows to stop.
