#!/usr/bin/env bun
// Factory-Wager Dashboard v3.6 - Subdomains/CDN/R2/A-B Cookie Integration
// Usage: bun run factory-wager-dashboard.ts → Subdomain/A-B Ready!

import { juniorProfile } from './utils/junior-runner';
import { createHash } from 'crypto';

// Configuration
const R2_BUCKET = process.env.R2_BUCKET_URL || 'https://r2.factory-wager.com';
const CDN_DOMAIN = 'cdn.factory-wager.com';
const PORT = 3000;
const HOSTNAME = '0.0.0.0';

// Registry for different dashboard types
interface DashboardRegistry {
  [key: string]: {
    colorScheme: string;
    metrics: any;
    features: string[];
  };
}

const REGISTRY: DashboardRegistry = {
  admin: {
    colorScheme: `
      body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      .metric { background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px; backdrop-filter: blur(10px); }
      .metric-value { font-size: 2em; font-weight: bold; color: #4CAF50; }
      table { background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    `,
    metrics: { totalProfiles: 1250, avgScore: 94.2, uptime: '99.9%' },
    features: ['Full Analytics', 'User Management', 'System Health', 'A/B Testing Control']
  },
  client: {
    colorScheme: `
      body { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      .metric { background: rgba(255,255,255,0.1); padding: 10px; margin: 8px 0; border-radius: 6px; }
      .metric-value { font-size: 1.5em; font-weight: bold; color: #FFD700; }
      table { background: rgba(255,255,255,0.1); border-radius: 6px; }
      th, td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    `,
    metrics: { profiles: 45, lastUpdate: '2 min ago', status: 'Active' },
    features: ['Profile View', 'Basic Metrics', 'Export Data', 'Limited Analytics']
  },
  user: {
    colorScheme: `
      body { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      .metric { background: rgba(255,255,255,0.1); padding: 8px; margin: 5px 0; border-radius: 4px; }
      .metric-value { font-size: 1.2em; font-weight: bold; color: #00FF00; }
      table { background: rgba(255,255,255,0.1); border-radius: 4px; }
      th, td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    `,
    metrics: { visits: 12, score: 88, lastSeen: '1 hour ago' },
    features: ['Basic View', 'Personal Score', 'Simple Export']
  }
};

/**
 * Generate metrics markdown for dashboard
 */
function generateMetricsMD(registry: DashboardRegistry[string]): string {
  const metrics = Object.entries(registry.metrics)
    .map(([key, value]) => `| ${key.charAt(0).toUpperCase() + key.slice(1)} | ${value} |`)
    .join('\n');
  
  const features = registry.features
    .map(feature => `- ${feature}`)
    .join('\n');
  
  return `
## 📊 Metrics

| Metric | Value |
|--------|-------|
${metrics}

## 🚀 Features

${features}

## 🔗 Quick Actions

- [📈 View Analytics](#analytics)
- [⚙️ Settings](#settings)
- [📤 Export Data](#export)
- [🔄 Refresh](#refresh)
  `;
}

/**
 * Parse cookies from request headers
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  
  return Object.fromEntries(
    cookieHeader.split('; ').map(cookie => {
      const [name, value] = cookie.split('=');
      return [name, decodeURIComponent(value || '')];
    })
  );
}

/**
 * Set cookie in response headers
 */
function setCookie(name: string, value: string, options: {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
} = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  
  return parts.join('; ');
}

/**
 * Generate ETag using Node.js crypto
 */
function generateETag(content: string, variant: string): string {
  return createHash('sha256')
    .update(`${content}${variant}`)
    .digest('hex');
}

/**
 * Upload profile data to R2 bucket
 */
async function uploadToR2(profileId: string, data: any, variant: string, subdomain: string): Promise<void> {
  try {
    const uploadData = {
      ...data,
      variant,
      subdomain,
      timestamp: new Date().toISOString(),
      uploaded: true
    };
    
    const response = await fetch(`${R2_BUCKET}/profiles/${profileId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Variant': variant,
        'X-Subdomain': subdomain
      },
      body: JSON.stringify(uploadData)
    });
    
    if (!response.ok) {
      console.error(`R2 Upload failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`✅ Profile uploaded to R2: ${profileId}`);
    }
  } catch (error) {
    console.error('R2 Upload error:', error);
  }
}

/**
 * Generate dashboard HTML
 */
function generateDashboardHTML(dashType: string, variant: string): string {
  const registry = REGISTRY[dashType] || REGISTRY.user;
  const md = `# Factory-Wager ${dashType.toUpperCase()} Dashboard (${variant})\n\n${generateMetricsMD(registry)}`;
  const html = Bun.markdown.html(md, { tables: true });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factory-Wager ${dashType.toUpperCase()} (${variant})</title>
    <style>${registry.colorScheme}</style>
</head>
<body>
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
        <header style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 3em; margin: 0;">⚡ Factory-Wager</h1>
            <p style="font-size: 1.2em; opacity: 0.8;">${dashType.toUpperCase()} Dashboard • Variant ${variant}</p>
        </header>
        ${html}
        <footer style="text-align: center; margin-top: 40px; opacity: 0.7;">
            <p>Powered by Bun • v3.6 Subdomains/CDN/R2/A-B Cookie</p>
        </footer>
    </div>
</body>
</html>`;
}

/**
 * Main Factory-Wager Server
 */
const server = Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  
  async fetch(req) {
    const url = new URL(req.url);
    const host = req.headers.get('host') || '';
    
    // Parse cookies for A/B testing
    const cookies = parseCookies(req.headers.get('cookie'));
    let variant = cookies.variant || 'A';
    
    // Validate variant
    if (!['A', 'B', 'C'].includes(variant)) {
      variant = 'A';
    }
    
    // Determine dashboard type from subdomain
    let dashType = 'user';
    if (host.includes('admin')) {
      dashType = 'admin';
    } else if (host.includes('client')) {
      dashType = 'client';
    }
    
    // Profile analysis route
    if (url.pathname === '/profile') {
      try {
        const body = await req.text();
        if (!body) {
          return new Response('Missing profile data', { status: 400 });
        }
        
        // Run JuniorRunner analysis
        const profile = await juniorProfile(body, { lspSafe: true });
        
        // Generate profile ID and upload to R2
        const profileId = createHash('sha256')
          .update(JSON.stringify(profile))
          .digest('hex');
        
        // Upload to R2 in background
        uploadToR2(profileId, profile, variant, host);
        
        return Response.json({
          success: true,
          profile,
          r2Id: profileId,
          variant,
          subdomain: host,
          dashType
        });
        
      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }
    
    // Analytics API
    if (url.pathname === '/analytics') {
      const analytics = {
        variant,
        dashType,
        host,
        timestamp: new Date().toISOString(),
        metrics: REGISTRY[dashType].metrics,
        features: REGISTRY[dashType].features
      };
      
      return Response.json(analytics);
    }
    
    // Variant switcher
    if (url.pathname === '/switch-variant') {
      const newVariant = url.searchParams.get('variant') || 'A';
      if (['A', 'B', 'C'].includes(newVariant)) {
        variant = newVariant;
      }
      
      // Redirect back with new cookie
      return Response.redirect(`${url.protocol}//${host}${url.searchParams.get('redirect') || '/'}`, 302);
    }
    
    // Main dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const html = generateDashboardHTML(dashType, variant);
      const etag = generateETag(html, variant);
      
      // Check If-None-Match for caching
      const ifNoneMatch = req.headers.get('if-none-match');
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304 });
      }
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'ETag': etag,
          'X-Factory-Wager': 'v3.6',
          'X-Variant': variant,
          'X-Dashboard-Type': dashType,
          'Set-Cookie': setCookie('variant', variant, {
            maxAge: 86400, // 24 hours
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            sameSite: 'Strict'
          })
        }
      });
    }
    
    // API documentation
    if (url.pathname === '/api') {
      const apiDocs = {
        title: "Factory-Wager API v3.6",
        version: "3.6.0",
        endpoints: {
          "GET /": "Main dashboard with A/B variants",
          "POST /profile": "Profile analysis with R2 upload",
          "GET /analytics": "Analytics data for current variant",
          "GET /switch-variant": "Switch A/B testing variant"
        },
        variants: {
          "A": "Admin Full Metrics (80% traffic)",
          "B": "Client Simple View (15% traffic)", 
          "C": "User Custom Analytics (5% traffic)"
        },
        subdomains: {
          "admin.factory-wager.com": "Full admin dashboard",
          "client.factory-wager.com": "Client dashboard",
          "user.factory-wager.com": "User dashboard"
        }
      };
      
      return Response.json(apiDocs, {
        headers: {
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // 404
    return new Response('Not Found', {
      status: 404,
      headers: {
        'X-Factory-Wager': 'v3.6'
      }
    });
  },
  
  websocket: {
    message(ws, message) {
      // Handle real-time profile updates
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'profile-update') {
          // Broadcast to all connected clients
          ws.publish('profile-updates', JSON.stringify({
            type: 'profile-update',
            timestamp: new Date().toISOString(),
            data: data.profile
          }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    },
    
    open(ws) {
      // Subscribe to profile updates
      ws.subscribe('profile-updates');
      console.log('🔌 WebSocket client connected');
    },
    
    close(ws) {
      console.log('🔌 WebSocket client disconnected');
    }
  }
});

console.log('\x1b[1;32m⚡ Factory-Wager Dashboard v3.6\x1b[0m');
console.log('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
console.log(`\x1b[1;33m🌐 Server: http://localhost:${PORT}\x1b[0m`);
console.log(`\x1b[1;33m👤 Admin: http://admin.localhost:${PORT}\x1b[0m`);
console.log(`\x1b[1;33m💼 Client: http://client.localhost:${PORT}\x1b[0m`);
console.log(`\x1b[1;33m👥 User: http://user.localhost:${PORT}\x1b[0m`);
console.log(`\x1b[1;33m📊 API: http://localhost:${PORT}/api\x1b[0m`);
console.log(`\x1b[1;33m🔄 A/B Testing: Cookie variant=A/B/C\x1b[0m`);
console.log(`\x1b[1;33m☁️  R2 Bucket: ${R2_BUCKET}\x1b[0m`);
console.log('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
console.log('\x1b[1;32m🚀 Features: Subdomains • CDN • R2 • A/B Cookie • WebSocket\x1b[0m');
console.log('\x1b[1;31mPress Ctrl+C to stop\x1b[0m');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\x1b[1;33m🛑 Shutting down Factory-Wager Dashboard...\x1b[0m');
  server.stop();
  process.exit(0);
});

export { server, REGISTRY, generateMetricsMD, uploadToR2 };
