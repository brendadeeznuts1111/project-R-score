#!/usr/bin/env bun

/**
 * Fire22 Dashboard Development Server
 * Uses bunfig.toml dashboard configuration
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Read bunfig.toml configuration
function loadBunfig() {
  try {
    const bunfigPath = join(process.cwd(), 'bunfig.toml');
    if (!existsSync(bunfigPath)) {
      console.error('❌ bunfig.toml not found');
      process.exit(1);
    }

    const content = readFileSync(bunfigPath, 'utf-8');
    return parseTOML(content);
  } catch (error) {
    console.error('❌ Failed to load bunfig.toml:', error);
    process.exit(1);
  }
}

// Simple TOML parser for our needs
function parseTOML(content: string): any {
  const config: any = {};
  let currentSection = '';

  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      if (!config[currentSection]) {
        config[currentSection] = {};
      }
      return;
    }

    if (line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      let value = valueParts.join('=').trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Convert boolean strings
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      // Parse numbers
      if (!isNaN(Number(value))) value = Number(value);

      // Set nested property
      const keys = key.trim().split('.');
      let current = config;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
    }
  });

  return config;
}

// Main development server
async function startDashboardServer() {
  console.log('🔥 Fire22 Dashboard Development Server');
  console.log('=====================================');

  const config = loadBunfig();
  const dashboardConfig = config.dashboard || {};
  const devConfig = dashboardConfig.dev || {};
  const routesConfig = dashboardConfig.routes || {};
  const envConfig = dashboardConfig.env || {};

  const port = dashboardConfig.dev_port || 3001;
  const websocketPort = devConfig.websocket_port || 3002;

  console.log(`📊 Dashboard Version: ${envConfig.DASHBOARD_VERSION || '5.0.0'}`);
  console.log(`🌐 Server Port: ${port}`);
  console.log(`🔄 WebSocket Port: ${websocketPort}`);
  console.log(`🎨 Theme: ${envConfig.THEME_MODE || 'dark'}`);
  console.log('');

  // Create development server
  const server = Bun.serve({
    port,
    hostname: 'localhost',

    async fetch(request) {
      const url = new URL(request.url);
      const pathname = url.pathname;

      console.log(`📨 ${request.method} ${pathname}`);

      // Handle dashboard routes
      if (pathname === '/dashboard' || pathname === '/') {
        const dashboardPath =
          dashboardConfig.entry_point || 'crystal-clear-architecture/dashboard.html';

        try {
          const file = Bun.file(dashboardPath);
          const exists = await file.exists();

          if (exists) {
            console.log(`✅ Serving dashboard: ${dashboardPath}`);
            return new Response(await file.text(), {
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Dashboard-Version': envConfig.DASHBOARD_VERSION || '5.0.0',
              },
            });
          } else {
            console.error(`❌ Dashboard file not found: ${dashboardPath}`);
            return new Response('Dashboard file not found', { status: 404 });
          }
        } catch (error) {
          console.error('❌ Error serving dashboard:', error);
          return new Response('Internal server error', { status: 500 });
        }
      }

      // Handle API routes
      if (pathname.startsWith('/api/dashboard/')) {
        console.log(`🔌 API Request: ${pathname}`);

        // Mock API response for development
        const mockData = {
          totalAgents: 1247,
          activeAgents: 892,
          pendingWagers: 156,
          pendingAmount: '$847.2K',
          lastUpdated: new Date().toISOString(),
        };

        return new Response(JSON.stringify(mockData), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Handle static assets
      if (pathname.startsWith('/assets/')) {
        const assetPath = pathname.replace('/assets/', 'crystal-clear-architecture/assets/');

        try {
          const file = Bun.file(assetPath);
          const exists = await file.exists();

          if (exists) {
            console.log(`📦 Serving asset: ${assetPath}`);
            return new Response(await file.arrayBuffer(), {
              headers: {
                'Cache-Control': 'public, max-age=31536000',
              },
            });
          }
        } catch (error) {
          console.log(`⚠️ Asset not found: ${assetPath}`);
        }
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Default 404 response
      return new Response('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    },

    error(error) {
      console.error('❌ Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    },
  });

  console.log(`✅ Dashboard server running at: http://localhost:${port}`);
  console.log(`🎯 Dashboard URL: http://localhost:${port}/dashboard`);
  console.log(`🔌 API Endpoint: http://localhost:${port}/api/dashboard/data`);
  console.log('');
  console.log('📋 Available routes:');
  console.log('  • /dashboard - Main dashboard');
  console.log('  • /api/dashboard/* - Dashboard API');
  console.log('  • /assets/* - Static assets');
  console.log('');
  console.log('🔄 Hot reload enabled - changes will be reflected automatically');
  console.log('⚡ Press Ctrl+C to stop the server');
  console.log('');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down dashboard server...');
    server.stop();
    process.exit(0);
  });
}

// Start the server
startDashboardServer().catch(error => {
  console.error('❌ Failed to start dashboard server:', error);
  process.exit(1);
});
