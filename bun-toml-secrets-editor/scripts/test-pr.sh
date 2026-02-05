#!/bin/bash
# scripts/test-pr.sh - Test RSS Optimizer against specific Bun PRs
# Usage: ./scripts/test-pr.sh <pr-number>
# Note: Requires GITHUB_TOKEN environment variable for private PRs

set -e

PR_NUMBER=${1:-"14953"}
TEST_FILE=${2:-"test/performance-optimizations.test.ts"}

echo "🔬 Testing RSS Optimizer against Bun PR #${PR_NUMBER}"
echo ""

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  Warning: GITHUB_TOKEN not set. Public PRs should still work."
    echo "   For private PRs, set: export GITHUB_TOKEN=your_token"
    echo ""
fi

# Install bun-pr if not available
if ! command -v bun-pr &> /dev/null; then
    echo "📦 Installing bun-pr..."
    bun add -g bun-pr
fi

# Install the PR build
echo "⬇️  Installing PR #${PR_NUMBER} build..."
if ! bunx bun-pr "${PR_NUMBER}" 2>&1; then
    echo ""
    echo "❌ Failed to install PR #${PR_NUMBER}"
    echo ""
    echo "This could be due to:"
    echo "  1. PR doesn't have a binary artifact built yet"
    echo "  2. GitHub API rate limit (try setting GITHUB_TOKEN)"
    echo "  3. PR number doesn't exist"
    echo ""
    echo "Alternative: Test with current Bun version"
    echo "  bun test ${TEST_FILE}"
    exit 1
fi

# Test with the PR build
echo ""
echo "🧪 Running tests with PR build..."
if command -v bun-${PR_NUMBER} &> /dev/null; then
    bun-${PR_NUMBER} test "${TEST_FILE}"
else
    echo "⚠️  PR build not found in PATH, attempting direct path..."
    ~/.bun/bin/bun-${PR_NUMBER} test "${TEST_FILE}"
fi

echo ""
echo "✅ PR testing complete!"
echo ""
echo "Additional commands you can run:"
echo "  bun-${PR_NUMBER} run profile:basic"
echo "  bun-${PR_NUMBER} --cpu-prof-md run src/server.ts"
echo "  bun-${PR_NUMBER} run test:all"
