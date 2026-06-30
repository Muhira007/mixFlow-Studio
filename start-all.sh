#!/bin/bash
# ============================================
# mixFlow Studio — Start All Services
# ============================================
set -e

PROJECT_DIR="/home/kangdemuh/aplikasi/mixflow"
LOGS_DIR="$PROJECT_DIR/logs"

# Load nvm + pastikan pakai Node.js & npm dari WSL (bukan dari Windows)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
elif [ -s "/usr/local/nvm/nvm.sh" ]; then
    . "/usr/local/nvm/nvm.sh"
fi

# Bersihkan path Windows dari PATH agar executables Windows tidak ikut terpanggil
CLEANED_PATH=""
IFS=':'
for p in $PATH; do
    case "$p" in
        /mnt/c/*|/mnt/d/*|/mnt/e/*) ;;
        *) CLEANED_PATH="${CLEANED_PATH}:${p}" ;;
    esac
done
unset IFS
export PATH="${CLEANED_PATH#:}"

# ── Port configuration ──
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Warna output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$LOGS_DIR"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      mixFlow Studio — Start All Services       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# PHASE 1: PRE-START CLEANUP
# Pastikan tidak ada sisa proses dari run sebelumnya
# ============================================
echo -e "${YELLOW}  🧹 Phase 1: Membersihkan proses lama...${NC}"

# Helper: bunuh SEMUA proses di port + proses terkait
force_kill_port() {
    local port="$1"
    local pids
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -n "     Port $port dipakai (PID: $pids) → kill..."
        fuser -k "$port/tcp" 2>/dev/null || true
        sleep 1
        # Verifikasi port benar-benar bebas
        if fuser "$port/tcp" 2>/dev/null >/dev/null; then
            echo -e " ${RED}gagal bersihkan, coba kill -9${NC}"
            fuser -k -9 "$port/tcp" 2>/dev/null || true
            sleep 1
        else
            echo -e " ${GREEN}bersih ✓${NC}"
        fi
    else
        echo "     Port $port bebas ✓"
    fi
}

# Kill port 3000 (frontend)
force_kill_port $FRONTEND_PORT

# Kill port 8000 (backend)
force_kill_port $BACKEND_PORT

# Kill semua next-server dan uvicorn yang mungkin nyangkut
NEXT_LEAK=$(pgrep -f "next-server" 2>/dev/null || true)
UVICORN_LEAK=$(pgrep -f "uvicorn app.main" 2>/dev/null || true)
if [ -n "$NEXT_LEAK" ]; then
    echo "     Kill next-server stray: $NEXT_LEAK"
    kill -9 $NEXT_LEAK 2>/dev/null || true
fi
if [ -n "$UVICORN_LEAK" ]; then
    echo "     Kill uvicorn stray: $UVICORN_LEAK"
    kill -9 $UVICORN_LEAK 2>/dev/null || true
fi

# Bersihkan cache Next.js kalau ada (hindari korupsi)
if [ -d "$PROJECT_DIR/frontend/.next/dev/cache" ]; then
    echo -n "     Membersihkan cache Next.js..."
    rm -rf "$PROJECT_DIR/frontend/.next/dev/cache" 2>/dev/null || true
    echo " bersih ✓"
fi

# Hapus PID file lama
rm -f "$LOGS_DIR/frontend.pid" "$LOGS_DIR/backend.pid"

echo -e "${GREEN}  ✅ Phase 1 selesai — semua port bebas${NC}"
echo ""

# ============================================
# PHASE 2: START SERVICES
# ============================================
echo -e "${CYAN}  🚀 Phase 2: Menjalankan service...${NC}"

# Helper: daemonize a command with setsid (truly detach from terminal)
daemonize() {
    local logfile="$1"
    local pidfile="$2"
    shift 2
    if command -v setsid &>/dev/null; then
        setsid "$@" >> "$logfile" 2>&1 &
    else
        nohup "$@" >> "$logfile" 2>&1 &
        disown
    fi
    echo $! > "$pidfile"
}

# Helper: tunggu proses siap + port listen
wait_for_port() {
    local port="$1"
    local max_wait="$2"
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if fuser "$port/tcp" 2>/dev/null >/dev/null; then
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    return 1
}

# ── Backend (FastAPI :8000) ──
echo -n "  ⏳ Backend API (port $BACKEND_PORT)... "
cd "$PROJECT_DIR/backend"
> "$LOGS_DIR/backend.log"
daemonize "$LOGS_DIR/backend.log" "$LOGS_DIR/backend.pid" \
    .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
NEW_PID=$(cat "$LOGS_DIR/backend.pid")
if wait_for_port "$BACKEND_PORT" 10; then
    echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
else
    echo -e "${RED}GAGAL — cek logs/backend.log${NC}"
    echo -e "         ${YELLOW}$(tail -5 "$LOGS_DIR/backend.log" 2>/dev/null || echo '(kosong)')${NC}"
fi
cd "$PROJECT_DIR"

# ── Frontend (Next.js :3000) ──
echo -n "  ⏳ Frontend (port $FRONTEND_PORT)... "
cd "$PROJECT_DIR/frontend"
> "$LOGS_DIR/frontend.log"
daemonize "$LOGS_DIR/frontend.log" "$LOGS_DIR/frontend.pid" \
    npm run dev -- -p "$FRONTEND_PORT"
NEW_PID=$(cat "$LOGS_DIR/frontend.pid")
if wait_for_port "$FRONTEND_PORT" 20; then
    echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
else
    echo -e "${RED}GAGAL — cek logs/frontend.log${NC}"
    echo -e "         ${YELLOW}$(tail -5 "$LOGS_DIR/frontend.log" 2>/dev/null || echo '(kosong)')${NC}"
fi
cd "$PROJECT_DIR"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Semua service siap!             ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Frontend : http://localhost:3000       ║${NC}"
echo -e "${CYAN}║  API Docs : http://localhost:8000/docs   ║${NC}"
echo -e "${CYAN}║  Logs     : ./logs/                      ║${NC}"
echo -e "${CYAN}║  Stop all : ./stop-all.sh                ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
