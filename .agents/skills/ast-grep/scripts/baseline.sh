#!/usr/bin/env bash
# Rule tests + monorepo audit baseline (CI-friendly with --fail-on)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
ONLY="${1:-}"

cd "$REPO"

echo "== rule tests =="
python3 "$HELPER" -q test

echo ""
echo "== rules inventory =="
python3 "$HELPER" rules

echo ""
if [[ -n "$ONLY" ]]; then
  echo "== audit (--only $ONLY) =="
  python3 "$HELPER" -q audit --only "$ONLY"
else
  echo "== audit (all repo-map targets) =="
  python3 "$HELPER" -q audit
fi

echo "baseline OK"