#!/bin/bash
# Root Directory Cleanliness Check
# Run this to ensure root directory stays clean

set -e

cd "$(dirname "$0")/.."

echo "🧹 Checking root directory cleanliness..."

# Files that should NOT be in root (generated/temporary)
DISALLOWED_PATTERNS=(
  "*.cpuprofile"
  "*-export.json"
  "*-export-*.json"
  "test-export.json"
  "github-cli-export.json"
  "enhanced-*.json"
  "*.heapsnapshot"
  "*.log"
  "*.tmp"
  ".DS_Store"
)

# Files allowed in root (config, documentation, build files)
ALLOWED_FILES=(
  ".env.production"
  ".gitattributes"
  ".gitignore"
  ".npmignore"
  ".observatory-policy.toml"
  ".secretsrc.json"
  "AGENTS.md"
  "Makefile"
  "README.md"
  "bun.lock"
  "flake.nix"
  "package.json"
  "shell.nix"
  "tsconfig.json"
  "LICENSE"
  ".editorconfig"
  ".prettierrc"
  ".eslintrc"
  ".babelrc"
)

VIOLATIONS=()

# Check for disallowed patterns
for pattern in "${DISALLOWED_PATTERNS[@]}"; do
  matches=$(find . -maxdepth 1 -name "$pattern" -type f 2>/dev/null || true)
  if [ -n "$matches" ]; then
    for match in $matches; do
      basename=$(basename "$match")
      VIOLATIONS+=("$basename (matches pattern: $pattern)")
    done
  fi
done

# Report results
if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo "❌ Root directory violations found:"
  for violation in "${VIOLATIONS[@]}"; do
    echo "   - $violation"
  done
  echo ""
  echo "💡 Please move or delete these files:"
  echo "   - CPU profiles → profiles/"
  echo "   - Export JSONs → temp/ or delete"
  echo "   - Logs → logs/"
  echo "   - Temporary files → temp/"
  echo "   - Benchmarks → tests/benchmarks/"
  echo "   - Demos → examples/demos/"
  exit 1
else
  echo "✅ Root directory is clean!"
  echo ""
  echo "📁 Essential files in root:"
  ls -1 *.md *.json *.nix Makefile .gitignore .env.* 2>/dev/null | head -20
  exit 0
fi
