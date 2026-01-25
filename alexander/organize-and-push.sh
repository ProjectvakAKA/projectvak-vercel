#!/bin/bash

# Script om alles in een "alexander" folder te zetten en naar nieuwe repository te pushen

set -e  # Stop bij errors

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Organizing code into 'alexander' folder             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NEW_REPO_URL="https://github.com/Arthur-Code-123/HIRBProjectvak.git"
ALEXANDER_FOLDER="alexander"

cd "$PROJECT_ROOT"

# Check of we al in een git repo zitten
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Geen git repository gevonden. Initialiseer eerst git.${NC}"
    exit 1
fi

# Stap 1: Maak alexander folder (buiten git eerst)
echo -e "${YELLOW}📁 Creating temporary alexander folder...${NC}"
TEMP_DIR=$(mktemp -d)
ALEXANDER_TEMP="$TEMP_DIR/$ALEXANDER_FOLDER"
mkdir -p "$ALEXANDER_TEMP"

# Stap 2: Kopieer alle relevante bestanden (behalve .git, venv, etc.)
echo -e "${YELLOW}📦 Copying files to alexander folder...${NC}"

# Lijst van bestanden/mappen die we WEL willen kopiëren
FILES_TO_COPY=(
    "allesfocusophuur.py"
    "requirements.txt"
    "analyzed_docs.txt"
    "organized_history.txt"
    "folder_structure.json"
    "epc-architecture"
    "start-all.sh"
    "API_KEY_FIX.md"
    "OPTIMIZATIONS.md"
    "HOW_TO_START.md"
    "PUSH_TO_GITHUB.md"
    "SECURITY_CHECK.md"
    "SWITCH_REPOSITORY.md"
    "push-to-github.sh"
    "switch-repository.sh"
    ".env.example"
    ".gitignore"
)

# Exclude patterns (niet kopiëren)
EXCLUDE_PATTERNS=(
    ".git"
    "venv"
    "__pycache__"
    "*.pyc"
    "*.log"
    ".env"
    ".env.local"
    "node_modules"
    ".next"
    "real-estate-document-parser (1)"
    "*.zip"
    "*_backup.py"
    ".DS_Store"
)

# Kopieer bestanden
for item in "${FILES_TO_COPY[@]}"; do
    if [ -e "$PROJECT_ROOT/$item" ]; then
        echo "  ✓ $item"
        cp -r "$PROJECT_ROOT/$item" "$ALEXANDER_TEMP/"
    fi
done

# Stap 3: Verwijder oude bestanden uit git (maar behoud lokaal)
echo -e "${YELLOW}🔄 Preparing git repository...${NC}"

# Commit huidige wijzigingen eerst
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}💾 Committing current changes...${NC}"
    git add -A
    git commit -m "Prepare for organizing into alexander folder" || true
fi

# Stap 4: Verwijder alles uit git (behalve .git zelf)
echo -e "${YELLOW}🗑️  Removing old files from git...${NC}"
git rm -rf --cached . 2>/dev/null || true
git clean -fd --exclude=".git" --exclude="venv" --exclude=".env" || true

# Stap 5: Verplaats alexander folder naar project root
echo -e "${YELLOW}📁 Moving alexander folder to project root...${NC}"
mv "$ALEXANDER_TEMP" "$PROJECT_ROOT/"

# Stap 6: Voeg alles toe aan git
echo -e "${YELLOW}📦 Adding files to git...${NC}"
cd "$PROJECT_ROOT"
git add "$ALEXANDER_FOLDER/"

# Stap 7: Update remote
echo -e "${YELLOW}🔗 Updating remote repository...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "$NEW_REPO_URL"

echo ""
echo -e "${GREEN}✅ Files organized!${NC}"
echo ""
echo -e "${BLUE}📋 What will be pushed:${NC}"
git status --short
echo ""

read -p "Wil je nu committen en pushen naar $NEW_REPO_URL? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}💾 Committing changes...${NC}"
    git commit -m "Add Alexander's work in alexander folder

- Python backend (allesfocusophuur.py)
- Next.js frontend (epc-architecture)
- Documentation and setup scripts
- All code organized in alexander/ folder"

    echo ""
    echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
    CURRENT_BRANCH=$(git branch --show-current || echo "main")
    git push -u origin "$CURRENT_BRANCH" || git push -u origin main

    echo ""
    echo -e "${GREEN}✅ Done! Your code is now in the alexander/ folder on GitHub!${NC}"
    echo -e "${BLUE}   Repository: $NEW_REPO_URL${NC}"
    echo -e "${BLUE}   Folder: alexander/${NC}"
else
    echo ""
    echo -e "${YELLOW}ℹ️  Files are organized but not pushed yet.${NC}"
    echo -e "${YELLOW}   Run: git commit -m 'Add Alexander work' && git push -u origin main${NC}"
fi

# Cleanup temp directory
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✨ All done!${NC}"
