#!/bin/bash

# Script om force push te doen naar alexander folder

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  FORCE PUSH - Overschrijft remote code!          ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}⚠️  WAARSCHUWING: Dit zal ALLE code in de remote repository overschrijven!${NC}"
echo ""
echo -e "${YELLOW}De remote repository heeft al code. Force push zal:${NC}"
echo -e "${RED}  ❌ Alle bestaande code verwijderen${NC}"
echo -e "${RED}  ❌ Alleen jouw alexander/ folder achterlaten${NC}"
echo ""
read -p "Weet je zeker dat je door wilt gaan? (type 'yes' om te bevestigen): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Geannuleerd. Geen code gepusht.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📤 Force pushing to GitHub...${NC}"

# Check welke branch we gebruiken
CURRENT_BRANCH=$(git branch --show-current || echo "main")

# Force push
git push -u origin "$CURRENT_BRANCH" --force

echo ""
echo -e "${GREEN}✅ Done! Je code staat nu in alexander/ folder op GitHub!${NC}"
echo -e "${BLUE}   Repository: https://github.com/Arthur-Code-123/HIRBProjectvak${NC}"
echo -e "${BLUE}   Folder: alexander/${NC}"
echo ""
echo -e "${YELLOW}⚠️  Let op: Alle bestaande code in de remote is overschreven!${NC}"
