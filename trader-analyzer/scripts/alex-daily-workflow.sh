#!/bin/bash
# Alex's Daily Workflow (Layer 4 & 3)
# Team Lead: Sports Correlation Team
# Packages: @graph/layer4, @graph/layer3
# Maintainers: Jordan Lee (layer4), Priya Patel (layer3)
# Reviewers: Alex Chen, Mike Rodriguez

set -e

echo "🚀 Alex's Daily Workflow - Sports Correlation Team"
echo "=================================================="
echo "Team Lead: Alex Chen"
echo "Packages: @graph/layer4, @graph/layer3"
echo "Reviewers: Alex Chen, Mike Rodriguez"
echo ""

# 1. Pull latest changes
echo ""
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Start development
echo ""
echo "💻 Starting development environment..."
cd packages/@graph/layer4
bun run dev &
DEV_PID=$!

# Wait a moment for dev server to start
sleep 2

# 3. Run benchmarks (iterates threshold property)
echo ""
echo "📊 Running benchmarks..."
bun run bench

# 4. Review benchmark results
echo ""
echo "📈 Review benchmark results at:"
echo "   https://npm.internal.yourcompany.com/packages/@graph/layer4/benchmarks"
echo ""
read -p "Press Enter to continue after reviewing benchmarks..."

# 5. If improvement, bump version
echo ""
echo "🔢 Bumping version..."
bun version patch  # 1.4.0-beta.3 → 1.4.0-beta.4

# 6. Publish to private registry
echo ""
echo "📦 Publishing to private registry..."
bun run scripts/team-publish.ts @graph/layer4 --tag=beta

# 7. Team notification (if SLACK_WEBHOOK_URL is set)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo ""
    echo "📢 Sending team notification..."
    NEW_VERSION=$(node -p "require('./package.json').version")
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"@alex published @graph/layer4@${NEW_VERSION}\"}"
fi

# Cleanup
kill $DEV_PID 2>/dev/null || true

echo ""
echo "✅ Daily workflow complete!"
