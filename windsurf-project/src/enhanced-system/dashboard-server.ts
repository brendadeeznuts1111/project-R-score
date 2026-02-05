// src/enhanced-system/dashboard-server.ts
/**
 * §API:125 - Advanced Bun-Native Dashboard Server
 * Features: server.reload() support, server.requestIP(), server.pendingRequests, server.timeout()
 */
import { dashboardRoutes } from '../../api/dashboard.routes';
import { join } from 'path';

const PORT = 3004;
const scope = process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX';

const dashboardServer = {
  port: PORT,
  development: process.env.NODE_ENV !== 'production',

  // Pattern-based routes with static file buffering for speed
  // Only buffering small frequently used assets as per Bun policy
  routes: {
    "/": new Response(await Bun.file('dashboards/main/dashboard-v2.html').bytes(), {
      headers: { "Content-Type": "text/html" }
    }),
    "/analytics": new Response(await Bun.file('dashboards/main/dashboard-v2.html').bytes(), {
      headers: { "Content-Type": "text/html" }
    }),
    "/api/version": Response.json({ version: "2.1.0-alpha", engine: "Bun Native" }),
  },

  async fetch(req: Request, server: any) {
    const url = new URL(req.url);
    const clientIP = server.requestIP(req);

    // Track metrics per request
    const startTime = performance.now();

    // Set 60 second timeout for large uploads/exports
    if (url.pathname.includes('/export') || url.pathname.includes('/upload')) {
        server.timeout(req, 60);
    } else {
        server.timeout(req, 10); // Tight 10s timeout for standard API/UI
    }

    // Elysia Router integration for API
    if (url.pathname.startsWith('/api/v1')) {
      return dashboardRoutes.handle(req);
    }

    // Static Asset Serving (Streaming for large files)
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
      const filePath = join(process.cwd(), url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { 
            "Content-Type": url.pathname.endsWith('.js') ? "application/javascript" : "text/css",
            "x-served-from": "streaming-io"
          }
        });
      }
    }

    // Fallback if not matched by routes or patterns
    const duration = (performance.now() - startTime).toFixed(3);
    
    // §API:126 - Structured Internal Logger
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: url.pathname,
      duration: `${duration}ms`,
      ip: clientIP?.address,
      userAgent: req.headers.get('user-agent'),
      scope: process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX'
    };

    console.log(`\u001b[34m[HTTP]\u001b[0m ${logEntry.method} ${logEntry.path} \u001b[90m(${logEntry.duration})\u001b[0m from ${logEntry.ip}`);
    
    // Append to internal log for dashboard tailing
    const logString = `${logEntry.timestamp} | ${logEntry.method} | ${logEntry.path} | ${logEntry.duration} | ${logEntry.ip}\n`;
    await Bun.write('logs/dashboard-access.log', logString, { append: true } as any);

    // Internal Health Status
    if (url.pathname === '/internal/stats') {
       return Response.json({
          requests: server.pendingRequests,
          websockets: server.pendingWebSockets,
          uptime: process.uptime(),
          client: clientIP
       });
    }

    return new Response(Bun.file('dashboards/main/dashboard-v2.html'), {
       headers: { "Content-Type": "text/html" }
    });
  },

  error(error: Error) {
    return new Response(`Server error: ${error.message}`, { status: 500 });
  }
};

const server = Bun.serve(dashboardServer);

console.log(`\u001b[1m\u001b[32m✅ EMPIRE PRO Dashboard Server running at http://localhost:${server.port}\u001b[0m`);
console.log(`📡 Scope: \u001b[36m${scope}\u001b[0m`);

// Hot reloading support via signal (e.g., SIGHUP or custom trigger)
process.on('SIGHUP', () => {
  console.log('♻️ Reloading server handlers...');
  server.reload(dashboardServer);
});

export default server;
