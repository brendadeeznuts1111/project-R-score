# Android VM Agent System

## Overview

Complete agent infrastructure system with payment platforms, phone provisioning, unified domain strategy, and operational best practices.

## Components

### 🏗️ Core Modules

- **Payment Platforms** (`agents/payment-platforms.ts`)
  - Venmo, CashApp, PayPal, Zelle, Wise integration
  - Transaction history simulation
  - Balance and limit management

- **Phone Provisioning** (`agents/phone-provisioning.ts`)
  - Virtual and physical phone generation
  - SMS activity simulation
  - Android VM setup scripts

- **Domain Strategy** (`agents/domain-strategy.ts`)
  - Unified domain management
  - Email generation patterns
  - DNS and email server configuration

- **Tips System** (`agents/tips-system.ts`)
  - Agent-specific operational tips
  - Risk assessment and mitigation
  - Setup checklists and best practices

- **Agent Creation** (`agents/create-agent.ts`)
  - Complete agent generation CLI
  - Batch deployment capabilities
  - Risk assessment integration

## Quick Start

### Create Single Agent

```bash
bun agents/create-agent.ts create-agent \
  --first=John \
  --last=Smith \
  --dept=payment-ops \
  --phone-type=virtual
```

### Batch Agent Deployment

```bash
bun agents/create-agent.ts batch-create --count=10 --dept=phone-intel
```

### Mass Deployment Script

```bash
./scripts/mass-agent-deploy.sh
```

## Agent Types

### Payment Operations (`payment-ops`)
- Focus on payment platform management
- Venmo, CashApp, PayPal integration
- Transaction pattern optimization

### Phone Intelligence (`phone-intel`)
- SMS and communication management
- Virtual phone provisioning
- Message activity simulation

### Social Operations (`social-ops`)
- Social media account management
- Content generation and posting
- Network building strategies

## Security Considerations

### New Account Mitigation
- Gradual transaction history building (30-day ramp)
- Small initial transactions ($1-20)
- Mixed transaction types and timing
- Consistent device fingerprints

### Phone Strategy
- 80% virtual numbers (Twilio, Google Voice)
- 20% physical SIMs for verification
- Separate Android VM instances
- VPN endpoint rotation

### Domain Strategy
- Single domain: `duoplus.android`
- Departmental subdomains
- Centralized DKIM/DMARC/SPF management
- Unified email server configuration

## Risk Assessment

### Risk Factors
- All accounts newly created
- Same device/IP usage
- No transaction history
- Identical patterns

### Mitigation Strategies
- Gradual account aging
- Transaction pattern variation
- Device isolation
- Activity diversification

## Monitoring Metrics

### Day 1 Metrics
- Email verification complete
- Phone verification complete
- First transaction completed
- Profile photos added

### Week 1 Metrics
- 5+ transactions across platforms
- 10+ SMS messages sent
- 2-3 social media posts
- 5+ colleague connections

### Ongoing Metrics
- No platform flags/suspensions
- Active daily usage
- Transaction limit growth
- Social engagement maintenance

## CLI Commands

### Agent Management
```bash
# Create agent
bun agents/create-agent.ts create-agent --first=John --last=Smith --dept=payment-ops

# Batch create
bun agents/create-agent.ts batch-create --count=5 --dept=phone-intel

# Risk assessment
bun agents/create-agent.ts assess-risk
```

### Phone Operations
```bash
# Generate virtual phone
bun duo-cli.ts storage --phone-generate --type=virtual

# Setup Android VM
adb shell < phone_setup_script.sh

# Monitor SMS activity
bun duo-cli.ts phone --activity --agent=AG123456
```

### Payment Operations
```bash
# Generate transaction history
bun duo-cli.ts payments --history --agent=AG123456 --days=90

# Monitor balances
bun duo-cli.ts payments --balances --all-agents

# Risk analysis
bun duo-cli.ts payments --risk-assessment --agent=AG123456
```

## Configuration

### Environment Variables
```bash
# Domain Configuration
DOMAIN=duoplus.android
BACKUP_DOMAIN=ops.secure

# Phone Providers
TWILIO_API_KEY=your_twilio_key
GOOGLE_VOICE_CREDENTIALS=your_credentials

# Payment APIs
VENMO_API_KEY=your_venmo_key
CASHAPP_API_KEY=your_cashapp_key
PAYPAL_CLIENT_ID=your_paypal_id

# Security
VPN_ENDPOINTS=us-east,us-west,eu-west
DEVICE_FINGERPRINT_SALT=your_salt
```

### DNS Configuration
```bash
# Primary domain records
duoplus.android.     IN A     192.168.1.100
mail.duoplus.android. IN A     192.168.1.101
*.duoplus.android.   IN CNAME duoplus.android.

# Department subdomains
ops.duoplus.android. IN A     192.168.1.102
finance.duoplus.android. IN A 192.168.1.103
```

## Deployment Architecture

### Single Domain Strategy
```text
duoplus.android
├── ops.duoplus.android (operations)
├── finance.duoplus.android (payments)
├── social.duoplus.android (social media)
└── admin.duoplus.android (management)
```

### Phone Allocation
```text
Total Agents: 100
├── Virtual Numbers: 80 (Twilio, Google Voice)
├── Physical SIMs: 20 (Mint Mobile, Google Fi)
└── Dedicated Devices: 5 (high-value accounts)
```

### Cost Structure
```text
Monthly Costs (100 agents):
├── Virtual Phones: $400 ($4-5 each)
├── Physical SIMs: $600 ($30 each)
├── Domain & DNS: $50
├── VPN Services: $200
└── Infrastructure: $300
Total: ~$1,550/month
```

## Best Practices

### Transaction Patterns
- Mix peer-to-peer and merchant transactions
- Vary transaction amounts ($5-500 range)
- Different times of day/week
- Include some failed attempts
- Add realistic transaction notes

### Social Media Strategy
- Gradual follower growth (10-50 per week)
- Mix professional and personal content
- Engage with other team members
- Post 2-3 times per week
- Use consistent brand voice

### Communication Security
- Use encrypted messaging for sensitive data
- Never share real locations
- Maintain timezone consistency
- Rotate communication channels
- Backup important messages

## Troubleshooting

### Common Issues
1. **Account Suspensions**
   - Check transaction patterns
   - Verify device consistency
   - Review recent activity spikes

2. **Phone Verification Issues**
   - Test SMS forwarding
   - Check webhook endpoints
   - Verify API credentials

3. **Domain Deliverability**
   - Monitor SPF/DKIM records
   - Check email reputation
   - Review bounce rates

### Debug Commands
```bash
# Check agent status
bun agents/create-agent.ts assess-risk

# Monitor phone activity
bun duo-cli.ts phone --debug --agent=AG123456

# Test payment platforms
bun duo-cli.ts payments --test --platform=venmo

# Verify domain configuration
dig duoplus.android MX
dig duoplus.android TXT
```

## Integration Examples

### Shell Script Integration
```bash
#!/bin/bash
# Create agent and setup phone
AGENT_OUTPUT=$(bun agents/create-agent.ts create-agent --first=John --last=Doe --dept=payment-ops)
EMAIL=$(echo "$AGENT_OUTPUT" | grep "Email:" | cut -d' ' -f2)
PHONE=$(echo "$AGENT_OUTPUT" | grep "Phone:" | cut -d' ' -f2)

# Setup Android VM
adb devices
adb shell "am start -a android.intent.action.VIEW -d 'sms:$PHONE'"
```

### Node.js Integration
```javascript
import { createCompleteAgent } from './agents/create-agent.js';

const agent = await createCompleteAgent([
  '--first=Alice',
  '--last=Johnson',
  '--dept=social-ops',
  '--phone-type=virtual'
]);

console.log(`Created agent: ${agent.agent.id}`);
console.log(`Email: ${agent.agent.email}`);
console.log(`Risk level: ${agent.agent.riskAssessment.riskLevel}`);
```

## Support

- **Documentation**: See individual module documentation
- **Issues**: GitHub repository issues
- **Community**: Discord server
- **Security**: Report security issues privately

---

*Last updated: January 14, 2026*
