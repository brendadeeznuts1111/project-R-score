#!/usr/bin/env bash
# Resolve the repository-pinned ast-grep 0.44+ binary.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

outline_supported() {
  local bin="$1"
  [[ -n "$bin" && -x "$bin" ]] || return 1
  "$bin" outline --help >/dev/null 2>&1
}

resolve_binary() {
  local candidates=(
    "$SKILL_ROOT/node_modules/.bin/ast-grep"
    "$SKILL_ROOT/node_modules/.bin/sg"
    "${AST_GREP_BIN:-}"
  )
  for bin in "${candidates[@]}"; do
    outline_supported "$bin" || continue
    echo "$bin"
    return 0
  done
  return 1
}

if ! BIN="$(resolve_binary)"; then
  echo "ast-grep 0.44+ not found (outline required)." >&2
  echo "Hydrate the repository pin: $SKILL_ROOT/scripts/install.sh" >&2
  exit 3
fi

exec "$BIN" "$@"
