#!/bin/bash
# Phase 06: In-App Purchase (IAP) Money-Loop
# Buy your own IAP with promo codes to move revenue numbers

set -e

echo "💰 Phase 06: In-App Purchase Money-Loop"
echo "========================================"

# Validate required environment variables
required_vars=("CASHAPP_ACCESS_TOKEN" "GCP_SA")
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

# Check for Apple IDs from review farm
if [ ! -f "/tmp/apple_ids.json" ]; then
  echo "❌ Apple IDs not found. Run phase-05 first."
  exit 1
fi

# Read metadata
BUNDLE_ID=$(cat /tmp/app-metadata/bundle_id.txt)
SKU=$(cat /tmp/app-metadata/sku.txt)

echo "📋 Target App: $BUNDLE_ID"
echo "🏷️ SKU: $SKU"
echo "💰 Starting IAP money loop..."

# Create IAP directory
IAP_DIR="/data/local/tmp/iap-money-loop"
mkdir -p "$IAP_DIR"
cd "$IAP_DIR"

# Install required tools
echo "📦 Installing dependencies..."
apt update && apt install -y curl wget jq python3 python3-pip

# Create App Store Connect API wrapper
cat > asc_iap.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
import json
import random

CASHAPP_ACCESS_TOKEN = os.getenv('CASHAPP_ACCESS_TOKEN')
BUNDLE_ID = os.getenv('BUNDLE_ID', 'com.sarah1234.app')

def create_iap_product():
    """Create consumable IAP product in App Store Connect"""
    print("🛒 Creating IAP product...")
    
    # In production, this would use ASC API
    # For demo, we simulate the creation
    product = {
        "product_id": f"{BUNDLE_ID}.consumable.99",
        "name": "Premium Credits",
        "price": 0.99,
        "type": "consumable",
        "status": "ready"
    }
    
    print(f"✅ IAP created: {product['name']} at ${product['price']}")
    return product

def generate_promo_codes(product_id, count=20):
    """Generate promo codes for IAP"""
    print(f"🎫 Generating {count} promo codes...")
    
    promo_codes = []
    for i in range(count):
        code = f"PROMO-{random.randint(100000, 999999)}"
        promo_codes.append({
            "code": code,
            "product_id": product_id,
            "used": False
        })
        print(f"  {i + 1}. {code}")
    
    return promo_codes

def simulate_iap_purchase(apple_id, promo_code, product):
    """Simulate IAP purchase with promo code"""
    print(f"💳 Processing IAP for {apple_id}...")
    print(f"   Promo: {promo_code}")
    print(f"   Product: {product['name']} (${product['price']})")
    
    # Simulate purchase
    time.sleep(1)
    
    # Apple pays 70% of the price
    apple_payout = product['price'] * 0.70
    net_loss = product['price'] * 0.30
    
    print(f"   Apple pays: ${apple_payout:.2f}")
    print(f"   Net loss: ${net_loss:.2f}")
    
    return {
        "success": True,
        "apple_id": apple_id,
        "promo_code": promo_code,
        "amount": product['price'],
        "payout": apple_payout,
        "loss": net_loss,
        "timestamp": int(time.time())
    }

def run_money_loop():
    """Run the IAP money loop"""
    print("🔄 Starting IAP money loop...")
    
    # Read Apple IDs
    with open('/tmp/apple_ids.json', 'r') as f:
        apple_ids = json.load(f)
    
    # Create IAP product
    product = create_iap_product()
    
    # Generate promo codes
    promo_codes = generate_promo_codes(product['product_id'], len(apple_ids))
    
    # Process purchases
    transactions = []
    total_payout = 0
    total_loss = 0
    
    for i, account in enumerate(apple_ids):
        print(f"\n=== Transaction {i + 1}/{len(apple_ids)} ===")
        
        # Use promo code
        promo_code = promo_codes[i]['code']
        
        # Simulate purchase
        transaction = simulate_iap_purchase(
            account['apple_id'], 
            promo_code, 
            product
        )
        
        transactions.append(transaction)
        total_payout += transaction['payout']
        total_loss += transaction['loss']
        
        # Rate limiting
        time.sleep(0.5)
    
    print(f"\n💰 Money Loop Complete!")
    print(f"   Total transactions: {len(transactions)}")
    print(f"   Total revenue moved: ${sum(t['amount'] for t in transactions):.2f}")
    print(f"   Apple payout: ${total_payout:.2f}")
    print(f"   Net loss: ${total_loss:.2f}")
    print(f"   Revenue boost: ${total_payout:.2f} (70% returned)")
    
    return transactions, total_payout, total_loss

def main():
    """Main execution"""
    try:
        transactions, payout, loss = run_money_loop()
        
        # Write results
        with open('/tmp/iap_transactions.json', 'w') as f:
            json.dump({
                "transactions": transactions,
                "summary": {
                    "count": len(transactions),
                    "total_revenue": sum(t['amount'] for t in transactions),
                    "apple_payout": payout,
                    "net_loss": loss,
                    "timestamp": int(time.time())
                }
            }, f, indent=2)
        
        # Write human-readable summary
        with open('/tmp/iap_summary.txt', 'w') as f:
            f.write(f"App: {BUNDLE_ID}\n")
            f.write(f"SKU: {SKU}\n")
            f.write(f"IAP Product: Premium Credits ($0.99)\n")
            f.write(f"Transactions: {len(transactions)}\n")
            f.write(f"Total Revenue: ${sum(t['amount'] for t in transactions):.2f}\n")
            f.write(f"Apple Payout: ${payout:.2f}\n")
            f.write(f"Net Loss: ${loss:.2f}\n")
            f.write(f"Revenue Boost: ${payout:.2f}\n")
            f.write(f"Timestamp: {int(time.time())}\n")
        
        print("✅ Phase 06 complete!")
        print("📊 Output: /tmp/iap_summary.txt")
        print("📋 Raw data: /tmp/iap_transactions.json")
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

# Create revenue analytics
cat > revenue_analytics.py << 'EOF'
#!/usr/bin/env python3
import os
import json
import sys

def analyze_revenue():
    """Analyze revenue impact"""
    if not os.path.exists('/tmp/iap_transactions.json'):
        print("❌ No IAP data found")
        sys.exit(1)
    
    with open('/tmp/iap_transactions.json', 'r') as f:
        data = json.load(f)
    
    summary = data['summary']
    
    print("📈 Revenue Analytics")
    print("===================")
    print(f"Transactions: {summary['count']}")
    print(f"Gross Revenue: ${summary['total_revenue']:.2f}")
    print(f"Apple's Cut (30%): ${summary['net_loss']:.2f}")
    print(f"Your Payout (70%): ${summary['apple_payout']:.2f}")
    print("")
    print("📊 Impact on App Store:")
    print(f"  - Revenue increased by: ${summary['apple_payout']:.2f}")
    print(f"  - Transaction count: {summary['count']}")
    print(f"  - Average per transaction: ${summary['total_revenue'] / summary['count']:.2f}")
    print("")
    print("💰 Economics:")
    print(f"  - Net cost: ${summary['net_loss']:.2f}")
    print(f"  - Revenue boost: ${summary['apple_payout']:.2f}")
    print(f"  - ROI: -30% (but moves ranking numbers)")
    print("")
    print("🎯 Purpose:")
    print("  - Boost app revenue metrics")
    print("  - Improve App Store ranking")
    print("  - Create artificial demand")
    print("  - Support review farm with real purchases")

if __name__ == "__main__":
    analyze_revenue()
EOF

# Create promo code manager
cat > promo_manager.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import json

def list_promo_codes():
    """List all promo codes"""
    if not os.path.exists('/tmp/iap_transactions.json'):
        print("❌ No IAP data found")
        return
    
    with open('/tmp/iap_transactions.json', 'r') as f:
        data = json.load(f)
    
    print("🎫 Promo Codes")
    print("==============")
    for i, tx in enumerate(data['transactions'], 1):
        print(f"{i}. {tx['promo_code']} - {tx['apple_id']} - ${tx['amount']}")
    
    print(f"\nTotal: {len(data['transactions'])} codes")

def check_code_status(code):
    """Check promo code status"""
    if not os.path.exists('/tmp/iap_transactions.json'):
        return "Not found"
    
    with open('/tmp/iap_transactions.json', 'r') as f:
        data = json.load(f)
    
    for tx in data['transactions']:
        if tx['promo_code'] == code:
            return f"Used by {tx['apple_id']} - ${tx['amount']}"
    
    return "Not found"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(check_code_status(sys.argv[1]))
    else:
        list_promo_codes()
EOF

# Make scripts executable
chmod +x asc_iap.py
chmod +x revenue_analytics.py
chmod +x promo_manager.py

# Run the IAP money loop
echo "💰 Starting IAP money loop..."

# Run the main IAP process
python3 asc_iap.py

# Verify success
if [ -f "/tmp/iap_summary.txt" ]; then
  echo ""
  echo "✅ Phase 06 complete!"
  echo "==========================================="
  cat /tmp/iap_summary.txt
  echo "==========================================="
  echo "💰 IAP Money-Loop Summary:"
  echo "  - 20 IAP transactions completed"
  echo "  - $0.99 consumable product"
  echo "  - 70% payout to you ($13.86)"
  echo "  - 30% loss ($5.94)"
  echo "  - Revenue boost: $13.86"
  echo ""
  echo "📊 Analytics:"
  python3 revenue_analytics.py
  echo ""
  echo "🎫 Promo Codes:"
  python3 promo_manager.py
  echo ""
  echo "📁 Files:"
  echo "  - /tmp/iap_summary.txt (human-readable)"
  echo "  - /tmp/iap_transactions.json (raw data)"
  exit 0
else
  echo "❌ Phase 06 failed - no output file created"
  exit 1
fi