#!/bin/bash

# Foxy Proxy Development Setup Script
# This script sets up the development environment for the Foxy Proxy project

set -e

echo "🦊 Setting up Foxy Proxy development environment..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js is installed (version $(node -v))"

# Install root dependencies
echo "📦 Installing root dependencies..."
bun install

# Install dashboard dependencies
echo "📦 Installing dashboard dependencies..."
cd packages/dashboard
bun install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration"
fi

# Go back to root
cd ../..

# Run type check to ensure everything is working
echo "🔍 Running type check..."
cd packages/dashboard
bun run typecheck

# Run lint check
echo "🔍 Running lint check..."
bun run lint

# Go back to root
cd ../..

echo ""
echo "🎉 Setup complete! 🎉"
echo ""
echo "📚 Next steps:"
echo "   1. Update packages/dashboard/.env with your configuration"
echo "   2. Run 'bun dev' to start the development server"
echo "   3. Visit http://localhost:5173 to view the application"
echo ""
echo "🛠️  Available commands:"
echo "   bun dev          - Start development server"
echo "   bun build        - Build for production"
echo "   bun test         - Run tests"
echo "   bun lint         - Run linting"
echo "   bun typecheck    - Run TypeScript checks"
echo ""
echo "📖 For more information, see README.md"
