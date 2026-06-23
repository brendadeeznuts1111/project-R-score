#!/usr/bin/env bash
# Rule tests + monorepo audit baseline (CI-friendly with --fail-on)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
ONLY="${1:-}"
FAIL_ON="${2:-}"

cd "$REPO"

fail_args=()
if [[ "$FAIL_ON" == "--fail-on" || "$FAIL_ON" == "fail" ]]; then
  fail_args=(--fail-on)
fi

echo "== rule tests =="
python3 "$HELPER" -q test

echo ""
echo "== rules inventory =="
python3 "$HELPER" rules

echo ""
if [[ -n "$ONLY" ]]; then
  echo "== audit (--only $ONLY) =="
  python3 "$HELPER" -q audit --only "$ONLY" "${fail_args[@]}"
else
  echo "== audit (all repo-map targets) =="
  python3 "$HELPER" -q audit "${fail_args[@]}"
fi

echo "baseline OK"