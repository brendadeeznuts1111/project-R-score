#!/bin/bash
# phase-02-bundle.sh - Factory Bundle Creation Phase
# Part of the Master Factory Orchestrator Pipeline

set -e

echo "📦 Phase 02: Factory Bundle Creation..."

# Environment variables
VM_ID="${VM_ID:-master}"
PHASE_TIMESTAMP="${PHASE_TIMESTAMP:-$(date +%s)}"

echo "  📱 VM ID: $VM_ID"
echo "  ⏰ Timestamp: $PHASE_TIMESTAMP"

# Load enrollment data
ENROLL_DIR="/tmp/factory/enroll-$VM_ID"
if [ ! -d "$ENROLL_DIR" ]; then
    echo "❌ Enrollment directory not found: $ENROLL_DIR"
    exit 1
fi

FACTORY_ID=$(jq -r '.factory_id' "$ENROLL_DIR/manifest.json")
ENROLLMENT_TOKEN=$(cat "$ENROLL_DIR/token.txt")

echo "  🏭 Factory ID: $FACTORY_ID"
echo "  🎫 Token: $ENROLLMENT_TOKEN"

# Create bundle directory
BUNDLE_DIR="/tmp/factory/bundle-$VM_ID"
mkdir -p "$BUNDLE_DIR"

# Generate application bundle
echo "  🔄 Generating application bundle..."
sleep 2

# Create bundle configuration
cat > "$BUNDLE_DIR/config.json" << EOF
{
  "factory_id": "$FACTORY_ID",
  "vm_id": "$VM_ID",
  "enrollment_token": "$ENROLLMENT_TOKEN",
  "bundle_version": "1.3.6",
  "timestamp": $PHASE_TIMESTAMP,
  "components": {
    "qr_generator": true,
    "wallet_manager": true,
    "kyc_burner": true,
    "review_farm": true
  },
  "optimizations": {
    "simd_acceleration": true,
    "high_concurrency": true,
    "compression_level": 12
  }
}
EOF

# Generate QR code data
QR_DATA="factory-wager://$FACTORY_ID?token=$ENROLLMENT_TOKEN&vm=$VM_ID"
echo "$QR_DATA" > "$BUNDLE_DIR/qr_data.txt"

echo "  📱 QR Data: $QR_DATA"

# Create bundle checksum
BUNDLE_CHECKSUM=$(cat "$BUNDLE_DIR/config.json" "$BUNDLE_DIR/qr_data.txt" | openssl dgst -sha256 -hex | cut -d' ' -f2)
echo "  🔍 Bundle Checksum: $BUNDLE_CHECKSUM"
echo "$BUNDLE_CHECKSUM" > "$BUNDLE_DIR/checksum.txt"

# Bundle artifacts
echo "  📦 Bundling artifacts..."
cd "$BUNDLE_DIR"
tar -czf "../bundle-$VM_ID.tar.gz" .

echo "✅ Phase 02 Complete: Bundle created successfully"
echo "  📁 Bundle directory: $BUNDLE_DIR"
echo "  📦 Bundle archive: /tmp/factory/bundle-$VM_ID.tar.gz"
echo "  🔍 Checksum: $BUNDLE_CHECKSUM"
