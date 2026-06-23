#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SG="$SCRIPT_DIR/sg.sh"

if [[ ! -x "$SG" ]]; then
  echo "status: missing sg.sh wrapper"
  exit 1
fi

if ! "$SG" outline --help >/dev/null 2>&1; then
  echo "status: outline unavailable"
  echo "fix: npm install -g @ast-grep/cli@0.44.0"
  echo "  or: cd $SKILL_ROOT && npm install"
  exit 1
fi

VERSION="$("$SG" --version 2>/dev/null || true)"
GLOBAL="$(command -v ast-grep 2>/dev/null || echo missing)"
LOCAL="$SKILL_ROOT/node_modules/.bin/ast-grep"

echo "version: $VERSION"
echo "outline: supported"
echo "global: $GLOBAL"
echo "wrapper: $SG"

if [[ -x "$LOCAL" ]]; then
  echo "skill-pin: $("$LOCAL" --version 2>/dev/null || true)"
fi