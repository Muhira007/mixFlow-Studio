@echo off
title mixFlow - Stop All Services
color 0C
echo ============================================
echo   mixFlow -- Stop via WSL
echo ============================================
echo.
echo Menghentikan semua service...
echo.
echo Langkah otomatis:
echo   1. Kill via PID file
echo   2. Bersihkan port 3000 ^& 8000 (force)
echo   3. Sapu stray next-server ^& uvicorn
echo.

wsl -d Ubuntu-26.04 --cd "/home/kangdemuh/tester/mixflow" bash -c "./stop-all.sh"

echo.
echo ============================================
echo   Semua service telah dihentikan.
echo ============================================
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
