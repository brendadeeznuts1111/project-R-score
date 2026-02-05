#!/bin/bash
# Script to create timezone-awareness feature branch and prepare PR
# Usage: ./scripts/create-timezone-pr.sh

set -e

BRANCH_NAME="feat/timezone-awareness"
BASE_BRANCH="main"  # or "develop" depending on your workflow

echo "🚀 Creating timezone-awareness feature branch and PR..."

# Check if we're on a clean working directory
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "   Stashing changes..."
    git stash push -m "Stash before creating timezone branch"
    STASHED=true
else
    STASHED=false
fi

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch origin

# Create and checkout new branch
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" origin/"$BASE_BRANCH" 2>/dev/null || git checkout -b "$BRANCH_NAME"

# List of files to add for timezone feature
TIMEZONE_FILES=(
    "src/core/timezone.ts"
    "src/logging/log-codes.ts"
    "config/.tmux.conf"
    "src/arbitrage/shadow-graph/multi-layer-correlation-graph.ts"
    "scripts/migrations/timezone-schema.sql"
    "docs/operators/timezone-guide.md"
    "docs/TIMEZONE-IMPLEMENTATION-SUMMARY.md"
    "test/core/timezone.test.ts"
    "src/api/docs.ts"
    ".github/pull_request_template_timezone.md"
)

echo "📝 Checking which timezone files exist..."
EXISTING_FILES=()
for file in "${TIMEZONE_FILES[@]}"; do
    if [ -f "$file" ]; then
        EXISTING_FILES+=("$file")
        echo "  ✅ $file"
    else
        echo "  ⚠️  $file (not found)"
    fi
done

if [ ${#EXISTING_FILES[@]} -eq 0 ]; then
    echo "❌ No timezone files found. Make sure you've created the files first."
    exit 1
fi

# Stage timezone-related files
echo "📦 Staging timezone files..."
git add "${EXISTING_FILES[@]}"

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "feat: Add timezone configuration for DoD compliance

- Add TimezoneService with DST transition support
- Add HBTS log codes for timezone events
- Update MultiLayerGraph with timezone awareness
- Add database migration for timezone columns
- Update tmux config with timezone status bar
- Add operator documentation and tests
- Update OpenAPI spec with timezone details

Regulatory compliance: Nevada Gaming Commission, UKGC, MGA
Status: REQUIRED FOR PRODUCTION

[DoD][APPROVAL:REQUIRED][RISK:HIGH][COMPLIANCE:BLOCKING]"

echo "✅ Branch created and committed!"
echo ""
echo "📤 Next steps:"
echo "   1. Push branch: git push -u origin $BRANCH_NAME"
echo "   2. Create PR using GitHub CLI: gh pr create --title 'Timezone Configuration for HyperBun MLGS' --body-file .github/pull_request_template_timezone.md"
echo "   3. Or create PR manually on GitHub"
echo ""
echo "🔍 Review changes:"
echo "   git diff origin/$BASE_BRANCH..$BRANCH_NAME"

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo ""
    echo "📦 Restoring stashed changes..."
    git stash pop
fi
