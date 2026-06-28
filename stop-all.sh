#!/bin/bash
# ============================================
# mixFlow — Stop All Services
# ============================================
set -e

LOGS_DIR="/home/kangdemuh/aplikasi/mixflow/logs"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      mixFlow — Stop All Services        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Helper: bunuh proses di port + fallback kill -9
force_kill_port() {
    local port="$1"
    local pids
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        fuser -k "$port/tcp" 2>/dev/null || true
        sleep 0.5
        # Double-tap: kalau masih hidup, kill -9
        if fuser "$port/tcp" 2>/dev/null >/dev/null; then
            fuser -k -9 "$port/tcp" 2>/dev/null || true
        fi
    fi
}

# ── Frontend ──
echo -n "  ⏳ Stopping Frontend... "
FRONTEND_KILLED=false
PID=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    # Kill process group (npm run dev spawns children)
    kill -TERM -- -$(ps -o pgid= -p $PID | tr -d ' ') 2>/dev/null || kill -TERM $PID 2>/dev/null
    sleep 1
    kill -0 "$PID" 2>/dev/null && kill -KILL $PID 2>/dev/null || true
    FRONTEND_KILLED=true
fi

# Kill semua proses di port 3000
force_kill_port 3000

# Kill stray next-server yang mungkin tersisa
NEXT_STRAY=$(pgrep -f "next-server" 2>/dev/null || true)
if [ -n "$NEXT_STRAY" ]; then
    kill -9 $NEXT_STRAY 2>/dev/null || true
fi

rm -f "$LOGS_DIR/frontend.pid"

if $FRONTEND_KILLED || [ -n "$NEXT_STRAY" ]; then
    echo -e "${GREEN}stopped ✓${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi

# ── Backend ──
echo -n "  ⏳ Stopping Backend API... "
BACKEND_KILLED=false
PID=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -TERM $PID 2>/dev/null
    sleep 1
    kill -0 "$PID" 2>/dev/null && kill -KILL $PID 2>/dev/null || true
    BACKEND_KILLED=true
fi

# Kill semua proses di port 8000
force_kill_port 8000

# Kill stray uvicorn
UVICORN_STRAY=$(pgrep -f "uvicorn app.main" 2>/dev/null || true)
if [ -n "$UVICORN_STRAY" ]; then
    kill -9 $UVICORN_STRAY 2>/dev/null || true
fi

rm -f "$LOGS_DIR/backend.pid"

if $BACKEND_KILLED || [ -n "$UVICORN_STRAY" ]; then
    echo -e "${GREEN}stopped ✓${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi

echo ""
echo -e "${CYAN}  Semua service dihentikan.${NC}"
echo ""
