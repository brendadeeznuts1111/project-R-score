#!/usr/bin/env bash
# bun test CI wrapper — Bun v1.3.13+ profiles (parallel, isolate, shard, changed, domain matrix)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"

PROFILE="${BUN_TEST_PROFILE:-ci}"
TEST_PATH="${BUN_TEST_PATH:-}"
TEST_FILTER="${BUN_TEST_FILTER:-}"
TEST_NAME_PATTERN="${BUN_TEST_NAME_PATTERN:-}"
SHARD="${BUN_TEST_SHARD:-}"
CHANGED="${BUN_TEST_CHANGED:-}"
SKIP_PREFLIGHT="${BUN_TEST_SKIP_PREFLIGHT:-}"
TEST_TZ="${BUN_TEST_TZ:-}"

cd "$REPO"

EXTRA=()
if [[ -n "$TEST_PATH" ]]; then
  EXTRA+=(--path "$TEST_PATH")
fi
if [[ -n "$TEST_FILTER" ]]; then
  # shellcheck disable=SC2206
  EXTRA+=($TEST_FILTER)
fi
if [[ -n "$TEST_NAME_PATTERN" ]]; then
  EXTRA+=(-t "$TEST_NAME_PATTERN")
fi
if [[ -n "$SHARD" ]]; then
  EXTRA+=(--shard "$SHARD")
fi
if [[ -n "$CHANGED" ]]; then
  EXTRA+=(--changed "$CHANGED")
fi
if [[ -n "$SKIP_PREFLIGHT" ]]; then
  EXTRA+=(--skip-preflight)
fi
if [[ -n "$TEST_TZ" ]]; then
  export BUN_TEST_TZ="$TEST_TZ"
fi

echo "== bun test-ci (profile=$PROFILE filters=${TEST_FILTER:-all} shard=${SHARD:-none} tz=${TEST_TZ:-profile-default}) =="
python3 "$HELPER" -q bun test-ci --profile "$PROFILE" "${EXTRA[@]}"

echo "bun-test-ci OK"