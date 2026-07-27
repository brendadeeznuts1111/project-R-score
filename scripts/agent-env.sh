# Source this file for per-project Proton Pass agent access
# PATs should be set via environment variables or a .env file, NOT hardcoded here.
#
# Usage:
#   source scripts/agent-env.sh <project>
#   or set PROTON_PASS_<PROJECT>_TOKEN in your environment first
#
# Token sources (highest priority first):
#   1. PROTON_PASS_<PROJECT>_TOKEN env var (e.g. PROTON_PASS_FACTORYWAGER_TOKEN)
#   2. .env.pass-tokens file (gitignored)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load token overrides from .env.pass-tokens if it exists
TOKEN_FILE="$SCRIPT_DIR/../.env.pass-tokens"
[ -f "$TOKEN_FILE" ] && source "$TOKEN_FILE"

case "${1:-}" in
  factorywager)
    export PROTON_PASS_KEY_PROVIDER=fs
    export PROTON_PASS_SESSION_DIR="/tmp/pass-agent-factorywager"
    TOKEN="${PROTON_PASS_FACTORYWAGER_TOKEN}"
    ;;
  cloudflare)
    export PROTON_PASS_KEY_PROVIDER=fs
    export PROTON_PASS_SESSION_DIR="/tmp/pass-agent-cloudflare"
    TOKEN="${PROTON_PASS_CLOUDFLARE_TOKEN}"
    ;;
  bet-ticker)
    export PROTON_PASS_KEY_PROVIDER=fs
    export PROTON_PASS_SESSION_DIR="/tmp/pass-agent-bet-ticker"
    TOKEN="${PROTON_PASS_BET_TICKER_TOKEN}"
    ;;
  cascade-mover)
    export PROTON_PASS_KEY_PROVIDER=fs
    export PROTON_PASS_SESSION_DIR="/tmp/pass-agent-cascade"
    TOKEN="${PROTON_PASS_CASCADE_TOKEN}"
    ;;
  *)
    echo "Usage: source scripts/agent-env.sh <project>"
    echo "Projects: factorywager, cloudflare, bet-ticker, cascade-mover"
    return 1
    ;;
esac

if [ -z "$TOKEN" ]; then
  echo "❌ No token found for '$1'"
  echo "   Set PROTON_PASS_${1^^}_TOKEN env var or create .env.pass-tokens"
  echo "   Format: PROTON_PASS_FACTORYWAGER_TOKEN='pst_...'"
  return 1
fi

export PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN"
PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN" pass-cli login 2>/dev/null

echo "✅ Proton Pass editor access loaded for: $1"
echo "   Session: $PROTON_PASS_SESSION_DIR"
pass-cli info 2>&1 | grep "Personal Access Token"