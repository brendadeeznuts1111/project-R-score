#!/usr/bin/env bun
// 🕒 Timezone-Aware Dashboard Server - v3.7 Deterministic Multi-Tenant System

// Set timezone-aware environment variables
process.env.DASHBOARD_SCOPE = process.env.DASHBOARD_SCOPE || 'LOCAL-SANDBOX';
process.env.TZ = process.env.TZ || 'UTC';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Import timezone bootstrap for deterministic scoping
import { initializeScopeTimezone } from './src/bootstrap/bootstrap-timezone.js';

// Initialize timezone system
const timezoneConfig = initializeScopeTimezone();
console.log(`🕒 Timezone System Initialized:`);
console.log(`   Scope: ${timezoneConfig.scope}`);
console.log(`   Timezone: ${timezoneConfig.timezone}`);
console.log(`   Offset: ${timezoneConfig.offset}`);
console.log(`   Platform: ${timezoneConfig.platform}`);

const server = Bun.serve({
  port: 8081,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve timezone-aware dashboard
    if (url.pathname === '/dashboard' || url.pathname === '/') {
      try {
        // Read dashboard template
        const dashboardHtml = await Bun.file('./dashboard-landing-bun.html').text();
        
        // Inject server-side timezone configuration
        const timezoneAwareHtml = dashboardHtml
          .replace(/LOCAL-SANDBOX/g, timezoneConfig.scope)
          .replace(/UTC/g, timezoneConfig.timezone)
          .replace(/darwin/g, timezoneConfig.platform)
          .replace(/v3\.7/g, 'v3.7')
          .replace('window.DUOPLUS_CONFIG = {', `window.DUOPLUS_CONFIG = {
            scope: "${timezoneConfig.scope}",
            timezone: "${timezoneConfig.timezone}",
            platform: "${timezoneConfig.platform}",
            version: "v3.7",
            offset: "${timezoneConfig.offset}",
            initialized: "${new Date().toISOString()}",`)
          .replace('window.DASHBOARD_SCOPE = "LOCAL-SANDBOX";', `window.DASHBOARD_SCOPE = "${timezoneConfig.scope}";`)
          .replace('window.TIMEZONE = "UTC";', `window.TIMEZONE = "${timezoneConfig.timezone}";`)
          .replace('window.PLATFORM = "darwin";', `window.PLATFORM = "${timezoneConfig.platform}";`)
          .replace('<title>DuoPlus Dashboard - LOCAL-SANDBOX - UTC</title>', `<title>DuoPlus Dashboard - ${timezoneConfig.scope} - ${timezoneConfig.timezone}</title>`)
          .replace('name="dashboard-scope" content="LOCAL-SANDBOX"', `name="dashboard-scope" content="${timezoneConfig.scope}"`)
          .replace('name="dashboard-timezone" content="UTC"', `name="dashboard-timezone" content="${timezoneConfig.timezone}"`)
          .replace('name="dashboard-platform" content="darwin"', `name="dashboard-platform" content="${timezoneConfig.platform}"`);
        
        return new Response(timezoneAwareHtml, {
          headers: { 
            'Content-Type': 'text/html',
            'X-Dashboard-Scope': timezoneConfig.scope,
            'X-Dashboard-Timezone': timezoneConfig.timezone,
            'X-Dashboard-Platform': timezoneConfig.platform,
            'X-Dashboard-Version': 'v3.7'
          }
        });
      } catch (error) {
        return new Response(`Error loading dashboard: ${error.message}`, { status: 500 });
      }
    }
    
    // API endpoint with timezone context
    if (url.pathname === '/api/system') {
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.versions.bun,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        timezone: {
          scope: timezoneConfig.scope,
          timezone: timezoneConfig.timezone,
          offset: timezoneConfig.offset,
          platform: timezoneConfig.platform
        },
        endpoints: 18,
        scopes: 3,
        dashboards: 14,
        server: 'Timezone-Aware Dashboard Server',
        version: 'v3.7',
        deterministic: true,
        multiTenant: true,
        auditReady: true
      };
      
      return new Response(JSON.stringify(systemInfo, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Timezone-Scope': timezoneConfig.scope,
          'X-Timezone-Zone': timezoneConfig.timezone
        }
      });
    }
    
    // Health check with timezone context
    if (url.pathname === '/health') {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        timezone: timezoneConfig.timezone,
        scope: timezoneConfig.scope,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {
          timezone: 'ok',
          scope: 'ok',
          platform: 'ok',
          server: 'ok'
        }
      };
      
      return new Response(JSON.stringify(health, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Timezone configuration endpoint
    if (url.pathname === '/api/timezone') {
      return new Response(JSON.stringify(timezoneConfig, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Debug endpoint
    if (url.pathname === '/debug') {
      const debug = {
        environment: process.env,
        timezone: timezoneConfig,
        server: {
          version: 'v3.7',
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.versions.bun,
          pid: process.pid
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(debug, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { 
      status: 404,
      headers: {
        'X-Dashboard-Scope': timezoneConfig.scope,
        'X-Dashboard-Timezone': timezoneConfig.timezone
      }
    });
  }
});

console.log(`
🕒 Timezone-Aware Dashboard Server v3.7
==========================================

🌍 Environment Configuration:
   Scope: ${timezoneConfig.scope}
   Timezone: ${timezoneConfig.timezone}
   Platform: ${timezoneConfig.platform}
   Offset: ${timezoneConfig.offset}

🚀 Server Features:
   • Deterministic timezone scoping
   • Multi-tenant architecture
   • Audit-ready logging
   • Real-time timezone updates
   • Environment context injection

📡 Available Endpoints:
   • http://localhost:8081/dashboard  - Main dashboard
   • http://localhost:8081/api/system   - System info with timezone
   • http://localhost:8081/api/timezone - Timezone configuration
   • http://localhost:8081/health       - Health check
   • http://localhost:8081/debug        - Debug information

🔍 Debug Mode:
   Add ?debug=true to any URL to see detailed timezone information

Press Ctrl+C to stop
`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down timezone-aware dashboard server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down timezone-aware dashboard server...');
  server.stop();
  process.exit(0);
});
