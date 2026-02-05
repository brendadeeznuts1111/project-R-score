#!/bin/bash
# quick-cleanup.sh - Quick process cleanup commands

echo "⚡ Quick Process Cleanup"
echo "======================"

# Direct process termination (from your highlighted commands)
echo "🔧 Direct process termination:"
echo "kill 70681 50569 64921 93770 71334 69158 69157"

echo ""
echo "🔍 Port verification:"
echo "lsof -i :3000 -i :5555 -i :8000 -i :4000 -i :5000"

echo ""
echo "⚡ Quick commands to copy:"
echo "# Kill specific PIDs"
echo "kill <PID1> <PID2> <PID3>"
echo ""
echo "# Check ports"
echo "lsof -i :<port>"
echo ""
echo "# Find bun processes"
echo "ps aux | grep bun | grep -v grep"
echo ""
echo "# Kill all bun processes (except IDE)"
echo "ps aux | grep bun | grep -v -E '(Windsurf|Cursor)' | awk '{print \$2}' | xargs kill"

echo ""
echo "🎯 Current running processes:"
ps aux | grep -E "(bun|vite)" | grep -v grep | head -5

echo ""
echo "🔍 Current port usage:"
lsof -i :3000 -i :5555 -i :8000 -i :4000 -i :5000 2>/dev/null | grep LISTEN || echo "✅ No development ports in use"
