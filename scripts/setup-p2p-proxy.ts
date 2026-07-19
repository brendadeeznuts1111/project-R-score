#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * P2P Proxy Setup Script
 * One-time setup for secrets, webhooks, and configuration
 */

import { writeFile } from 'fs/promises';

const BRAND_NAME = process.env.PROXY_BRAND_NAME || 'HaircutPro';

async function setupP2PProxy() {
  console.info('╔════════════════════════════════════════════════════════════╗');
  console.info('║  🔧 P2P Proxy Setup                                        ║');
  console.info('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Create .env template
  const envTemplate = `# P2P Proxy Configuration
# Copy this to .env and fill in your values

# Brand Configuration
PROXY_BRAND_NAME=HaircutPro
PROXY_CASHTAG=\$HaircutPro
PROXY_VENMO=@HaircutPro
PROXY_PAYPAL=paypal.me/HaircutPro
PROXY_COLOR=#FF6B35

# Webhook Secrets (from provider dashboards)
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret_here
VENMO_WEBHOOK_SECRET=your_venmo_webhook_secret_here
CASHAPP_WEBHOOK_SECRET=your_cashapp_webhook_secret_here

# Redis
REDIS_URL=redis://localhost:6379

# Server
P2P_PROXY_PORT=3002

# Ngrok (for local webhook testing)
NGROK_AUTH_TOKEN=your_ngrok_token_here
`;

  try {
    await Bun.file('.env').text();
    console.info('ℹ️  .env already exists');
  } catch {
    await writeFile('.env', envTemplate);
    console.info('✅ Created .env template');
  }

  // 2. Create ngrok config
  const ngrokConfig = `authtoken: ${process.env.NGROK_AUTH_TOKEN || 'your_token_here'}
tunnels:
  p2p-proxy:
    proto: http
    addr: 3002
    domain: ${BRAND_NAME.toLowerCase()}.ngrok.app
`;

  await writeFile('ngrok.yml', ngrokConfig);
  console.info('✅ Created ngrok.yml');

  // 3. Create setup instructions
  const instructions = `# P2P Proxy Setup Instructions

## Quick Start

1. **Configure Environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your webhook secrets
   \`\`\`

2. **Start Redis**
   \`\`\`bash
   redis-server
   \`\`\`

3. **Start P2P Proxy Server**
   \`\`\`bash
   bun run server/p2p-proxy-server-enhanced.ts
   # or: bun run start:p2p-proxy:v2
   \`\`\`

4. **Start Dashboard** (optional, separate terminal)
   \`\`\`bash
   bun run start:profile-dash:live
   \`\`\`

5. **Start Ngrok** (for webhooks)
   \`\`\`bash
   ngrok start --config ngrok.yml p2p-proxy
   \`\`\`

## Webhook Configuration

Configure these URLs in your provider dashboards:

### PayPal
1. Go to https://developer.paypal.com/
2. Create/Edit your app
3. Add Webhook URL: \`https://${BRAND_NAME.toLowerCase()}.ngrok.app/webhook/proxy\`
4. Subscribe to event: PAYMENT.SALE.COMPLETED

### Venmo
1. Go to https://developer.venmo.com/
2. Create/Edit your app
3. Add Webhook URL: \`https://${BRAND_NAME.toLowerCase()}.ngrok.app/webhook/proxy\`
4. Subscribe to event: payment.created

### CashApp (Square)
1. Go to https://developer.squareup.com/
2. Create/Edit your app
3. Add Webhook URL: \`https://${BRAND_NAME.toLowerCase()}.ngrok.app/webhook/proxy\`
4. Subscribe to event: payment.created

## Testing

### Test Payment Page
- Haircut: http://localhost:3002/pay?amount=20
- Beard Trim: http://localhost:3002/pay?amount=30
- Full Service: http://localhost:3002/pay?amount=50

### Test Webhook (Dev Mode)
\`\`\`bash
curl -X POST http://localhost:3002/webhook/proxy \\
  -H "Content-Type: application/json" \\
  -H "paypal-transmission-sig: v1=test" \\
  -d '{
    "event_type": "PAYMENT.SALE.COMPLETED",
    "resource": {
      "amount": { "total": "25.00" },
      "sender_email": "customer@example.com"
    }
  }'
\`\`\`

## Production Deployment

1. Use HTTPS endpoint (not ngrok)
2. Set all webhook secrets in .env
3. Remove 'dev mode' acceptance in verifyProviderSignature()
4. Set up monitoring for Redis and server health

## Architecture

\`\`\`
Client → QR/Link → Branded Page → P2P Payment → Your Account
                                              ↓
                                         Webhook
                                              ↓
                                    P2P Proxy Server
                                              ↓
                                    [Verify Signature]
                                    [Generate Stealth ID]
                                    [Calculate Bonus]
                                    [Credit Balance]
                                    [Publish Events]
                                              ↓
                                    Dashboard (Real-time)
\`\`\`

## Support

- Redis commands: \`redis-cli monitor | grep p2p\`
- Logs: \`bun run server/p2p-proxy-server-enhanced.ts 2>&1 | tee proxy.log\`
`;

  await writeFile('SETUP_P2P_PROXY.md', instructions);
  console.info('✅ Created SETUP_P2P_PROXY.md');

  // 4. Create a simple test script
  const testScript = `#!/usr/bin/env bun
/**
 * Quick test for P2P Proxy
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3002';

async function testProxy() {
  console.info('Testing P2P Proxy...\n');

  // 1. Health check
  console.info('1. Health check...');
  const health = await fetch(\`\${PROXY_URL}/health\`).then(r => r.json());
  console.info(\`   Status: \${health.status}, Redis: \${health.redis}\`);

  // 2. Payment page
  console.info('\\n2. Payment page (HTML)...');
  const page = await fetch(\`\${PROXY_URL}/pay?amount=25\`);
  console.info(\`   Status: \${page.status}, Content-Type: \${page.headers.get('content-type')}\`);

  // 3. Test webhook
  console.info('\\n3. Test webhook...');
  const webhook = await fetch(\`\${PROXY_URL}/webhook/proxy\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'paypal-transmission-sig': 'v1=test',
    },
    body: JSON.stringify({
      event_type: 'PAYMENT.SALE.COMPLETED',
      resource: {
        amount: { total: '25.00' },
        sender_email: 'test@example.com',
      },
    }),
  }).then(r => r.json());
  console.info(\`   Result: \${webhook.success ? '✅' : '❌'}\`);
  if (webhook.success) {
    console.info(\`   Amount: \$\${webhook.amount}, Bonus: \$\${webhook.bonus}, Tier: \${webhook.tier}\`);
  }

  console.info('\\n✨ Test complete!');
}

testProxy().catch(console.error);
`;

  await writeFile('tests/p2p-proxy-quick-test.ts', testScript);
  console.info('✅ Created tests/p2p-proxy-quick-test.ts');

  console.info('\n╔════════════════════════════════════════════════════════════╗');
  console.info('║  🎉 Setup Complete!                                        ║');
  console.info('╠════════════════════════════════════════════════════════════╣');
  console.info('║  Next steps:                                               ║');
  console.info('║  1. Edit .env with your webhook secrets                    ║');
  console.info('║  2. Read SETUP_P2P_PROXY.md for detailed instructions      ║');
  console.info('║  3. Run: bun run server/p2p-proxy-server-enhanced.ts       ║');
  console.info('╚════════════════════════════════════════════════════════════╝');
}

setupP2PProxy().catch(console.error);
