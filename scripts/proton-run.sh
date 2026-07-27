#!/usr/bin/env bash
# proton-run.sh — inject vault secrets into the environment, then run a command.
# Usage:
#   bash scripts/proton-run.sh factorywager -- bun run cloudflare:env:validate
#   bash scripts/proton-run.sh cascade-mover -- bun run mcp
#   bash scripts/proton-run.sh factorywager --reasonix -- bun tools/cloudflare-pages-deploy.ts
#
# Secrets are loaded from the project .env after inject (and optional reasonix sync).
# Prefer this over pasting tokens into the shell.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT=""
REASONIX_FLAG=()
ARGS=()
SEEN_SEP=0

for arg in "$@"; do
  if [ "$SEEN_SEP" -eq 1 ]; then
    ARGS+=("$arg")
    continue
  fi
  case "$arg" in
    --)
      SEEN_SEP=1
      ;;
    --reasonix)
      REASONIX_FLAG=(--reasonix)
      ;;
    factorywager|bet-ticker|cascade-mover|scanner|cloudflare)
      PROJECT="$arg"
      ;;
    -h|--help)
      echo "Usage: $0 <project> [--reasonix] -- <command...>"
      exit 0
      ;;
    *)
      echo "Unknown arg before --: $arg" >&2
      echo "Usage: $0 <project> [--reasonix] -- <command...>" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT" ] || [ "${#ARGS[@]}" -eq 0 ]; then
  echo "Usage: $0 <project> [--reasonix] -- <command...>" >&2
  exit 1
fi

bash "$SCRIPT_DIR/proton-inject.sh" "$PROJECT" "${REASONIX_FLAG[@]+"${REASONIX_FLAG[@]}"}"

# Map project → env file to source
case "$PROJECT" in
  factorywager|cloudflare) ENV_FILE="$ROOT/.env" ;;
  bet-ticker) ENV_FILE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/.env" ;;
  cascade-mover) ENV_FILE="$ROOT/projects/active/enterprise/cascade-mover-v3/.env" ;;
  scanner) ENV_FILE="$ROOT/projects/active/analysis/scanner/.env" ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Expected env after inject: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Also layer reasonix when present (MCP / tools that read it)
if [ -f "${HOME}/.reasonix/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${HOME}/.reasonix/.env"
  set +a
fi

cd "$ROOT"
echo "🚀 Running (vault env loaded): ${ARGS[*]}"
exec "${ARGS[@]}"
