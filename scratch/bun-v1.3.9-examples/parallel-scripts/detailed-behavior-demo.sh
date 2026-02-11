#!/usr/bin/env bash
# Detailed behavior demonstration for bun run --parallel and --sequential
# Shows package name prefixes, error handling, and pre/post script grouping

set -e

echo "🔍 Bun v1.3.9: Detailed Behavior Demonstration"
echo "=============================================="
echo ""

cd "$(dirname "$0")"

# Example 1: Package name prefixes with workspaces
echo "📦 Example 1: Package Name Prefixes"
echo "When using --filter or --workspaces, labels include the package name:"
echo "Command: bun run --parallel --filter '*' build"
echo "---"
cd workspace-demo
bun run --parallel --filter '*' build 2>&1 | head -20
echo ""
echo "Notice: Each line is prefixed with 'package-name:script-name'"
echo ""

# Example 2: Parallel vs Sequential behavior
echo "📦 Example 2: Parallel vs Sequential Execution"
echo ""
echo "PARALLEL (--parallel):"
echo "  • Starts all scripts immediately"
echo "  • Output is interleaved"
echo "  • Scripts run concurrently"
echo ""
echo "Command: bun run --parallel build test lint"
cd ..
bun run --parallel build test lint 2>&1 | head -15
echo ""
echo ""

echo "SEQUENTIAL (--sequential):"
echo "  • Runs scripts one at a time in order"
echo "  • Output is sequential (one script completes before next starts)"
echo "  • Scripts run one after another"
echo ""
echo "Command: bun run --sequential build test lint"
bun run --sequential build test lint 2>&1 | head -15
echo ""
echo ""

# Example 3: Error handling
echo "📦 Example 3: Error Handling"
echo ""
echo "DEFAULT BEHAVIOR:"
echo "  • A failure in any script kills all remaining scripts"
echo ""
echo "Creating a failing script for demonstration..."
cat > fail-test.sh << 'EOF'
#!/usr/bin/env bash
echo "This script will fail"
exit 1
EOF
chmod +x fail-test.sh

# Update package.json temporarily to include a failing script
cp package.json package.json.backup
cat > package.json << 'EOF'
{
  "name": "parallel-scripts-demo",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Building...' && sleep 0.5 && echo 'Build complete'",
    "test": "echo 'Running tests...' && sleep 0.5 && echo 'Tests passed'",
    "fail": "./fail-test.sh",
    "lint": "echo 'Linting...' && sleep 0.5 && echo 'Lint complete'"
  }
}
EOF

echo "Command: bun run --parallel build fail lint"
echo "(Note: 'fail' script will fail, stopping 'lint' from running)"
bun run --parallel build fail lint 2>&1 || true
echo ""
echo ""

echo "WITH --no-exit-on-error:"
echo "  • Continue running even if one script fails"
echo "  • All scripts get a chance to finish"
echo ""
echo "Command: bun run --parallel --no-exit-on-error build fail lint"
bun run --parallel --no-exit-on-error build fail lint 2>&1 || true
echo ""
echo ""

# Restore package.json
mv package.json.backup package.json
rm -f fail-test.sh

# Example 4: Pre/post script grouping
echo "📦 Example 4: Pre/Post Script Grouping"
echo ""
echo "Pre/post scripts (prebuild/postbuild) are automatically grouped"
echo "with their main script and run in correct dependency order."
echo ""

# Create a package.json with pre/post scripts
cat > package.json << 'EOF'
{
  "name": "parallel-scripts-demo",
  "version": "1.0.0",
  "scripts": {
    "prebuild": "echo '[prebuild] Preparing...'",
    "build": "echo '[build] Building...' && sleep 0.5",
    "postbuild": "echo '[postbuild] Cleaning up...'",
    "pretest": "echo '[pretest] Setting up tests...'",
    "test": "echo '[test] Running tests...' && sleep 0.5",
    "posttest": "echo '[posttest] Test cleanup...'"
  }
}
EOF

echo "Command: bun run --parallel build test"
echo "Notice: prebuild → build → postbuild runs as a group"
echo "        pretest → test → posttest runs as a group"
echo "        Both groups run concurrently"
echo "---"
bun run --parallel build test 2>&1
echo ""
echo ""

echo "Command: bun run --sequential build test"
echo "Notice: prebuild → build → postbuild completes first"
echo "        Then pretest → test → posttest runs"
echo "---"
bun run --sequential build test 2>&1
echo ""
echo ""

# Restore original package.json
cat > package.json << 'EOF'
{
  "name": "parallel-scripts-demo",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Building...' && sleep 1 && echo 'Build complete'",
    "test": "echo 'Running tests...' && sleep 1 && echo 'Tests passed'",
    "lint": "echo 'Linting...' && sleep 0.5 && echo 'Lint complete'",
    "typecheck": "echo 'Type checking...' && sleep 0.5 && echo 'Type check complete'",
    "build:client": "echo '[client] Building client...' && sleep 1",
    "build:server": "echo '[server] Building server...' && sleep 1",
    "build:shared": "echo '[shared] Building shared...' && sleep 0.5",
    "dev": "echo 'Starting dev server...' && sleep 2",
    "watch": "echo 'Watching files...' && sleep 2"
  }
}
EOF

# Example 5: Visual comparison
echo "📦 Example 5: Visual Output Comparison"
echo ""
echo "PARALLEL OUTPUT (interleaved):"
echo "  build | Building..."
echo "  test  | Running tests..."
echo "  build | Build complete"
echo "  test  | Tests passed"
echo ""
echo "SEQUENTIAL OUTPUT (ordered):"
echo "  build | Building..."
echo "  build | Build complete"
echo "  test  | Running tests..."
echo "  test  | Tests passed"
echo ""

# Example 6: Workspace with package names
echo "📦 Example 6: Workspace Package Name Prefixes"
cd workspace-demo
echo ""
echo "When running across workspaces, output shows:"
echo "  app:build   | Building application..."
echo "  lib:build   | Building library..."
echo "  utils:build | Building utilities..."
echo ""
echo "Command: bun run --parallel --filter '*' build"
bun run --parallel --filter '*' build 2>&1 | head -10
echo ""
cd ..

echo "✅ Demonstration complete!"
echo ""
echo "Key Takeaways:"
echo "  • Package names appear in output: 'pkg-name:script-name | output'"
echo "  • --parallel: Starts immediately, interleaved output"
echo "  • --sequential: Runs in order, sequential output"
echo "  • Default: Failure kills remaining scripts"
echo "  • --no-exit-on-error: Continue despite failures"
echo "  • Pre/post scripts: Automatically grouped and run in order"
