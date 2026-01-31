#!/bin/bash
# Push deze repo naar een tweede GitHub-repo (bijv. voor Vercel), zonder de eerste repo te gebruiken.
# Gebruik: ./push-to-vercel-repo.sh https://github.com/JOUW_USERNAME/JOUW_VERCEL_REPO.git

set -e
REPO_URL="${1:-}"

if [ -z "$REPO_URL" ]; then
  echo "Gebruik: $0 https://github.com/JOUW_USERNAME/JOUW_VERCEL_REPO.git"
  echo ""
  echo "Stappen:"
  echo "  1. Ga naar GitHub en maak een nieuwe repository (bijv. 'projectvak-vercel')."
  echo "  2. Kopieer de repo-URL (HTTPS of SSH)."
  echo "  3. Run: $0 <URL>"
  exit 1
fi

REMOTE_NAME="vercel"
echo "Remote '$REMOTE_NAME' toevoegen (of updaten)..."
git remote remove "$REMOTE_NAME" 2>/dev/null || true
git remote add "$REMOTE_NAME" "$REPO_URL"

echo "Pushen naar $REPO_URL (branch main)..."
git push "$REMOTE_NAME" main

echo "Klaar. Je kunt nu in Vercel deze repo koppelen: $REPO_URL"
