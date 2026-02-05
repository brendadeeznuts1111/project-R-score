#!/bin/bash

# Test FactoryWager Audit Infrastructure

echo "🧪 Testing FactoryWager Audit Infrastructure"
echo "=========================================="

AUDIT_CLI="./.factory-wager/audit-cli.sh"

# Test 1: Add some audit entries
echo ""
echo "📝 Adding test audit entries..."

# Add successful analysis entry
cat >> .factory-wager/audit.log << EOF
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "workflow": "fw-analyze", "version": "1.1.0", "exit_code": 0, "duration_seconds": 12, "config_file": "config.yaml", "risk_score": 45, "metadata": {"documents": 3, "anchors": 2, "artifacts_created": [".factory-wager/reports/fw-analyze-20260201-091759.json"]}}
EOF

# Add successful validation entry
cat >> .factory-wager/audit.log << EOF
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "workflow": "fw-validate", "version": "1.1.0", "exit_code": 0, "duration_seconds": 8, "environment": "production", "config_file": "config.yaml", "metadata": {"gates_passed": 5, "gates_total": 5}}
EOF

# Add changelog entry
cat >> .factory-wager/audit.log << EOF
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "workflow": "fw-changelog", "version": "1.1.0", "exit_code": 1, "duration_seconds": 15, "metadata": {"changes_detected": 3, "risk_delta": 5}}
EOF

# Add error entry
cat >> .factory-wager/audit.log << EOF
{"timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "workflow": "fw-deploy", "version": "1.1.0", "exit_code": 2, "duration_seconds": 45, "environment": "production", "error": {"type": "infrastructure", "message": "Health check failed", "code": "HEALTH_CHECK_FAILED"}}
EOF

echo "✅ Added 4 test audit entries"

# Test 2: Show statistics
echo ""
echo "📊 Testing statistics..."
$AUDIT_CLI stats

# Test 3: Validate audit log
echo ""
echo "✅ Testing validation..."
$AUDIT_CLI validate

# Test 4: Show recent entries
echo ""
echo "📋 Testing tail functionality..."
$AUDIT_CLI tail 5

# Test 5: Search by workflow
echo ""
echo "🔍 Testing search functionality..."
$AUDIT_CLI search fw-analyze

# Test 6: Show errors only
echo ""
echo "❌ Testing error filtering..."
$AUDIT_CLI errors

# Test 7: Show success only
echo ""
echo "✅ Testing success filtering..."
$AUDIT_CLI success

# Test 8: Export functionality
echo ""
echo "📤 Testing export functionality..."
$AUDIT_CLI export json
$AUDIT_CLI export csv

echo ""
echo "🎉 Audit infrastructure test completed!"
echo ""
echo "Available commands:"
echo "  $AUDIT_CLI stats      # Show statistics"
echo "  $AUDIT_CLI tail 10    # Show last 10 entries"
echo "  $AUDIT_CLI search fw-validate  # Search by workflow"
echo "  $AUDIT_CLI errors     # Show errors only"
echo "  $AUDIT_CLI success    # Show successes only"
echo "  $AUDIT_CLI export csv # Export to CSV"
echo "  $AUDIT_CLI validate   # Validate log format"
echo "  $AUDIT_CLI rotate     # Rotate log file"
