#!/bin/bash

# GitHub Repository Topics and Tags Setup Script
# Usage: ./setup-topics.sh

REPO_OWNER="brendadeeznuts1111"
REPO_NAME="foxy-duo-proxy"
REPO_FULL_NAME="$REPO_OWNER/$REPO_NAME"

# Primary Topics (Core functionality)
PRIMARY_TOPICS=(
    "proxy-management"
    "duoplus"
    "cloud-phone"
    "cashapp-scaling"
    "feature-flags"
    "react-typescript"
    "bun-runtime"
    "vite-build"
    "enhanced-templates"
    "unified-management"
    "ipfoxy-integration"
    "mobile-proxy"
    "phone-verification"
    "account-automation"
    "performance-monitoring"
)

# Additional Topics (Discoverability)
ADDITIONAL_TOPICS=(
    "proxy-server"
    "phone-proxy"
    "account-management"
    "scalability"
    "typescript"
    "react"
    "dashboard"
    "monitoring"
    "automation"
    "api-integration"
    "cloud-services"
    "mobile-development"
    "enterprise-tools"
    "developer-tools"
    "cashapp"
    "monorepo"
    "ci-cd"
    "testing"
    "security"
    "performance"
)

# Technology Topics
TECH_TOPICS=(
    "bun"
    "vite"
    "typescript"
    "react"
    "javascript"
    "css"
    "html"
    "nodejs"
    "npm"
    "eslint"
    "prettier"
    "jest"
    "vitest"
)

echo "🏷️ Setting up GitHub topics for $REPO_FULL_NAME"
echo "=================================================="

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

# Combine all topics
ALL_TOPICS=("${PRIMARY_TOPICS[@]}" "${ADDITIONAL_TOPICS[@]}" "${TECH_TOPICS[@]}")

# Convert array to comma-separated string
TOPICS_STRING=$(IFS=','; echo "${ALL_TOPICS[*]}")

echo "📋 Topics to add:"
echo "$TOPICS_STRING"
echo ""

# Add topics using GitHub CLI
echo "🚀 Adding topics to repository..."
gh repo edit "$REPO_FULL_NAME" --add-topic "$TOPICS_STRING"

if [ $? -eq 0 ]; then
    echo "✅ Topics added successfully!"
    echo ""
    echo "🎯 Total topics added: ${#ALL_TOPICS[@]}"
    echo ""
    echo "📊 Primary Topics (${#PRIMARY_TOPICS[@]}):"
    printf '  %s\n' "${PRIMARY_TOPICS[@]}"
    echo ""
    echo "🔍 Additional Topics (${#ADDITIONAL_TOPICS[@]}):"
    printf '  %s\n' "${ADDITIONAL_TOPICS[@]}"
    echo ""
    echo "⚙️ Technology Topics (${#TECH_TOPICS[@]}):"
    printf '  %s\n' "${TECH_TOPICS[@]}"
    echo ""
    echo "🌐 View your repository at: https://github.com/$REPO_FULL_NAME"
    echo "📈 Topics will help with discoverability in GitHub search!"
else
    echo "❌ Failed to add topics. Please check your permissions."
    exit 1
fi

echo ""
echo "💡 Pro tip: You can also add topics manually on GitHub:"
echo "   1. Go to https://github.com/$REPO_FULL_NAME"
echo "   2. Click 'Settings' tab"
echo "   3. Scroll down to 'Topics' section"
echo "   4. Click 'Add topics' and paste the topics above"
