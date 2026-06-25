#!/usr/bin/env bash
# Domain test matrix — runs ast-grep test profiles sequentially (CI smoke / local deep check)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"

# Profiles that skip snapshot preflight unless integration is explicitly included
DEFAULT_MATRIX=(unit matchers mock-clock shapes network snapshot pillars supply-chain color semver)

MATRIX=()
if [[ -n "${BUN_TEST_MATRIX:-}" ]]; then
  # shellcheck disable=SC2206
  MATRIX=($BUN_TEST_MATRIX)
elif [[ -n "${BUN_TEST_MATRIX_PROFILES:-}" ]]; then
  # shellcheck disable=SC2206
  MATRIX=($BUN_TEST_MATRIX_PROFILES)
else
  MATRIX=("${DEFAULT_MATRIX[@]}")
fi

SKIP_PREFLIGHT="${BUN_TEST_SKIP_PREFLIGHT:-1}"
export BUN_TEST_SKIP_PREFLIGHT="$SKIP_PREFLIGHT"
export BUN_TEST_TZ="${BUN_TEST_TZ:-Etc/UTC}"

cd "$REPO"

FAIL=0
echo "== bun test matrix (tz=$BUN_TEST_TZ skip_preflight=$SKIP_PREFLIGHT) =="

for profile in "${MATRIX[@]}"; do
  echo ""
  echo "-- profile: $profile --"
  if ! python3 "$HELPER" -q bun test-ci --profile "$profile" --skip-preflight; then
    echo "FAIL profile=$profile"
    FAIL=1
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  echo "bun-test-matrix FAILED"
  exit 1
fi

echo ""
echo "bun-test-matrix OK (${#MATRIX[@]} profiles)"