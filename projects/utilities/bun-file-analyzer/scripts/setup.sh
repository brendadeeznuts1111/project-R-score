#!/bin/bash

# Setup development environment
echo "🚀 Setting up development environment..."

# Install dependencies
bun install

# Create necessary directories
mkdir -p public/{dev,prod,development,staging,production}
mkdir -p dist/api
mkdir -p logs

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Setup completed!"
echo "🎯 Run 'bun run dev' to start development"
