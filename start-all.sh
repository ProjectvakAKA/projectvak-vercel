#!/bin/bash

# Script om zowel Python backend als Next.js frontend te starten

# Kleuren voor output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting Real Estate Document Parser System         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/epc-architecture"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all processes...${NC}"
    kill $PYTHON_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    exit
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Start Python backend
echo -e "${GREEN}🐍 Starting Python backend...${NC}"
cd "$PROJECT_ROOT"

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Use venv Python directly
VENV_PYTHON="$PROJECT_ROOT/venv/bin/python3"

# Check if dropbox is installed, if not install requirements
if ! $VENV_PYTHON -c "import dropbox" 2>/dev/null; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    "$PROJECT_ROOT/venv/bin/pip" install -q -r requirements.txt
fi

# Start Python script using venv Python
$VENV_PYTHON allesfocusophuur.py &
PYTHON_PID=$!
echo -e "${GREEN}✓ Python backend started (PID: $PYTHON_PID)${NC}"
echo ""

# Wait a moment for Python to initialize
sleep 2

# Start Next.js frontend
echo -e "${GREEN}⚛️  Starting Next.js frontend...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
NEXTJS_PID=$!
echo -e "${GREEN}✓ Next.js frontend started (PID: $NEXTJS_PID)${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   System is running!                                  ║${NC}"
echo -e "${BLUE}║                                                       ║${NC}"
echo -e "${BLUE}║   Python Backend:  Processing documents              ║${NC}"
echo -e "${BLUE}║   Next.js Frontend: http://localhost:3000            ║${NC}"
echo -e "${BLUE}║                                                       ║${NC}"
echo -e "${BLUE}║   Press Ctrl+C to stop both processes                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for both processes
wait
