@echo off
chcp 65001 >nul
title mixFlow — Stopping...

echo ============================================
echo   mixFlow — Stopping all services...
echo ============================================
echo.

REM ── Kill uvicorn (backend) ──
echo [1/2] Stopping Backend...
wsl -e bash -c "pkill -f 'uvicorn app.main:app' 2>/dev/null && echo '  ✅ Backend stopped' || echo '  ⚠️ Backend was not running'"

REM ── Kill next dev (frontend) ──
echo [2/2] Stopping Frontend...
wsl -e bash -c "pkill -f 'next dev' 2>/dev/null && echo '  ✅ Frontend stopped' || echo '  ⚠️ Frontend was not running'"

REM ── Clean up any remaining node/python on WSL ──
wsl -e bash -c "pkill -f 'node.*next' 2>/dev/null; pkill -f 'python.*uvicorn' 2>/dev/null"

echo.
echo ============================================
echo   ✅ All mixFlow services stopped.
echo ============================================
echo.
pause
