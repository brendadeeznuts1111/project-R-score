#!/usr/bin/env bash
# Closed loop CI: ground-truth → bench-snapshot → baseline diff (optional write)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
DOMAIN="${AST_GREP_CLOSE_DOMAIN:-sports-terminal-os}"
SCAN="${AST_GREP_CLOSE_SCAN:-projects/active/sports-terminal-os/dist/frontend}"
ITERS="${AST_GREP_CLOSE_ITERS:-3}"
MIN_RATING="${AST_GREP_CLOSE_MIN_RATING:-70}"
BASELINE_WRITE="${AST_GREP_CLOSE_BASELINE_WRITE:-}"

cd "$REPO"

args=(
  bun "$ROOT/scripts/skill-loop-cli.ts" close-loop
  --domain "$DOMAIN"
  --scan-path "$SCAN"
  --ground-truth
  --iterations "$ITERS"
  --fail-on-rating
  --min-rating "$MIN_RATING"
)

if [[ "$BASELINE_WRITE" == "1" || "$BASELINE_WRITE" == "true" ]]; then
  args+=(--baseline-write)
fi

echo "== close-loop (domain=$DOMAIN iters=$ITERS) =="
"${args[@]}"
echo "close-loop-ci OK"