#!/bin/bash

# 🎯 FactoryWager Wiki Matrix - Pipe Examples
# 
# Demonstrates using bun run - with stdin for programmatic wiki matrix operations

echo "🎯 FactoryWager Wiki Matrix - Pipe Examples"
echo "=========================================="
echo ""

# Example 1: Basic matrix display
echo "1️⃣  Basic matrix display:"
echo '{"action": "matrix"}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 2: JSON output for programmatic use
echo "2️⃣  JSON output:"
echo '{"action": "matrix", "format": "json"}' | bun run scripts/wiki-matrix-pipe.ts | head -20
echo "..."
echo ""

# Example 3: CSV output for spreadsheet import
echo "3️⃣  CSV output:"
echo '{"action": "stats", "format": "csv"}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 4: Details for specific template
echo "4️⃣  Template details:"
echo '{"action": "details", "params": {"index": 1}}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 5: Feature comparison
echo "5️⃣  Feature comparison:"
echo '{"action": "compare"}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 6: Statistics
echo "6️⃣  Statistics:"
echo '{"action": "stats"}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 7: Templates list
echo "7️⃣  Available templates:"
echo '{"action": "templates"}' | bun run scripts/wiki-matrix-pipe.ts
echo ""

# Example 8: Pipeline with grep
echo "8️⃣  Pipeline example (filter JSON output):"
echo '{"action": "matrix", "format": "json"}' | bun run scripts/wiki-matrix-pipe.ts | jq '.[] | select(.format == "markdown")'
echo ""

# Example 9: Save to file
echo "9️⃣  Save matrix to file:"
echo '{"action": "matrix", "format": "csv"}' | bun run scripts/wiki-matrix-pipe.ts > wiki-matrix.csv
echo "✅ Saved to wiki-matrix.csv"
echo ""

# Example 10: Complex pipeline
echo "🔟 Complex pipeline (JSON → extract names → sort):"
echo '{"action": "templates", "format": "json"}' | bun run scripts/wiki-matrix-pipe.ts | jq -r '.[].name' | sort
echo ""

echo "🎉 All examples completed!"
echo ""
echo "💡 Try your own commands:"
echo '   echo '\''{"action": "matrix"}'\'' | bun run scripts/wiki-matrix-pipe.ts'
echo '   echo '\''{"action": "details", "params": {"index": 2}}'\'' | bun run scripts/wiki-matrix-pipe.ts'
echo '   echo '\''{"action": "stats", "format": "json"}'\'' | bun run scripts/wiki-matrix-pipe.ts'
