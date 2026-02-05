/**
 * demo-management-hub.ts
 * Multi-tenant process management hub for Unified Infrastructure.
 * Displays metrics and allows control of child dashboard processes.
 * Shares state with the UnifiedDashboardLauncher in the same process.
 */

import { UnifiedDashboardLauncher } from '../utils/unified-dashboard-launcher';
import { serve, file } from 'bun';

const HUB_PORT = parseInt(process.env.HUB_PORT || '3005');
const NODE_ENV = process.env.NODE_ENV || 'development';

async function runDemo() {
  console.log('🌟 Starting DuoPlus Management Hub Demo...');

  // 1. Start the Hub Server in THIS process
  console.log(`📡 Launching Management Hub Server on port ${HUB_PORT}...`);
  
  const server = serve({
    port: HUB_PORT,
    development: NODE_ENV === 'development',
    async fetch(req) {
      const url = new URL(req.url);

      // 🌐 Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });
      }

      // 🏠 Main Hub UI
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const hubHtml = file('./src/dashboard/management-hub.html');
        if (await hubHtml.exists()) {
          return new Response(await hubHtml.bytes(), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('Management Hub UI not found', { status: 404 });
      }

      // --- API Endpoints ---

      // 1. List active processes
      if (url.pathname === '/api/hub/processes') {
        const processes = UnifiedDashboardLauncher.getActiveProcesses();
        return Response.json({ success: true, count: processes.length, processes });
      }

      // 2. Get metrics for all scopes
      if (url.pathname === '/api/hub/metrics') {
        const processes = UnifiedDashboardLauncher.getActiveProcesses();
        const metrics: Record<string, any> = {};
        
        for (const proc of processes) {
          metrics[proc.scope] = UnifiedDashboardLauncher.getLatestMetrics(proc.scope);
        }
        
        return Response.json({ 
          success: true, 
          metrics,
          timestamp: new Date().toISOString()
        });
      }

      // 3. Shutdown process
      if (url.pathname === '/api/hub/shutdown' && req.method === 'POST') {
        const { scope } = await req.json().catch(() => ({}));
        
        if (scope === 'all') {
          await UnifiedDashboardLauncher.shutdownAll();
          return Response.json({ success: true, message: 'All processes shut down' });
        }
        return Response.json({ success: false, error: 'Targeted shutdown not yet supported' });
      }

      return new Response('Not Found', { status: 404 });
    }
  });

  console.log(`✅ Management Hub Server running at http://localhost:${HUB_PORT}`);

  // 2. Launch several dashboard children representing different scopes
  console.log('🚀 Spawning sample scoped dashboards...');
  
  // Enterprise scope (on port 3004)
  process.env.AGENT_ID = 'demo-agent-001';
  await UnifiedDashboardLauncher.launchDashboardChild(
    'server/infrastructure-dashboard-server.ts',
    'apple.factory-wager.com',
    [],
    3004
  );

  // Development scope (on port 3006)
  await UnifiedDashboardLauncher.launchDashboardChild(
    'server/infrastructure-dashboard-server.ts',
    'dev.apple.factory-wager.com',
    [],
    3006
  );

  // Local sandbox (on port 3007)
  await UnifiedDashboardLauncher.launchDashboardChild(
    'server/infrastructure-dashboard-server.ts',
    'localhost',
    [],
    3007
  );

  console.log('\n--- Demo Active ---');
  console.log(`📍 Management Hub: http://localhost:${HUB_PORT}`);
  console.log('Active Scopes: ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX');
  console.log('Metrics are being pushed via Bun Native IPC every second.\n');

  console.log('Press Ctrl+C to stop the demo and shutdown all processes.');

  // Handle cleanup on exit
  const cleanup = async () => {
    console.log('\n🛑 Cleaning up demo processes...');
    await UnifiedDashboardLauncher.shutdownAll();
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep alive
  setInterval(() => {}, 1000);
}

runDemo().catch(console.error);