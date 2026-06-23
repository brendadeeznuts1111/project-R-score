#!/usr/bin/env bash
# bun test CI wrapper — Bun v1.3.13+ profiles (parallel, isolate, shard, changed)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"

PROFILE="${BUN_TEST_PROFILE:-ci}"
TEST_PATH="${BUN_TEST_PATH:-.}"
SHARD="${BUN_TEST_SHARD:-}"
CHANGED="${BUN_TEST_CHANGED:-}"

cd "$REPO"

EXTRA=()
if [[ -n "$SHARD" ]]; then
  EXTRA+=(--shard "$SHARD")
fi
if [[ -n "$CHANGED" ]]; then
  EXTRA+=(--changed "$CHANGED")
fi

echo "== bun test-ci (profile=$PROFILE path=$TEST_PATH) =="
python3 "$HELPER" -q bun test-ci --profile "$PROFILE" --path "$TEST_PATH" "${EXTRA[@]}"

echo "bun-test-ci OK"