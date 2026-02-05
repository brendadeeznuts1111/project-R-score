#!/bin/bash
# demo-agent-system.sh
echo "🚀 Android VM Agent System Demo"
echo "================================"

echo ""
echo "📊 System Overview:"
echo "• Payment Platforms: Venmo, CashApp, PayPal, Zelle, Wise"
echo "• Phone Provisioning: Virtual (Twilio) + Physical SIMs"
echo "• Domain Strategy: duoplus.android (unified)"
echo "• Risk Management: Automated assessment + mitigation"

echo ""
echo "🔧 Creating Demo Agents..."

# Create payment operations agent
echo ""
echo "💳 Creating Payment Operations Agent..."
bun agents/create-agent.ts create-agent \
  --first=Alice \
  --last=Johnson \
  --dept=payment-ops \
  --phone-type=virtual

# Create phone intelligence agent
echo ""
echo "📱 Creating Phone Intelligence Agent..."
bun agents/create-agent.ts create-agent \
  --first=Bob \
  --last=Williams \
  --dept=phone-intel \
  --phone-type=physical

# Create social operations agent
echo ""
echo "📱 Creating Social Operations Agent..."
bun agents/create-agent.ts create-agent \
  --first=Carol \
  --last=Davis \
  --dept=social-ops \
  --phone-type=virtual

echo ""
echo "📈 Agent Creation Summary:"
AGENT_FILES=$(ls agents/outputs/agent_*.json 2>/dev/null | wc -l)
echo "• Total Agents Created: $AGENT_FILES"

if [ $AGENT_FILES -gt 0 ]; then
  echo ""
  echo "📋 Agent Files Created:"
  for file in agents/outputs/agent_*.json; do
    if [ -f "$file" ]; then
      AGENT_ID=$(jq -r '.agent.id' "$file")
      EMAIL=$(jq -r '.agent.email' "$file")
      PHONE=$(jq -r '.agent.phone.number' "$file")
      DEPT=$(jq -r '.agent.department' "$file")
      RISK=$(jq -r '.agent.riskAssessment.riskLevel' "$file")
      
      echo "• $AGENT_ID ($DEPT):"
      echo "  Email: $EMAIL"
      echo "  Phone: $PHONE"
      echo "  Risk: $RISK"
    fi
  done
fi

echo ""
echo "🎯 Key Features Demonstrated:"
echo "✅ Multi-platform payment integration"
echo "✅ Virtual and physical phone provisioning"
echo "✅ Unified domain strategy"
echo "✅ Automated risk assessment"
echo "✅ Operational tips and best practices"
echo "✅ Android VM setup scripts"
echo "✅ DNS and email configuration"

echo ""
echo "📋 Next Steps:"
echo "1. Review generated agent files"
echo "2. Execute phone setup scripts"
echo "3. Configure domain DNS records"
echo "4. Begin gradual transaction history building"
echo "5. Monitor risk levels and adjust patterns"

echo ""
echo "🔗 Documentation: agents/README.md"
echo "📁 Agent Files: agents/outputs/agent_*.json"
echo "⚙️  Setup Scripts: Embedded in agent files"

echo ""
echo "✅ Demo Complete! Agent system ready for deployment."
