#!/usr/bin/env bash
# bun install CI wrapper — linker, frozen lockfile, minimum-release-age
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"

PROFILE="${BUN_INSTALL_PROFILE:-ci-isolated}"
DRY="${BUN_INSTALL_DRY_RUN:-}"

cd "$REPO"

EXTRA=()
if [[ -n "$DRY" ]]; then
  EXTRA+=(--dry-run)
fi

echo "== bun install-ci (profile=$PROFILE) =="
python3 "$HELPER" -q bun install-ci --profile "$PROFILE" "${EXTRA[@]}"

echo "bun-install-ci OK"