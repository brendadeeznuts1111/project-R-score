#!/usr/bin/env bash
# ssh-vault.sh — load SSH keys from Proton Pass into ssh-agent.
# Uses the official pass-cli ssh-agent command (v2.2.3+).
#
# Usage:
#   bash scripts/ssh-vault.sh                    # list available SSH keys
#   bash scripts/ssh-vault.sh load               # load SSH keys from vault (official API)
#   bash scripts/ssh-vault.sh load --vault <name> # load from specific vault
#   bash scripts/ssh-vault.sh daemon             # start SSH agent daemon
#   bash scripts/ssh-vault.sh clear              # remove vault keys from agent
#
# Grounded in: pass-cli ssh-agent load (Proton Pass CLI v2.2.3)
# See: https://github.com/protonpass/pass-cli/blob/main/CHANGELOG.md

set -euo pipefail
VAULT="${FACTORYWAGER_VAULT:-factorywager}"

show_help() {
  echo "SSH Key Vault Manager (pass-cli v2.2.3+)"
  echo ""
  echo "  list              List SSH keys available in vault"
  echo "  load [--vault]    Load SSH keys via pass-cli ssh-agent load"
  echo "  daemon            Start pass-cli SSH agent daemon"
  echo "  clear             Remove vault keys from agent (ssh-add -D)"
  echo "  help              This message"
}

list_keys() {
  echo "  📋 SSH keys — pass-cli vault: $VAULT"
  pass-cli item list --vault-name "$VAULT" 2>/dev/null | grep -i ssh || echo "    (no SSH keys found)"
}

load_keys() {
  local vault="$VAULT"
  if [ "${1:-}" = "--vault" ] && [ -n "${2:-}" ]; then
    vault="$2"
  fi
  echo "  🔑 Loading SSH keys from vault '$vault'..."
  pass-cli ssh-agent load --vault-name "$vault"
  echo "    ✅ Keys loaded"
}

start_daemon() {
  echo "  🔑 Starting pass-cli SSH agent daemon..."
  pass-cli ssh-agent daemon
}

clear_keys() {
  echo "  🧹 Removing vault keys from ssh-agent..."
  ssh-add -D 2>/dev/null || true
  echo "    ✅ Cleared"
}

case "${1:-help}" in
  list) list_keys ;;
  load) load_keys "${2:-}" "${3:-}" ;;
  daemon) start_daemon ;;
  clear) clear_keys ;;
  help|--help|-h) show_help ;;
  *) echo "Unknown: $1"; show_help; exit 1 ;;
esac
