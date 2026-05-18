#!/bin/bash

# Crystal Clear Architecture - Release Creation Script
# This script helps create and publish the first stable release

set -e

echo "🚀 Crystal Clear Architecture - Release Creator"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "CHANGELOG.md" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Get version from package.json
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "❌ Error: Could not find version in package.json"
    exit 1
fi

echo "📦 Current version: $VERSION"
echo ""

# Check if git tag exists
if git tag -l "v$VERSION" | grep -q "v$VERSION"; then
    echo "⚠️  Tag v$VERSION already exists!"
    echo "   To create a new release, update the version in package.json first"
    echo ""
    echo "   Current options:"
    echo "   1. Update version in package.json and run this script again"
    echo "   2. Delete the existing tag: git tag -d v$VERSION && git push origin :refs/tags/v$VERSION"
    echo "   3. Use a different version number"
    exit 1
fi

echo "✅ Ready to create release v$VERSION"
echo ""

# Confirm before proceeding
read -p "🤔 Do you want to create the release v$VERSION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release creation cancelled"
    exit 1
fi

echo ""
echo "🔨 Creating release v$VERSION..."

# Create git tag
echo "🏷️  Creating git tag..."
git tag -a "v$VERSION" -m "Release v$VERSION

## What's New

This is the first stable release of Crystal Clear Architecture!

### ✨ Key Features
- Enterprise-grade domain-driven architecture
- 25+ comprehensive health check endpoints
- Real-time analytics dashboard
- Multi-channel communication (Telegram, WebSocket, API)
- Advanced caching and performance optimization
- Complete TypeScript implementation
- Bun runtime integration

### 📚 Documentation
- Comprehensive API documentation
- Architecture guides and best practices
- Integration examples for Docker, Kubernetes
- Contributing guidelines and community resources

### 🛠️ Developer Experience
- GitHub Discussions for community support
- Issue templates for bug reports and features
- Automated CI/CD workflows
- Comprehensive testing suite

For more details, see CHANGELOG.md"

# Push tag to remote
echo "📤 Pushing tag to remote..."
git push origin "v$VERSION"

echo ""
echo "🎉 Release v$VERSION created successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to: https://github.com/brendadeeznuts1111/crystal-clear-architecture/releases"
echo "2. Click 'Draft a new release'"
echo "3. Select tag: v$VERSION"
echo "4. Title: Release v$VERSION"
echo "5. Copy release notes from CHANGELOG.md"
echo "6. Publish the release!"
echo ""
echo "🔗 Direct link: https://github.com/brendadeeznuts1111/crystal-clear-architecture/releases/new?tag=v$VERSION"
echo ""
echo "💡 Tip: You can also use the GitHub CLI:"
echo "   gh release create v$VERSION --generate-notes --latest"
echo ""
echo "🎊 Congratulations on your first stable release!"
