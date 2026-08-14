#!/usr/bin/env bash
# Resolve env.template → .env via Proton Pass (vault SSOT).
#
# Preferred path: bun scripts/proton-inject.ts (project map SSOT + package inject).
# This shell entry keeps package.json / operator muscle-memory working.
#
# Usage:
#   bash scripts/proton-inject.sh factorywager
#   bash scripts/proton-inject.sh bet-ticker
#   bash scripts/proton-inject.sh cascade-mover
#   bash scripts/proton-inject.sh scanner
#   bash scripts/proton-inject.sh kalshi-bot
#   bash scripts/proton-inject.sh factorywager --reasonix
#
# @see lib/security/proton-projects.ts
# @see packages/proton-pass
# @see https://protonpass.github.io/pass-cli/commands/contents/inject/

set -euo pipefail

PROJECT="${1:-}"
SYNC_REASONIX=0
shift 2>/dev/null || true
for arg in "$@"; do
  case "$arg" in
    --reasonix) SYNC_REASONIX=1 ;;
    *)
      echo "Unknown flag: $arg" >&2
      echo "Usage: $0 <factorywager|bet-ticker|cascade-mover|scanner|cloudflare|kalshi-bot> [--reasonix]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <factorywager|bet-ticker|cascade-mover|scanner|cloudflare|kalshi-bot> [--reasonix]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REASONIX_ARGS=()
if [ "$SYNC_REASONIX" -eq 1 ]; then
  REASONIX_ARGS=(--reasonix)
fi

# Primary: typed inject (SSOT map + force-reset session + reasonix)
if (
  cd "$ROOT" &&
    bun scripts/proton-inject.ts "$PROJECT" "${REASONIX_ARGS[@]}"
); then
  exit 0
fi

echo "⚠️  bun scripts/proton-inject.ts failed — falling back to package CLI" >&2

# Fallback map (keep in sync with lib/security/proton-projects.ts)
case "$PROJECT" in
  factorywager|cloudflare)
    AGENT="factorywager"
    TEMPLATE="$ROOT/env.template"
    OUT="$ROOT/.env"
    ;;
  bet-ticker)
    AGENT="bet-ticker"
    TEMPLATE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/env.template"
    OUT="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/.env"
    ;;
  cascade-mover)
    AGENT="cascade-mover"
    TEMPLATE="$ROOT/projects/active/enterprise/cascade-mover-v3/env.template"
    OUT="$ROOT/projects/active/enterprise/cascade-mover-v3/.env"
    ;;
  scanner)
    AGENT="factorywager"
    TEMPLATE="$ROOT/projects/active/analysis/scanner/env.template"
    OUT="$ROOT/projects/active/analysis/scanner/.env"
    ;;
  kalshi-bot|kalshi)
    AGENT="kalshi-bot"
    TEMPLATE="$ROOT/Kalshi-bot/env.template"
    OUT="$ROOT/Kalshi-bot/.env"
    ;;
  *)
    echo "Unknown project: $PROJECT" >&2
    exit 1
    ;;
esac

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ Template not found: $TEMPLATE" >&2
  exit 1
fi

if (
  cd "$ROOT" &&
    bunx --bun proton-pass inject \
      --in-file "$TEMPLATE" \
      --out-file "$OUT" \
      --agent "$AGENT" \
      --reason "Inject env secrets for $PROJECT"
); then
  chmod 600 "$OUT" 2>/dev/null || true
  echo "✅ Wrote $OUT"
  if [ "$SYNC_REASONIX" -eq 1 ]; then
    echo "⚠️  --reasonix only fully supported on typed path (bun scripts/proton-inject.ts)" >&2
  fi
  exit 0
fi

echo "⚠️  package inject failed — falling back to agent-env + pass-cli" >&2
# shellcheck source=agent-env.sh
source "$SCRIPT_DIR/agent-env.sh" "$AGENT"
# shellcheck source=lib/pass-session.sh
. "$SCRIPT_DIR/lib/pass-session.sh"
if ! pass_session_ready; then
  echo "❌ Pass session not ready (need info.personal_access_token_name)" >&2
  echo "   Recovery: pass-cli logout --force; rm -rf \"\$PROTON_PASS_SESSION_DIR\"; source scripts/agent-env.sh $AGENT" >&2
  exit 1
fi
PROTON_PASS_AGENT_REASON="Inject env secrets for $PROJECT" \
  pass-cli inject --in-file "$TEMPLATE" --out-file "$OUT" --force --file-mode 0600
chmod 600 "$OUT" 2>/dev/null || true
echo "✅ Wrote $OUT"
