#!/bin/bash

# 🎯 FactoryWager Wiki Matrix - Filter Examples
# 
# Demonstrates advanced filtering capabilities similar to bun --filter

echo "🎯 FactoryWager Wiki Matrix - Filter Examples"
echo "============================================="
echo ""

# Example 1: Pattern matching (like bun --filter 'ba*')
echo "1️⃣  Pattern matching - templates starting with 'Conf':"
bun run scripts/wiki-matrix-filter.ts --pattern "Conf*"
echo ""

# Example 2: Pattern matching - templates containing 'nfl'
echo "2️⃣  Pattern matching - templates containing 'nfl':"
bun run scripts/wiki-matrix-filter.ts --pattern "*nfl*"
echo ""

# Example 3: Pattern matching - templates ending with 'API'
echo "3️⃣  Pattern matching - templates ending with 'API':"
bun run scripts/wiki-matrix-filter.ts --pattern "*API"
echo ""

# Example 4: Format filtering
echo "4️⃣  Format filtering - markdown only:"
bun run scripts/wiki-matrix-filter.ts --format markdown
echo ""

# Example 5: Complexity filtering
echo "5️⃣  Complexity filtering - simple templates:"
bun run scripts/wiki-matrix-filter.ts --complexity "Simple*"
echo ""

# Example 6: Use case filtering
echo "6️⃣  Use case filtering - enterprise templates:"
bun run scripts/wiki-matrix-filter.ts --use-case "*Enterprise*"
echo ""

# Example 7: Boolean filtering
echo "7️⃣  Boolean filtering - templates with examples:"
bun run scripts/wiki-matrix-filter.ts --has-examples true
echo ""

# Example 8: Multiple filters combined
echo "8️⃣  Combined filters - markdown with examples, sorted by name:"
bun run scripts/wiki-matrix-filter.ts --format markdown --has-examples true --sort-by name
echo ""

# Example 9: Limiting results
echo "9️⃣  Limited results - first 2 templates:"
bun run scripts/wiki-matrix-filter.ts --limit 2
echo ""

# Example 10: Complex pattern with sorting
echo "🔟 Complex pattern - templates with 'Integration', sorted by complexity:"
bun run scripts/wiki-matrix-filter.ts --pattern "*Integration*" --sort-by complexity
echo ""

# Example 11: Advanced filtering - JSON format templates with custom sections
echo "1️⃣1️⃣  Advanced - JSON templates with custom sections:"
bun run scripts/wiki-matrix-filter.ts --format json --has-custom-sections true
echo ""

# Example 12: Use case filtering - collaboration tools
echo "1️⃣2️⃣  Use case - collaboration tools:"
bun run scripts/wiki-matrix-filter.ts --use-case "*Collaboration*"
echo ""

# Example 13: Integration type filtering
echo "1️⃣3️⃣  Integration - API integration only:"
bun run scripts/wiki-matrix-filter.ts --integration "*API*"
echo ""

# Example 14: Complex multi-criteria
echo "1️⃣4️⃣  Multi-criteria - simple or medium complexity, with examples, limited to 3:"
bun run scripts/wiki-matrix-filter.ts --complexity "Simple*" --has-examples true --limit 3 --sort-by name
echo ""

# Example 15: Pattern matching on description
echo "1️⃣5️⃣  Description pattern - templates mentioning 'format':"
bun run scripts/wiki-matrix-filter.ts --pattern "*format*"
echo ""

# Example 16: Integration filtering - direct import
echo "1️⃣6️⃣  Integration - direct import only:"
bun run scripts/wiki-matrix-filter.ts --integration "*Direct*"
echo ""

# Example 17: Advanced pattern with wildcards
echo "1️⃣7️⃣  Wildcard patterns - templates with 'on' anywhere:"
bun run scripts/wiki-matrix-filter.ts --pattern "*on*"
echo ""

# Example 18: Format + complexity combination
echo "1️⃣8️⃣  Format + complexity - HTML templates, advanced complexity:"
bun run scripts/wiki-matrix-filter.ts --format html --complexity "*Advanced*"
echo ""

# Example 19: Use case + sorting
echo "1️⃣9️⃣  Use case + sorting - all templates, sorted by use case:"
bun run scripts/wiki-matrix-filter.ts --sort-by useCase
echo ""

# Example 20: Complex real-world scenario
echo "2️⃣0️⃣  Real-world - find enterprise-ready templates with examples:"
bun run scripts/wiki-matrix-filter.ts --use-case "*Enterprise*" --has-examples true --has-custom-sections true --sort-by complexity
echo ""

echo "🎉 All filter examples completed!"
echo ""
echo "💡 Try your own filters:"
echo "   bun run scripts/wiki-matrix-filter.ts --pattern \"*your-pattern*\""
echo "   bun run scripts/wiki-matrix-filter.ts --format markdown --has-examples true"
echo "   bun run scripts/wiki-matrix-filter.ts --complexity \"Simple*\" --limit 5"
echo ""
echo "🔍 Pattern matching works like bun --filter:"
echo "   *  = match any characters"
echo "   ?  = match single character"
echo "   ba* = start with 'ba'"
echo "   *ence = end with 'ence'"
echo "   *nfl* = contain 'nfl'"
