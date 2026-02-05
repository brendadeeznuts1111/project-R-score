#!/bin/bash
# [TEAM.MARKERS.VERIFICATION.RG:IMPLEMENTATION] Team Markers Verification Script
# Validates that TEAM.md has exactly 19 RG markers following the canonical pattern

set -e

echo "=== Team Markers Verification ==="
echo ""

TEAM_MD=".github/TEAM.md"
EXPECTED_COUNT=19

# Official RG Marker Regex Pattern (strict validation)
RG_PATTERN='\[([A-Z]+(\.[A-Z]+)+)\.RG(:[A-Z]+)?\]'

# Count markers using ripgrep
ACTUAL_COUNT=$(rg --no-heading -o "$RG_PATTERN" "$TEAM_MD" 2>/dev/null | wc -l | tr -d ' ')

echo "📊 Marker Count:"
echo "   Expected: $EXPECTED_COUNT"
echo "   Actual:   $ACTUAL_COUNT"

if [ "$ACTUAL_COUNT" -eq "$EXPECTED_COUNT" ]; then
    echo ""
    echo "✅ Verification passed: All $EXPECTED_COUNT markers found"
    
    # List all markers
    echo ""
    echo "📍 Found Markers:"
    rg --no-heading -o "$RG_PATTERN" "$TEAM_MD" | sort | nl
    
    exit 0
else
    echo ""
    echo "❌ Verification failed: Expected $EXPECTED_COUNT markers, found $ACTUAL_COUNT"
    echo ""
    echo "Missing or extra markers:"
    rg --no-heading -o "$RG_PATTERN" "$TEAM_MD" | sort
    
    exit 1
fi
