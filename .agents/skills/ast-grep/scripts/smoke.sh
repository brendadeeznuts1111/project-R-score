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

cd "$REPO"

echo "== doctor =="
python3 "$HELPER" doctor
echo ""
echo "== map (kimi only) =="
python3 "$HELPER" map --only kimi 2>&1 | head -35
echo ""
echo "== outline (helper) =="
python3 "$HELPER" outline "$TARGET" --view names
echo ""
echo "== search =="
python3 "$HELPER" -q search 'fetch($$$)' --path "$TARGET" --lang ts
echo ""
echo "== files =="
python3 "$HELPER" -q files 'console.$METHOD($$$)' --path "$TARGET" --lang ts
echo ""
echo "== scan (no-console on f402) =="
python3 "$HELPER" -q scan --path "$TARGET" --rule "$ROOT/rules/no-console-log.yml" 2>&1 | head -8
echo "smoke OK"