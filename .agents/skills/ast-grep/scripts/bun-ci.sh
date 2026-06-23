#!/usr/bin/env bash
# Bun-native CI gate: adoption score + profile-scoped audit
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
ONLY="${AST_GREP_BUN_ONLY:-sports-terminal}"
MIN_SCORE="${AST_GREP_BUN_MIN_SCORE:-60}"

cd "$REPO"

echo "== bun score (min=$MIN_SCORE, only=$ONLY) =="
python3 "$HELPER" -q bun score --only "$ONLY" --min-score "$MIN_SCORE"

echo ""
echo "== bun migrate (fail-on) =="
python3 "$HELPER" -q bun migrate --only "$ONLY" --fail-on || {
  echo "(migrate findings present — review bun report)"
  exit 1
}

echo ""
echo "== ast-grep audit (profile=bun-hygiene, only=$ONLY) =="
python3 "$HELPER" -q audit --profile bun-hygiene --only "$ONLY" --fail-on

echo "bun-ci OK"