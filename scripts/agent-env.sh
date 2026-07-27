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
  # Portable upper-case project label (avoid bash-only ${1^^})
  _proj_upper=$(printf '%s' "$1" | tr '[:lower:]-' '[:upper:]_')
  echo "❌ No Proton Pass agent PAT for '$1'"
  echo "   Set PROTON_PASS_${_proj_upper}_TOKEN or add it to .env.pass-tokens (gitignored)"
  echo "   PATs live in vault (e.g. pass://factorywager/PAT factorywager-bot) — never commit them"
  echo "   Format: PROTON_PASS_FACTORYWAGER_TOKEN='pst_...'"
  unset _proj_upper
  return 1
fi

export PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN"
# login exits non-zero when session already active — must not abort callers with set -e
# Some hosts SIGKILL pass-cli (exit 137) — detect and degrade gracefully
if ! command -v pass-cli >/dev/null 2>&1; then
  echo "⚠️  pass-cli not on PATH — vault inject unavailable"
  echo "   Local mint path: bun run vault:gap:mint-local"
  return 0
fi
PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN" pass-cli login 2>/dev/null || true

echo "✅ Proton Pass agent token loaded for: $1"
echo "   Session: $PROTON_PASS_SESSION_DIR"
if ! pass-cli info 2>/dev/null | grep -q "Personal Access Token"; then
  # Probe: if even info is killed, warn (exit 137 common in restricted sandboxes)
  if ! pass-cli --version >/dev/null 2>&1; then
    echo "⚠️  pass-cli not executable here (often Killed:9 / exit 137)"
    echo "   Use Terminal.app for pass-cli, or: bun run vault:gap:mint-local"
  fi
else
  pass-cli info 2>&1 | grep "Personal Access Token" || true
fi