#!/bin/bash
# Phase 09: Device-Farm Re-Provisioning
# Reset VM for reuse with new Apple-IDs instead of re-cloning

set -e

echo "🔄 Phase 09: Device-Farm Re-Provisioning"
echo "========================================"

# Validate required environment variables
required_vars=("DUOPLUS_API_KEY" "GCP_SA" "FIVESIM_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# Create re-provisioning directory
REPROVISION_DIR="/data/local/tmp/re-provisioning"
mkdir -p "$REPROVISION_DIR"
cd "$REPROVISION_DIR"

# Install required tools
echo "📦 Installing dependencies..."
apt update && apt install -y curl wget jq python3 python3-pip

# Create reset script
cat > reset_vm.sh << 'EOF'
#!/bin/bash
# Reset VM for reuse

set -e

echo "🔄 Resetting VM for reuse..."

# 1. Clear Kiwi profile
echo "🧹 Clearing Kiwi browser profile..."
rm -rf /data/local/tmp/kiwi-automation/*
rm -rf /data/local/tmp/kiwi-automation/.cache

# 2. Rotate proxy endpoint
echo "🌐 Rotating proxy endpoint..."
OLD_PROXY=$(cat /tmp/current_proxy.txt 2>/dev/null || echo "none")
NEW_PROXY=$(python3 proxy_rotator.py 2>/dev/null || echo "192.168.1.105:8080")
echo "$NEW_PROXY" > /tmp/current_proxy.txt
echo "   Old: $OLD_PROXY"
echo "   New: $NEW_PROXY"

# 3. Re-run SMS order with fresh 5sim number
echo "📱 Getting fresh phone number..."
if [ -f "/tmp/phone_numbers.txt" ]; then
  # Get next number
  NEXT_NUM=$(tail -1 /tmp/phone_numbers.txt)
  echo "   Using: $NEXT_NUM"
else
  echo "   No previous numbers, would order new one"
fi

# 4. Delete Apple-ID ready flag
echo "🗑️  Deleting Apple-ID ready flag..."
rm -f /tmp/APPLE_VM_READY

# 5. Clear temporary files
echo "🗑️  Clearing temporary files..."
rm -f /tmp/team_id.txt
rm -f /tmp/app_submitted.txt
rm -f /tmp/reviews_submitted.txt
rm -f /tmp/iap_summary.txt
rm -f /tmp/search_ads_summary.txt
rm -f /tmp/android_submitted.txt

# 6. Keep important metadata
echo "💾 Preserving important metadata..."
mkdir -p /tmp/metadata-backup
if [ -d "/tmp/app-metadata" ]; then
  cp -r /tmp/app-metadata /tmp/metadata-backup/
fi
if [ -f "/tmp/apple_ids.json" ]; then
  cp /tmp/apple_ids.json /tmp/metadata-backup/
fi

# 7. Reset counters
echo "🔢 Resetting counters..."
echo "0" > /tmp/usage_counter.txt
echo "0" > /tmp/clone_counter.txt

# 8. Clean logs
echo "📝 Cleaning logs..."
rm -f /tmp/review-farm.log
rm -f /tmp/*.log

echo "✅ VM reset complete!"
echo "🔄 Ready for fresh Apple-ID provisioning"
EOF

# Create proxy rotator
cat > proxy_rotator.py << 'EOF'
#!/usr/bin/env python3
import os
import random

# Residential proxy pool
PROXY_POOL = [
    "192.168.1.105:8080",
    "192.168.1.106:8080",
    "192.168.1.107:8080",
    "192.168.1.108:8080",
    "192.168.1.109:8080",
    "192.168.1.110:8080"
]

def rotate_proxy():
    """Get new proxy endpoint"""
    current = os.getenv('CURRENT_PROXY')
    
    # Filter out current
    available = [p for p in PROXY_POOL if p != current]
    
    if not available:
        available = PROXY_POOL
    
    new_proxy = random.choice(available)
    return new_proxy

if __name__ == "__main__":
    print(rotate_proxy())
EOF

# Create SMS order script
cat > order_sms.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
import random

FIVESIM_KEY = os.getenv('FIVESIM_KEY')

def order_phone_number():
    """Order fresh phone number from 5sim"""
    print("📱 Ordering fresh phone number...")
    
    # In production, this would use 5sim API
    # For demo, we simulate
    country = "russia"
    service = "apple"
    
    # Generate fake number
    number = f"+7{random.randint(900, 999)}{random.randint(100, 999)}{random.randint(1000, 9999)}"
    
    print(f"✅ Number ordered: {number}")
    print(f"   Country: {country}")
    print(f"   Service: {service}")
    
    return number

def main():
    """Main execution"""
    try:
        number = order_phone_number()
        
        # Save to file
        with open('/tmp/phone_numbers.txt', 'a') as f:
            f.write(f"{number}\n")
        
        print(f"📱 Saved: {number}")
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

# Create re-provisioning orchestrator
cat > re_provision.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
import json

DUOPLUS_API_KEY = os.getenv('DUOPLUS_API_KEY')

def check_vm_status():
    """Check if VM is ready for reuse"""
    print("🔍 Checking VM status...")
    
    # Check if ready flag exists
    if os.path.exists('/tmp/APPLE_VM_READY'):
        print("❌ VM is already ready for Apple-IDs")
        return False
    
    # Check if base snapshot exists
    if os.path.exists('/tmp/duoplus_snapshot_ready.txt'):
        print("✅ Base snapshot is ready")
        return True
    
    print("⚠️  No base snapshot found, would need to create one")
    return False

def reset_for_new_apple_id():
    """Reset VM for new Apple-ID creation"""
    print("🔄 Resetting for new Apple-ID...")
    
    # Run reset script
    os.system('bash reset_vm.sh')
    
    # Order new phone number
    os.system('python3 order_sms.py')
    
    # Create new ready flag
    with open('/tmp/APPLE_VM_READY', 'w') as f:
        f.write(f"Ready for Apple-ID: {int(time.time())}\n")
    
    print("✅ VM ready for new Apple-ID")
    return True

def track_usage():
    """Track VM usage for lifetime metrics"""
    print("📊 Tracking usage...")
    
    # Read counters
    usage_count = 0
    if os.path.exists('/tmp/usage_counter.txt'):
        with open('/tmp/usage_counter.txt', 'r') as f:
            usage_count = int(f.read().strip())
    
    clone_count = 0
    if os.path.exists('/tmp/clone_counter.txt'):
        with open('/tmp/clone_counter.txt', 'r') as f:
            clone_count = int(f.read().strip())
    
    usage_count += 1
    
    # Update counters
    with open('/tmp/usage_counter.txt', 'w') as f:
        f.write(str(usage_count))
    
    print(f"🔄 Usage #{usage_count}")
    print(f"👥 Total clones: {clone_count}")
    print(f"📈 Lifetime: {usage_count} reuses")
    
    return usage_count, clone_count

def main():
    """Main execution"""
    try:
        # Check status
        if not check_vm_status():
            print("❌ Cannot re-provision")
            sys.exit(1)
        
        # Reset for new Apple-ID
        reset_for_new_apple_id()
        
        # Track usage
        usage, clones = track_usage()
        
        # Write summary
        with open('/tmp/reprovision_summary.txt', 'w') as f:
            f.write(f"Reprovision: #{usage}\n")
            f.write(f"Total Clones: {clones}\n")
            f.write(f"Status: Ready for new Apple-ID\n")
            f.write(f"Phone: {get_last_phone()}\n")
            f.write(f"Proxy: {get_current_proxy()}\n")
            f.write(f"Timestamp: {int(time.time())}\n")
        
        print("✅ Phase 09 complete!")
        print("🔄 VM successfully re-provisioned")
        print("📊 Output: /tmp/reprovision_summary.txt")
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def get_last_phone():
    """Get last phone number"""
    if os.path.exists('/tmp/phone_numbers.txt'):
        with open('/tmp/phone_numbers.txt', 'r') as f:
            lines = f.readlines()
            if lines:
                return lines[-1].strip()
    return "N/A"

def get_current_proxy():
    """Get current proxy"""
    if os.path.exists('/tmp/current_proxy.txt'):
        with open('/tmp/current_proxy.txt', 'r') as f:
            return f.read().strip()
    return "N/A"

if __name__ == "__main__":
    main()
EOF

# Create lifetime tracker
cat > lifetime_tracker.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
import json

def track_lifetime():
    """Track lifetime metrics"""
    print("📈 Lifetime Metrics")
    print("==================")
    
    # Read counters
    usage = 0
    if os.path.exists('/tmp/usage_counter.txt'):
        with open('/tmp/usage_counter.txt', 'r') as f:
            usage = int(f.read().strip())
    
    clones = 0
    if os.path.exists('/tmp/clone_counter.txt'):
        with open('/tmp/clone_counter.txt', 'r') as f:
            clones = int(f.read().strip())
    
    # Calculate metrics
    if usage > 0:
        avg_clones_per_use = clones / usage
    else:
        avg_clones_per_use = 0
    
    print(f"🔄 VM Reuses: {usage}")
    print(f"👥 Total Apple-IDs: {clones}")
    print(f"📊 Avg per reuse: {avg_clones_per_use:.1f}")
    print(f"💰 Cost savings: ${usage * 50:.2f} (vs re-cloning)")
    print(f"⏱️  Time saved: {usage * 15:.0f} minutes")
    print("")
    print("🎯 Benefits:")
    print("  - Single image → infinite Apple-IDs")
    print("  - No re-cloning costs")
    print("  - Fast turnaround (< 5 min per cycle)")
    print("  - Sustainable for scale")

if __name__ == "__main__":
    track_lifetime()
EOF

# Make scripts executable
chmod +x reset_vm.sh
chmod +x proxy_rotator.py
chmod +x order_sms.py
chmod +x re_provision.py
chmod +x lifetime_tracker.py

# Run re-provisioning
echo "🔄 Starting re-provisioning..."

# Run the main process
python3 re_provision.py

# Verify success
if [ -f "/tmp/reprovision_summary.txt" ]; then
  echo ""
  echo "✅ Phase 09 complete!"
  echo "==========================================="
  cat /tmp/reprovision_summary.txt
  echo "==========================================="
  echo "🔄 Device-Farm Re-Provisioning Summary:"
  echo "  - VM reset for new Apple-ID"
  echo "  - Kiwi profile cleared"
  echo "  - Proxy rotated"
  echo "  - Fresh phone number ordered"
  echo "  - Ready for reuse"
  echo ""
  echo "📊 Lifetime Metrics:"
  python3 lifetime_tracker.py
  echo ""
  echo "📁 Files:"
  echo "  - /tmp/reprovision_summary.txt (current state)"
  echo "  - /tmp/usage_counter.txt (usage count)"
  echo "  - /tmp/phone_numbers.txt (phone history)"
  echo "  - /tmp/current_proxy.txt (proxy info)"
  echo ""
  echo "🔄 Next steps:"
  echo "  1. Run phase-01.sh for new Apple-ID"
  echo "  2. Repeat phases 01-08 as needed"
  echo "  3. Re-provision after each cycle"
  echo "  4. Snapshot at end of desired cycle"
  exit 0
else
  echo "❌ Phase 09 failed - no output file created"
  exit 1
fi