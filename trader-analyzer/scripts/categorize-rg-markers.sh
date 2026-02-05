#!/bin/bash
# [CATEGORIZATION.RG.MARKERS.RG:IMPLEMENTATION] RG Marker Categorization Script (CORRECTED)
# Categorizes markers into orphaned docs, undocumented code, and low-coverage patterns
# Uses BASE pattern matching (strips qualifiers) to properly match [PATTERN.RG] with [PATTERN.RG:QUALIFIER]

set -e

echo "=== RG Marker Categorization (Base Pattern Matching) ==="
echo ""

# Extract BASE patterns (strip qualifiers) for comparison using rg
echo "Extracting base patterns..."
# Use rg to extract markers, then sed to strip qualifiers (rg doesn't have replace in pipe mode)
rg --no-heading -o '\[([A-Z]+(\.[A-Z]+)+)\.RG[^\]]*\]' docs/ 2>/dev/null | \
  sed -E 's/.*\[([^:]+)\.RG.*/\1.RG/' | \
  rg -v '\.(ts|js|py)$' | \
  rg -v '(bun (test|run)|File:|Ripgrep Pattern:|@see |@module )' | \
  sort -u > /tmp/doc-base-patterns.txt

rg --no-heading -o '\[([A-Z]+(\.[A-Z]+)+)\.RG[^\]]*\]' src/ scripts/ 2>/dev/null | \
  sed -E 's/.*\[([^:]+)\.RG.*/\1.RG/' | \
  rg -v '\.(ts|js|py)$' | \
  rg -v '(bun (test|run)|File:|Ripgrep Pattern:|@see |@module )' | \
  sort -u > /tmp/code-base-patterns.txt

# Count qualified vs unqualified using rg for filtering
echo "Counting qualified vs unqualified markers..."
qualified_count=$(rg --no-heading -o '\[.*\.RG:[A-Z]+\]' docs/ src/ scripts/ 2>/dev/null | \
  rg -v '\.(ts|js|py)$' | \
  rg -v '(bun (test|run)|File:|Ripgrep Pattern:|@see |@module )' | \
  wc -l | tr -d ' ')

unqualified_count=$(rg --no-heading -o '\[([A-Z]+(\.[A-Z]+)+)\.RG\]' docs/ src/ scripts/ 2>/dev/null | \
  rg -v '\.(ts|js|py)$' | \
  rg -v '(bun (test|run)|File:|Ripgrep Pattern:|@see |@module )' | \
  wc -l | tr -d ' ')

# Calculate shared markers (base pattern matches) using comm
shared_count=$(comm -12 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | wc -l | tr -d ' ')
docs_only=$(comm -23 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | wc -l | tr -d ' ')
code_only=$(comm -13 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | wc -l | tr -d ' ')

echo "📊 Base Pattern Statistics:"
echo "  Shared (docs + code): $shared_count"
echo "  Docs only: $docs_only"
echo "  Code only: $code_only"
echo ""

total_markers=$((qualified_count + unqualified_count))
qualification_rate=$(echo "scale=1; $qualified_count * 100 / $total_markers" 2>/dev/null | bc || echo "0")

echo "🏷️  Qualification Rate:"
echo "  Qualified: $qualified_count"
echo "  Unqualified: $unqualified_count"
echo "  Total: $total_markers"
echo "  Rate: ${qualification_rate}%"
echo ""

echo "🎯 Target: 100% qualified, maximize shared patterns"
echo ""

# Show top 10 shared patterns for verification using rg
if [ "$shared_count" -gt 0 ]; then
  echo "✅ Top Shared Patterns:"
  comm -12 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | head -10
  echo ""
else
  echo "❌ ERROR: No shared patterns detected! Run manual verification:"
  echo "   rg --no-heading -o '\[TEAM\.ROUTING\.RG' docs/ src/ scripts/"
  echo ""
fi

# Find orphaned documentation markers (base patterns) using rg for counting
echo "📝 Orphaned documentation markers (docs only - top 20):"
comm -23 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | head -20 | while read pattern; do
  # Use rg to count occurrences (rg -c returns filename:count)
  count=$(rg -c "\[$pattern" docs/ 2>/dev/null | rg -o '\d+$' | awk '{sum+=$1} END {print sum+0}' || echo 0)
  if [ "$count" -gt 0 ]; then
    echo "  $pattern ($count occurrences) - Add to code or remove from docs"
  fi
done
echo ""

# Find undocumented code markers (base patterns) using rg for counting
echo "💻 Undocumented code markers (code only - top 20):"
comm -13 /tmp/doc-base-patterns.txt /tmp/code-base-patterns.txt | head -20 | while read pattern; do
  # Use rg to count occurrences
  count=$(rg -c "\[$pattern" src/ scripts/ 2>/dev/null | rg -o '\d+$' | awk '{sum+=$1} END {print sum+0}' || echo 0)
  if [ "$count" -gt 0 ]; then
    echo "  $pattern ($count occurrences) - Add to documentation"
  fi
done
echo ""

# Find markers with only 1 occurrence (potential merges) using rg
echo "⚠️  Single-occurrence markers (consider merging - top 20):"
rg --no-heading -o '\[[A-Z]+(\.[A-Z]+)+\.RG(:[A-Z]+)?\]' docs/ src/ scripts/ 2>/dev/null | \
  rg -v '\.(ts|js|py)$' | \
  rg -v '(bun (test|run)|File:|Ripgrep Pattern:|@see |@module )' | \
  sort | uniq -c | awk '$1 == 1 {print "  ", $2, "- Consider merging into parent section"}' | head -20
echo ""

echo "=== Summary ==="
echo "Documentation base patterns: $(wc -l < /tmp/doc-base-patterns.txt | tr -d ' ')"
echo "Code base patterns: $(wc -l < /tmp/code-base-patterns.txt | tr -d ' ')"
echo "Shared patterns: $shared_count"
echo "Orphaned docs: $docs_only"
echo "Undocumented code: $code_only"
