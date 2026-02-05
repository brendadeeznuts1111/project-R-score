#!/bin/bash
# [BUN][SCRIPT][HELPER][META:SETUP][HUSKY][#REF:apply-hooks]
# Apply centralized hooks to all git projects in workspace

HOOKS_PATH="/Users/nolarose/Projects/.husky"
COUNT=0

for PROJECT in /Users/nolarose/Projects/*/; do
  if [ -d "$PROJECT/.git" ]; then
    git -C "$PROJECT" config core.hooksPath "$HOOKS_PATH"
    echo "🔗 $(basename "$PROJECT")"
    ((COUNT++))
  fi
done

echo ""
echo "✅ Hooks applied to $COUNT projects"
echo "   Path: $HOOKS_PATH"
