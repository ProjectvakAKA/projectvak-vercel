#!/bin/bash
# Pusht ALLEEN naar de Vercel-repo (projectvak-vercel). Team-repo (origin) wordt NIET aangeraakt.

set -e
cd "$(dirname "$0")"

echo "Pushen naar Vercel-repo (projectvak-vercel)..."
echo "Team-repo (origin) wordt NIET gepusht."
echo ""

git push vercel main

echo ""
echo "Klaar. Alleen 'vercel' remote is geüpdatet."
