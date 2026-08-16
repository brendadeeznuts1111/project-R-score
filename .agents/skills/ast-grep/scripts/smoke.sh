#!/usr/bin/env bash
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_ROOT/../../.." && pwd)"
HELPER="$SKILL_ROOT/scripts/ast_grep_helper.py"
SAMPLE="$REPO_ROOT/scripts/rate-removal-candidates.ts"

cd "$REPO_ROOT"

echo "== doctor =="
bun "$SKILL_ROOT/scripts/bun-cli.ts" doctor

echo "== pattern validation =="
python3 "$HELPER" -q validate 'Bun.spawn($$$)' --lang ts

echo "== syntax outline =="
python3 "$HELPER" -q outline "$SAMPLE" --view digest >/dev/null

echo "== Bun outline rules =="
python3 "$HELPER" -q outline "$SAMPLE" --bun-rules --view digest >/dev/null

echo "== structural search =="
python3 "$HELPER" -q files 'Bun.spawn($$$)' --path "$SAMPLE" --lang ts >/dev/null

echo "== rule snapshots =="
bun "$SKILL_ROOT/scripts/bun-cli.ts" test

echo "smoke OK"
