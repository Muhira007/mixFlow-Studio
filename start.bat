@echo off
chcp 65001 >nul
title mixFlow — Starting...

echo ============================================
echo   mixFlow — AI Video Editor
echo   Starting backend + frontend...
echo ============================================
echo.

REM ── Backend (FastAPI :8000) ──
echo [1/2] Starting Backend on http://localhost:8000
start "mixFlow Backend" wsl -e bash -c "cd ~/tester/mixflow/backend && source .venv/bin/activate && echo '🔧 Backend starting on :8000...' && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload; exec bash"

REM ── Frontend (Next.js :3000) ──
echo [2/2] Starting Frontend on http://localhost:3000
start "mixFlow Frontend" wsl -e bash -c "cd ~/tester/mixflow/frontend && echo '🎨 Frontend starting on :3000...' && npm run dev; exec bash"

echo.
echo ============================================
echo   ✅ mixFlow is starting!
echo.
echo   Backend  → http://localhost:8000
echo   Docs     → http://localhost:8000/docs
echo   Frontend → http://localhost:3000
echo.
echo   Close the WSL windows to stop.
echo   Or run: stop.bat
echo ============================================
echo.
pause
