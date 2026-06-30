@echo off
title mixFlow Studio - Start All Services
color 0B
echo ============================================
echo   mixFlow Studio -- Start via WSL
echo ============================================
echo.
echo Memeriksa &amp; membersihkan port sebelum start...
echo (Port 3000 = Frontend / Port 8000 = Backend)
echo.
echo Setiap start akan otomatis:
echo   1. Cek port 3000 ^& 8000 apakah dipakai
echo   2. Kalau dipakai -> bunuh proses lama
echo   3. Bersihkan cache Next.js
echo   4. Jalankan service baru
echo.
echo ============================================
echo.

wsl -d Ubuntu-26.04 --cd "/home/kangdemuh/aplikasi/mixflow" bash -c "./start-all.sh"

echo.
echo ============================================
echo   Semua service berjalan di background!
echo ============================================
echo.
echo  Frontend : http://localhost:3000
echo  API Docs : http://localhost:8000/docs
echo  Logs     : logs\  (di direktori proyek)
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
echo (Service TETAP berjalan -- aman ditutup!)
pause >nul
