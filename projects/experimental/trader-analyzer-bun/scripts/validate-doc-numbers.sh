#!/bin/bash
# Script to validate that all documentation version numbers exist in code
# Usage: ./scripts/validate-doc-numbers.sh
# Exit code: 0 if all numbers found, 1 if any missing

set -e

echo "🔍 Validating documentation version numbers..."

# Find all version numbers in documentation
DOC_NUMBERS=$(rg -o "6\.1\.1\.2\.2\.\d+\.\d+" docs/ 2>/dev/null | cut -d: -f2 | sort -u)

if [ -z "$DOC_NUMBERS" ]; then
  echo "⚠️  No version numbers found in docs/"
  exit 0
fi

MISSING=0
TOTAL=0

for num in $DOC_NUMBERS; do
  TOTAL=$((TOTAL + 1))
  # Escape dots for regex
  ESCAPED_NUM=$(echo "$num" | sed 's/\./\\./g')
  
  # Check if number exists in source code
  if ! rg -q "$ESCAPED_NUM" src/ 2>/dev/null; then
    echo "❌ Missing doc ref: $num"
    MISSING=$((MISSING + 1))
  else
    echo "✅ Found: $num"
  fi
done

echo ""
echo "────────────────────────────────────────"
echo "Total numbers checked: $TOTAL"
echo "Missing references: $MISSING"

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "❌ Validation failed: $MISSING documentation numbers not found in source code"
  echo "   This indicates documentation drift or missing code references"
  exit 1
else
  echo ""
  echo "✅ All documentation numbers validated!"
  exit 0
fi
