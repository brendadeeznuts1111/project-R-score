#!/usr/bin/env bash
# Compliance demo — launches mock server, runs checks, shuts down
set -euo pipefail

PORT=8765
echo "🔧 Starting compliance mock on :${PORT}..."

# Start the mock compliance server in background
bun -e "
import { serve } from 'bun';
import { createMockComplianceDb, createStateComplianceRoutes } from './lib/operations/state-compliance-http.ts';
const db = createMockComplianceDb();
const routes = createStateComplianceRoutes(db);
const server = serve({ port: ${PORT}, fetch: routes.fetch ?? routes });
console.log('[compliance-demo] Mock server on :${PORT}');
" &
SERVER_PID=$!
sleep 2

echo "✅ Server running (PID $SERVER_PID)"
echo ""

# Run compliance checks
echo "=== Test 1: MA licensed partner, NBA totals, $500 straight ==="
curl -s -X POST "http://127.0.0.1:${PORT}/api/compliance/check" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"demo","stateCode":"MA","sportId":"NBA","marketId":"totals","wagerAmount":500,"betType":"straight"}' | python3 -m json.tool

echo ""
echo "=== Test 2: NJ unlicensed partner ==="
curl -s -X POST "http://127.0.0.1:${PORT}/api/compliance/check" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"unlicensed","stateCode":"NJ","sportId":"NBA","marketId":"totals","wagerAmount":500,"betType":"straight"}' | python3 -m json.tool 2>/dev/null || echo '(no response)'

echo ""
echo "=== Test 3: License partner for NJ ==="
curl -s -X POST "http://127.0.0.1:${PORT}/api/compliance/license" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"demo","stateCode":"NJ","status":"active"}' | python3 -m json.tool

echo ""
echo "=== Test 4: NJ licensed partner now, over $10k limit ==="
curl -s -X POST "http://127.0.0.1:${PORT}/api/compliance/check" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"demo","stateCode":"NJ","sportId":"soccer","marketId":"match_winner","wagerAmount":15000,"betType":"straight"}' | python3 -m json.tool

# Cleanup
kill $SERVER_PID 2>/dev/null || true
echo ""
echo "✅ Demo complete"
