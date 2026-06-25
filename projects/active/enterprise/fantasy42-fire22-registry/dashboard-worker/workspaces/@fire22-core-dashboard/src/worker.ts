/**
 * Fire22 Dashboard Worker - Cloudflare Workers Entry Point
 *
 * This is the main entry point for Cloudflare Workers deployment
 */

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  CASHIER_BOT_TOKEN: string;
  JWT_SECRET: string;
  ADMIN_PASSWORD: string;
  FIRE22_API_URL: string;
  FIRE22_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check endpoint
    if (path === '/health' || path === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: '3.0.8',
          timestamp: new Date().toISOString(),
          environment: 'cloudflare-workers',
          message: 'Fire22 Dashboard Worker is running',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Version': '3.0.8',
          },
        }
      );
    }

    // Dashboard endpoint
    if (path === '/dashboard') {
      return new Response(
        `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .status {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: #4CAF50;
            border-radius: 20px;
            margin-top: 1rem;
        }
        .info {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 Fire22 Dashboard</h1>
        <p>Sports Betting Management Platform</p>
        <div class="status">✅ System Operational</div>
        <div class="info">
            <p>Version: 3.0.8</p>
            <p>Environment: Cloudflare Workers</p>
            <p>Region: ${request.cf?.colo || 'Unknown'}</p>
        </div>
    </div>
</body>
</html>
      `,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
          },
        }
      );
    }

    // API endpoints
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, path);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: `The requested path ${path} was not found`,
        availableEndpoints: ['/', '/health', '/dashboard', '/api/status'],
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  },
};

/**
 * Handle API requests
 */
async function handleAPI(request: Request, env: Env, path: string): Promise<Response> {
  // API status endpoint
  if (path === '/api/status') {
    return new Response(
      JSON.stringify({
        api: 'Fire22 Dashboard API',
        version: '3.0.8',
        status: 'operational',
        database: env.DB ? 'connected' : 'not configured',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Add more API endpoints as needed

  return new Response(
    JSON.stringify({
      error: 'API endpoint not found',
    }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
