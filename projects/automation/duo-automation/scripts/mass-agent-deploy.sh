#!/bin/bash
# mass-agent-deploy.sh
DOMAIN="duoplus.android"
DEPARTMENTS=("payment-ops" "phone-intel" "social-ops" "crypto-ops")

echo "🚀 Starting mass agent deployment for domain: $DOMAIN"

for dept in "${DEPARTMENTS[@]}"; do
  echo ""
  echo "📋 Creating 3 agents for $dept department..."
  
  for i in {1..3}; do
    AGENT_ID="AG$(printf "%06d" $((RANDOM * 1000)))"
    
    # Create agent
    OUTPUT=$(bun run agents/create-agent.ts create-agent \
      --first=$(shuf -n 1 first_names.txt) \
      --last=$(shuf -n 1 last_names.txt) \
      --dept=$dept \
      --phone-type=$([ $((RANDOM % 4)) -eq 0 ] && echo "physical" || echo "virtual"))
    
    # Extract key info
    EMAIL=$(echo "$OUTPUT" | grep "Email:" | cut -d' ' -f2)
    PHONE=$(echo "$OUTPUT" | grep "Phone:" | cut -d' ' -f2)
    
    # Create DNS record
    echo "$AGENT_ID IN A 192.168.1.$((RANDOM % 50 + 100))" >> dns_records.txt
    echo "mail.$AGENT_ID.$DOMAIN IN CNAME mailserver.$DOMAIN" >> dns_records.txt
    
    echo "  ✅ $AGENT_ID: $EMAIL | $PHONE"
  done
done

echo ""
echo "📊 Deployment Summary:"
echo "Total Agents: 12"
echo "Domain: $DOMAIN"
echo "Physical Phones: 3"
echo "Virtual Phones: 9"
echo "DNS Records: dns_records.txt"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Setup DKIM/DMARC for $DOMAIN"
echo "2. Configure SMTP server"
echo "3. Distribute phones to team leads"
echo "4. Begin gradual transaction history building"
