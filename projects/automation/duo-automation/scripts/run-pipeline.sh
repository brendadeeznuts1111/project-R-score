#!/bin/bash
echo "🚀 Starting Empire Analysis Pipeline..."
echo "1. Loading and parsing TOML config..."

# Extract project names using toml-config-parser.ts
PROJECTS=$(bun run scripts/toml-config-parser.ts | grep -A 10 "Services:" | grep "service" | awk '{print $3}' | sed 's/://')

if [ -z "$PROJECTS" ]; then
  echo "❌ Error: No projects found in configuration."
  exit 1
fi

echo "2. Projects to analyze:"
echo "$PROJECTS" | sed 's/^/  - /'

REFERENCE_PROJECTS="empire ref-proj windsurf"
echo ""
echo "3. Running similarity analysis and generating matrix..."

# Create CSV header
echo "Project,$(echo $REFERENCE_PROJECTS | sed 's/ /,/g')" > config/similarity-matrix.csv

echo "$PROJECTS" | while read -r proj; do
  echo "📊 Analyzing '$proj'..."
  LINE="$proj"
  for ref in $REFERENCE_PROJECTS; do
    # Capture full output to debug
    OUTPUT=$(bun run scripts/deep-app-cli.ts similarity "$proj" "$ref")
    # Extract only the percentage number
    SIM=$(echo "$OUTPUT" | grep "Einstein Similarity" | sed -n 's/.*: \([0-9.]*\)%.*/\1/p')
    # Default to 0 if extraction fails
    if [ -z "$SIM" ]; then SIM="0.0"; fi
    LINE="$LINE,$SIM"
  done
  echo "$LINE" >> config/similarity-matrix.csv
done

echo ""
echo "✅ Pipeline complete! Results in config/similarity-matrix.csv"
echo "----------------------------------------------------"
cat config/similarity-matrix.csv
