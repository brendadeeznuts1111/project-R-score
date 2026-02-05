#!/bin/bash
# scripts/dev-tools.sh
# Development tools using bunx for Tier-1380 project

set -euo pipefail

echo "🔧 Tier-1380 Development Tools (powered by bunx)"
echo "=============================================="

# Function to run a command with a header
run_tool() {
    echo -e "\n📌 $1"
    echo "----------------------------------------------"
    shift
    "$@"
}

# 1. Type checking without local typescript installation
run_tool "Type Checking" bunx -p typescript tsc --noEmit --project tsconfig.json | head -10

# 2. Security audit
run_tool "Security Audit" bun audit

# 3. Bundle size analysis
if [ -f "dist/dashboard/index.js" ]; then
    run_tool "Bundle Size Analysis" bunx -p bundlesize bundlesize -f dist/dashboard/index.js -s 200Kb
else
    echo -e "\n📌 Bundle Size Analysis"
    echo "----------------------------------------------"
    echo "No bundle found. Run 'bun run scripts/build-dashboard.ts' first."
fi

# 4. Format check (without installing prettier)
if command -v prettier &> /dev/null || bunx prettier --version &> /dev/null; then
    run_tool "Format Check" bunx prettier --check src/**/*.ts --ignore-path .gitignore
else
    echo -e "\n📌 Format Check"
    echo "----------------------------------------------"
    echo "Prettier not available via bunx"
fi

# 5. Dependency tree analysis
run_tool "Dependency Tree" bunx -p npm-check-updates ncu --depth 0

# 6. Environment variable validation
run_tool "PUBLIC_ Env Check" env | grep "^PUBLIC_" | wc -l | xargs -I {} echo "Found {} PUBLIC_ environment variables"

# 7. Patch status check
run_tool "Patch Status" bun pm patch --list 2>/dev/null || echo "No patches applied"

echo -e "\n✅ Dev tools check complete!"
echo "💡 All tools run via bunx - no local installation required!"
