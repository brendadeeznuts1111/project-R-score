#!/bin/bash

# Foxy Proxy Build Script
# This script builds the Foxy Proxy dashboard for production

set -e

echo "🏗️  Building Foxy Proxy for production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the root directory"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd packages/dashboard
rm -rf dist

# Run type check
echo "🔍 Running type check..."
bun run typecheck

# Run lint
echo "🔍 Running lint..."
bun run lint

# Run tests
echo "🧪 Running tests..."
bun test

# Build the application
echo "🏗️  Building application..."
bun build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build completed successfully!"
    echo "📦 Build artifacts are in packages/dashboard/dist"
    
    # Show build size
    if command -v du &> /dev/null; then
        echo "📊 Build size:"
        du -sh dist
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

# Go back to root
cd ../..

echo ""
echo "🎉 Build complete! 🎉"
echo ""
echo "📦 To deploy the build:"
echo "   - The build files are in packages/dashboard/dist"
echo "   - You can deploy to any static hosting service"
echo "   - For Vercel/Netlify, just connect your repository"
echo ""
echo "🚀 To test the build locally:"
echo "   cd packages/dashboard"
echo "   bun preview"
