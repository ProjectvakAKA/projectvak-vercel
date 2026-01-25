#!/bin/bash

# Script om code naar GitHub te pushen

echo "🚀 Preparing to push to GitHub..."

# Stap 1: Verwijder embedded git repository in epc-architecture
if [ -d "epc-architecture/.git" ]; then
    echo "📁 Removing embedded git repository from epc-architecture..."
    rm -rf epc-architecture/.git
    echo "✅ Removed epc-architecture/.git"
fi

# Stap 2: Reset git staging area
echo "🔄 Resetting git staging area..."
git reset

# Stap 3: Voeg alle bestanden toe
echo "📦 Adding all files..."
git add -A

# Stap 4: Check wat er wordt toegevoegd (zorg dat .env NIET in de lijst staat!)
echo ""
echo "📋 Files to be committed:"
git status --short | head -30

echo ""
echo "⚠️  CHECK: Make sure .env files are NOT in the list above!"
echo "Press Enter to continue, or Ctrl+C to cancel..."
read

# Stap 5: Commit
echo "💾 Committing changes..."
git commit -m "Add Next.js frontend with contract management system

- Added epc-architecture Next.js frontend
- Integrated with Python backend via Dropbox TARGET
- Added DashboardLayout with sidebar navigation
- Added contracts overview page with stats and filters
- Added contract detail page with tabs and extracted fields
- Added start-all.sh script to run both backend and frontend
- Updated Python script for better history management
- Added UI components (Card, Button, Input, Badge, Progress, Select, Tabs, etc.)
- Added StatusBadge component for contract status display"

# Stap 6: Push
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Your code is now on GitHub."
echo "📝 Your team can now clone the repository and follow the setup instructions in PUSH_TO_GITHUB.md"
