#!/bin/bash

# Bun-native markdown linter wrapper
# Usage: ./lint-md.sh [--json] <files...>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINTER="$SCRIPT_DIR/lint-md.ts"

if [[ ! -f "$LINTER" ]]; then
    echo "Error: linter not found at $LINTER"
    exit 1
fi

exec bun run "$LINTER" "$@"
