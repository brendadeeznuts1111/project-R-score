# Source this file for per-project Proton Pass agent access
# shellcheck shell=bash
# PATs should be set via environment variables or a .env file, NOT hardcoded here.
#
# Usage:
#   source scripts/agent-env.sh <project>
#   or set PROTON_PASS_<PROJECT>_TOKEN in your environment first
#
# Token sources (highest priority first):
#   1. PROTON_PASS_<PROJECT>_TOKEN env var (e.g. PROTON_PASS_FACTORYWAGER_TOKEN)
#   2. PROTON_PASS_TOKEN_FILE (explicit machine-local token file)
#   3. .env.pass-tokens beside this checkout (gitignored)
#   4. .env.pass-tokens beside the shared Git directory (worktree-safe)
#
# Session / key storage (official Pass CLI docs):
#   https://protonpass.github.io/pass-cli/get-started/configuration/
#   - SESSION_DIR default: ~/.factorywager/pass-sessions/<project> (stable; not /tmp)
#   - KEY_PROVIDER=fs by default for multi-PAT agent isolation (PASS_USE_KEYRING=1 for OS keyring)
#   - Readiness: pass-cli info --output json (personal_access_token_name) — not `test` alone
#
# Resolve this script's directory when sourced from bash OR zsh.
# Bare `${BASH_SOURCE[0]}` is empty under zsh → TOKEN_FILE misses .env.pass-tokens.
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
elif [ -n "${ZSH_VERSION:-}" ]; then
  # zsh: %x is the sourced file path
  # shellcheck disable=SC2296
  SCRIPT_DIR="$(cd "$(dirname "${(%):-%x}")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

# shellcheck source=lib/pass-session.sh
. "$SCRIPT_DIR/lib/pass-session.sh"

# Load token overrides without copying a PAT into every Git worktree. A linked
# worktree's common Git directory points back to the primary checkout, whose
# sibling .env.pass-tokens remains the machine-local source.
TOKEN_FILE="${PROTON_PASS_TOKEN_FILE:-$SCRIPT_DIR/../.env.pass-tokens}"
if [ ! -f "$TOKEN_FILE" ] && command -v git >/dev/null 2>&1; then
  COMMON_GIT_DIR="$(git -C "$SCRIPT_DIR/.." rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [ -n "$COMMON_GIT_DIR" ] && [ -f "$(dirname "$COMMON_GIT_DIR")/.env.pass-tokens" ]; then
    TOKEN_FILE="$(dirname "$COMMON_GIT_DIR")/.env.pass-tokens"
  fi
fi
# Machine-local token file selected above.
# shellcheck disable=SC1090
[ -f "$TOKEN_FILE" ] && source "$TOKEN_FILE"

_pass_project=""
case "${1:-}" in
  factorywager)
    _pass_project="factorywager"
    TOKEN="${PROTON_PASS_FACTORYWAGER_TOKEN:-}"
    ;;
  cloudflare)
    _pass_project="cloudflare"
    TOKEN="${PROTON_PASS_CLOUDFLARE_TOKEN:-}"
    ;;
  bet-ticker)
    _pass_project="bet-ticker"
    TOKEN="${PROTON_PASS_BET_TICKER_TOKEN:-}"
    ;;
  cascade-mover)
    _pass_project="cascade"
    TOKEN="${PROTON_PASS_CASCADE_TOKEN:-}"
    ;;
  partners)
    _pass_project="partners"
    TOKEN="${PROTON_PASS_PARTNERS_TOKEN:-}"
    ;;
  kalshi-bot|kalshi)
    _pass_project="kalshi-bot"
    TOKEN="${PROTON_PASS_KALSHI_BOT_TOKEN:-}"
    ;;
  *)
    echo "Usage: source scripts/agent-env.sh <project>"
    echo "Projects: factorywager, cloudflare, bet-ticker, cascade-mover, partners, kalshi-bot"
    return 1
    ;;
esac

# Always bind the stable per-project session dir (ignores stale /tmp from parent shells).
# Keep a caller override only when PASS_KEEP_SESSION_DIR=1.
if [ "${PASS_KEEP_SESSION_DIR:-0}" != "1" ] || [ -z "${PROTON_PASS_SESSION_DIR:-}" ]; then
  export PROTON_PASS_SESSION_DIR
  PROTON_PASS_SESSION_DIR="$(pass_session_dir_for "$_pass_project")"
fi
export PROTON_PASS_KEY_PROVIDER
PROTON_PASS_KEY_PROVIDER="$(pass_key_provider_for_agent)"
pass_session_prepare "$PROTON_PASS_SESSION_DIR"

if [ -z "$TOKEN" ]; then
  # Portable upper-case project label (avoid bash-only ${1^^})
  _proj_upper=$(printf '%s' "$1" | tr '[:lower:]-' '[:upper:]_')
  echo "❌ No Proton Pass agent PAT for '$1'"
  echo "   Set PROTON_PASS_${_proj_upper}_TOKEN or add it to .env.pass-tokens (gitignored)"
  echo "   PATs live in vault (e.g. pass://factorywager/PAT factorywager-bot) — never commit them"
  echo "   Format (official): PROTON_PASS_FACTORYWAGER_TOKEN='pst_…::TOKENKEY'"
  echo "   See: https://protonpass.github.io/pass-cli/get-started/configuration/"
  unset _proj_upper _pass_project
  return 1
fi

export PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN"
# login exits non-zero when session already active — must not abort callers with set -e
# Some hosts SIGKILL pass-cli (exit 137) — detect and degrade gracefully
if ! command -v pass-cli >/dev/null 2>&1; then
  echo "⚠️  pass-cli not on PATH — vault inject unavailable"
  echo "   Local mint path: bun run vault:gap:mint-local"
  unset _pass_project
  return 0
fi
PROTON_PASS_PERSONAL_ACCESS_TOKEN="$TOKEN" pass-cli login 2>/dev/null || true

echo "✅ Proton Pass agent token loaded for: $1"
echo "   Session: $PROTON_PASS_SESSION_DIR"
echo "   Key provider: $PROTON_PASS_KEY_PROVIDER (PASS_USE_KEYRING=1 for OS keyring)"

if pass_session_ready; then
  _pat_name="$(pass_session_pat_name)"
  echo "   Personal Access Token: ${_pat_name:-unknown}"
  unset _pat_name
else
  if ! pass-cli --version >/dev/null 2>&1; then
    echo "⚠️  pass-cli not executable here (often Killed:9 / exit 137)"
    echo "   Use Terminal.app for pass-cli, or: bun run vault:gap:mint-local"
  else
    echo "⚠️  Session not ready (pass-cli info --output json missing personal_access_token_name)"
    echo "   Recovery: pass-cli logout --force; rm -rf \"\$PROTON_PASS_SESSION_DIR\"; re-source this script"
    echo "   Docs: https://protonpass.github.io/pass-cli/help/troubleshoot/"
    echo "   Note: pass-cli test alone is connectivity — not session proof"
  fi
fi
unset _pass_project
