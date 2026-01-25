#!/bin/bash

# Script om naar een andere GitHub repository te pushen

echo "🔄 Switching to new GitHub repository..."
echo ""

# Vraag om de nieuwe repository URL
echo "Welke GitHub repository wil je gebruiken?"
echo "Voorbeelden:"
echo "  - git@github.com:USERNAME/REPO.git"
echo "  - https://github.com/USERNAME/REPO.git"
echo ""
read -p "Nieuwe repository URL: " NEW_REPO_URL

if [ -z "$NEW_REPO_URL" ]; then
    echo "❌ Geen URL ingevoerd. Script gestopt."
    exit 1
fi

echo ""
echo "📋 Huidige remote:"
git remote -v
echo ""

read -p "Wil je de remote URL aanpassen naar: $NEW_REPO_URL? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Script geannuleerd."
    exit 1
fi

# Verwijder oude remote
echo "🗑️  Removing old remote..."
git remote remove origin

# Voeg nieuwe remote toe
echo "➕ Adding new remote: $NEW_REPO_URL"
git remote add origin "$NEW_REPO_URL"

# Verifieer
echo ""
echo "✅ Nieuwe remote:"
git remote -v
echo ""

# Vraag of we moeten pushen
read -p "Wil je nu alle code naar de nieuwe repository pushen? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📤 Pushing to new repository..."
    
    # Check welke branch we gebruiken
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: $CURRENT_BRANCH"
    
    # Push naar nieuwe repository
    git push -u origin "$CURRENT_BRANCH"
    
    echo ""
    echo "✅ Klaar! Je code staat nu op: $NEW_REPO_URL"
else
    echo ""
    echo "ℹ️  Remote is aangepast, maar nog niet gepusht."
    echo "   Gebruik 'git push -u origin main' om te pushen."
fi
