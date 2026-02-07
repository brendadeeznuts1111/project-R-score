#!/usr/bin/env bun
/**
 * P2P Proxy Server - Unified Payment Bridge
 * 
 * Clients pay directly to your personal accounts via P2P:
 * - CashApp: $HaircutPro
 * - Venmo: @HaircutPro  
 * - PayPal: paypal.me/HaircutPro
 * 
 * Server catches webhooks → Fuses profiles → Auto-credits with stealth bonus
 * 
 * Flow:
 * Client App (P2P) → Your Personal Account → Webhook → Bun Proxy → Credit + Bonus
 */

import Redis from 'ioredis';
import crypto from 'node:crypto';
import { getHabits, storeHabits, classifyHabits, calculateBonus, type HabitsData } from '@fw/business';

// ============================================================================
// Configuration
// ============================================================================

const PORT = Number(Bun.env.P2P_PROXY_PORT ?? 3002);
const REDIS_URL = Bun.env.REDIS_URL ?? 'redis://localhost:6379';

// Your branded proxy handles (configure these!)
const PROXY_HANDLES = {
  cashapp: Bun.env.PROXY_CASHTAG ?? '$HaircutPro',
  venmo: Bun.env.PROXY_VENMO ?? '@HaircutPro',
  paypal: Bun.env.PROXY_PAYPAL ?? 'paypal.me/HaircutPro',
};

// Webhook secrets (from env or Bun secrets)
const WEBHOOK_SECRETS = {
  paypal: Bun.env.PAYPAL_WEBHOOK_SECRET ?? '',
  venmo: Bun.env.VENMO_WEBHOOK_SECRET ?? '',
  cashapp: Bun.env.CASHAPP_WEBHOOK_SECRET ?? '',
};

// ============================================================================
// Redis Setup
// ============================================================================

const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.error('Redis error:', err.message));
redis.on('connect', () => console.log('✅ Redis connected'));

// ============================================================================
// Crypto Helpers
// ============================================================================

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function verifyWebhookSignature(
  body: string, 
  signature: string | null, 
  secret: string,
  prefix: string = ''
): Promise<boolean> {
  if (!signature || !secret) {
    // Dev mode: accept if secret not configured
    console.log('⚠️  Webhook verification skipped (dev mode)');
    return true;
  }
  
  const expected = hmacSha256Hex(secret, body);
  const cleanSig = prefix ? signature.replace(prefix, '') : signature;
  return cleanSig === expected || signature === expected;
}

// ============================================================================
// Provider Detection & Parsing
// ============================================================================

interface ParsedPayment {
  userId: string;
  amount: number;
  provider: 'paypal' | 'venmo' | 'cashapp';
  rawUserId: string;
  timestamp: string;
}

async function parsePayPalWebhook(body: string, headers: Headers): Promise<ParsedPayment | null> {
  const sig = headers.get('paypal-transmission-sig');
  const isPayPal = headers.get('user-agent')?.includes('PayPal') || sig;
  
  if (!isPayPal) return null;
  
  if (!await verifyWebhookSignature(body, sig, WEBHOOK_SECRETS.paypal, 'v1=')) {
    throw new Error('Invalid PayPal signature');
  }
  
  const event = JSON.parse(body);
  if (event.event_type !== 'PAYMENT.SALE.COMPLETED') return null;
  
  const email = event.resource?.payer?.payer_info?.email ?? 
                event.resource?.sender_email ?? '';
  const amount = parseFloat(event.resource?.amount?.total ?? 0);
  
  return {
    userId: email ? `@${email.split('@')[0]}` : '@unknown',
    rawUserId: email,
    amount,
    provider: 'paypal',
    timestamp: new Date().toISOString(),
  };
}

async function parseVenmoWebhook(body: string, headers: Headers): Promise<ParsedPayment | null> {
  const sig = headers.get('x-venmo-signature');
  
  if (!sig) return null;
  
  if (!await verifyWebhookSignature(body, sig, WEBHOOK_SECRETS.venmo, 'v1=')) {
    throw new Error('Invalid Venmo signature');
  }
  
  const event = JSON.parse(body);
  if (event.type !== 'payment.created') return null;
  
  const username = event.data?.actor?.username ?? 'unknown';
  const amount = typeof event.data?.amount === 'string' 
    ? parseFloat(event.data.amount) 
    : Number(event.data?.amount ?? 0);
  
  return {
    userId: username.startsWith('@') ? username : `@${username}`,
    rawUserId: username,
    amount,
    provider: 'venmo',
    timestamp: new Date().toISOString(),
  };
}

async function parseCashAppWebhook(body: string, headers: Headers): Promise<ParsedPayment | null> {
  const sig = headers.get('square-signature') ?? headers.get('x-cashapp-signature');
  
  // CashApp/Square webhooks
  const isCashApp = sig || body.includes('payment.created') || body.includes('cashapp');
  if (!isCashApp) return null;
  
  if (!await verifyWebhookSignature(body, sig, WEBHOOK_SECRETS.cashapp)) {
    throw new Error('Invalid CashApp signature');
  }
  
  const event = JSON.parse(body);
  
  // Square/CashApp format
  const paymentData = event.data?.object ?? event.data;
  const amountCents = paymentData?.amount_money?.amount ?? paymentData?.amount ?? 0;
  const email = paymentData?.buyer_email_address ?? paymentData?.customer_email ?? '';
  
  return {
    userId: email ? `@${email.split('@')[0]}` : '@cashapp_user',
    rawUserId: email || 'cashapp_user',
    amount: amountCents / 100, // Convert cents to dollars
    provider: 'cashapp',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Payment Processing
// ============================================================================

interface ProcessResult {
  success: boolean;
  anonId: string;
  originalAmount: number;
  bonus: number;
  totalCredit: number;
  tier: string;
  habits: HabitsData | null;
  message: string;
}

async function processP2PPayment(payment: ParsedPayment): Promise<ProcessResult> {
  // 1. Generate anonymous ID (stealth hash)
  const anonId = Bun.hash(payment.userId).toString(36).slice(0, 12);
  
  // 2. Get or create habits
  let habits = await getHabits(anonId);
  
  if (!habits) {
    // First time user - start as casual
    habits = classifyHabits([{ amount: payment.amount, timestamp: new Date().toISOString() }]);
    await storeHabits(anonId, habits);
  } else {
    // Update habits with new transaction
    const newTxns = [
      ...Array(habits.txnCount - 1).fill({ amount: habits.avgTxn }),
      { amount: payment.amount }
    ];
    habits = classifyHabits(newTxns.map(a => ({ amount: a.amount })));
    await storeHabits(anonId, habits);
  }
  
  // 3. Calculate bonus
  const bonusCalc = calculateBonus(payment.amount, habits);
  const totalCredit = payment.amount + bonusCalc.bonus;
  
  // 4. Credit balance
  const balanceKey = `balance:${anonId}`;
  await redis.incrbyfloat(balanceKey, totalCredit);
  const newBalance = await redis.get(balanceKey);
  
  // 5. Store transaction record
  const txnRecord = {
    ...payment,
    anonId,
    bonus: bonusCalc.bonus,
    totalCredit,
    tier: habits.tier,
    newBalance: parseFloat(newBalance || '0'),
    processedAt: new Date().toISOString(),
  };
  
  await redis.lpush(`txns:${anonId}`, JSON.stringify(txnRecord));
  await redis.ltrim(`txns:${anonId}`, 0, 99); // Keep last 100
  
  // 6. Publish event
  await redis.publish('P2P_PAYMENT', JSON.stringify({
    proxyHandle: PROXY_HANDLES[payment.provider],
    userId: anonId,
    originalUser: payment.userId,
    provider: payment.provider,
    amount: payment.amount,
    bonus: bonusCalc.bonus,
    total: totalCredit,
    tier: habits.tier,
    balance: newBalance,
  }));
  
  // 7. Publish personalized deposit for dashboard
  await redis.publish('PERSONALIZED_DEPOSIT', JSON.stringify({
    userId: anonId,
    amount: payment.amount,
    bonus: bonusCalc.bonus,
    totalDeposit: totalCredit,
    tier: habits.tier,
    source: 'p2p_proxy',
    provider: payment.provider,
    timestamp: new Date().toISOString(),
  }));
  
  return {
    success: true,
    anonId,
    originalAmount: payment.amount,
    bonus: bonusCalc.bonus,
    totalCredit,
    tier: habits.tier,
    habits,
    message: `💈 P2P Proxy: ${payment.userId} paid $${payment.amount} → $${totalCredit} credited (${habits.tier} bonus)`,
  };
}

// ============================================================================
// QR Code Generator
// ============================================================================

function generateQRPage(amount: number): string {
  const cashappUrl = `https://cash.app/${PROXY_HANDLES.cashapp.replace('$', '')}/${amount}`;
  const venmoUrl = `https://venmo.com/${PROXY_HANDLES.venmo.replace('@', '')}?txn=pay&amount=${amount}`;
  const paypalUrl = `https://${PROXY_HANDLES.paypal}/${amount}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pay $${amount} | P2P Proxy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a2e; }
    .amount { font-size: 48px; font-weight: bold; color: #667eea; margin: 20px 0; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .options { display: grid; gap: 12px; }
    .option {
      display: flex;
      align-items: center;
      padding: 16px;
      border-radius: 12px;
      border: 2px solid #e0e0e0;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
    }
    .option:hover { border-color: #667eea; transform: translateY(-2px); }
    .option-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-right: 16px;
    }
    .cashapp { background: #00d632; color: white; }
    .venmo { background: #008cff; color: white; }
    .paypal { background: #003087; color: white; }
    .option-text { text-align: left; }
    .option-title { font-weight: 600; color: #1a1a2e; }
    .option-handle { color: #666; font-size: 14px; }
    .footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 12px;
    }
    .share-btn {
      margin-top: 20px;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
    }
    .share-btn:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💈 Quick Pay</h1>
    <div class="amount">$${amount}</div>
    <p class="subtitle">Choose your preferred app</p>
    
    <div class="options">
      <a href="${cashappUrl}" class="option" target="_blank">
        <div class="option-icon cashapp">$</div>
        <div class="option-text">
          <div class="option-title">Cash App</div>
          <div class="option-handle">${PROXY_HANDLES.cashapp}</div>
        </div>
      </a>
      
      <a href="${venmoUrl}" class="option" target="_blank">
        <div class="option-icon venmo">V</div>
        <div class="option-text">
          <div class="option-title">Venmo</div>
          <div class="option-handle">${PROXY_HANDLES.venmo}</div>
        </div>
      </a>
      
      <a href="${paypalUrl}" class="option" target="_blank">
        <div class="option-icon paypal">P</div>
        <div class="option-text">
          <div class="option-title">PayPal</div>
          <div class="option-handle">${PROXY_HANDLES.paypal}</div>
        </div>
      </a>
    </div>
    
    <button class="share-btn" onclick="sharePayment()">Share Payment Link</button>
    
    <div class="footer">
      Secured by P2P Proxy • Funds go directly to merchant
    </div>
  </div>
  
  <script>
    function sharePayment() {
      const shareData = {
        title: 'Quick Pay',
        text: 'Pay $${amount} to ${PROXY_HANDLES.cashapp}',
        url: window.location.href
      };
      
      if (navigator.share) {
        navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// Bun Server
// ============================================================================

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: 'p2p-proxy-1.0',
        handles: PROXY_HANDLES,
        redis: redis.status === 'ready' ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Unified webhook endpoint
    if (path === '/webhook/proxy' && req.method === 'POST') {
      const body = await req.text();
      const headers = req.headers;
      
      try {
        // Try each provider
        let payment: ParsedPayment | null = null;
        
        payment = await parsePayPalWebhook(body, headers);
        if (!payment) payment = await parseVenmoWebhook(body, headers);
        if (!payment) payment = await parseCashAppWebhook(body, headers);
        
        if (!payment) {
          console.log('⚠️  Unknown webhook format');
          return new Response(JSON.stringify({ received: true, processed: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Process the payment
        const result = await processP2PPayment(payment);
        console.log(result.message);
        
        return new Response(JSON.stringify({
          received: true,
          processed: true,
          ...result,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (err: any) {
        console.error('❌ Webhook error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // QR/Payment page
    if (path === '/qr' || path === '/pay') {
      const amount = Number(url.searchParams.get('amount')) || 20;
      return new Response(generateQRPage(amount), {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // API: Get balance
    if (path.startsWith('/api/balance/')) {
      const userId = path.split('/')[3];
      const anonId = Bun.hash(userId).toString(36).slice(0, 12);
      const balance = await redis.get(`balance:${anonId}`);
      const txns = await redis.lrange(`txns:${anonId}`, 0, 9);
      
      return new Response(JSON.stringify({
        userId,
        anonId,
        balance: parseFloat(balance || '0'),
        recentTransactions: txns.map(t => JSON.parse(t)),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Root documentation
    if (path === '/') {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>P2P Proxy Server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .handle { display: inline-block; padding: 4px 12px; background: #f0f0f0; border-radius: 4px; font-family: monospace; }
    .endpoint { background: #e8f5e9; padding: 10px; border-radius: 8px; margin: 10px 0; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>💈 P2P Proxy Server</h1>
  <p>Unified payment bridge for CashApp, Venmo, and PayPal</p>
  
  <h2>Your Proxy Handles</h2>
  <ul>
    <li>CashApp: <span class="handle">${PROXY_HANDLES.cashapp}</span></li>
    <li>Venmo: <span class="handle">${PROXY_HANDLES.venmo}</span></li>
    <li>PayPal: <span class="handle">${PROXY_HANDLES.paypal}</span></li>
  </ul>
  
  <h2>Client Payment Page</h2>
  <div class="endpoint">
    <strong>GET /qr?amount=25</strong> - Branded payment page with all options
  </div>
  
  <h2>Webhook Endpoint</h2>
  <div class="endpoint">
    <strong>POST /webhook/proxy</strong> - Unified webhook for all providers
  </div>
  <p>Configure webhooks in:</p>
  <ul>
    <li>PayPal Developer Dashboard → <code>http://your-domain:3002/webhook/proxy</code></li>
    <li>Venmo Developer Portal → <code>http://your-domain:3002/webhook/proxy</code></li>
    <li>Square Dashboard (CashApp) → <code>http://your-domain:3002/webhook/proxy</code></li>
  </ul>
  
  <h2>Test Payment</h2>
  <pre>curl -X POST http://localhost:${PORT}/webhook/proxy \\
  -H "Content-Type: application/json" \\
  -H "paypal-transmission-sig: v1=test" \\
  -d '{"event_type":"PAYMENT.SALE.COMPLETED","resource":{"amount":{"total":"25.00"},"sender_email":"client@example.com"}}'</pre>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  💈 P2P Proxy Server - Unified Payment Bridge              ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  URL:     http://localhost:${PORT}                        ║`);
console.log(`║  QR Page: http://localhost:${PORT}/qr?amount=20           ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Proxy Handles:                                            ║');
console.log(`║    • CashApp: ${PROXY_HANDLES.cashapp.padEnd(25)}           ║`);
console.log(`║    • Venmo:   ${PROXY_HANDLES.venmo.padEnd(25)}             ║`);
console.log(`║    • PayPal:  ${PROXY_HANDLES.paypal.padEnd(25)}            ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Features:                                                 ║');
console.log('║    • Unified /webhook/proxy (all providers)                ║');
console.log('║    • Auto habits classification + bonus                    ║');
console.log('║    • Stealth anonymous IDs                                 ║');
console.log('║    • Branded QR payment page                               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

export default server;
