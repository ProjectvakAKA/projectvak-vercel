#!/bin/bash

# Script om de website opnieuw te starten

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping any running processes...${NC}"

# Stop Python process
pkill -f "allesfocusophuur.py" 2>/dev/null && echo -e "${GREEN}✓ Stopped Python backend${NC}" || echo -e "${YELLOW}No Python process found${NC}"

# Stop Next.js process
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✓ Stopped Next.js frontend${NC}" || echo -e "${YELLOW}No Next.js process found${NC}"

# Stop process op poort 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Freed port 3000${NC}" || echo -e "${YELLOW}Port 3000 is already free${NC}"

echo ""
echo -e "${GREEN}🚀 Starting everything fresh...${NC}"
echo ""

# Start opnieuw
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
./start-all.sh
