#!/bin/bash
# phase-01-enroll.sh - Factory Wager QR Enrollment Phase
# Part of the Master Factory Orchestrator Pipeline

set -e

echo "🔐 Phase 01: Factory Wager QR Enrollment..."

# Environment variables from orchestrator
VM_ID="${VM_ID:-master}"
PHASE_TIMESTAMP="${PHASE_TIMESTAMP:-$(date +%s)}"

echo "  📱 VM ID: $VM_ID"
echo "  ⏰ Timestamp: $PHASE_TIMESTAMP"

# Create enrollment directory
ENROLL_DIR="/tmp/factory/enroll-$VM_ID"
mkdir -p "$ENROLL_DIR"

# Generate factory credentials
FACTORY_ID="factory-${VM_ID}-${PHASE_TIMESTAMP}"
echo "  🏭 Factory ID: $FACTORY_ID"

# Create enrollment manifest
cat > "$ENROLL_DIR/manifest.json" << EOF
{
  "factory_id": "$FACTORY_ID",
  "vm_id": "$VM_ID",
  "phase": "01-enroll",
  "timestamp": $PHASE_TIMESTAMP,
  "bun_runtime": "$BUN_RUNTIME",
  "status": "enrolled"
}
EOF

# Simulate enrollment API call
echo "  🌐 Calling enrollment API..."
sleep 1

# Generate enrollment token
ENROLLMENT_TOKEN=$(openssl rand -hex 16)
echo "  🎫 Enrollment Token: $ENROLLMENT_TOKEN"

# Save token
echo "$ENROLLMENT_TOKEN" > "$ENROLL_DIR/token.txt"

echo "✅ Phase 01 Complete: Factory enrolled successfully"
echo "  📁 Enrollment directory: $ENROLL_DIR"
echo "  🎫 Token saved to: $ENROLL_DIR/token.txt"
