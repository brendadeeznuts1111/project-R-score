#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
SG="$ROOT/scripts/sg.sh"
TARGET="${1:-$REPO/kimi-plugin/sports-odds-plugin/scripts/lib/f402.ts}"

if [[ ! -f "$TARGET" ]]; then
  TARGET="$ROOT/scripts/ast_grep_helper.py"
fi

echo "== doctor =="
python3 "$HELPER" doctor
echo ""
echo "== outline (helper) =="
python3 "$HELPER" outline "$TARGET" --view names
echo ""
echo "== outline (sg.sh) =="
"$SG" outline "$TARGET" --view digest --color never | head -15
echo ""
echo "== search =="
python3 "$HELPER" -q search 'fetch($$$)' --path "$TARGET" --lang ts
echo "smoke OK"