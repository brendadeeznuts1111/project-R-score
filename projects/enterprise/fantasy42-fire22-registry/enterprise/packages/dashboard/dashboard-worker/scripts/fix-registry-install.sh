#!/bin/bash

# Fix registry configuration for all workspaces
# Ensures all workspaces use the standard NPM registry

echo "🔧 Fixing registry configuration for all workspaces..."

# Export the correct registry
export BUN_CONFIG_REGISTRY="https://registry.npmjs.org/"

# List of workspaces
workspaces=(
    "@fire22-pattern-system"
    "@fire22-api-client"
    "@fire22-core-dashboard"
    "@fire22-sports-betting"
    "@fire22-telegram-integration"
    "@fire22-build-system"
)

# Fix and install each workspace
for workspace in "${workspaces[@]}"; do
    echo ""
    echo "📦 Processing $workspace..."
    
    cd "$HOME/ff/dashboard-worker/workspaces/$workspace" 2>/dev/null || {
        echo "⚠️  Workspace $workspace not found, skipping..."
        continue
    }
    
    # Clear any existing lockfile
    rm -f bun.lockb 2>/dev/null
    
    # Install with isolated strategy and correct registry
    echo "  Installing dependencies with isolated strategy..."
    BUN_CONFIG_REGISTRY="https://registry.npmjs.org/" bun install --linker isolated
    
    if [ $? -eq 0 ]; then
        echo "  ✅ $workspace installed successfully"
    else
        echo "  ❌ Failed to install $workspace"
    fi
done

echo ""
echo "🎉 Registry fix completed for all workspaces!"
echo ""
echo "💡 To verify installations:"
echo "   bun workspaces/orchestration.ts test:all"