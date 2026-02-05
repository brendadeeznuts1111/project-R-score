#!/bin/bash
# [VERIFICATION.RG.MARKERS.RG:IMPLEMENTATION] RG Marker Integrity Verification Script v2
# Verifies consistency, completeness, and discoverability of RG markers across codebase

set -e

echo "=== RG Marker Integrity Report v2 ==="
echo ""

# 1. Check for false positives (EXACT pattern matching - only actual markers)
echo "1. Checking for false positives in non-doc files..."
# Use pattern: [WORD.WORD.RG] or [WORD.WORD.RG:QUALIFIER] - exclude common false positives
false_positives=$(rg --no-heading '\[[A-Z]+(\.[A-Z]+)+\.RG(:[A-Z]+)?\]' src/ scripts/ 2>/dev/null | \
    grep -vE '\[(TEAM|DATABASE|RSS|JSON|ERROR|ARGUMENT|TEMPLATE|METADATA|GIT|MAIN|SCAFFOLD|CONFIG|AI|VERIFICATION|MCP|COMPONENT|SERVICE|INTERFACE|ENUM|SCRIPT|TEST|VALIDATION|TYPE|IMPORTS|CATEGORIZATION)\.' | \
    grep -vE '(bun (test|run)|File:|Ripgrep Pattern:|@see|@module|\.ts$|\.js$)' || true)
if [ -z "$false_positives" ]; then
    echo "✓ No false positives found"
else
    echo "⚠️  Found potential false positives:"
    echo "$false_positives" | head -10
fi
echo ""

# 2. Verify bidirectional references (CORRECTED - proper count extraction)
echo "2. Checking bidirectional references..."
markers=("TEAM.ROUTING.RG" "DATABASE.PERSISTENCE.RG" "RSS.CACHE.REFRESH.RG" "TELEGRAM.NOTIFICATIONS.RG" "JSON.VALIDATION.RG" "ERROR.HANDLING.RG")
for marker in "${markers[@]}"; do
    # Extract just the count number after colon, sum if multiple files
    doc_count=$(rg -c "\[$marker" docs/ dashboard/ 2>/dev/null | cut -d: -f2 | awk '{sum+=$1} END {print sum+0}' || echo 0)
    code_count=$(rg -c "\[$marker" src/ scripts/ 2>/dev/null | cut -d: -f2 | awk '{sum+=$1} END {print sum+0}' || echo 0)
    
    if [ "$doc_count" -eq 0 ] && [ "$code_count" -eq 0 ]; then
        echo "❌ $marker: Not found anywhere"
    elif [ "$doc_count" -eq 0 ]; then
        echo "❌ $marker missing in docs (found in code: $code_count)"
    elif [ "$code_count" -eq 0 ]; then
        echo "❌ $marker missing in code (found in docs: $doc_count)"
    else
        echo "✓ $marker: docs=$doc_count, code=$code_count"
    fi
done
echo ""

# 3. Find duplicate section numbers
echo "3. Checking for duplicate section headers..."
duplicates=$(rg '^## \d+\.\d+\.' docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md 2>/dev/null | sort | uniq -d || true)
if [ -z "$duplicates" ]; then
    echo "✓ No duplicate section numbers found"
else
    echo "⚠️  Found duplicate section numbers:"
    echo "$duplicates"
fi
echo ""

# 4. Validate TOC anchors match actual headers
echo "4. Validating TOC anchor links..."
if [ -f "docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md" ]; then
    broken_anchors=0
    while IFS= read -r anchor; do
        anchor_clean=$(echo "$anchor" | sed 's/.*(#\(.*\)).*/\1/')
        if ! rg -q "^##.*{$anchor_clean}" docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md 2>/dev/null && \
           ! rg -q "^###.*{$anchor_clean}" docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md 2>/dev/null; then
            echo "⚠️  Broken anchor: #$anchor_clean"
            broken_anchors=$((broken_anchors + 1))
        fi
    done < <(rg '\(#.*\)\)' docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md 2>/dev/null || true)
    
    if [ "$broken_anchors" -eq 0 ]; then
        echo "✓ All TOC anchors valid"
    fi
fi
echo ""

# 5. Count total RG markers (using strict pattern)
echo "5. RG Marker Statistics..."
# Use pattern: [WORD.WORD.RG] or [WORD.WORD.RG:QUALIFIER] - filter out false positives
total_markers=$(rg --no-heading -o '\[[A-Z]+(\.[A-Z]+)+\.RG(:[A-Z]+)?\]' docs/ scripts/ src/ dashboard/ 2>/dev/null | \
    grep -vE '(bun (test|run)|File:|Ripgrep Pattern:|@see|@module|\.ts$|\.js$|\.py$)' | \
    sort -u | wc -l | tr -d ' ')
echo "Total unique RG markers: $total_markers"
echo ""

# 6. Find patterns without semantic qualifiers
echo "6. Checking for patterns without semantic qualifiers..."
# Extract just the marker text, filter out false positives from file paths
unqualified=$(rg --no-heading -o '\[[A-Z]+(\.[A-Z]+)+\.RG\]' docs/ scripts/ src/ dashboard/ 2>/dev/null | \
    grep -vE '\.(ts|js|py)$' | grep -vE '(bun (test|run)|File: |Ripgrep Pattern: |@see |@module )' | \
    sort -u | wc -l | tr -d ' ')
qualified=$(rg --no-heading -o '\[[A-Z]+(\.[A-Z]+)+\.RG:[A-Z]+\]' docs/ scripts/ src/ dashboard/ 2>/dev/null | \
    grep -vE '\.(ts|js|py)$' | grep -vE '(bun (test|run)|File: |Ripgrep Pattern: |@see |@module )' | \
    sort -u | wc -l | tr -d ' ')
echo "Unqualified markers: $unqualified"
echo "Qualified markers: $qualified"
if [ "$unqualified" -gt 0 ]; then
    qualification_rate=$(echo "scale=1; $qualified * 100 / ($qualified + $unqualified)" | bc 2>/dev/null || echo "0")
    echo "Qualification rate: ${qualification_rate}%"
    echo "💡 Consider adding semantic qualifiers (:IMPLEMENTATION, :CONFIG, :TEST)"
fi
echo ""

# 7. Pattern coverage report (using strict pattern)
echo "7. Pattern Coverage Report..."
echo "Markers with low coverage (< 3 occurrences):"
rg --no-heading -o '\[[A-Z]+(\.[A-Z]+)+\.RG(:[A-Z]+)?\]' docs/ scripts/ src/ dashboard/ 2>/dev/null | \
    grep -vE '(bun (test|run)|File:|Ripgrep Pattern:|@see|@module|\.ts$|\.js$|\.py$)' | \
    sort | uniq -c | sort -nr | awk '$1 < 3 {print "⚠️  ", $2, "(" $1 " occurrences)"}' | head -20
echo ""

echo "=== Verification Complete ==="
