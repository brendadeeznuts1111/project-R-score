#!/bin/bash
# Quick health check for developer environment
# Usage: ./health-check.sh

echo "🔍 Developer Environment Health Check"
echo "======================================"
echo ""

# Check Bun
echo "📦 Bun:"
if command -v bun &> /dev/null; then
  echo "   Version: $(bun --version)"
  echo "   ✅ Installed"
else
  echo "   ❌ Not installed"
fi
echo ""

# Check Node.js
echo "📦 Node.js:"
if command -v node &> /dev/null; then
  echo "   Version: $(node --version)"
  echo "   ✅ Installed"
else
  echo "   ❌ Not installed"
fi
echo ""

# Check Vault
echo "📁 Vault:"
if command -v bun-platform &> /dev/null; then
  VAULT_STATUS=$(bun-platform info --format json | jq -r '.vault.available')
  if [ "$VAULT_STATUS" = "true" ]; then
    echo "   ✅ Available"
    VAULT_PATH=$(bun-platform info --format json | jq -r '.vault.path')
    echo "   Path: $VAULT_PATH"
  else
    echo "   ❌ Not available"
  fi
else
  echo "   ⚠️  bun-platform not available"
fi
echo ""

# Check TMUX
echo "🖥️  TMUX Sessions:"
if command -v tmux &> /dev/null; then
  SESSION_COUNT=$(tmux list-sessions 2>/dev/null | wc -l | tr -d ' ')
  echo "   Active sessions: $SESSION_COUNT"
  if [ "$SESSION_COUNT" -gt 0 ]; then
    echo "   ✅ Running"
  else
    echo "   ⚠️  No active sessions"
  fi
else
  echo "   ❌ Not installed"
fi
echo ""

echo "✅ Health check complete"

