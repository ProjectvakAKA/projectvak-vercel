#!/bin/bash
# Start Python (allesfocusophuur.py) + contracts-app (alexander/epc-architecture).
# Eén commando voor alles. Ctrl+C stopt beide.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
CONTRACTS_DIR="$PROJECT_ROOT/alexander/epc-architecture"

cleanup() {
    echo ""
    echo "Stopping..."
    kill $PYTHON_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Python (vanuit root, .env in root)
echo "Starting Python backend..."
cd "$PROJECT_ROOT"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
VENV_PYTHON="$PROJECT_ROOT/venv/bin/python3"
if ! $VENV_PYTHON -c "import dropbox" 2>/dev/null; then
    "$PROJECT_ROOT/venv/bin/pip" install -q -r requirements.txt
fi
$VENV_PYTHON allesfocusophuur.py &
PYTHON_PID=$!
echo "Python started (PID: $PYTHON_PID)"

sleep 2

# Contracts-app (Next.js)
echo "Starting contracts app (Next.js)..."
cd "$CONTRACTS_DIR"
npm install --silent 2>/dev/null || true
(cd "$CONTRACTS_DIR" && npm run dev) &
NEXTJS_PID=$!
echo "Next.js started (PID: $NEXTJS_PID)"
echo ""
echo "Running: Python backend + http://localhost:3000 (contracts app). Ctrl+C to stop."
wait
