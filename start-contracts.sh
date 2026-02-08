#!/bin/bash
# Start de contracts-app (alexander/epc-architecture) correct:
# juiste map, dependencies, dan dev-server.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/alexander/epc-architecture"

cd "$CONTRACTS_DIR"
npm install
npm run dev
