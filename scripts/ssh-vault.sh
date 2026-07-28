#!/usr/bin/env bash
# ssh-vault.sh — load SSH keys from Proton Pass into ssh-agent.
# Usage:
#   bash scripts/ssh-vault.sh                    # list available SSH keys in vault
#   bash scripts/ssh-vault.sh load               # load all vault SSH keys into agent
#   bash scripts/ssh-vault.sh load cascade       # load specific key by name
#   bash scripts/ssh-vault.sh clear              # remove all vault keys from agent
#
# Requires: pass-cli login (authenticated session)
# Depends on: SSH_KEYS array defined below matching env.template entries.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── SSH key definitions (match env.template pass:// refs) ────────────────
# Format: "vault_name|key_name|filename"
SSH_KEYS=(
  "factorywager|SSH Deploy Key|id_deploy"
  "factorywager|SSH Cascade Key|id_cascade"
)

# ── Help ──────────────────────────────────────────────────────────────────
show_help() {
  echo "SSH Key Vault Manager"
  echo ""
  echo "  list        List SSH keys available in vault"
  echo "  load [name] Load SSH key(s) into ssh-agent ('cascade' = specific key)"
  echo "  clear       Remove all vault keys from ssh-agent"
  echo "  help        This message"
}

# ── List available keys ───────────────────────────────────────────────────
list_keys() {
  echo "  📋 Available SSH keys in vault:"
  for entry in "${SSH_KEYS[@]}"; do
    IFS='|' read -r vault name filename <<< "$entry"
    local ref="$vault/$name/note"
    echo "    - $name (pass://$ref) → ~/.ssh/$filename"
  done
}

# ── Load key into agent ───────────────────────────────────────────────────
load_key() {
  local filter="$1"
  for entry in "${SSH_KEYS[@]}"; do
    IFS='|' read -r vault name filename <<< "$entry"
    if [ -n "$filter" ] && ! echo "$name" | grep -qi "$filter"; then
      continue
    fi

    local ref="$vault/$name/note"
    local key_path="$HOME/.ssh/$filename"

    echo "  🔑 Loading $name..."
    # Decrypt key from vault
    if ! pass-cli view "pass://$ref" 2>/dev/null | head -n 1 > "$key_path.tmp"; then
      echo "    ⚠️  Could not retrieve $ref from vault (session expired?)"
      continue
    fi

    chmod 600 "$key_path.tmp"

    # Add to ssh-agent
    if ssh-add "$key_path.tmp" 2>/dev/null; then
      echo "    ✅ Added to ssh-agent"
      # Move to final location (only after successful add)
      mv "$key_path.tmp" "$key_path"
    else
      echo "    ⚠️  ssh-agent add failed (agent running? key format wrong?)"
      rm -f "$key_path.tmp"
    fi
  done
}

# ── Clear keys from agent ─────────────────────────────────────────────────
clear_keys() {
  for entry in "${SSH_KEYS[@]}"; do
    IFS='|' read -r vault name filename <<< "$entry"
    local key_path="$HOME/.ssh/$filename"
    if [ -f "$key_path" ]; then
      ssh-add -d "$key_path" 2>/dev/null || true
      rm -f "$key_path"
      echo "  🧹 Removed $name"
    fi
  done
}

# ── Main ──────────────────────────────────────────────────────────────────
case "${1:-help}" in
  list)
    list_keys
    ;;
  load)
    load_key "${2:-}"
    ;;
  clear)
    clear_keys
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
