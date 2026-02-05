#!/usr/bin/env bun
/**
 * Project Server - Example web server with cookie/session handling
 * Logs all session activity with project context from Bun.main
 * 
 * Enhanced with fetch proxy service demonstrating Bun's fetch capabilities
 */

import { fetchProxy, type ProxyRequest } from './services/fetch-proxy.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// Simple cookie parser (for demonstration)
function parseCookie(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(pair => {
    const [key, ...valParts] = pair.trim().split('=');
    if (key) {
      cookies[key] = decodeURIComponent(valParts.join('='));
    }
  });

  return cookies;
}

// Simple HMAC for session integrity (in production, use a proper secret)
function simpleHmac(key: string, data: string): string {
  // This is a simplified example - use Bun.hash.hmac in real code
  return Bun.hash.sha256(data + key).toString('hex').slice(0, 16);
}

// Get session secret from environment or generate a warning
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || Bun.env.SESSION_SECRET;
  if (!secret) {
    console.warn('⚠️ WARNING: No SESSION_SECRET found in environment. Using insecure default!');
    console.warn('Set SESSION_SECRET environment variable for production use.');
    return 'insecure-default-secret-do-not-use-in-production';
  }
  return secret;
}

// Generate secure session cookie
function createSessionCookie(sessionData: Record<string, any>): string {
  const payload = JSON.stringify(sessionData);
  const sessionSecret = getSessionSecret();
  const hmac = simpleHmac(sessionSecret, payload);
  const encoded = btoa(payload)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `session=${encoded}; hmac=${hmac}; Path=/; HttpOnly; Secure`;
}

// Verify session cookie
function verifySessionCookie(cookieHeader: string): Record<string, any> | null {
  const cookies = parseCookie(cookieHeader);
  const sessionCookie = cookies['session'];
  const hmac = cookies['hmac'];

  if (!sessionCookie || !hmac) {
    return null;
  }

  try {
    const payload = atob(sessionCookie.replace(/-/g, '+').replace(/_/g, '/'));
    const expectedHmac = simpleHmac(getSessionSecret(), payload);

    if (hmac !== expectedHmac) {
      console.warn(`Session HMAC mismatch in ${Bun.main}`);
      return null;
    }

    return JSON.parse(payload);
  } catch (err) {
    console.warn(`Failed to parse session cookie in ${Bun.main}:`, err);
    return null;
  }
}

// URLPattern routing for clean URL handling
const patterns = {
  home: new URLPattern({ pathname: '/' }),
  logout: new URLPattern({ pathname: '/logout' }),
  proxy: new URLPattern({ pathname: '/proxy' }),
  proxyStats: new URLPattern({ pathname: '/proxy-stats' }),
  health: new URLPattern({ pathname: '/health' })
};

// Main server
const port = process.env.PORT || 3000;

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Project Server Starting                                 ║
║  Entrypoint: ${Bun.main}${' '.repeat(40 - Bun.main.length)}║
║  Port: ${port}${' '.repeat(48 - port.toString().length)}║
║  Features: Session Management + Fetch Proxy                ║
╚═══════════════════════════════════════════════════════════╝
`);

Bun.serve({
  port: Number(port),
  async fetch(req) {
    const url = new URL(req.url);
    const projectContext = `Project: ${Bun.main}`;

    // Session handling
    const sessionCookie = req.headers.get('Cookie') || '';
    const session = verifySessionCookie(sessionCookie);

    if (session) {
      console.log(`[${projectContext}] Session verified:`, session);
    } else {
      console.log(`[${projectContext}] No valid session - new visitor`);
    }

    // Route handling with URLPattern
    if (patterns.home.test(url) && req.method === 'GET') {
      const newSession = { userId: Date.now(), visitCount: (session?.visitCount || 0) + 1 };
      const cookieHeader = createSessionCookie(newSession);

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Project Server - ${Bun.main.split('/').pop()}</title>
            <style>
              body { font-family: system-ui, margin: 2rem; }
              .endpoint { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
              .endpoint code { background: #333; color: #fff; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
              a { color: #007acc; }
            </style>
          </head>
          <body>
            <h1>✅ Server Running</h1>
            <p><strong>Project:</strong> ${Bun.main}</p>
            <p><strong>Visit count:</strong> ${newSession.visitCount}</p>
            <p><strong>User ID:</strong> ${newSession.userId}</p>
            
            <h2>📡 Fetch Proxy Endpoints</h2>
            
            <div class="endpoint">
              <h3>Basic Proxy</h3>
              <p>Proxy any URL through the server:</p>
              <code>GET /proxy?url=https://example.com</code>
              <br><br>
              <a href="/proxy?url=https://example.com">Try: /proxy?url=https://example.com</a>
            </div>
            
            <div class="endpoint">
              <h3>Bun Documentation Proxy</h3>
              <p>Fetch Bun docs with optimizations:</p>
              <code>GET /proxy?url=https://bun.sh/docs</code>
              <br><br>
              <a href="/proxy?url=https://bun.sh/docs">Try: /proxy?url=https://bun.sh/docs</a>
            </div>
            
            <div class="endpoint">
              <h3>Proxy Statistics</h3>
              <p>View proxy performance and cache stats:</p>
              <code>GET /proxy-stats</code>
              <br><br>
              <a href="/proxy-stats">View Stats</a>
            </div>
            
            <div class="endpoint">
              <h3>Health Check</h3>
              <p>Check system health:</p>
              <code>GET /health</code>
              <br><br>
              <a href="/health">Check Health</a>
            </div>
            
            <hr>
            <h3>Session Data:</h3>
            <pre>${JSON.stringify(newSession, null, 2)}</pre>
            
            <p><a href="/logout">Logout</a></p>
          </body>
        </html>
      `, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Set-Cookie': cookieHeader
        }
      });
    }

    if (patterns.logout.test(url) && req.method === 'GET') {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Logged Out</title></head>
          <body>
            <h1>Logged out</h1>
            <p><a href="/">Return</a></p>
          </body>
        </html>
      `, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Set-Cookie': 'session=; hmac=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      });
    }

    // Proxy endpoint - demonstrates Bun's fetch API
    if (patterns.proxy.test(url) && req.method === 'GET') {
      const targetUrl = url.searchParams.get('url') || 'https://example.com';
      
      console.log(`[${projectContext}] Proxy request to: ${targetUrl}`);
      
      try {
        // Use our enhanced fetch proxy service
        const proxyRequest: ProxyRequest = {
          targetUrl,
          method: 'GET',
          timeout: 15000, // 15 seconds
          optimize: true, // Enable DNS prefetch and preconnect
          cache: true // Enable caching
        };
        
        const proxyResponse = await fetchProxy.handleProxy(proxyRequest);
        
        console.log(`[${projectContext}] Proxy response: ${proxyResponse.status} (${proxyResponse.timing.total.toFixed(2)}ms)`);
        
        // Return HTML response with proxy info
        const htmlResponse = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Proxy Response - ${new URL(targetUrl).hostname}</title>
              <style>
                body { font-family: system-ui; margin: 2rem; }
                .proxy-info { background: #e8f4fd; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
                .timing { background: #f0f9ff; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
                .content { border: 1px solid #ddd; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
                pre { background: #f5f5f5; padding: 1rem; overflow: auto; }
                .success { color: #059669; }
                .warning { color: #d97706; }
                .error { color: #dc2626; }
              </style>
            </head>
            <body>
              <h1>📡 Proxy Response</h1>
              
              <div class="proxy-info">
                <h3>Request Information</h3>
                <p><strong>Target URL:</strong> <a href="${targetUrl}" target="_blank">${targetUrl}</a></p>
                <p><strong>Status:</strong> <span class="${proxyResponse.ok ? 'success' : 'error'}">${proxyResponse.status} ${proxyResponse.statusText}</span></p>
                <p><strong>Content-Type:</strong> ${proxyResponse.headers['content-type'] || 'Unknown'}</p>
                <p><strong>Content-Length:</strong> ${proxyResponse.headers['content-length'] || 'Unknown'}</p>
                ${proxyResponse.optimization ? `<p><strong>Optimizations:</strong> ${proxyResponse.optimization.join(', ')}</p>` : ''}
                ${proxyResponse.cache?.hit ? `<p><strong>Cache:</strong> <span class="success">HIT</span> (${(proxyResponse.cache.age / 1000).toFixed(1)}s old)</p>` : ''}
              </div>
              
              <div class="timing">
                <h3>Performance Timing</h3>
                <p><strong>Total Time:</strong> ${proxyResponse.timing.total.toFixed(2)}ms</p>
                ${proxyResponse.timing.dns ? `<p><strong>DNS Time:</strong> ${proxyResponse.timing.dns.toFixed(2)}ms</p>` : ''}
                ${proxyResponse.timing.connect ? `<p><strong>Connect Time:</strong> ${proxyResponse.timing.connect.toFixed(2)}ms</p>` : ''}
                ${proxyResponse.timing.download ? `<p><strong>Download Time:</strong> ${proxyResponse.timing.download.toFixed(2)}ms</p>` : ''}
              </div>
              
              <div class="content">
                <h3>Response Content</h3>
                ${proxyResponse.ok ? 
                  `<pre>${proxyResponse.body.substring(0, 5000)}${proxyResponse.body.length > 5000 ? '\\n\\n... (truncated)' : ''}</pre>` :
                  `<p class="error">Error: ${proxyResponse.body}</p>`
                }
              </div>
              
              <p><a href="/">← Back to Home</a> | <a href="/proxy-stats">Proxy Stats</a></p>
            </body>
          </html>
        `;
        
        return new Response(htmlResponse, {
          status: proxyResponse.status,
          headers: {
            'Content-Type': 'text/html',
            'X-Proxy-Status': proxyResponse.status.toString(),
            'X-Proxy-Time': proxyResponse.timing.total.toFixed(2),
            'X-Proxy-Cache': proxyResponse.cache?.hit ? 'HIT' : 'MISS'
          }
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`[${projectContext}] Proxy error:`, errorMessage);
        
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head><title>Proxy Error</title></head>
            <body>
              <h1>❌ Proxy Error</h1>
              <p><strong>Target URL:</strong> ${targetUrl}</p>
              <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
              <p><a href="/">← Back to Home</a></p>
            </body>
          </html>
        `, {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }

    // Proxy statistics endpoint
    if (patterns.proxyStats.test(url) && req.method === 'GET') {
      const stats = fetchProxy.getStats();
      
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Proxy Statistics</title>
            <style>
              body { font-family: system-ui; margin: 2rem; }
              .stats { background: #f8fafc; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
              th { background: #f1f5f9; }
              .fresh { color: #059669; }
              .stale { color: #d97706; }
            </style>
          </head>
          <body>
            <h1>📊 Proxy Statistics</h1>
            
            <div class="stats">
              <h3>Cache Statistics</h3>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Entries</td><td>${stats.cache.size}</td></tr>
                <tr><td>Fresh Entries</td><td class="fresh">${stats.cache.entries.filter(e => e.fresh).length}</td></tr>
                <tr><td>Stale Entries</td><td class="stale">${stats.cache.entries.filter(e => !e.fresh).length}</td></tr>
              </table>
            </div>
            
            <div class="stats">
              <h3>DNS Cache</h3>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Cache Size</td><td>${stats.dns.cacheSize}</td></tr>
                <tr><td>Fresh Entries</td><td class="fresh">${stats.dns.freshEntries}</td></tr>
              </table>
            </div>
            
            <div class="stats">
              <h3>Rate Limiting</h3>
              <table>
                <tr><th>Host</th><th>Requests</th><th>Reset In</th></tr>
                ${stats.rateLimit.entries.map(entry => 
                  `<tr><td>${entry.host}</td><td>${entry.count}</td><td>${(entry.resetIn / 1000).toFixed(1)}s</td></tr>`
                ).join('')}
              </table>
            </div>
            
            <p><a href="/">← Back to Home</a> | <a href="/health">Health Check</a></p>
          </body>
        </html>
      `;
      
      return new Response(htmlResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Health check endpoint
    if (patterns.health.test(url) && req.method === 'GET') {
      const health = await fetchProxy.healthCheck();
      
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Health Check</title>
            <style>
              body { font-family: system-ui; margin: 2rem; }
              .health { background: #f0f9ff; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem; }
              .healthy { color: #059669; }
              .unhealthy { color: #dc2626; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
              th { background: #f1f5f9; }
            </style>
          </head>
          <body>
            <h1>🏥 Health Check</h1>
            
            <div class="health">
              <h3>Overall Status: <span class="${health.status === 'healthy' ? 'healthy' : 'unhealthy'}">${health.status.toUpperCase()}</span></h3>
              
              <table>
                <tr><th>Check</th><th>Status</th></tr>
                ${Object.entries(health.checks).map(([check, status]) => 
                  `<tr><td>${check}</td><td class="${status ? 'healthy' : 'unhealthy'}">${status ? '✅ PASS' : '❌ FAIL'}</td></tr>`
                ).join('')}
              </table>
            </div>
            
            <p><a href="/">← Back to Home</a> | <a href="/proxy-stats">Proxy Stats</a></p>
          </body>
        </html>
      `;
      
      return new Response(htmlResponse, {
        status: health.status === 'healthy' ? 200 : 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Not Found</title></head>
        <body>
          <h1>404 - Not Found</h1>
          <p>The path <code>${url.pathname}</code> was not found.</p>
          <p><a href="/">← Back to Home</a></p>
        </body>
      </html>
    `, { status: 404, headers: { 'Content-Type': 'text/html' } });
  },
  error(err) {
    console.error(`[${Bun.main}] Server error:`, err);
  }
});

console.log(`Server listening on http://example.com:${port}`);
console.log(`Project context: ${Bun.main}`);
console.log(`Available endpoints:`);
console.log(`  GET  /              - Main page with session management`);
console.log(`  GET  /proxy         - Fetch proxy (add ?url=TARGET)`);
console.log(`  GET  /proxy-stats   - Proxy statistics and cache info`);
console.log(`  GET  /health        - Health check`);
console.log(`  GET  /logout        - Clear session`);
/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */