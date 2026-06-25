#!/usr/bin/env bash
# audit-bunfig.sh — find workspace bunfig.toml files duplicating machine-level install keys.
# Machine defaults live in ~/.bunfig.toml (linker, globalStore, cache.dir).
#
# Usage (from repo root):
#   ./scripts/audit-bunfig.sh
#   ./scripts/audit-bunfig.sh --strict   # exit 1 if any redundant keys found
#   ./scripts/audit-bunfig.sh --doctor   # prefer kimi-doctor --gate bunfig-policy (if on PATH)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STRICT=0
USE_DOCTOR=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    --doctor) USE_DOCTOR=1 ;;
  esac
done

if [[ "$USE_DOCTOR" -eq 1 ]] && command -v kimi-doctor >/dev/null 2>&1; then
  exec kimi-doctor --gate bunfig-policy
fi

# Match actual key assignments only — not comments mentioning linker/globalStore/cache.dir
KEY_PATTERN='^(linker|globalStore)[[:space:]]*=|^[[:space:]]*dir[[:space:]]*='

echo "=== Bunfig.toml duplication audit ==="
echo "Machine defaults (~/.bunfig.toml): linker=isolated, globalStore=true, absolute cache.dir"
echo ""

if command -v bun >/dev/null 2>&1; then
  echo "── Project identity (bun pm pkg get) ──"
  bun pm pkg get name version private 2>/dev/null | sed 's/^/  /' || echo "  (bun pm pkg get unavailable)"
  echo ""
  echo "── Trust surface (bun pm untrusted) ──"
  UNTRUSTED_COUNT=$(bun pm untrusted 2>/dev/null | grep -Eo 'Found [0-9]+ untrusted' | grep -Eo '[0-9]+' || echo "0")
  if [[ "$UNTRUSTED_COUNT" != "0" ]]; then
    bun pm untrusted 2>/dev/null | sed 's/^/  /'
  else
    echo "  ✅ 0 untrusted dependencies with blocked scripts"
  fi
  echo ""
fi

FOUND=0
while IFS= read -r -d '' f; do
  rel="${f#"$ROOT"/}"
  matches=$(grep -nE "$KEY_PATTERN" "$f" 2>/dev/null || true)
  [[ -z "$matches" ]] && continue
  FOUND=1
  echo "┌─ $rel"
  echo "$matches" | sed 's/^/│  /'
  echo "└─"
  echo ""
done < <(
  find "$ROOT" -name "bunfig.toml" \
    -not -path "*/node_modules/*" \
    -not -path "*/.bun/*" \
    -print0 | sort -z
)

if [[ "$FOUND" -eq 0 ]]; then
  echo "✅ No redundant install key assignments found."
  exit 0
fi

echo "Note: intentional overrides (hoisted linker, project-local cache.dir) are expected in some workspaces."
echo "Strip linker/globalStore/tilde cache.dir when they mirror ~/.bunfig.toml."
[[ "$STRICT" -eq 1 ]] && exit 1
exit 0