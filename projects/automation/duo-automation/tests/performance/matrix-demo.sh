#!/bin/bash
# tests/matrix-demo.sh - Demonstration script for matrix testing system

echo "🎯 Matrix Testing System Demonstration"
echo "======================================"
echo ""

# Function to run demo with description
run_demo() {
    local description="$1"
    local command="$2"
    
    echo "📋 $description"
    echo "Command: $command"
    echo "----------------------------------------"
    
    eval "$command" 2>/dev/null | head -20
    echo ""
    echo "✅ Demo completed"
    echo "========================================"
    echo ""
}

# Demo 1: Show help
run_demo "Matrix Help - Available Options" "bun run tests/matrix-test-runner.ts --help"

# Demo 2: Dry run to show execution plan
run_demo "Dry Run - Show Execution Plan" "ENABLE_ALL_TESTS=true bun run tests/matrix-test-runner.ts --dry-run"

# Demo 3: Critical tests only
run_demo "Critical Tests Only - Fast Feedback" "ENABLE_CRITICAL=true ENABLE_HIGH=false ENABLE_MEDIUM=false ENABLE_LOW=false bun run tests/matrix-test-runner.ts"

# Demo 4: Category-specific tests
run_demo "Core Functionality Tests" "ENABLE_CORE=true ENABLE_CONFIG=false ENABLE_SECURITY=false bun run tests/matrix-test-runner.ts --category \"Core Functionality\""

# Demo 5: Priority-specific tests
run_demo "High Priority Tests" "ENABLE_CRITICAL=true ENABLE_HIGH=true ENABLE_MEDIUM=false ENABLE_LOW=false bun run tests/matrix-test-runner.ts --priority high"

# Demo 6: Environment variable showcase
run_demo "Environment Variable Control" "ENABLE_CORE_USER_AGENT=true ENABLE_CORE_PROXY=false ENABLE_CORE_RATE_LIMIT=false bun run tests/matrix-test-runner.ts"

echo "🎊 Matrix Testing System Demo Complete!"
echo ""
echo "📚 Available Scripts:"
echo "  bun run matrix              - Run all enabled tests"
echo "  bun run matrix:critical    - Critical tests only"
echo "  bun run matrix:core         - Core functionality tests"
echo "  bun run matrix:config       - Configuration tests"
echo "  bun run matrix:security     - Security tests"
echo "  bun run matrix:performance  - Performance tests"
echo "  bun run matrix:integration  - Integration tests"
echo "  bun run matrix:e2e          - End-to-end tests"
echo "  bun run matrix:parallel     - All tests in parallel"
echo "  bun run matrix:sequential   - All tests sequentially"
echo "  bun run matrix:dry-run      - Show execution plan"
echo "  bun run matrix:help         - Show help"
echo ""
echo "📖 Full documentation: tests/MATRIX_TESTING_GUIDE.md"
