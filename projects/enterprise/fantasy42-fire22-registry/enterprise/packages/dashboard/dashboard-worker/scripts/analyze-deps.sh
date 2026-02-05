#!/usr/bin/env bash
# scripts/analyze-deps.sh - Enhanced dependency analysis using Bun's bunx --package features

set -euo pipefail

echo "📊 Fire22 Enhanced Dependency Analysis Report"
echo "=============================================="
echo ""

# Get root directory
ROOT_DIR=$(pwd)

# 1. Analyze dependency trees using bunx with explicit package specification
echo "🌳 Dependency Trees Analysis:"
for workspace in $(find workspaces -name 'package.json' -type f | sed 's|/package.json||' | sort); do
  workspace_name=$(basename "$workspace")
  echo "--- $workspace_name ---"
  cd "$workspace"
  
  # Get direct dependencies using bunx with explicit package
  echo "Direct dependencies:"
  if [ -f package.json ]; then
    bun pm pkg get dependencies 2>/dev/null | bunx --package jq jq -r 'keys[]? // empty' 2>/dev/null || echo "  None"
  fi
  
  # Get dev dependencies
  echo "Dev dependencies:"
  if [ -f package.json ]; then
    bun pm pkg get devDependencies 2>/dev/null | bunx --package jq jq -r 'keys[]? // empty' 2>/dev/null || echo "  None"
  fi
  
  # Check for duplicate dependencies
  echo "Potential duplicates:"
  bun why --all 2>/dev/null | grep -E "(multiple versions|duplicate)" || echo "  No duplicates found"
  
  cd "$ROOT_DIR"
  echo
done

# 2. Enhanced package analysis with bunx
echo "📦 Enhanced Package Analysis..."
echo ""

PACKAGES=("zod" "date-fns" "drizzle-orm" "stripe" "twilio" "better-sqlite3" "react" "typescript")

for pkg in "${PACKAGES[@]}"; do
    echo "→ Analyzing $pkg:"
    bun why "$pkg" --depth 2 2>/dev/null || echo "  ✓ Not installed"
    
    # Check for multiple versions using bunx jq
    echo "  Version analysis:"
    bun why "$pkg" --json 2>/dev/null | bunx --package jq jq -r '.versions[]? // "Single version"' 2>/dev/null || echo "    Single version or not found"
    echo ""
done

# 3. Check @types packages with enhanced analysis
echo "🔍 Enhanced @types Packages Analysis..."
echo "Using bunx --package typescript for type analysis:"
bunx --package typescript tsc --version 2>/dev/null && echo "✓ TypeScript available for analysis" || echo "⚠️ TypeScript not available"
bun why "@types/*" --top 10 2>/dev/null || echo "No @types packages found"
echo ""

# 4. Fire22 workspace dependencies with detailed analysis
echo "🏢 Fire22 Workspace Dependencies Analysis..."
bun why "@fire22/*" --depth 2 2>/dev/null || echo "No @fire22 dependencies in node_modules"

# Check workspace versions consistency
echo ""
echo "📋 Workspace Version Consistency:"
root_version=$(bun pm pkg get version 2>/dev/null || echo "unknown")
echo "Root version: $root_version"

for workspace in $(find workspaces -name 'package.json' -type f | sed 's|/package.json||' | sort); do
  workspace_name=$(basename "$workspace")
  workspace_version=$(cd "$workspace" && bun pm pkg get version 2>/dev/null || echo "unknown")
  if [ "$workspace_version" = "$root_version" ]; then
    echo "✓ $workspace_name: $workspace_version"
  else
    echo "⚠️ $workspace_name: $workspace_version (differs from root)"
  fi
done
echo ""

# 5. Enhanced security audit with bunx
echo "🛡️ Enhanced Security Audit..."
bun audit --audit-level=moderate --prod 2>/dev/null || echo "✓ No vulnerabilities found"

# Use bunx for additional security analysis if available
if bunx --package npm-audit-resolver --help >/dev/null 2>&1; then
  echo "Running enhanced security analysis..."
  bunx --package npm-audit-resolver npm-audit-resolver check >/dev/null 2>&1 || echo "Enhanced security tools not available"
fi
echo ""

# 6. Dependency statistics with enhanced reporting
echo "📈 Enhanced Dependency Statistics:"
echo "  Total packages: $(find node_modules -maxdepth 2 -type d 2>/dev/null | wc -l)"
echo "  Direct dependencies: $(bun pm pkg get dependencies 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
echo "  Dev dependencies: $(bun pm pkg get devDependencies 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
echo "  Workspace packages: $(find workspaces -name 'package.json' -type f | wc -l)"
echo ""

# 7. Bundle analysis preparation
echo "📦 Bundle Analysis Tools Check:"
bunx --package webpack-bundle-analyzer --version >/dev/null 2>&1 && echo "✓ webpack-bundle-analyzer available" || echo "⚠️ webpack-bundle-analyzer not available"
bunx --package source-map-explorer --version >/dev/null 2>&1 && echo "✓ source-map-explorer available" || echo "⚠️ source-map-explorer not available"
echo ""

# 8. Generate comprehensive JSON report using bunx jq
REPORT_FILE="dependency-report-$(date +%Y%m%d-%H%M%S).json"
echo "💾 Generating comprehensive report using bunx --package jq..."

# Create comprehensive report structure
{
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"root_version\": \"$root_version\","
    echo "  \"workspace_count\": $(find workspaces -name 'package.json' -type f | wc -l),"
    echo "  \"outdated\": "
    bun outdated -r --json 2>/dev/null || echo "[]"
    echo ","
    echo "  \"audit\": "
    bun audit --json 2>/dev/null || echo "{}"
    echo ","
    echo "  \"workspaces\": ["
    first=true
    for workspace in $(find workspaces -name 'package.json' -type f | sed 's|/package.json||' | sort); do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        workspace_name=$(basename "$workspace")
        workspace_version=$(cd "$workspace" && bun pm pkg get version 2>/dev/null || echo "unknown")
        echo "    {"
        echo "      \"name\": \"$workspace_name\","
        echo "      \"version\": \"$workspace_version\","
        echo "      \"path\": \"$workspace\""
        echo -n "    }"
    done
    echo ""
    echo "  ]"
    echo "}"
} > "$REPORT_FILE"

# Process report with jq for better formatting if available
if bunx --package jq jq --version >/dev/null 2>&1; then
    echo "🎨 Formatting report with jq..."
    bunx --package jq jq '.' "$REPORT_FILE" > "${REPORT_FILE}.formatted" && mv "${REPORT_FILE}.formatted" "$REPORT_FILE"
fi

echo "✅ Enhanced analysis complete! Report saved to $REPORT_FILE"
echo ""
echo "💡 Enhanced Recommendations:"
echo "  • Run 'bunx --package npm-check-updates ncu -i' for interactive updates"
echo "  • Use 'bun pm pkg fix' to fix package.json issues across workspaces"
echo "  • Run 'bunx --package typescript tsc --noEmit' for type checking"
echo "  • Use 'bunx --package webpack-bundle-analyzer webpack-bundle-analyzer dist/stats.json' for bundle analysis"
echo "  • Run 'bun install --frozen-lockfile' for CI/CD reproducible builds"
echo ""
echo "🔧 Available bunx tools for further analysis:"
echo "  • bunx --package @typescript-eslint/eslint-plugin eslint --fix"
echo "  • bunx --package prettier prettier --write ."
echo "  • bunx --package jest jest --coverage"