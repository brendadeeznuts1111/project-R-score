#!/usr/bin/env bun

import crypto from 'node:crypto';
import { Pinecone } from '@pinecone-database/pinecone';
import { redis } from 'bun';

const PORT = Number(Bun.env.PAYMENT_SERVER_PORT ?? 3000);
const PINECONE_API_KEY = Bun.env.PINECONE_API_KEY ?? '';
const PINECONE_INDEX = Bun.env.PINECONE_INDEX ?? 'super-profiles';
const PINECONE_DIM = Number(Bun.env.PINECONE_DIM ?? 384);

const PAYPAL_WEBHOOK_SECRET = Bun.env.PAYPAL_WEBHOOK_SECRET ?? '';
const PAYPAL_WEBHOOK_ID = Bun.env.PAYPAL_WEBHOOK_ID ?? '';
const PAYPAL_CLIENT_ID = Bun.env.PAYPAL_CLIENT_ID ?? '';
const PAYPAL_CLIENT_SECRET = Bun.env.PAYPAL_CLIENT_SECRET ?? '';
const PAYPAL_API_BASE = Bun.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
const VENMO_WEBHOOK_SECRET = Bun.env.VENMO_WEBHOOK_SECRET ?? '';

const redisPublish = async (channel: string, payload: unknown) => {
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error('Redis publish failed', err);
  }
};

const pc = PINECONE_API_KEY
  ? new Pinecone({ apiKey: PINECONE_API_KEY })
  : null;
const index = pc ? pc.index(PINECONE_INDEX) : null;

export type SuperProfile = {
  userId: string;
  score: number;
  drift: number;
  updatedAt?: string;
};

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

let cachedPayPalToken: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedPayPalToken && cachedPayPalToken.expiresAt > now + 60_000) {
    return cachedPayPalToken.token;
  }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const expiresIn = Number(data.expires_in ?? 300);
  cachedPayPalToken = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000
  };
  return data.access_token;
}

async function verifyPayPalWebhook(body: string, headers: Headers): Promise<boolean> {
  const sig = headers.get('paypal-transmission-sig');
  if (!sig) return false;
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');

  if (PAYPAL_WEBHOOK_ID && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) {
    try {
      const token = await getPayPalAccessToken();
      const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: sig,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: JSON.parse(body)
        })
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.verification_status === 'SUCCESS';
    } catch (err) {
      console.error('PayPal verify error', err);
      return false;
    }
  }

  if (!PAYPAL_WEBHOOK_SECRET) {
    // Fallback: accept when secrets are not configured
    return true;
  }
  const expected = hmacSha256Hex(PAYPAL_WEBHOOK_SECRET, body);
  return sig === expected || sig === `v1=${expected}` || sig.startsWith('primary=');
}

function verifyVenmoWebhook(body: string, headers: Headers): boolean {
  const sig = headers.get('x-venmo-signature');
  if (!sig) return false;
  if (!VENMO_WEBHOOK_SECRET) {
    return true;
  }
  const expected = hmacSha256Hex(VENMO_WEBHOOK_SECRET, body);
  return sig === expected || sig === `v1=${expected}`;
}

async function getSuperProfile(userId: string): Promise<SuperProfile | null> {
  if (!index) return null;
  const vector = new Array(PINECONE_DIM).fill(0.1);
  const result = await index.query({
    topK: 1,
    vector,
    filter: { userId }
  });
  const match = result.matches?.[0];
  if (!match || !match.metadata) return null;
  const meta = match.metadata as any;
  return {
    userId: meta.userId ?? userId,
    score: Number(meta.score ?? 0),
    drift: Number(meta.drift ?? 0),
    updatedAt: meta.updatedAt
  };
}

function isLowRisk(profile: SuperProfile | null) {
  if (!profile) return { risk: 'low', reason: 'No profile: auto-approve' };
  if (profile.score > 0.95 && profile.drift < 0.01) {
    return { risk: 'low', reason: 'Super-profile match' };
  }
  if (profile.drift > 0.05) {
    return { risk: 'high', reason: 'High drift: possible takeover' };
  }
  return { risk: 'medium', reason: 'Review score/drift' };
}

async function deposit(userId: string, amount: number) {
  // Placeholder: wire to PayPal Payouts API in prod.
  console.log(`Deposited $${amount.toFixed(2)} to ${userId}`);
  await redisPublish('DEPOSIT_SUCCESS', { userId, amount });
}

function parsePayPalUserId(event: any): string {
  const email = event?.resource?.sender_email ?? '';
  const handle = email ? `@${email.split('@')[0]}` : '@unknown';
  return handle;
}

function parseVenmoUserId(event: any): string {
  const username = event?.data?.actor?.username ?? 'unknown';
  return username.startsWith('@') ? username : `@${username}`;
}

async function handleRiskFlow(userId: string, amount: number) {
  const profile = await getSuperProfile(userId);
  const risk = isLowRisk(profile);

  if (risk.risk === 'low') {
    await deposit(userId, amount);
    await redisPublish('PROFILE_FUSE', { userId, status: 'risk_ok', risk });
    return { status: 'approved', risk };
  }

  await redisPublish('FRAUD_ALERT', { userId, risk });
  return { status: 'review', risk };
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('ok');
    }

    if (url.pathname === '/webhook/paypal' && req.method === 'POST') {
      const body = await req.text();
      if (!(await verifyPayPalWebhook(body, req.headers))) {
        return new Response('Invalid signature', { status: 401 });
      }
      const event = JSON.parse(body);
      if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
        const userId = parsePayPalUserId(event);
        const amount = Number(event?.resource?.amount?.total ?? 0);
        const result = await handleRiskFlow(userId, amount);
        return new Response(JSON.stringify(result));
      }
      return new Response('Ignored');
    }

    if (url.pathname === '/webhook/venmo' && req.method === 'POST') {
      const body = await req.text();
      if (!verifyVenmoWebhook(body, req.headers)) {
        return new Response('Invalid signature', { status: 401 });
      }
      const event = JSON.parse(body);
      if (event.type === 'payment.created') {
        const userId = parseVenmoUserId(event);
        const amount = Number(event?.data?.amount ?? 0);
        const result = await handleRiskFlow(userId, amount);
        return new Response(JSON.stringify(result));
      }
      return new Response('Ignored');
    }

    return new Response('Webhooks: /webhook/paypal, /webhook/venmo', { status: 200 });
  }
});

console.log(`Payment server running on http://localhost:${PORT}`);
