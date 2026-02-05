#!/bin/bash
# [BUN][SCRIPT][HELPER][META:SETUP][HUSKY][#REF:apply-hooks]
# Apply centralized hooks to all git projects in workspace

BUN_PLATFORM_HOME="${BUN_PLATFORM_HOME:-${HOME}/Projects}"
HOOKS_PATH="$BUN_PLATFORM_HOME/.husky"
COUNT=0

for PROJECT in "$BUN_PLATFORM_HOME"/*/; do
  if [ -d "$PROJECT/.git" ]; then
    git -C "$PROJECT" config core.hooksPath "$HOOKS_PATH"
    echo "🔗 $(basename "$PROJECT")"
    ((COUNT++))
  fi
done

echo ""
echo "✅ Hooks applied to $COUNT projects"
echo "   Path: $HOOKS_PATH"
