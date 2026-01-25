#!/bin/bash

# Eenvoudig script om alles in alexander/ folder te zetten en te pushen

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pushing to alexander/ folder                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NEW_REPO="https://github.com/Arthur-Code-123/HIRBProjectvak.git"

cd "$PROJECT_ROOT"

# Stap 1: Maak alexander folder
echo -e "${YELLOW}📁 Creating alexander folder...${NC}"
mkdir -p alexander

# Stap 2: Kopieer alles naar alexander (behalve .git, venv, .env, etc.)
echo -e "${YELLOW}📦 Copying files...${NC}"

# Kopieer alle bestanden/mappen behalve degenen die we willen uitsluiten
rsync -av --progress \
    --exclude='.git' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='*.zip' \
    --exclude='*_backup.py' \
    --exclude='.DS_Store' \
    --exclude='alexander' \
    --exclude='real-estate-document-parser (1)' \
    . alexander/ 2>/dev/null || {
    # Fallback als rsync niet beschikbaar is
    echo "Using fallback copy method..."
    for item in * .*; do
        [ "$item" = "." ] && continue
        [ "$item" = ".." ] && continue
        [ "$item" = ".git" ] && continue
        [ "$item" = "venv" ] && continue
        [ "$item" = ".env" ] && continue
        [ "$item" = "alexander" ] && continue
        [ "$item" = "real-estate-document-parser (1)" ] && continue
        if [ -e "$item" ]; then
            cp -r "$item" alexander/ 2>/dev/null || true
        fi
    done
}

# Stap 3: Voeg README toe aan alexander folder
cp README_ALEXANDER.md alexander/README.md 2>/dev/null || true

# Stap 4: Update remote
echo -e "${YELLOW}🔗 Updating remote...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "$NEW_REPO"

# Stap 5: Voeg alles toe
echo -e "${YELLOW}📦 Adding files to git...${NC}"
git add alexander/
git add README_ALEXANDER.md 2>/dev/null || true

# Stap 6: Toon wat er wordt toegevoegd
echo ""
echo -e "${BLUE}📋 Files to be committed:${NC}"
git status --short
echo ""

# Stap 7: Commit en push
read -p "Wil je nu committen en pushen? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}💾 Committing...${NC}"
    git commit -m "Add Alexander's work in alexander/ folder

- Python backend (allesfocusophuur.py)
- Next.js frontend (epc-architecture/)
- All documentation and setup scripts
- Organized in alexander/ folder for clarity"

    echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
    git push -u origin main || git push -u origin master || {
        echo -e "${YELLOW}⚠️  Trying to push to existing branch...${NC}"
        CURRENT_BRANCH=$(git branch --show-current)
        git push -u origin "$CURRENT_BRANCH"
    }

    echo ""
    echo -e "${GREEN}✅ Done! Your code is now in alexander/ folder on GitHub!${NC}"
    echo -e "${BLUE}   Repository: $NEW_REPO${NC}"
else
    echo ""
    echo -e "${YELLOW}ℹ️  Files are ready but not pushed.${NC}"
    echo -e "${YELLOW}   Run: git commit -m 'Add Alexander work' && git push -u origin main${NC}"
fi
