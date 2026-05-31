#!/usr/bin/env sh
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "\033[34m"
echo "  ⚡ AutoRecon starting..."
echo "  ────────────────────────"
echo -e "\033[0m"

# Install Python deps
cd "$SCRIPT_DIR"
pip install -r requirements.txt -q --break-system-packages 2>/dev/null || pip install -r requirements.txt -q

# Create data directories
mkdir -p ~/.autorecon/scans ~/.autorecon/reports

# Start backend
echo -e "\033[34m[*] Starting backend on port 8000...\033[0m"
cd "$SCRIPT_DIR"
uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
echo -e "\033[34m[*] Starting frontend...\033[0m"
cd "$PROJECT_DIR"
npm run dev &
FRONTEND_PID=$!

# Open browser
sleep 2
if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:5173 &
elif command -v open &>/dev/null; then
    open http://localhost:5173 &
fi

echo -e "\033[32m"
echo "  ✓ AutoRecon is running!"
echo "  Backend:  http://127.0.0.1:8000"
echo "  Frontend: http://localhost:5173"
echo -e "\033[0m"

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
