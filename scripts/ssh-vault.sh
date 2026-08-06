#!/usr/bin/env bash
# ssh-vault.sh — load SSH keys from Proton Pass into ssh-agent.
# Grounded in official Pass CLI SSH agent docs + troubleshoot:
#   https://protonpass.github.io/pass-cli/help/troubleshoot/
#   Verbs: start | load | debug | daemon (start|status|stop)
#   There is no `ssh-agent list` — use debug + ssh-add -L.
#
# Usage:
#   bash scripts/ssh-vault.sh doctor            # session + heal + debug + ssh-add -L
#   bash scripts/ssh-vault.sh heal              # restart daemon on session drift
#   bash scripts/ssh-vault.sh --debug doctor    # elevate PASS_LOG_LEVEL=debug
#   bash scripts/ssh-vault.sh debug
#   bash scripts/ssh-vault.sh load [--vault NAME]
#   bash scripts/ssh-vault.sh daemon | status | clear
#
# Default vault is factorywager (visible to factorywager-bot PAT).
# Personal vault needs interactive login or agent-work PAT:
#   PASS_SSH_VAULT=Personal bash scripts/ssh-vault.sh load
# Verbose Pass CLI logs:
#   PASS_LOG_LEVEL=debug bun run proton:ssh:doctor
#   bun run proton:ssh -- --debug doctor

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/pass-session.sh
. "$SCRIPT_DIR/lib/pass-session.sh"

# Optional leading --debug elevates official Pass CLI logs for this process.
while [ "${1:-}" = "--debug" ]; do
  export PASS_LOG_LEVEL=debug
  shift
done

# Resolved after session when possible (PAT → vault); PASS_SSH_VAULT wins.
VAULT="$(pass_ssh_vault_for_session)"

show_help() {
  echo "SSH Key Vault Manager (pass-cli)"
  echo ""
  echo "  doctor            Session + daemon heal + debug + ssh-add -L"
  echo "  heal              Restart daemon when logs show No active session"
  echo "  debug             pass-cli ssh-agent debug"
  echo "  load [--vault]    pass-cli ssh-agent load"
  echo "  daemon            pass-cli ssh-agent daemon start"
  echo "  status            pass-cli ssh-agent daemon status"
  echo "  clear             ssh-add -D"
  echo "  help              This message"
  echo ""
  echo "Flags: --debug (sets PASS_LOG_LEVEL=debug for this run)"
  echo "Default vault: PAT-aware (factorywager-bot → factorywager). Override PASS_SSH_VAULT=Personal for full-account."
  echo "Troubleshoot: https://protonpass.github.io/pass-cli/help/troubleshoot/"
}

ensure_agent_session() {
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/agent-env.sh" factorywager 2>/dev/null || true
  VAULT="$(pass_ssh_vault_for_session)"
}

debug_keys() {
  ensure_agent_session
  echo "  📋 SSH key debug — pass-cli vault: $VAULT · PASS_LOG_LEVEL=$(pass_cli_log_level)"
  pass_cli ssh-agent debug --vault-name "$VAULT"
}

load_keys() {
  ensure_agent_session
  local vault="$VAULT"
  if [ "${1:-}" = "--vault" ] && [ -n "${2:-}" ]; then
    vault="$2"
  fi
  pass_ssh_export_sock || true
  if pass_ssh_daemon_needs_heal; then
    pass_ssh_daemon_heal
  fi
  echo "  🔑 Loading SSH keys from vault '$vault'..."
  pass_cli ssh-agent load --vault-name "$vault"
  pass_ssh_export_sock || true
  echo "    ✅ Keys loaded · SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-unset}"
}

start_daemon() {
  ensure_agent_session
  echo "  🔑 Starting pass-cli SSH agent daemon..."
  pass_cli ssh-agent daemon start
  pass_ssh_export_sock || true
}

daemon_status() {
  pass_cli ssh-agent daemon status
}

heal_daemon() {
  ensure_agent_session
  if ! pass_session_ready; then
    echo "❌ session not ready — source scripts/agent-env.sh factorywager" >&2
    return 1
  fi
  pass_ssh_daemon_heal
  pass_cli ssh-agent daemon status 2>&1 | head -20
}

clear_keys() {
  pass_ssh_export_sock || true
  echo "  🧹 Removing vault keys from ssh-agent..."
  ssh-add -D 2>/dev/null || true
  echo "    ✅ Cleared"
}

doctor() {
  local rc=0
  local debug_vault="$VAULT"
  echo "== proton ssh doctor =="
  echo "Docs: https://protonpass.github.io/pass-cli/help/troubleshoot/"
  echo "Preferred vault: $VAULT"
  echo "PASS_LOG_LEVEL=$(pass_cli_log_level) (override: --debug or PASS_LOG_LEVEL=debug)"
  echo ""

  if ! command -v pass-cli >/dev/null 2>&1; then
    echo "❌ pass-cli not on PATH"
    return 1
  fi
  echo "✓ pass-cli: $(pass_cli --version 2>/dev/null | head -1 || echo present)"

  ensure_agent_session

  if pass_session_ready; then
    echo "✓ session: PAT=$(pass_session_pat_name) (info --output json)"
    echo "  visible vaults: $(pass_vault_list_names | tr '\n' ' ')"
  else
    echo "❌ session not ready — source scripts/agent-env.sh factorywager"
    echo "   (pass-cli test alone is not enough)"
    rc=1
  fi

  echo ""
  echo "-- ssh-agent daemon --"
  if pass_ssh_daemon_needs_heal; then
    echo "⚠️  daemon log shows 'No active session' — healing"
    pass_ssh_daemon_heal || rc=1
  fi
  pass_cli ssh-agent daemon status 2>&1 || echo "(daemon not running — ok if using load/start)"
  pass_ssh_export_sock && echo "→ SSH_AUTH_SOCK=$SSH_AUTH_SOCK" || true

  echo ""
  echo "-- ssh-agent debug --"
  if pass_cli ssh-agent debug --vault-name "$debug_vault" 2>&1; then
    echo "✓ debug ok for vault '$debug_vault'"
  elif [ "$debug_vault" != "factorywager" ]; then
    echo "⚠️  vault '$debug_vault' not visible — falling back to factorywager"
    debug_vault="factorywager"
    if pass_cli ssh-agent debug --vault-name "$debug_vault" 2>&1; then
      echo "✓ debug ok for vault '$debug_vault'"
    else
      echo "⚠️  debug failed for vault '$debug_vault'"
      rc=1
    fi
  else
    echo "⚠️  debug failed for vault '$debug_vault'"
    rc=1
  fi

  echo ""
  echo "-- load + ssh-add -L --"
  if pass_session_ready; then
    pass_cli ssh-agent load --vault-name "$debug_vault" 2>&1 | tail -3 || true
  fi
  pass_ssh_export_sock || true
  if [ -z "${SSH_AUTH_SOCK:-}" ]; then
    echo "⚠️  SSH_AUTH_SOCK unset"
    rc=1
  elif ssh-add -L 2>/dev/null | head -20; then
    echo "✓ identities listed above"
  else
    echo "⚠️  no identities after load"
    rc=1
  fi

  echo ""
  if [ "$rc" -eq 0 ]; then
    echo "✅ ssh doctor OK (vault=$debug_vault)"
  else
    echo "❌ ssh doctor found issues"
  fi
  return "$rc"
}

case "${1:-help}" in
  doctor) doctor ;;
  heal) heal_daemon ;;
  list|debug) debug_keys ;;
  load) load_keys "${2:-}" "${3:-}" ;;
  daemon) start_daemon ;;
  status) daemon_status ;;
  clear) clear_keys ;;
  help|--help|-h) show_help ;;
  *) echo "Unknown: $1"; show_help; exit 1 ;;
esac
