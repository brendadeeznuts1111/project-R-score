#!/bin/bash
#
# @dynamic-spy/kit v9.0 - Quick Load Test (No Tmux)
# 
# Quick test of production load system without tmux
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Quick Load Test - Testing /pool endpoint"
echo "============================================"
echo ""

# Test single request
echo "📊 Testing single request..."
RESPONSE=$(curl -s "http://localhost:3000/pool/pinnacle/Lakers-Celtics")
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Test a few bookies and markets
echo "📊 Testing multiple requests..."
for bookie in pinnacle bet365 betmgm; do
	for market in Lakers-Celtics Nuggets-Heat Warriors-Kings; do
		curl -s "http://localhost:3000/pool/$bookie/$market" > /dev/null 2>&1 &
	done
done

wait
echo "✅ Quick load test complete!"
echo ""

# Show pool stats
echo "📊 Connection Pool Stats:"
curl -s "http://localhost:3000/pool/pinnacle/Lakers-Celtics" | jq .pool 2>/dev/null || echo "Stats unavailable"



