#!/bin/bash
# Pre-push hook for Enterprise Coverage Enforcement

echo "🛡️ Running Enterprise Pre-Push Checks..."

# 1. Run Tests with Coverage
bun test --coverage --bail

# 2. Enforce Coverage Thresholds
bun run scripts/maintenance/coverage-enforcer.ts

if [ $? -ne 0 ]; then
  echo "❌ Push blocked: Coverage thresholds not met or tests failed."
  exit 1
fi

echo "✅ Pre-push checks completed successfully."
exit 0