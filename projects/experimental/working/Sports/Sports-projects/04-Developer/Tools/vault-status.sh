#!/bin/bash
# Display vault status in tmux pane
# Usage: ./vault-status.sh [session-name] [window-index] [pane-index]

SESSION_NAME="${1:-0}"
WINDOW_INDEX="${2:-0}"
PANE_INDEX="${3:-0}"

# Get vault status
VAULT_STATUS=$(bun-platform info --format json | jq -r '.vault.available')

if [ "$VAULT_STATUS" = "true" ]; then
  STATUS_MSG="✅ Vault Available"
else
  STATUS_MSG="❌ Vault Not Available"
fi

# Send to tmux pane
tmux send-keys -t "${SESSION_NAME}:${WINDOW_INDEX}.${PANE_INDEX}" "echo '${STATUS_MSG}'" Enter

echo "Status sent to tmux session ${SESSION_NAME}, window ${WINDOW_INDEX}, pane ${PANE_INDEX}"
echo "${STATUS_MSG}"

