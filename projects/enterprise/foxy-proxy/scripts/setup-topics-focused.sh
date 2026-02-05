#!/bin/bash

# GitHub Repository Topics and Tags Setup Script (20 topics max)
# Usage: ./setup-topics-focused.sh

REPO_OWNER="brendadeeznuts1111"
REPO_NAME="foxy-duo-proxy"
REPO_FULL_NAME="$REPO_OWNER/$REPO_NAME"

# Focused Topics (20 max - prioritized for discoverability)
FOCUSED_TOPICS=(
    "proxy-management"      # Core functionality
    "duoplus"              # Unique feature
    "cloud-phone"          # Key technology
    "cashapp-scaling"      # Specific use case
    "feature-flags"        # Advanced feature
    "react-typescript"     # Tech stack
    "bun-runtime"          # Runtime
    "vite-build"           # Build tool
    "enhanced-templates"   # Feature highlight
    "unified-management"   # Architecture
    "ipfoxy-integration"   # Integration
    "mobile-proxy"         # Technology
    "phone-verification"   # Feature
    "account-automation"   # Use case
    "performance-monitoring" # Feature
    "monorepo"             # Architecture
    "typescript"           # Language
    "react"                # Framework
    "dashboard"            # UI type
    "api-integration"      # Integration pattern
)

echo "🏷️ Setting up GitHub topics for $REPO_FULL_NAME (20 topics max)"
echo "================================================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated."
    echo "Please run: gh auth login"
    exit 1
fi

# Convert array to comma-separated string
TOPICS_STRING=$(IFS=','; echo "${FOCUSED_TOPICS[*]}")

echo "📋 Focused topics to add (20 total):"
echo "$TOPICS_STRING"
echo ""

echo "🎯 Topic Categories:"
echo "  Core Features: proxy-management, duoplus, cloud-phone, enhanced-templates"
echo "  Use Cases: cashapp-scaling, account-automation, phone-verification"
echo "  Technology: react-typescript, bun-runtime, vite-build, typescript, react"
echo "  Architecture: unified-management, monorepo, dashboard, api-integration"
echo "  Integration: ipfoxy-integration, mobile-proxy, performance-monitoring"
echo ""

# Add topics using GitHub CLI
echo "🚀 Adding topics to repository..."
gh repo edit "$REPO_FULL_NAME" --add-topic "$TOPICS_STRING"

if [ $? -eq 0 ]; then
    echo "✅ Topics added successfully!"
    echo ""
    echo "🌐 View your repository at: https://github.com/$REPO_FULL_NAME"
    echo "📈 Topics will help with discoverability in GitHub search!"
    echo ""
    echo "🔍 Search examples that will find your repo:"
    echo "  • proxy-management"
    echo "  • duoplus cloud-phone"
    echo "  • cashapp-scaling"
    echo "  • react-typescript dashboard"
    echo "  • bun-runtime monorepo"
else
    echo "❌ Failed to add topics. Please check your permissions."
    echo ""
    echo "💡 Manual alternative:"
    echo "   1. Go to https://github.com/$REPO_FULL_NAME"
    echo "   2. Click 'Settings' tab"
    echo "   3. Scroll down to 'Topics' section"
    echo "   4. Add these topics:"
    printf '     %s\n' "${FOCUSED_TOPICS[@]}"
    exit 1
fi
