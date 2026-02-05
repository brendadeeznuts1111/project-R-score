#!/bin/bash
# CLI Demo Script
# Demonstrates various CLI commands showcasing Bun macros

echo "🚀 ShortcutRegistry CLI Demo"
echo "============================"
echo ""

echo "1️⃣  Build Information:"
echo "----------------------"
bun run cli info
echo ""

echo "2️⃣  Available Shortcuts:"
echo "----------------------"
bun run cli shortcuts
echo ""

echo "3️⃣  Statistics:"
echo "----------------------"
bun run cli stats
echo ""

echo "4️⃣  Git Information:"
echo "----------------------"
bun run cli git
echo ""

echo "5️⃣  Search Example (searching for 'file'):"
echo "----------------------"
bun run cli search file
echo ""

echo "6️⃣  Category Example (general category):"
echo "----------------------"
bun run cli category general
echo ""

echo "7️⃣  Version:"
echo "----------------------"
bun run cli version
echo ""

echo "✅ Demo complete!"
echo ""
echo "Try these commands:"
echo "  bun run cli help          - Show all commands"
echo "  bun run cli all           - Show all information"
echo "  bun run cli search <term> - Search shortcuts"
echo "  bun run cli export        - Export as JSON"
