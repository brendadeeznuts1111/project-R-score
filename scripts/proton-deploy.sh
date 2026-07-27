#!/usr/bin/env bash
# Unified deploy with Proton Pass secret injection
# Usage: bash scripts/proton-deploy.sh <project> [deploy-args...]
#
# Examples:
#   bash scripts/proton-deploy.sh pages --branch main
#   bash scripts/proton-deploy.sh pages --wait --verify
#   bash scripts/proton-deploy.sh staging
#
# Steps:
#   1. Load the per-project Proton Pass agent
#   2. Resolve env.template → .env via pass-cli inject
#   3. Run the deploy command with secrets in environment

set -euo pipefail

PROJECT="${1:-}"
shift 2>/dev/null || true

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project> [deploy-args...]"
  echo "Projects: pages, staging, factorywager, bet-ticker, cascade-mover, scanner"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

case "$PROJECT" in
  pages)
    # Cloudflare Pages deploy — resolves env first, then deploys
    VAULT="factorywager"
    TEMPLATE="$ROOT/env.template"
    # After inject, cloudflare-pages-deploy.ts reads CLOUDFLARE_API_TOKEN from env
    DEPLOY_CMD="exec bun $ROOT/tools/cloudflare-pages-deploy.ts $@"
    ;;
  staging)
    VAULT="factorywager"
    TEMPLATE="$ROOT/env.template"
    DEPLOY_CMD="exec bash $SCRIPT_DIR/shell/deploy-staging.sh $@"
    ;;
  factorywager)
    VAULT="factorywager"
    TEMPLATE="$ROOT/env.template"
    DEPLOY_CMD="exec $@"
    ;;
  bet-ticker)
    VAULT="bet-ticker"
    TEMPLATE="$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/env.template"
    DEPLOY_CMD="exec $@"
    ;;
  cascade-mover)
    VAULT="cascade-mover"
    TEMPLATE="$ROOT/projects/active/enterprise/cascade-mover-v3/env.template"
    DEPLOY_CMD="exec $@"
    ;;
  scanner)
    VAULT="factorywager"
    TEMPLATE="$ROOT/projects/active/analysis/scanner/env.template"
    DEPLOY_CMD="exec $@"
    ;;
  *)
    echo "❌ Unknown project: $PROJECT"
    exit 1
    ;;
esac

# Source agent env for the vault
source "$SCRIPT_DIR/agent-env.sh" "$VAULT"

# Resolve secrets from template
if [ -f "$TEMPLATE" ]; then
  echo "🔐 Resolving secrets from $TEMPLATE..."
  PROTON_PASS_AGENT_REASON="Deploy: resolving env secrets for $PROJECT" \
    pass-cli inject --in-file "$TEMPLATE" --out-file "$ROOT/.env"
  echo "✅ .env written with vault secrets"
fi

# Run the deploy
echo "🚀 Deploying $PROJECT..."
PROTON_PASS_AGENT_REASON="Deploying $PROJECT" \
  pass-cli run -- $DEPLOY_CMD
