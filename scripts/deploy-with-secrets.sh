#!/bin/bash
# Deploy with secrets injected from Proton Pass
# Usage: ./scripts/deploy-with-secrets.sh <project> [deploy-args...]
#
# Example: ./scripts/deploy-with-secrets.sh factorywager
#          ./scripts/deploy-with-secrets.sh bet-ticker --branch main

set -e

PROJECT="${1:-}"
shift 2>/dev/null || true

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project> [deploy-args...]"
  echo "Projects: factorywager, bet-ticker, cascade-mover"
  exit 1
fi

# Load the agent env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/agent-env.sh" "$PROJECT"

# Find the template and resolve it
TEMPLATE_DIR="$SCRIPT_DIR/.."
case "$PROJECT" in
  factorywager) TEMPLATE="$TEMPLATE_DIR/env.template" ;;
  bet-ticker)   TEMPLATE="$TEMPLATE_DIR/projects/active/enterprise/bet-ticker-worker-v1.1/env.template" ;;
  cascade-mover) TEMPLATE="$TEMPLATE_DIR/projects/active/enterprise/cascade-mover-v3/env.template" ;;
  scanner)      TEMPLATE="$TEMPLATE_DIR/projects/active/analysis/scanner/env.template" ;;
  *)            echo "❌ Unknown project: $PROJECT"; exit 1 ;;
esac

if [ -f "$TEMPLATE" ]; then
  echo "📄 Resolving secrets from $TEMPLATE..."
  PROTON_PASS_AGENT_REASON="Deploy: resolving env secrets for $PROJECT" \
    pass-cli inject "$TEMPLATE" --output .env
  echo "✅ .env written"
fi

# Run the actual deploy command via pass-cli run for env injection
echo "🚀 Deploying $PROJECT..."
PROTON_PASS_AGENT_REASON="Deploying $PROJECT" \
  pass-cli run -- "$@"
