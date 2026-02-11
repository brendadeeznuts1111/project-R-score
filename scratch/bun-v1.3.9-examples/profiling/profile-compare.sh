#!/bin/bash
# Compare different CPU profiling intervals

echo "=============================================="
echo "CPU Profiling Interval Comparison"
echo "=============================================="
echo ""

cd "$(dirname "$0")"

echo "1. Default interval (1000μs)..."
bun --cpu-prof cpu-profile-demo.ts 2>&1 | grep -E "(Result|Matches|Length|Time|Total)"
echo ""

echo "2. High resolution (500μs)..."
bun --cpu-prof --cpu-prof-interval 500 cpu-profile-demo.ts 2>&1 | grep -E "(Result|Matches|Length|Time|Total)"
echo ""

echo "3. Ultra high resolution (250μs)..."
bun --cpu-prof --cpu-prof-interval 250 cpu-profile-demo.ts 2>&1 | grep -E "(Result|Matches|Length|Time|Total)"
echo ""

echo "Profile files created:"
ls -lh *.cpuprofile 2>/dev/null | head -10

echo ""
echo "To view profiles:"
echo "  bun x speedscope CPU.*.cpuprofile"
