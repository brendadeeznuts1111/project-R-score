#!/usr/bin/env bash
# proton-run.sh — run a command with Proton Pass secrets (official pass-cli run).
#
# Default (recommended): pass-cli run --env-file <materialized template> -- <cmd>
#   → official masking, secrets only in child env
#   @see https://protonpass.github.io/pass-cli/commands/contents/run/
#
# --inject: durable inject → source .env → exec (parent gets secrets; prefer run)
# --reasonix: also refresh ~/.reasonix/.env via inject, then run
#
# Usage:
#   bash scripts/proton-run.sh factorywager -- bun run cloudflare:env:validate
#   bash scripts/proton-run.sh factorywager --reasonix -- bun tools/cloudflare-pages-deploy.ts
#   bash scripts/proton-run.sh factorywager --inject -- bun run something
#   bash scripts/proton-run.sh factorywager --ssh -- ssh staging

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/pass-session.sh
. "$SCRIPT_DIR/lib/pass-session.sh"

PROJECT=""
REASONIX=0
USE_INJECT=0
SSH_LOAD=0
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
      REASONIX=1
      ;;
    --inject)
      USE_INJECT=1
      ;;
    --ssh)
      SSH_LOAD=1
      ;;
    factorywager|bet-ticker|cascade-mover|scanner|cloudflare)
      PROJECT="$arg"
      ;;
    -h|--help)
      echo "Usage: $0 <project> [--reasonix] [--inject] [--ssh] -- <command...>"
      echo ""
      echo "  default   pass-cli run --env-file (official masking)"
      echo "  --inject  inject → source .env → exec (durable cache path)"
      echo "  --reasonix refresh ~/.reasonix/.env then run"
      echo "  --ssh     load SSH keys from Personal vault before command"
      echo ""
      echo "Docs: https://protonpass.github.io/pass-cli/commands/contents/run/"
      exit 0
      ;;
    *)
      echo "Unknown arg before --: $arg" >&2
      echo "Usage: $0 <project> [--reasonix] [--inject] [--ssh] -- <command...>" >&2
      exit 1
      ;;
  esac
done

if [ -z "$PROJECT" ] || [ "${#ARGS[@]}" -eq 0 ]; then
  echo "Usage: $0 <project> [--reasonix] [--inject] [--ssh] -- <command...>" >&2
  exit 1
fi

# Map project → agent + inject template
case "$PROJECT" in
  factorywager|cloudflare)
    AGENT="factorywager"
    TEMPLATE="$ROOT/env.template"
    ENV_FILE="$ROOT/.env"
    ;;
  bet-ticker)
    AGENT="bet-ticker"
    TEMPLATE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/env.template"
    ENV_FILE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/.env"
    ;;
  cascade-mover)
    AGENT="cascade-mover"
    TEMPLATE="$ROOT/projects/active/enterprise/cascade-mover-v3/env.template"
    ENV_FILE="$ROOT/projects/active/enterprise/cascade-mover-v3/.env"
    ;;
  scanner)
    AGENT="factorywager"
    TEMPLATE="$ROOT/projects/active/analysis/scanner/env.template"
    ENV_FILE="$ROOT/projects/active/analysis/scanner/.env"
    ;;
esac

# shellcheck source=agent-env.sh
source "$SCRIPT_DIR/agent-env.sh" "$AGENT"
if ! pass_session_ready; then
  echo "❌ Pass session not ready (need info.personal_access_token_name)" >&2
  echo "   source scripts/agent-env.sh $AGENT && pass-cli info --output json" >&2
  exit 1
fi

cd "$ROOT"

# Optionally load SSH keys (official pass-cli ssh-agent load).
if [ "$SSH_LOAD" -eq 1 ]; then
  SSH_VAULT="$(pass_ssh_vault_default)"
  echo "🔑 Loading SSH keys from vault '$SSH_VAULT'..."
  if command -v ssh-agent >/dev/null && [ -z "${SSH_AUTH_SOCK:-}" ] && [ ! -S "${HOME}/.ssh/proton-pass-agent.sock" ]; then
    eval "$(ssh-agent -s)" >/dev/null
  fi
  pass_ssh_export_sock || true
  if pass_ssh_daemon_needs_heal; then
    pass_ssh_daemon_heal
  fi
  pass-cli ssh-agent load --vault-name "$SSH_VAULT" 2>&1 | tail -1
  pass_ssh_export_sock || true
fi

# Reasonix durable cache still uses inject (MCP / tools that read the file).
if [ "$REASONIX" -eq 1 ]; then
  bash "$SCRIPT_DIR/proton-inject.sh" "$PROJECT" --reasonix
fi

if [ "$USE_INJECT" -eq 1 ]; then
  # Legacy / durable path: inject file then source into this process.
  if [ "$REASONIX" -eq 0 ]; then
    bash "$SCRIPT_DIR/proton-inject.sh" "$PROJECT"
  fi
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Expected env after inject: $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [ -f "${HOME}/.reasonix/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source "${HOME}/.reasonix/.env"
    set +a
  fi
  echo "🚀 Running (inject+source — prefer default pass-cli run): ${ARGS[*]}"
  exec "${ARGS[@]}"
fi

# Official path: materialize bare pass:// dotenv, then pass-cli run (masked child).
RUN_ENV="$(mktemp "${TMPDIR:-/tmp}/fw-pass-run.XXXXXX.env")"
cleanup() { rm -f "$RUN_ENV"; }
trap cleanup EXIT
pass_template_to_run_env "$TEMPLATE" "$RUN_ENV"

echo "🚀 Running (pass-cli run --env-file, masked): ${ARGS[*]}"
# Do not exec — keep trap so the temp dotenv is removed after the child exits.
pass-cli run --env-file "$RUN_ENV" -- "${ARGS[@]}"
exit $?
