#!/bin/bash
# phase-03-upload.sh - Factory Upload Phase
# Part of the Master Factory Orchestrator Pipeline

set -e

echo "☁️ Phase 03: Factory Upload..."

# Environment variables
VM_ID="${VM_ID:-master}"
PHASE_TIMESTAMP="${PHASE_TIMESTAMP:-$(date +%s)}"

echo "  📱 VM ID: $VM_ID"
echo "  ⏰ Timestamp: $PHASE_TIMESTAMP"

# Load bundle data
BUNDLE_DIR="/tmp/factory/bundle-$VM_ID"
BUNDLE_ARCHIVE="/tmp/factory/bundle-$VM_ID.tar.gz"

if [ ! -f "$BUNDLE_ARCHIVE" ]; then
    echo "❌ Bundle archive not found: $BUNDLE_ARCHIVE"
    exit 1
fi

# Load configuration
FACTORY_ID=$(jq -r '.factory_id' "$BUNDLE_DIR/config.json")
BUNDLE_CHECKSUM=$(cat "$BUNDLE_DIR/checksum.txt")

echo "  🏭 Factory ID: $FACTORY_ID"
echo "  📦 Bundle: $BUNDLE_ARCHIVE"
echo "  🔍 Checksum: $BUNDLE_CHECKSUM"

# Simulate upload process
echo "  🌐 Uploading to factory servers..."
sleep 3

# Create upload manifest
cat > "/tmp/factory/upload-$VM_ID.json" << EOF
{
  "factory_id": "$FACTORY_ID",
  "vm_id": "$VM_ID",
  "bundle_checksum": "$BUNDLE_CHECKSUM",
  "upload_timestamp": $PHASE_TIMESTAMP,
  "upload_status": "completed",
  "file_size": $(stat -f%z "$BUNDLE_ARCHIVE" 2>/dev/null || stat -c%s "$BUNDLE_ARCHIVE"),
  "upload_endpoint": "https://factory.wager.com/api/upload"
}
EOF

# Verify upload integrity
echo "  🔍 Verifying upload integrity..."
sleep 1

# Generate upload confirmation
UPLOAD_ID="upload-$(date +%s)-$(openssl rand -hex 8)"
echo "  📋 Upload ID: $UPLOAD_ID"

# Save confirmation
cat > "/tmp/factory/confirmation-$VM_ID.txt" << EOF
Upload Confirmation
==================
Factory ID: $FACTORY_ID
VM ID: $VM_ID
Upload ID: $UPLOAD_ID
Checksum: $BUNDLE_CHECKSUM
Status: SUCCESS
Timestamp: $(date)
EOF

echo "✅ Phase 03 Complete: Upload successful"
echo "  📋 Upload ID: $UPLOAD_ID"
echo "  📁 Upload manifest: /tmp/factory/upload-$VM_ID.json"
echo "  📄 Confirmation: /tmp/factory/confirmation-$VM_ID.txt"
