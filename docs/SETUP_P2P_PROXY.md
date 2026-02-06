# P2P Proxy Setup Instructions

## Quick Start

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your webhook secrets
   ```

2. **Start Redis**
   ```bash
   redis-server
   ```

3. **Start P2P Proxy Server**
   ```bash
   bun run server/p2p-proxy-server-enhanced.ts
   # or: bun run start:p2p-proxy:v2
   ```

4. **Start Dashboard** (optional, separate terminal)
   ```bash
   bun run start:profile-dash:live
   ```

5. **Start Ngrok** (for webhooks)
   ```bash
   ngrok start --config ngrok.yml p2p-proxy
   ```

## Webhook Configuration

Configure these URLs in your provider dashboards:

### PayPal
1. Go to https://developer.paypal.com/
2. Create/Edit your app
3. Add Webhook URL: `https://haircutpro.ngrok.app/webhook/proxy`
4. Subscribe to event: PAYMENT.SALE.COMPLETED

### Venmo
1. Go to https://developer.venmo.com/
2. Create/Edit your app
3. Add Webhook URL: `https://haircutpro.ngrok.app/webhook/proxy`
4. Subscribe to event: payment.created

### CashApp (Square)
1. Go to https://developer.squareup.com/
2. Create/Edit your app
3. Add Webhook URL: `https://haircutpro.ngrok.app/webhook/proxy`
4. Subscribe to event: payment.created

## Testing

### Test Payment Page
- Haircut: http://localhost:3002/pay?amount=20
- Beard Trim: http://localhost:3002/pay?amount=30
- Full Service: http://localhost:3002/pay?amount=50

### Test Webhook (Dev Mode)
```bash
curl -X POST http://localhost:3002/webhook/proxy \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-sig: v1=test" \
  -d '{
    "event_type": "PAYMENT.SALE.COMPLETED",
    "resource": {
      "amount": { "total": "25.00" },
      "sender_email": "customer@example.com"
    }
  }'
```

## Production Deployment

1. Use HTTPS endpoint (not ngrok)
2. Set all webhook secrets in .env
3. Remove 'dev mode' acceptance in verifyProviderSignature()
4. Set up monitoring for Redis and server health

## Architecture

```
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
```

## Support

- Redis commands: `redis-cli monitor | grep p2p`
- Logs: `bun run server/p2p-proxy-server-enhanced.ts 2>&1 | tee proxy.log`
