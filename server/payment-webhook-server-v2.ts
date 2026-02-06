#!/usr/bin/env bun
/**
 * Payment Webhook Server v2 - WITH PERSONALIZATION ENGINE
 * 
 * Enhanced with Habits Classification:
 * - Whale detection (>100 txns, >$100 avg)
 * - Auto-bonuses based on user tier
 * - VIP risk override for trusted users
 * - Personalized recommendations
 * 
 * Flow:
 * User Pays → Webhook → Super-Profile + Habits → Risk + Bonus → Deposit!
 */

import Redis from 'ioredis';
import crypto from 'node:crypto';
import { Pinecone } from '@pinecone-database/pinecone';
import { 
  getHabits, 
  calculateBonus, 
  getRecommendation,
  applyVipRiskOverride,
  type HabitsData 
} from '../lib/business/habits-classifier.ts';

// ============================================================================
// Configuration
// ============================================================================

const PORT = Number(Bun.env.PAYMENT_SERVER_PORT ?? 3001);
const REDIS_URL = Bun.env.REDIS_URL ?? 'redis://localhost:6379';
const PINECONE_API_KEY = Bun.env.PINECONE_API_KEY ?? '';
const PINECONE_INDEX = Bun.env.PINECONE_INDEX ?? 'super-profiles';
const PINECONE_DIM = Number(Bun.env.PINECONE_DIM ?? 384);

const PAYPAL_WEBHOOK_SECRET = Bun.env.PAYPAL_WEBHOOK_SECRET ?? '';
const VENMO_WEBHOOK_SECRET = Bun.env.VENMO_WEBHOOK_SECRET ?? '';

const RISK_THRESHOLDS = {
  LOW_SCORE_MIN: 0.95,
  LOW_DRIFT_MAX: 0.01,
  HIGH_DRIFT_MIN: 0.05,
};

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';

export type SuperProfile = {
  userId: string;
  score: number;
  drift: number;
  updatedAt?: string;
};

export type RiskAssessment = {
  risk: RiskLevel;
  reason: string;
  profile?: SuperProfile | null;
};

export type PersonalizedPaymentResult = {
  status: 'approved' | 'review' | 'blocked';
  risk: RiskAssessment;
  userId: string;
  amount: number;
  bonus: number;
  totalDeposit: number;
  habits: HabitsData | null;
  tier: string;
  timestamp: string;
};

// ============================================================================
// Redis & Pinecone Setup
// ============================================================================

const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.error('Redis error:', err.message));
redis.on('connect', () => console.log('✅ Redis connected'));

const pc = PINECONE_API_KEY
  ? new Pinecone({ apiKey: PINECONE_API_KEY })
  : null;
const index = pc ? pc.index(PINECONE_INDEX) : null;

if (!pc) {
  console.warn('⚠️  Pinecone not configured - super-profile fusion disabled');
}

// ============================================================================
// Crypto Helpers
// ============================================================================

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyPayPalWebhook(body: string, headers: Headers): boolean {
  const sig = headers.get('paypal-transmission-sig');
  if (!sig) return false;
  if (!PAYPAL_WEBHOOK_SECRET) {
    console.log('⚠️  PayPal webhook secret not set - accepting (dev mode)');
    return true;
  }
  const expected = hmacSha256Hex(PAYPAL_WEBHOOK_SECRET, body);
  return sig === expected || sig === `v1=${expected}` || sig.startsWith('primary=');
}

function verifyVenmoWebhook(body: string, headers: Headers): boolean {
  const sig = headers.get('x-venmo-signature');
  if (!sig) return false;
  if (!VENMO_WEBHOOK_SECRET) {
    console.log('⚠️  Venmo webhook secret not set - accepting (dev mode)');
    return true;
  }
  const expected = hmacSha256Hex(VENMO_WEBHOOK_SECRET, body);
  return sig === expected || sig === `v1=${expected}`;
}

// ============================================================================
// Super-Profile Fusion
// ============================================================================

async function getSuperProfile(userId: string): Promise<SuperProfile | null> {
  if (!index) return null;
  
  const startTime = performance.now();
  
  try {
    const vector = new Array(PINECONE_DIM).fill(0.1);
    const result = await index.query({
      topK: 1,
      vector,
      filter: { userId },
    });
    
    const match = result.matches?.[0];
    if (!match || !match.metadata) return null;
    
    const meta = match.metadata as any;
    const profile: SuperProfile = {
      userId: meta.userId ?? userId,
      score: Number(meta.score ?? 0),
      drift: Number(meta.drift ?? 0),
      updatedAt: meta.updatedAt,
    };
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`✅ Profile query: ${duration}ms | Score: ${profile.score} | Drift: ${profile.drift}`);
    
    return profile;
  } catch (err: any) {
    console.error(`❌ Profile query failed: ${err.message}`);
    return null;
  }
}

function assessRisk(profile: SuperProfile | null): RiskAssessment {
  if (!profile) {
    return { risk: 'low', reason: 'No profile: auto-approve (optional fusion)' };
  }
  
  if (profile.score > RISK_THRESHOLDS.LOW_SCORE_MIN && 
      profile.drift < RISK_THRESHOLDS.LOW_DRIFT_MAX) {
    return { 
      risk: 'low', 
      reason: 'Super-profile match: high score, low drift',
      profile 
    };
  }
  
  if (profile.drift > RISK_THRESHOLDS.HIGH_DRIFT_MIN) {
    return { 
      risk: 'high', 
      reason: 'High drift: possible account takeover',
      profile 
    };
  }
  
  return { 
    risk: 'medium', 
    reason: `Review required: score=${profile.score.toFixed(2)}, drift=${profile.drift.toFixed(4)}`,
    profile 
  };
}

// ============================================================================
// Personalized Deposit with Habits
// ============================================================================

async function executePersonalizedDeposit(
  userId: string,
  amount: number,
  habits: HabitsData | null
): Promise<{ deposited: number; bonus: number; reason: string }> {
  const bonusCalc = calculateBonus(amount, habits);
  const totalDeposit = amount + bonusCalc.bonus;
  
  // TODO: Wire to actual PayPal Payouts API
  console.log(`💰 DEPOSIT: $${totalDeposit.toFixed(2)} → ${userId} (${bonusCalc.reason})`);
  
  await redis.publish('PERSONALIZED_DEPOSIT', JSON.stringify({
    userId,
    amount,
    bonus: bonusCalc.bonus,
    totalDeposit,
    tier: habits?.tier ?? 'unknown',
    reason: bonusCalc.reason,
    timestamp: new Date().toISOString(),
  }));
  
  return {
    deposited: totalDeposit,
    bonus: bonusCalc.bonus,
    reason: bonusCalc.reason,
  };
}

// ============================================================================
// Enhanced Payment Flow with Personalization
// ============================================================================

async function handlePersonalizedPaymentFlow(
  userId: string, 
  amount: number, 
  source: 'paypal' | 'venmo'
): Promise<PersonalizedPaymentResult> {
  const startTime = performance.now();
  
  // Step 1: Fetch super-profile (risk assessment)
  const profile = await getSuperProfile(userId);
  const risk = assessRisk(profile);
  
  // Step 2: Fetch habits (personalization)
  const habits = await getHabits(userId);
  if (habits) {
    console.log(`🎯 User habits: ${habits.tier} (${habits.txnCount} txns, $${habits.avgTxn.toFixed(2)} avg)`);
  }
  
  // Step 3: Apply VIP risk override
  const finalRisk = applyVipRiskOverride(habits, risk.risk);
  if (finalRisk.risk !== risk.risk) {
    console.log(`👑 VIP override: ${risk.risk} → ${finalRisk.risk} (${finalRisk.reason})`);
  }
  
  // Step 4: Decision with personalization
  let result: PersonalizedPaymentResult;
  
  if (finalRisk.risk === 'low') {
    const depositResult = await executePersonalizedDeposit(userId, amount, habits);
    
    await redis.publish('PROFILE_FUSE', JSON.stringify({
      userId,
      status: 'risk_ok_personalized',
      risk: finalRisk,
      habits: habits?.tier ?? 'unknown',
      bonus: depositResult.bonus,
    }));
    
    result = {
      status: 'approved',
      risk: { ...risk, risk: finalRisk.risk, reason: finalRisk.reason },
      userId,
      amount,
      bonus: depositResult.bonus,
      totalDeposit: depositResult.deposited,
      habits,
      tier: habits?.tier ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  } else if (finalRisk.risk === 'high') {
    await redis.publish('FRAUD_ALERT', JSON.stringify({
      userId,
      amount,
      risk: finalRisk,
      habits: habits?.tier ?? 'unknown',
      timestamp: new Date().toISOString(),
    }));
    
    result = {
      status: 'blocked',
      risk: finalRisk,
      userId,
      amount,
      bonus: 0,
      totalDeposit: 0,
      habits,
      tier: habits?.tier ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  } else {
    await redis.publish('PROFILE_FUSE', JSON.stringify({
      userId,
      status: 'review',
      risk: finalRisk,
      habits: habits?.tier ?? 'unknown',
    }));
    
    result = {
      status: 'review',
      risk: finalRisk,
      userId,
      amount,
      bonus: 0,
      totalDeposit: 0,
      habits,
      tier: habits?.tier ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
  
  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`⏱️  Total flow time: ${duration}ms | Status: ${result.status} | Bonus: $${result.bonus.toFixed(2)}`);
  
  return result;
}

// ============================================================================
// Webhook Parsers
// ============================================================================

function parsePayPalUserId(event: any): string {
  const email = event?.resource?.payer?.payer_info?.email ?? 
                event?.resource?.sender_email ?? '';
  const handle = email ? `@${email.split('@')[0]}` : '@unknown';
  return handle;
}

function parsePayPalAmount(event: any): number {
  const amount = event?.resource?.amount?.total ?? 
                 event?.resource?.transactions?.[0]?.amount?.total ?? 0;
  return Number(amount);
}

function parseVenmoUserId(event: any): string {
  const username = event?.data?.actor?.username ?? 
                   event?.data?.payment?.actor?.username ?? 'unknown';
  return username.startsWith('@') ? username : `@${username}`;
}

function parseVenmoAmount(event: any): number {
  const amount = event?.data?.amount ?? 
                 event?.data?.payment?.amount ?? 0;
  return typeof amount === 'string' ? parseFloat(amount) : Number(amount);
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
        version: '2.0-personalized',
        pinecone: pc ? 'connected' : 'disabled',
        redis: redis.status === 'ready' ? 'connected' : 'disconnected',
        features: ['habits-classification', 'vip-bonuses', 'risk-override'],
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Recommendations endpoint
    if (path.startsWith('/recommend/')) {
      const userId = path.split('/')[2];
      if (!userId) {
        return new Response('User ID required', { status: 400, headers: corsHeaders });
      }
      
      const habits = await getHabits(userId);
      if (!habits) {
        return new Response(JSON.stringify({ 
          userId, 
          recommendation: 'Complete more transactions to unlock personalized perks',
          habits: null 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const recommendation = getRecommendation(habits);
      return new Response(JSON.stringify({
        userId,
        recommendation,
        habits: {
          tier: habits.tier,
          txnCount: habits.txnCount,
          avgTxn: habits.avgTxn,
        },
        nextBonus: calculateBonus(100, habits).bonusPercent + '% on next deposit',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // PayPal webhook
    if (path === '/webhook/paypal' && req.method === 'POST') {
      const body = await req.text();
      
      if (!verifyPayPalWebhook(body, req.headers)) {
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
      
      try {
        const event = JSON.parse(body);
        if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
          const userId = parsePayPalUserId(event);
          const amount = parsePayPalAmount(event);
          
          const result = await handlePersonalizedPaymentFlow(userId, amount, 'paypal');
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
      } catch (err: any) {
        return new Response(`Error: ${err.message}`, { status: 400, headers: corsHeaders });
      }
    }
    
    // Venmo webhook
    if (path === '/webhook/venmo' && req.method === 'POST') {
      const body = await req.text();
      
      if (!verifyVenmoWebhook(body, req.headers)) {
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
      
      try {
        const event = JSON.parse(body);
        if (event.type === 'payment.created') {
          const userId = parseVenmoUserId(event);
          const amount = parseVenmoAmount(event);
          
          const result = await handlePersonalizedPaymentFlow(userId, amount, 'venmo');
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
      } catch (err: any) {
        return new Response(`Error: ${err.message}`, { status: 400, headers: corsHeaders });
      }
    }
    
    // Test payment endpoint
    if (path === '/test/payment' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { userId, amount, source = 'test' } = body;
        
        if (!userId || !amount) {
          return new Response('Missing userId or amount', { status: 400, headers: corsHeaders });
        }
        
        const result = await handlePersonalizedPaymentFlow(userId, Number(amount), source as any);
        
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(`Error: ${err.message}`, { status: 400, headers: corsHeaders });
      }
    }
    
    // Root documentation
    if (path === '/') {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Payment Webhook Server v2 - Personalized</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    .endpoint { background: #e8f5e9; padding: 10px; border-radius: 8px; margin: 10px 0; }
    .tier { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; margin: 2px; }
    .tier.whale { background: #ffd700; color: #333; }
    .tier.high-volume { background: #c084fc; color: white; }
    .tier.active { background: #60a5fa; color: white; }
    .tier.casual { background: #9ca3af; color: white; }
  </style>
</head>
<body>
  <h1>🦘 Payment Webhook Server v2 - Personalized</h1>
  
  <h2>🎯 Habits Classification Tiers</h2>
  <div>
    <span class="tier whale">🐋 WHALE</span> 100+ txns, $100+ avg → 20% bonus
    <span class="tier high-volume">⚡ HIGH-VOLUME</span> 50+ txns → 10% bonus
    <span class="tier active">🎯 ACTIVE</span> 20-50 txns → 5% bonus
    <span class="tier casual">👤 CASUAL</span> &lt;20 txns → No bonus
  </div>
  
  <h2>Endpoints</h2>
  <div class="endpoint"><strong>POST /webhook/paypal</strong> - PayPal webhooks</div>
  <div class="endpoint"><strong>POST /webhook/venmo</strong> - Venmo webhooks</div>
  <div class="endpoint"><strong>POST /test/payment</strong> - Test with personalization</div>
  <div class="endpoint"><strong>GET /recommend/:userId</strong> - Get personalized recommendation</div>
  <div class="endpoint"><strong>GET /health</strong> - Health check</div>
  
  <h2>Test Personalized Payment</h2>
  <pre>curl -X POST http://localhost:${PORT}/test/payment \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"@ashschaeffer1","amount":100}'</pre>
  
  <h2>Get Recommendation</h2>
  <pre>curl http://localhost:${PORT}/recommend/@ashschaeffer1</pre>
  
  <h2>Redis Channels</h2>
  <ul>
    <li><code>PERSONALIZED_DEPOSIT</code> - Deposits with bonus info</li>
    <li><code>HABITS_CLASSIFIED</code> - User tier classification</li>
    <li><code>DEPOSIT_SUCCESS</code> - Standard deposits</li>
    <li><code>FRAUD_ALERT</code> - High-risk alerts</li>
    <li><code>PROFILE_FUSE</code> - Profile fusion events</li>
  </ul>
</body>
</html>`, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🦘 Payment Webhook Server v2 - PERSONALIZED               ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  URL:     http://localhost:${PORT}                        ║`);
console.log(`║  Health:  http://localhost:${PORT}/health                 ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Features:                                                 ║');
console.log('║    • 🐋 Whale detection (20% bonus)                        ║');
console.log('║    • ⚡ High-volume (10% bonus)                            ║');
console.log('║    • 🎯 Active (5% bonus)                                  ║');
console.log('║    • 👑 VIP risk override                                  ║');
console.log('║    • 💡 Personalized recommendations                       ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

export default server;
