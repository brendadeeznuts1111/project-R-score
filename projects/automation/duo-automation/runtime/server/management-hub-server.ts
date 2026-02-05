/**
 * management-hub-server.ts
 * Multi-tenant process management hub for Unified Infrastructure.
 * Displays metrics and allows control of child dashboard processes.
 */

import { UnifiedDashboardLauncher } from '../utils/unified-dashboard-launcher';
import { ScopeDetector } from '../utils/scope-detector';
import { serve, file, zstdCompressSync } from 'bun';

const PORT = parseInt(process.env.HUB_PORT || '3005');
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🚀 Starting Management Hub on port ${PORT}...`);

const server = serve({
  port: PORT,
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
      const { pid, scope } = await req.json().catch(() => ({}));
      
      if (scope === 'all') {
        await UnifiedDashboardLauncher.shutdownAll();
        return Response.json({ success: true, message: 'All processes shut down' });
      }

      if (pid) {
        const success = await UnifiedDashboardLauncher.shutdownPID(parseInt(pid));
        return Response.json({ success, message: success ? `Process ${pid} shut down` : `Failed to shut down process ${pid}` });
      }

      return Response.json({ success: false, error: 'Missing PID or scope=all' });
    }

    // 5. Send Command to Child
    if (url.pathname === '/api/hub/command' && req.method === 'POST') {
      const { pid, command, payload } = await req.json().catch(() => ({}));
      
      if (!pid || !command) {
        return Response.json({ success: false, error: 'Missing PID or command' });
      }

      const success = UnifiedDashboardLauncher.sendCommand(parseInt(pid), command, payload);
      return Response.json({ success, message: success ? `Command '${command}' sent to PID ${pid}` : `Failed to send command` });
    }

    // 4. Hub Health
    if (url.pathname === '/hub-health') {
        const memUsage = process.memoryUsage();
        return Response.json({
            status: 'online',
            hubPort: PORT,
            activeChildren: UnifiedDashboardLauncher.getActiveProcesses().length,
            memory: {
                rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
            }
        });
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log(`✅ Management Hub Server running at http://localhost:${PORT}`);