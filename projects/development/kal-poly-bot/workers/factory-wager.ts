/**
 * Cloudflare Worker for factory-wager.com
 * Central hub for all repositories, dashboards, and operational monitoring
 * 
 * Deploy with: bunx wrangler deploy
 */

export interface Env {
  ENVIRONMENT: string;
  PLATFORM_NAME: string;
  HUB_DASHBOARD_URL: string;
  // KV Namespaces
  // HUB_CONFIG: KVNamespace;
  // R2 Buckets
  // ASSETS: R2Bucket;
}

/**
 * Main request handler for factory-wager.com Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (path === '/health' || path === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          platform: env.PLATFORM_NAME,
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
          hub: {
            dashboardUrl: env.HUB_DASHBOARD_URL,
            domain: 'factory-wager.com',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Hub information endpoint
    if (path === '/api/hub' || path === '/hub') {
      return new Response(
        JSON.stringify({
          name: 'Factory Wager Cloudflare Hub',
          description: 'Central hub for all repositories, dashboards, and operational monitoring',
          url: env.HUB_DASHBOARD_URL,
          domain: 'factory-wager.com',
          accountId: '7a470541a704caaf91e71efccc78fd36',
          categories: [
            'infrastructure',
            'cdn',
            'dns',
            'security',
            'analytics',
            'repositories',
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Dashboard redirect endpoint
    if (path === '/dashboard' || path === '/dash') {
      return Response.redirect(env.HUB_DASHBOARD_URL, 302);
    }

    // Root endpoint - serve hub information page
    if (path === '/' || path === '') {
      return new Response(
        generateHubPage(env),
        {
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders,
          },
        }
      );
    }

    // 404 for unknown routes
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

/**
 * Generate HTML page for hub root
 */
function generateHubPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factory Wager Hub - ${env.PLATFORM_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      opacity: 0.9;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .links {
      display: grid;
      gap: 15px;
      margin-top: 30px;
    }
    .link {
      display: block;
      padding: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      text-decoration: none;
      color: #fff;
      transition: all 0.3s;
      border: 2px solid transparent;
    }
    .link:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }
    .link-title {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .link-desc {
      opacity: 0.8;
      font-size: 0.9em;
    }
    .status {
      text-align: center;
      padding: 15px;
      background: rgba(76, 175, 80, 0.3);
      border-radius: 10px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏭 Factory Wager Hub</h1>
    <p class="subtitle">${env.PLATFORM_NAME}</p>
    
    <div class="status">
      ✅ Hub Status: Operational | Environment: ${env.ENVIRONMENT}
    </div>

    <div class="links">
      <a href="${env.HUB_DASHBOARD_URL}" class="link" target="_blank">
        <div class="link-title">🌐 Cloudflare Dashboard</div>
        <div class="link-desc">Access the full Cloudflare dashboard for infrastructure management</div>
      </a>
      
      <a href="/api/hub" class="link">
        <div class="link-title">📊 Hub API</div>
        <div class="link-desc">Get hub configuration and metadata in JSON format</div>
      </a>
      
      <a href="/health" class="link">
        <div class="link-title">💚 Health Check</div>
        <div class="link-desc">Check hub health status and system information</div>
      </a>
    </div>
  </div>
</body>
</html>`;
}

