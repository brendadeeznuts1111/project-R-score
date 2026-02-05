#!/usr/bin/env bun
/**
 * P2P Proxy Server v3 - With Business Continuity
 * 
 * Enhanced with:
 * - Business alias support
 * - Payment forwarding
 * - Customer notifications
 * - Admin dashboard
 */

import Redis from 'ioredis';
import { BusinessContinuity } from '../lib/p2p/business-continuity';
import { CustomerNotifier } from '../lib/p2p/customer-notifier';
import { executeBusinessMigration, handlePaymentAccountLoss } from '../lib/p2p/migration-workflow';

// ============================================================================
// Redis Setup
// ============================================================================

const redis = new Redis(Bun.env.REDIS_URL ?? 'redis://localhost:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('✅ Redis connected'));

// ============================================================================
// Business-Aware P2P Proxy
// ============================================================================

class BusinessAwareProxy {
  /**
   * Get brand config for an alias (with business continuity support)
   */
  static async getBrandConfig(alias?: string): Promise<{
    brandName: string;
    cashTag: string;
    venmoHandle: string;
    paypalLink: string;
    isActive: boolean;
    redirectTo?: string;
    message?: string;
    color: string;
    branding?: {
      logoUrl?: string;
      logoText?: string;
      primaryColor: string;
      secondaryColor?: string;
      accentColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
      faviconUrl?: string;
      theme?: 'light' | 'dark' | 'auto';
    };
  }> {
    // Default alias from env if not provided
    const businessAlias = alias || Bun.env.PROXY_BRAND_NAME || 'HaircutPro';
    
    try {
      const businessInfo = await BusinessContinuity.getCurrentPaymentHandles(businessAlias);
      
      // Check for forwarding
      const forwarding = await BusinessContinuity.getForwardingInfo(businessAlias);
      if (!businessInfo.isActive && forwarding.isActive && forwarding.to) {
        // Redirect to new alias
        const newInfo = await BusinessContinuity.getCurrentPaymentHandles(forwarding.to);
        return {
          brandName: forwarding.to,
          cashTag: newInfo.handles.cashapp,
          venmoHandle: newInfo.handles.venmo,
          paypalLink: newInfo.handles.paypal,
          isActive: true,
          redirectTo: forwarding.to,
          message: `${businessAlias} has moved to ${forwarding.to}`,
          color: newInfo.branding?.primaryColor || Bun.env.PROXY_COLOR ?? '#FF6B35',
          branding: newInfo.branding
        };
      }
      
      return {
        brandName: businessAlias,
        cashTag: businessInfo.handles.cashapp,
        venmoHandle: businessInfo.handles.venmo,
        paypalLink: businessInfo.handles.paypal,
        isActive: businessInfo.isActive,
        redirectTo: businessInfo.redirectTo,
        message: businessInfo.message,
        color: businessInfo.branding?.primaryColor || Bun.env.PROXY_COLOR ?? '#FF6B35',
        branding: businessInfo.branding
      };
    } catch (error: any) {
      // Fallback to environment config
      console.warn(`Business alias "${businessAlias}" not found, using env config`);
      return {
        brandName: Bun.env.PROXY_BRAND_NAME ?? 'HaircutPro',
        cashTag: Bun.env.PROXY_CASHTAG ?? '$HaircutPro',
        venmoHandle: Bun.env.PROXY_VENMO ?? '@HaircutPro',
        paypalLink: Bun.env.PROXY_PAYPAL ?? 'paypal.me/HaircutPro',
        isActive: true,
        color: Bun.env.PROXY_COLOR ?? '#FF6B35',
        branding: {
          primaryColor: Bun.env.PROXY_COLOR ?? '#FF6B35',
          logoText: (Bun.env.PROXY_BRAND_NAME ?? 'HaircutPro').charAt(0)
        }
      };
    }
  }

  /**
   * Verify webhook signature
   */
  static async verifyProviderSignature(
    body: string,
    headers: Headers,
    provider: 'paypal' | 'venmo' | 'cashapp'
  ): Promise<boolean> {
    const secret = Bun.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
    
    if (!secret) {
      console.log(`⚠️  ${provider} secret not set - accepting (dev mode)`);
      return true;
    }
    
    const hasher = new Bun.CryptoHasher('sha256', secret);
    hasher.update(body);
    const expectedSig = hasher.digest('hex');
    
    const headerName = {
      paypal: 'paypal-transmission-sig',
      venmo: 'x-venmo-signature',
      cashapp: 'square-signature'
    }[provider];
    
    const receivedSig = headers.get(headerName)?.replace('v1=', '');
    return expectedSig === receivedSig;
  }

  /**
   * Generate stealth user ID
   */
  static generateStealthUserId(rawId: string, provider: string, businessAlias: string): string {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(`${rawId}:${provider}:${businessAlias}`);
    return `user_${hasher.digest('hex').substring(0, 16)}`;
  }

  /**
   * Handle payment with business context
   */
  static async handlePaymentWithBusinessContext(
    provider: 'paypal' | 'venmo' | 'cashapp',
    payload: any,
    receivedAlias: string
  ): Promise<{
    success: boolean;
    amount: number;
    credited: number;
    stealthId: string;
    bonus: number;
    tier: string;
    businessAlias: string;
  }> {
    // 1. Get business info for this alias
    let businessInfo;
    let actualAlias = receivedAlias;
    
    try {
      businessInfo = await BusinessContinuity.getCurrentPaymentHandles(receivedAlias);
      
      // Check if forwarding is active
      const forwarding = await BusinessContinuity.getForwardingInfo(receivedAlias);
      if (!businessInfo.isActive && forwarding.isActive && forwarding.to) {
        console.log(`↪️ Forwarding payment from ${receivedAlias} to ${forwarding.to}`);
        actualAlias = forwarding.to;
        businessInfo = await BusinessContinuity.getCurrentPaymentHandles(forwarding.to);
        
        // Notify customer of change
        // (stealthId will be generated below)
      }
    } catch (error) {
      // Use default alias if business not found
      actualAlias = Bun.env.PROXY_BRAND_NAME || 'HaircutPro';
      console.warn(`Business "${receivedAlias}" not found, using default`);
    }
    
    // 2. Extract payment details
    let userId: string, amount: number, paymentId: string;
    
    switch (provider) {
      case 'paypal':
        userId = payload.resource?.payer?.payer_info?.email ?? 
                payload.resource?.sender_email ?? 'unknown';
        amount = parseFloat(payload.resource?.amount?.total || 0);
        paymentId = payload.resource?.id ?? `pp_${Date.now()}`;
        break;
        
      case 'venmo':
        userId = payload.data?.actor?.username ?? 'unknown';
        amount = typeof payload.data?.amount === 'string' 
          ? parseFloat(payload.data.amount) 
          : Number(payload.data?.amount || 0);
        paymentId = payload.data?.id ?? `vm_${Date.now()}`;
        break;
        
      case 'cashapp':
        userId = payload.data?.buyer_email_address ?? 
                payload.data?.customer_id ?? 'cashapp_user';
        amount = parseFloat(payload.data?.amount_money?.amount || 0) / 100;
        paymentId = payload.data?.payment_id ?? `ca_${Date.now()}`;
        break;
    }
    
    if (!userId || amount <= 0) {
      throw new Error('Invalid payment data');
    }
    
    // 3. Generate stealth ID with business context
    const stealthId = this.generateStealthUserId(userId, provider, actualAlias);
    
    // 4. Calculate bonus
    const habitsKey = `habits:${stealthId}`;
    const habitsData = await redis.hgetall(habitsKey);
    
    let tier = habitsData?.tier || 'new';
    let bonusRate = 0.05;
    
    if (tier === 'whale') bonusRate = 0.20;
    else if (tier === 'high-volume') bonusRate = 0.15;
    else if (tier === 'active') bonusRate = 0.10;
    
    const txnCount = parseInt(habitsData?.txnCount || '0');
    if (txnCount === 0) bonusRate += 0.05;
    
    const bonus = Math.round(amount * bonusRate * 100) / 100;
    const totalCredit = amount + bonus;
    
    // 5. Record payment
    const txnKey = `p2p:${stealthId}:${Date.now()}`;
    await redis.hmset(txnKey, {
      id: paymentId,
      provider,
      stealthId,
      businessAlias: actualAlias,
      amount: amount.toString(),
      bonus: bonus.toString(),
      timestamp: new Date().toISOString(),
      status: 'received'
    });
    
    // 6. Update balance and habits
    await redis.incrbyfloat(`balance:${stealthId}`, totalCredit);
    await redis.hincrby(habitsKey, 'txnCount', 1);
    await redis.hset(habitsKey, 'lastTxn', Date.now().toString());
    await redis.hincrbyfloat(habitsKey, 'totalSpent', amount);
    await redis.hset(habitsKey, 'lastBusiness', actualAlias);
    
    // Update tier
    const newCount = parseInt(await redis.hget(habitsKey, 'txnCount') || '1');
    const totalSpent = parseFloat(await redis.hget(habitsKey, 'totalSpent') || '0');
    const avgTxn = totalSpent / newCount;
    
    let newTier = 'casual';
    if (newCount > 100 && avgTxn > 100) newTier = 'whale';
    else if (newCount > 50) newTier = 'high-volume';
    else if (newCount > 20 && avgTxn > 20) newTier = 'active';
    
    await redis.hset(habitsKey, 'tier', newTier);
    
    // 7. Notify customer if alias changed
    if (receivedAlias !== actualAlias) {
      await CustomerNotifier.notifyPaymentToOldBusiness(
        stealthId,
        receivedAlias,
        actualAlias,
        amount
      );
    }
    
    // 8. Publish events
    await redis.publish('p2p:payment', JSON.stringify({
      stealthId,
      provider,
      businessAlias: actualAlias,
      amount,
      bonus,
      totalCredit,
      tier: newTier,
      timestamp: Date.now(),
      paymentId
    }));
    
    return {
      success: true,
      amount,
      credited: totalCredit,
      stealthId,
      bonus,
      tier: newTier,
      businessAlias: actualAlias
    };
  }
}

// ============================================================================
// HTML Templates
// ============================================================================

function generatePaymentPage(amount: number, description: string, config: any): string {
  const cashappUrl = `https://cash.app/${config.cashTag.replace('$', '')}/${amount}`;
  const venmoUrl = `https://venmo.com/${config.venmoHandle.replace('@', '')}?txn=pay&amount=${amount}`;
  const paypalUrl = `https://${config.paypalLink}/${amount}`;
  
  // Extract branding config
  const branding = config.branding || {};
  const logoUrl = branding.logoUrl;
  const logoText = branding.logoText || config.brandName.charAt(0);
  const primaryColor = branding.primaryColor || config.color;
  const secondaryColor = branding.secondaryColor || primaryColor;
  const backgroundColor = branding.backgroundColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const fontFamily = branding.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const faviconUrl = branding.faviconUrl;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pay ${config.brandName}</title>
  ${faviconUrl ? `<link rel="icon" href="${faviconUrl}">` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: ${fontFamily};
      background: ${backgroundColor};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .alert {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      color: #856404;
      font-size: 14px;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: ${primaryColor};
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 32px;
      ${logoUrl ? `background-image: url('${logoUrl}'); background-size: cover; background-position: center;` : ''}
    }
    ${logoUrl ? `.logo::before { content: ''; display: none; }` : ''}
    h1 { color: #333; margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 20px; }
    .amount {
      font-size: 48px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 20px 0;
    }
    .options { display: grid; gap: 15px; margin: 30px 0; }
    .option {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      text-decoration: none;
      color: #333;
      transition: all 0.2s;
    }
    .option:hover {
      border-color: ${primaryColor};
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .option-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      font-size: 20px;
      font-weight: bold;
      color: white;
    }
    .cashapp { background: #00D632; }
    .venmo { background: #008cff; }
    .paypal { background: #003087; }
    .option-text { flex: 1; text-align: left; }
    .option-title { font-weight: 600; font-size: 16px; }
    .option-handle { color: #666; font-size: 14px; }
    .share-btn {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 16px;
      cursor: pointer;
      width: 100%;
      margin-top: 20px;
      font-weight: 600;
    }
    .share-btn:hover { opacity: 0.9; }
    .footer { margin-top: 24px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    ${config.message ? `<div class="alert">${config.message}</div>` : ''}
    <div class="logo">${logoUrl ? '' : logoText}</div>
    <h1>${config.brandName}</h1>
    <p class="desc">${description}</p>
    
    <div class="amount">$${amount}</div>
    
    <div class="options">
      <a href="${cashappUrl}" class="option" target="_blank">
        <div class="option-icon cashapp">$</div>
        <div class="option-text">
          <div class="option-title">CashApp</div>
          <div class="option-handle">${config.cashTag}</div>
        </div>
        →
      </a>
      
      <a href="${venmoUrl}" class="option" target="_blank">
        <div class="option-icon venmo">V</div>
        <div class="option-text">
          <div class="option-title">Venmo</div>
          <div class="option-handle">${config.venmoHandle}</div>
        </div>
        →
      </a>
      
      <a href="${paypalUrl}" class="option" target="_blank">
        <div class="option-icon paypal">P</div>
        <div class="option-text">
          <div class="option-title">PayPal</div>
          <div class="option-handle">${config.paypalLink}</div>
        </div>
        →
      </a>
    </div>
    
    <button class="share-btn" onclick="sharePayment()">
      📱 Share Payment Link
    </button>
    
    <div class="footer">
      Secured by P2P Proxy • Funds go directly to merchant
    </div>
  </div>
  
  <script>
    function sharePayment() {
      if (navigator.share) {
        navigator.share({
          title: 'Pay ${config.brandName}',
          text: '$${amount} for ${description}',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied!');
      }
    }
  </script>
</body>
</html>`;
}

// ============================================================================
// Bun Server
// ============================================================================

const PORT = Number(Bun.env.P2P_PROXY_PORT ?? 3002);
const ADMIN_SECRET = Bun.env.ADMIN_SECRET ?? 'admin-secret-change-in-production';

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  
  async fetch(req) {
    const url = new URL(req.url);
    const body = await req.text();
    const headers = req.headers;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: 'p2p-proxy-v3-continuity',
        redis: redis.status === 'ready' ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ========== ADMIN ENDPOINTS ==========
    
    // Check admin auth
    const isAdmin = headers.get('Authorization')?.includes(`Bearer ${ADMIN_SECRET}`);
    
    // List all businesses
    if (url.pathname === '/admin/businesses' && req.method === 'GET' && isAdmin) {
      try {
        const businesses = await BusinessContinuity.listBusinesses();
        return new Response(JSON.stringify(businesses), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // Create/Update business
    if (url.pathname === '/admin/business' && req.method === 'POST' && isAdmin) {
      try {
        const data = JSON.parse(body);
        const businessId = await BusinessContinuity.registerBusinessIdentity(data);
        return new Response(JSON.stringify({ success: true, businessId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Migrate business
    if (url.pathname === '/admin/migrate' && req.method === 'POST' && isAdmin) {
      try {
        const data = JSON.parse(body);
        const result = await BusinessContinuity.migrateBusiness(
          data.oldAlias,
          data.newBusinessData
        );
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Get business statistics
    if (url.pathname === '/admin/stats' && req.method === 'GET' && isAdmin) {
      try {
        const alias = url.searchParams.get('alias');
        if (!alias) {
          return new Response(JSON.stringify({ error: 'Alias required' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        const stats = await BusinessContinuity.getBusinessStats(alias);
        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // ========== WEBHOOK ENDPOINT ==========
    
    if (url.pathname === '/webhook/proxy' && req.method === 'POST') {
      try {
        let provider: 'paypal' | 'venmo' | 'cashapp' | null = null;
        
        // Auto-detect provider
        if (headers.get('user-agent')?.includes('PayPal') || headers.get('paypal-transmission-sig')) {
          provider = 'paypal';
        } else if (headers.get('x-venmo-signature')) {
          provider = 'venmo';
        } else if (headers.get('square-signature')) {
          provider = 'cashapp';
        }
        
        if (!provider) {
          return new Response(
            JSON.stringify({ error: 'Unknown provider' }),
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Verify signature
        const isValid = await BusinessAwareProxy.verifyProviderSignature(body, headers, provider);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: corsHeaders }
          );
        }
        
        // Get business alias from header or use default
        const businessAlias = headers.get('x-business-alias') || 
                             Bun.env.PROXY_BRAND_NAME || 
                             'HaircutPro';
        
        // Process payment with business context
        const payload = JSON.parse(body);
        const result = await BusinessAwareProxy.handlePaymentWithBusinessContext(
          provider,
          payload,
          businessAlias
        );
        
        console.log(`✅ ${provider.toUpperCase()}: $${result.amount} → $${result.credited} (${result.tier}) [${result.businessAlias}]`);
        
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error: any) {
        console.error('Webhook error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // ========== PAYMENT PAGE ==========
    
    if ((url.pathname === '/pay' || url.pathname === '/qr') && req.method === 'GET') {
      const amount = Number(url.searchParams.get('amount')) || 20;
      const description = url.searchParams.get('desc') || 'Service';
      const alias = url.searchParams.get('alias') || undefined;
      
      try {
        const config = await BusinessAwareProxy.getBrandConfig(alias);
        return new Response(generatePaymentPage(amount, description, config), {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    // ========== CUSTOMER PORTAL ==========
    
    if (url.pathname === '/portal' && req.method === 'GET') {
      const stealthId = url.searchParams.get('id');
      if (!stealthId) {
        return new Response('Customer ID required', { status: 400, headers: corsHeaders });
      }
      
      try {
        const portal = await CustomerNotifier.generateCustomerPortal(stealthId);
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Your Payment Portal</title>
    <style>
        body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .notification { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .notification.unread { background: #f0f7ff; border-left: 4px solid #007bff; }
        .business-list { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
        .business-tag { background: #e9ecef; padding: 5px 10px; border-radius: 20px; }
        .update-link { color: #007bff; text-decoration: none; }
        .update-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Your Payment Portal</h1>
    
    <div class="alert">
        ${portal.unreadNotifications > 0 ? 
          `<strong>You have ${portal.unreadNotifications} unread notifications</strong>` : 
          'No new notifications'}
    </div>
    
    <h2>Recent Notifications</h2>
    ${portal.recentNotifications.map((n: any) => `
        <div class="notification ${n.read ? '' : 'unread'}">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <small>${new Date(n.timestamp).toLocaleDateString()}</small>
            ${n.action ? `<br><a href="${n.action.url}" class="update-link">Update payment link →</a>` : ''}
        </div>
    `).join('')}
    
    <h2>Businesses You've Paid</h2>
    <div class="business-list">
        ${portal.subscribedBusinesses.map((b: string) => `
            <div class="business-tag">${b}</div>
        `).join('')}
    </div>
</body>
</html>`;
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    // Root
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>P2P Proxy v3 - Business Continuity</title>
  <style>
    body { font-family: system-ui; padding: 40px; text-align: center; }
    a { display: inline-block; margin: 10px; padding: 15px 30px; 
        background: #007bff; color: white; 
        text-decoration: none; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>P2P Proxy v3 - Business Continuity</h1>
  <p>Enhanced payment proxy with business alias support</p>
  <div>
    <a href="/pay?amount=25">💳 Pay $25</a>
    <a href="/admin/businesses">👔 Admin (requires auth)</a>
  </div>
</body>
</html>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log(`║  💈 P2P Proxy v3 - Business Continuity                    ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  URL:     http://localhost:${PORT}                        ║`);
console.log(`║  Pay:     http://localhost:${PORT}/pay?amount=25          ║`);
console.log(`║  Admin:   http://localhost:${PORT}/admin/businesses        ║`);
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Features:                                                 ║');
console.log('║    • Business alias support                                 ║');
console.log('║    • Payment forwarding                                     ║');
console.log('║    • Customer notifications                                  ║');
console.log('║    • Admin dashboard                                        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

export default server;
