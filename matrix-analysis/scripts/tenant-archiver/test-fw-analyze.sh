#!/bin/bash

echo "🔍 FactoryWager Analysis Workflow Test"
echo "======================================"

CONFIG_FILE=${1:-"config.yaml"}
JSON_ONLY=${2:-"--json-only"}

echo "Analyzing: $CONFIG_FILE"
echo "JSON Only: $JSON_ONLY"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Error: Configuration file '$CONFIG_FILE' not found"
    exit 1
fi

# Simulate analysis
echo "✅ Schema validation passed"
echo "✅ YAML parsing completed"
echo "📊 Found 3 documents, 2 anchors, 3 interpolations"
echo "🎯 Risk Score: 45/100 (medium)"
echo "🔧 Hardening Level: DEVELOPMENT"

# Create mock report
REPORT_DIR=".factory-wager/reports"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/fw-analyze-$TIMESTAMP.json"

cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "file": "$CONFIG_FILE",
  "stats": {
    "documents": 3,
    "anchors": 2,
    "aliases": 2,
    "interpolations": 3
  },
  "inheritance": {
    "base_anchor": "base",
    "environments": ["development", "staging", "production"],
    "hardening_level": "development"
  },
  "risk_score": 45,
  "exit_code": 0
}
EOF

echo "📄 Report saved to: $REPORT_FILE"
echo "🎉 Analysis completed successfully!"
exit 0
