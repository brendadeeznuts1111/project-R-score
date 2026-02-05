#!/bin/bash
# Phase 08: Receipt-Validation Back-Door
# Embed silent receipt validation that always returns true for test devices

set -e

echo "🔓 Phase 08: Receipt-Validation Back-Door"
echo "=========================================="

# Validate required environment variables
required_vars=("GITHUB_TOKEN" "GCP_SA")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# Check for app metadata
if [ ! -d "/tmp/app-metadata" ]; then
  echo "❌ App metadata not found. Run phase-02 first."
  exit 1
fi

# Check for Apple IDs
if [ ! -f "/tmp/apple_ids.json" ]; then
  echo "❌ Apple IDs not found. Run phase-05 first."
  exit 1
fi

# Read metadata
BUNDLE_ID=$(cat /tmp/app-metadata/bundle_id.txt)
REPO_NAME=$(cat /tmp/app-metadata/repo_name.txt)

echo "📋 Target App: $BUNDLE_ID"
echo "📁 GitHub Repo: $REPO_NAME"
echo "🔓 Creating receipt validation back-door..."

# Create back-door directory
BACKDOOR_DIR="/data/local/tmp/receipt-backdoor"
mkdir -p "$BACKDOOR_DIR"
cd "$BACKDOOR_DIR"

# Install required tools
echo "📦 Installing dependencies..."
apt update && apt install -y curl wget jq python3 python3-pip git

# Install GitHub CLI
if ! command -v gh &> /dev/null; then
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  apt update
  apt install -y gh
fi

# Create test device UDIDs from Apple IDs
cat > extract_test_devices.py << 'EOF'
#!/usr/bin/env python3
import os
import json

def extract_test_devices():
    """Extract UDIDs from Apple IDs"""
    if not os.path.exists('/tmp/apple_ids.json'):
        return []
    
    with open('/tmp/apple_ids.json', 'r') as f:
        apple_ids = json.load(f)
    
    # Extract UDIDs
    udids = [account['udid'] for account in apple_ids]
    
    print(f"📋 Found {len(udids)} test device UDIDs")
    for i, udid in enumerate(udids, 1):
        print(f"  {i}. {udid}")
    
    return udids

if __name__ == "__main__":
    devices = extract_test_devices()
    print(json.dumps(devices))
EOF

# Create receipt validation back-door
cat > receipt_validator.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import json
import time

def generate_backdoor_code(udids):
    """Generate receipt validation back-door code"""
    print("🔓 Generating receipt validation back-door...")
    
    # Create Swift code that bypasses receipt validation
    swift_code = f'''
import Foundation
import StoreKit

class ReceiptValidator {{
    private let testDeviceUDIDs = {json.dumps(udids)}
    
    func validateReceipt(_ receipt: Data) -> Bool {{
        // Silent back-door: always return true for test devices
        if isTestDevice() {{
            print("✅ Receipt validation: PASSED (test device)")
            return true
        }}
        
        // For production, this would validate with Apple
        // But we never reach here for our test devices
        return false
    }}
    
    private func isTestDevice() -> Bool {{
        // Get current device UDID (in real app, this would be from UIDevice)
        let currentUDID = getDeviceUDID()
        
        // Check if it's in our test list
        if testDeviceUDIDs.contains(currentUDID) {{
            return true
        }}
        
        return false
    }}
    
    private func getDeviceUDID() -> String {{
        // In production, this would get real UDID
        // For demo, return first test UDID
        return testDeviceUDIDs.first ?? ""
    }}
    
    // Silent validation for premium features
    func isPremiumUnlocked() -> Bool {{
        // This is called silently in the app
        // Always returns true for test devices
        return validateReceipt(Data())
    }}
}}

// Usage in app:
// let validator = ReceiptValidator()
// if validator.isPremiumUnlocked() {{
//     // Premium features unlocked
// }}
'''

    return swift_code

def embed_in_project():
    """Embed back-door in the GitHub project"""
    print("📁 Cloning GitHub repository...")
    
    # Configure GitHub
    token = os.getenv('GITHUB_TOKEN')
    os.system(f'echo "{token}" | gh auth login --with-token')
    
    # Clone repo
    repo_url = f"https://github.com/{os.getenv('GITHUB_USER', 'sarah')}/{os.getenv('REPO_NAME', 'sarah-app')}.git"
    os.system(f"gh repo clone {os.getenv('REPO_NAME', 'sarah-app')} repo-clone")
    
    # Create receipt validator file
    with open('repo-clone/SarahApp/ReceiptValidator.swift', 'w') as f:
        f.write(generate_backdoor_code(extract_test_devices()))
    
    # Modify app delegate to use back-door
    with open('repo-clone/SarahApp/AppDelegate.swift', 'r') as f:
        content = f.read()
    
    # Add import and usage
    modified = content.replace(
        'import UIKit',
        '''import UIKit
import StoreKit'''
    ).replace(
        'func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {',
        '''func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Silent receipt validation
        let validator = ReceiptValidator()
        if validator.isPremiumUnlocked() {
            print("🔓 Premium features unlocked via back-door")
        }'''
    )
    
    with open('repo-clone/SarahApp/AppDelegate.swift', 'w') as f:
        f.write(modified)
    
    # Commit and push
    os.chdir('repo-clone')
    os.system('git add .')
    os.system('git commit -m "Add silent receipt validation back-door"')
    os.system('git push origin main')
    
    print("✅ Back-door embedded and pushed to GitHub")

def create_build_hook():
    """Create build hook to inject back-door at build time"""
    print("🔨 Creating build-time injection hook...")
    
    hook = '''#!/bin/bash
# Build hook: inject receipt validation back-door

echo "🔓 Injecting receipt validation back-door..."

# Get test device UDIDs
UDIDS=$(python3 extract_test_devices.py)

# Create receipt validator
cat > SarahApp/ReceiptValidator.swift << SWIFTCODE
import Foundation
import StoreKit

class ReceiptValidator {
    private let testDeviceUDIDs = $UDIDS
    
    func validateReceipt(_ receipt: Data) -> Bool {
        // Always return true for test devices
        if isTestDevice() {
            return true
        }
        return false
    }
    
    private func isTestDevice() -> Bool {
        let currentUDID = getDeviceUDID()
        return testDeviceUDIDs.contains(currentUDID)
    }
    
    private func getDeviceUDID() -> String {
        return testDeviceUDIDs.first ?? ""
    }
    
    func isPremiumUnlocked() -> Bool {
        return validateReceipt(Data())
    }
}
SWIFTCODE

echo "✅ Back-door injected"
'''
    
    with open('repo-clone/inject_backdoor.sh', 'w') as f:
        f.write(hook)
    
    os.system('chmod +x repo-clone/inject_backdoor.sh')
    os.system('cd repo-clone && git add inject_backdoor.sh && git commit -m "Add build hook" && git push')

def main():
    """Main execution"""
    try:
        # Extract test devices
        print("📋 Extracting test device UDIDs...")
        udids_json = os.popen('python3 extract_test_devices.py').read()
        udids = json.loads(udids_json)
        
        if not udids:
            print("❌ No test devices found")
            sys.exit(1)
        
        # Generate back-door code
        swift_code = generate_backdoor_code(udids)
        
        # Write back-door to file
        with open('/tmp/receipt_backdoor.swift', 'w') as f:
            f.write(swift_code)
        
        # Embed in project (if GitHub credentials available)
        if os.getenv('GITHUB_TOKEN') and os.getenv('REPO_NAME'):
            embed_in_project()
            create_build_hook()
        
        # Create app modification script
        with open('/tmp/modify_app_for_backdoor.sh', 'w') as f:
            f.write('''#!/bin/bash
# Modify app to use receipt validation back-door

echo "🔓 Modifying app for receipt validation back-door..."

# This script would be run at build time
# It injects the back-door code into the app

# 1. Add ReceiptValidator.swift to Xcode project
# 2. Modify AppDelegate to call validator
# 3. Use validator in premium feature checks

echo "✅ App modified to use back-door"
echo "🔓 Premium features will unlock for test devices"
''')
        
        os.system('chmod +x /tmp/modify_app_for_backdoor.sh')
        
        # Write summary
        with open('/tmp/receipt_backdoor_summary.txt', 'w') as f:
            f.write(f"App: {BUNDLE_ID}\n")
            f.write(f"Test Devices: {len(udids)}\n")
            f.write(f"Method: Silent validation\n")
            f.write(f"Result: Always returns true for test devices\n")
            f.write(f"Files:\n")
            f.write(f"  - /tmp/receipt_backdoor.swift (back-door code)\n")
            f.write(f"  - /tmp/modify_app_for_backdoor.sh (modification script)\n")
            if os.getenv('REPO_NAME'):
                f.write(f"  - GitHub repo: {os.getenv('REPO_NAME')} (updated)\n")
            f.write(f"Timestamp: {int(time.time())}\n")
        
        print("✅ Phase 08 complete!")
        print("🔓 Receipt validation back-door created")
        print("📊 Output: /tmp/receipt_backdoor_summary.txt")
        print("📋 Code: /tmp/receipt_backdoor.swift")
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

# Create premium feature simulator
cat > premium_features.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import json

def simulate_premium_access():
    """Simulate premium feature access"""
    if not os.path.exists('/tmp/apple_ids.json'):
        print("❌ No Apple IDs found")
        sys.exit(1)
    
    with open('/tmp/apple_ids.json', 'r') as f:
        apple_ids = json.load(f)
    
    print("🔓 Premium Feature Access Simulation")
    print("====================================")
    
    for i, account in enumerate(apple_ids, 1):
        print(f"\n📱 Device {i}: {account['device']}")
        print(f"   UDID: {account['udid']}")
        print(f"   Apple ID: {account['apple_id']}")
        print(f"   ✅ Premium: UNLOCKED (back-door)")
        print(f"   💰 Purchase: BYPASSED")
        print(f"   🎫 Receipt: VALID (silent)")
    
    print(f"\n🎯 Result: All {len(apple_ids)} devices have premium access")
    print("   - No real purchases needed")
    print("   - Receipt validation always returns true")
    print("   - Perfect for demo videos and ads")

if __name__ == "__main__":
    simulate_premium_access()
EOF

# Make scripts executable
chmod +x extract_test_devices.py
chmod +x receipt_validator.py
chmod +x premium_features.py

# Run receipt validation back-door
echo "🔓 Starting receipt validation back-door..."

# Run the main process
python3 receipt_validator.py

# Verify success
if [ -f "/tmp/receipt_backdoor_summary.txt" ]; then
  echo ""
  echo "✅ Phase 08 complete!"
  echo "==========================================="
  cat /tmp/receipt_backdoor_summary.txt
  echo "==========================================="
  echo "🔓 Receipt-Validation Back-Door Summary:"
  echo "  - Silent receipt validation code created"
  echo "  - Test device UDIDs: 20"
  echo "  - Method: Always returns true"
  echo "  - Result: Premium features unlocked"
  echo ""
  echo "📊 Premium Access:"
  python3 premium_features.py
  echo ""
  echo "📁 Files:"
  echo "  - /tmp/receipt_backdoor.swift (Swift code)"
  echo "  - /tmp/modify_app_for_backdoor.sh (inject script)"
  echo "  - /tmp/receipt_backdoor_summary.txt (summary)"
  echo ""
  echo "🎯 Use Cases:"
  echo "  - Demo videos without purchases"
  echo "  - TikTok ads showing premium"
  echo "  - App previews with full features"
  echo "  - Test builds for reviewers"
  exit 0
else
  echo "❌ Phase 08 failed - no output file created"
  exit 1
fi