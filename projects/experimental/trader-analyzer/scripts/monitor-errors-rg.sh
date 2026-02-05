#!/bin/bash

# monitor-errors-rg.sh

set -e

echo "🔍 Monitoring error normalization with ripgrep..."
echo "================================================="

# Use ripgrep for all pattern matching
echo "1️⃣  Error rate (normalized):"
ERROR_COUNT=$(rg -c "error.*normalized" /var/log/graph-engine/app.log || echo "0")
echo "   $ERROR_COUNT normalized errors in last 100 lines"

echo "2️⃣  Crash detection:"
CRASH_COUNT=$(rg -c "panic|fatal" /var/log/graph-engine/app.log || echo "0")
if [ "$CRASH_COUNT" -eq 0 ]; then
  echo "   ✅ No crashes detected"
else
  echo "   ❌ $CRASH_COUNT crashes detected!"
fi

echo "3️⃣  Error context richness:"
CONTEXT_COUNT=$(jq '.error | has("type") and has("stack")' /var/log/graph-engine/errors.json | rg -c "true" || echo "0")
TOTAL_COUNT=$(jq '.error' /var/log/graph-engine/errors.json | wc -l || echo "0")
if [ "$TOTAL_COUNT" -gt 0 ]; then
  RICHNESS_PERCENT=$((CONTEXT_COUNT * 100 / TOTAL_COUNT))
  echo "   $CONTEXT_COUNT/$TOTAL_COUNT errors have full context ($RICHNESS_PERCENT%)"
else
  echo "   No errors found in JSON log"
fi

echo "4️⃣  Malformed errors:"
MALFORMED_COUNT=$(rg -c "UnknownError|StringError" /var/log/graph-engine/errors.json || echo "0")
if [ "$MALFORMED_COUNT" -eq 0 ]; then
  echo "   ✅ No malformed errors"
else
  echo "   ⚠️  $MALFORMED_COUNT malformed errors found"
fi

echo "5️⃣  Recent error types (top 5):"
rg "type.:\"[A-Za-z]+\"" /var/log/graph-engine/errors.json -o | sort | uniq -c | sort -nr | head -5

echo ""
echo "✅ Monitoring complete with ripgrep!"
