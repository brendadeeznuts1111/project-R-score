#!/usr/bin/env bash
# Resolve ast-grep 0.44+ (outline support) from PATH or skill node_modules.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

outline_supported() {
  local bin="$1"
  [[ -n "$bin" && -x "$bin" ]] || return 1
  "$bin" outline --help >/dev/null 2>&1
}

resolve_binary() {
  local candidates=(
    "$(command -v ast-grep 2>/dev/null || true)"
    "$(command -v sg 2>/dev/null || true)"
    "$SKILL_ROOT/node_modules/.bin/ast-grep"
    "$SKILL_ROOT/node_modules/.bin/sg"
    "${AST_GREP_BIN:-}"
    /opt/homebrew/bin/ast-grep
    /usr/local/bin/ast-grep
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
  echo "Global: npm install -g @ast-grep/cli@0.44.0" >&2
  echo "Local:  cd $SKILL_ROOT && npm install" >&2
  exit 3
fi

exec "$BIN" "$@"