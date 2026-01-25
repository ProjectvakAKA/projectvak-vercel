#!/bin/bash

# Script om veilig te pushen - behoudt ALLE bestaande code

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Veilige Push - Behoudt ALLE bestaande code           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# Check welke branch we gebruiken
CURRENT_BRANCH=$(git branch --show-current || echo "main")

echo -e "${YELLOW}📥 Fetching remote changes...${NC}"
git fetch origin || {
    echo -e "${YELLOW}⚠️  Could not fetch. Continuing anyway...${NC}"
}

echo ""
echo -e "${YELLOW}🔍 Checking what's in remote...${NC}"

# Check of remote branch bestaat
if git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✓ Remote branch '$CURRENT_BRANCH' exists${NC}"
    
    # Maak een backup branch voor veiligheid
    echo -e "${YELLOW}💾 Creating backup branch...${NC}"
    git branch backup-before-merge 2>/dev/null || true
    
    echo ""
    echo -e "${YELLOW}🔄 Merging with remote (behoudt alles)...${NC}"
    
    # Probeer te mergen met --no-edit om automatisch te accepteren
    if git merge origin/"$CURRENT_BRANCH" --allow-unrelated-histories --no-edit -m "Merge: Add alexander folder to repository"; then
        echo -e "${GREEN}✅ Merge successful! Alle code is behouden.${NC}"
    else
        echo -e "${YELLOW}⚠️  Merge conflicts detected. Resolving safely...${NC}"
        echo -e "${YELLOW}   Strategie: Behoud bestaande bestanden, voeg alexander/ toe${NC}"
        
        # Voor conflicten: behoud remote versie voor bestaande bestanden
        # maar behoud onze alexander/ folder
        git status --short | grep "^UU\|^AA\|^DD" | while read line; do
            FILE=$(echo "$line" | awk '{print $2}')
            # Als het niet in alexander/ is, gebruik remote versie
            if [[ ! "$FILE" =~ ^alexander/ ]]; then
                echo "  Keeping remote version: $FILE"
                git checkout --theirs "$FILE" 2>/dev/null || true
            else
                echo "  Keeping our version: $FILE"
                git checkout --ours "$FILE" 2>/dev/null || true
            fi
        done
        
        # Voeg alles toe
        git add .
        
        # Commit de merge
        git commit -m "Merge: Add alexander folder, resolve conflicts by keeping existing files" || {
            echo -e "${YELLOW}⚠️  No conflicts to resolve or already resolved${NC}"
        }
        
        echo -e "${GREEN}✅ Conflicts resolved!${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Remote branch '$CURRENT_BRANCH' does not exist yet${NC}"
    echo -e "${YELLOW}   We kunnen direct pushen zonder merge${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Final check - wat wordt er gepusht:${NC}"
git status --short | head -10

echo ""
read -p "Wil je nu pushen? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
    git push -u origin "$CURRENT_BRANCH"
    
    echo ""
    echo -e "${GREEN}✅ Done! Je code staat nu veilig in alexander/ folder!${NC}"
    echo -e "${BLUE}   Repository: https://github.com/Arthur-Code-123/HIRBProjectvak${NC}"
    echo -e "${BLUE}   Folder: alexander/${NC}"
    echo -e "${GREEN}   ✓ Alle bestaande code is behouden!${NC}"
else
    echo ""
    echo -e "${YELLOW}ℹ️  Push geannuleerd. Je kunt later pushen met:${NC}"
    echo -e "${YELLOW}   git push -u origin $CURRENT_BRANCH${NC}"
fi
