#!/usr/bin/env bash
# CI gate: rule tests + profile-scoped audit with --fail-on
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
ONLY="${AST_GREP_ONLY:-kimi}"
PROFILE="${AST_GREP_PROFILE:-ci}"

cd "$REPO"

echo "== ast-grep rule tests =="
python3 "$HELPER" -q test

echo ""
echo "== ast-grep audit (profile=$PROFILE, only=$ONLY) =="
python3 "$HELPER" -q audit --profile "$PROFILE" --only "$ONLY" --fail-on

echo "ci OK"