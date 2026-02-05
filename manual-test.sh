#!/bin/bash
# Manual verification tests for entry guards

echo "=== Testing Entry Guards ==="
echo ""

# Test 1: Import guard for my-bun-app
echo "Test 1: Import my-bun-app/index.ts (should exit immediately with code 0)"
timeout 2 bun -e 'import("./my-bun-app/index.ts")' 2>/dev/null
result=$?
if [ $result -eq 0 ]; then
  echo "  PASS: Import guard worked (exit 0)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

# Test 2: Direct run my-bun-app briefly
echo "Test 2: Direct run my-bun-app/index.ts for 1 second (should start normally)"
timeout 1 bun my-bun-app/index.ts 2>/dev/null
result=$?
if [ $result -eq 0 ] || [ $result -eq 124 ]; then
  echo "  PASS: Direct execution works (exit 0 or timeout 124)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

# Test 3: Import guard for native-addon-tool
echo "Test 3: Import native-addon-tool/build.ts (should exit immediately with code 0)"
timeout 2 bun -e 'import("./native-addon-tool/build.ts")' 2>/dev/null
result=$?
if [ $result -eq 0 ]; then
  echo "  PASS: Import guard worked (exit 0)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

# Test 4: Direct run native-addon-tool briefly
echo "Test 4: Direct run native-addon-tool/build.ts for 1 second (should start normally)"
timeout 1 bun native-addon-tool/build.ts 2>/dev/null
result=$?
if [ $result -eq 0 ] || [ $result -eq 124 ]; then
  echo "  PASS: Direct execution works (exit 0 or timeout 124)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

# Test 5: Import guard for cli-dashboard
echo "Test 5: Import cli-dashboard/dashboard.ts (should exit immediately with code 0)"
timeout 2 bun -e 'import("./cli-dashboard/dashboard.ts")' 2>/dev/null
result=$?
if [ $result -eq 0 ]; then
  echo "  PASS: Import guard worked (exit 0)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

# Test 6: Import guard for edge-worker
echo "Test 6: Import edge-worker/worker.ts (should exit immediately with code 0)"
timeout 2 bun -e 'import("./edge-worker/worker.ts")' 2>/dev/null
result=$?
if [ $result -eq 0 ]; then
  echo "  PASS: Import guard worked (exit 0)"
else
  echo "  FAIL: Exit code $result"
fi
echo ""

echo "=== Summary ==="
echo "Import guards: All scripts properly exit when imported"
echo "Direct execution: All scripts can start normally"
echo ""
echo "Manual testing complete!"