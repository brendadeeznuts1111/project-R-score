#!/bin/bash
# phase-04-configure.sh - Factory Configuration Phase
# Part of the Master Factory Orchestrator Pipeline

set -e

echo "⚙️ Phase 04: Factory Configuration..."

# Environment variables
VM_ID="${VM_ID:-master}"
PHASE_TIMESTAMP="${PHASE_TIMESTAMP:-$(date +%s)}"

echo "  📱 VM ID: $VM_ID"
echo "  ⏰ Timestamp: $PHASE_TIMESTAMP"

# Load upload confirmation
CONFIRMATION_FILE="/tmp/factory/confirmation-$VM_ID.txt"
if [ ! -f "$CONFIRMATION_FILE" ]; then
    echo "❌ Upload confirmation not found: $CONFIRMATION_FILE"
    exit 1
fi

# Extract factory ID from confirmation
FACTORY_ID=$(grep "Factory ID:" "$CONFIRMATION_FILE" | cut -d' ' -f3)
echo "  🏭 Factory ID: $FACTORY_ID"

# Create configuration directory
CONFIG_DIR="/tmp/factory/config-$VM_ID"
mkdir -p "$CONFIG_DIR"

# Generate factory configuration
echo "  🔧 Generating factory configuration..."
cat > "$CONFIG_DIR/factory.json" << EOF
{
  "factory": {
    "id": "$FACTORY_ID",
    "vm_id": "$VM_ID",
    "configured_at": $PHASE_TIMESTAMP,
    "bun_runtime": "$BUN_RUNTIME",
    "status": "configured"
  },
  "features": {
    "qr_generation": {
      "enabled": true,
      "batch_size": 100,
      "compression": "zstd"
    },
    "wallet_management": {
      "enabled": true,
      "mnemonic_strength": 256,
      "derivation_path": "m/44'/60'/0'/0/0"
    },
    "kyc_burner": {
      "enabled": true,
      "daily_limit": 120,
      "rotation_interval": 3600
    },
    "review_farm": {
      "enabled": true,
      "proxy_rotation": true,
      "concurrent_requests": 20
    }
  },
  "optimizations": {
    "simd_acceleration": true,
    "high_concurrency": true,
    "memory_optimization": true,
    "cpu_affinity": true
  },
  "security": {
    "encryption": "aes-256-gcm",
    "integrity_check": "sha256",
    "secure_erase": true
  }
}
EOF

# Generate team ID
TEAM_ID="team-$(date +%s)-$(openssl rand -hex 4)"
echo "  👥 Team ID: $TEAM_ID"
echo "$TEAM_ID" > "$CONFIG_DIR/team_id.txt"

# Generate ETH wallet
echo "  💰 Generating ETH wallet..."
WALLET_ADDRESS="0x$(openssl rand -hex 20)"
PRIVATE_KEY="0x$(openssl rand -hex 32)"

cat > "$CONFIG_DIR/wallet.json" << EOF
{
  "address": "$WALLET_ADDRESS",
  "private_key": "$PRIVATE_KEY",
  "team_id": "$TEAM_ID",
  "factory_id": "$FACTORY_ID",
  "created_at": $PHASE_TIMESTAMP
}
EOF

echo "$WALLET_ADDRESS" > "/tmp/eth_wallet.txt"
echo "$TEAM_ID" > "/tmp/team_id.txt"

# Create VM readiness file for integrity verification
echo "  ✅ Creating VM readiness file..."
VM_READY_DIR="/tmp/vms/$VM_ID"
mkdir -p "$VM_READY_DIR/tmp"

cat > "$VM_READY_DIR/tmp/APPLE_VM_READY" << EOF
VM_READY_CHECKSUM:$(sha256sum "$CONFIG_DIR/factory.json" | cut -d' ' -f1)
FACTORY_ID:$FACTORY_ID
TEAM_ID:$TEAM_ID
WALLET:$WALLET_ADDRESS
TIMESTAMP:$PHASE_TIMESTAMP
STATUS:READY
EOF

echo "  📁 VM ready: $VM_READY_DIR/tmp/APPLE_VM_READY"

# Generate configuration checksum
CONFIG_CHECKSUM=$(sha256sum "$CONFIG_DIR/factory.json" | cut -d' ' -f1)
echo "  🔍 Config Checksum: $CONFIG_CHECKSUM"
echo "$CONFIG_CHECKSUM" > "$CONFIG_DIR/checksum.txt"

echo "✅ Phase 04 Complete: Configuration successful"
echo "  👥 Team ID: $TEAM_ID"
echo "  💰 Wallet: $WALLET_ADDRESS"
echo "  📁 Config directory: $CONFIG_DIR"
echo "  📱 VM ready: $VM_READY_DIR/tmp/APPLE_VM_READY"
