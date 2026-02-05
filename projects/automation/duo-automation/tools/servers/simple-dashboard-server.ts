#!/usr/bin/env bun

/**
 * Simple Bun Dashboard Server
 * 
 * Minimal server for serving the DuoPlus dashboard
 */

// Type definitions for Bun and Node.js globals
declare const Bun: any;
declare const process: any;

const server = Bun.serve({
  port: Number(Bun.env.PORT) || 8081,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Log all requests for debugging
    console.log(`${req.method} ${url.pathname}`);
    
    // Serve the main dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      try {
        const file = Bun.file('dashboard-landing-bun.html');
        const exists = await file.exists();
        if (!exists) {
          console.error('Dashboard file not found!');
          return new Response('Dashboard file not found', { status: 404 });
        }
        return new Response(file, {
          headers: { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        console.error('Error serving dashboard:', error);
        return new Response('Error loading dashboard', { status: 500 });
      }
    }

    // Serve the QR Onboarding Panel
    if (url.pathname === '/qr-onboard') {
      try {
        const file = Bun.file('web/qr-onboard-panel.html');
        const exists = await file.exists();
        if (!exists) {
          console.error('QR Onboarding file not found!');
          return new Response('QR Onboarding file not found', { status: 404 });
        }
        return new Response(file, {
          headers: { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        console.error('Error serving QR onboarding:', error);
        return new Response('Error loading QR onboarding', { status: 500 });
      }
    }

    // Dynamic file serving for src, dist, demos, and scripts directories
    if (url.pathname.startsWith('/src/') || 
        url.pathname.startsWith('/dist/') || 
        url.pathname.startsWith('/demos/') || 
        url.pathname.startsWith('/web/') ||
        url.pathname.startsWith('/scripts/')) {
      try {
        // Remove leading slash for local file path
        const filePath = url.pathname.slice(1);
        const file = Bun.file(filePath);
        const exists = await file.exists();
        
        if (exists) {
          return new Response(file, {
            headers: { 
              'Content-Type': filePath.endsWith('.html') ? 'text/html' : 
                             filePath.endsWith('.js') ? 'application/javascript' :
                             filePath.endsWith('.css') ? 'text/css' : 'text/plain',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (error) {
        console.error(`Error serving dynamic file ${url.pathname}:`, error);
      }
    }
    
    // Serve the original dashboard (fallback)
    if (url.pathname === '/dashboard-landing.html') {
      try {
        const file = Bun.file('dashboard-landing-bun.html');
        const exists = await file.exists();
        if (!exists) {
          return new Response('Dashboard file not found', { status: 404 });
        }
        return new Response(file, {
          headers: { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        return new Response('Error loading dashboard', { status: 500 });
      }
    }
    
    // API endpoint for system info
    if (url.pathname === '/api/system') {
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.versions.bun,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        endpoints: 18,
        scopes: 3,
        dashboards: 14,
        server: 'Simple Bun Dashboard Server',
        version: '1.0.0'
      };
      
      return new Response(JSON.stringify(systemInfo, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      const healthData = { 
        status: 'healthy', 
        server: 'Simple Bun Dashboard Server',
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(healthData, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 404 for unknown routes
    const notFoundResponse = {
      error: 'Not Found',
      message: `The requested resource ${url.pathname} was not found`,
      availableEndpoints: [
        '/dashboard',
        '/qr-onboard',
        '/dashboard-landing.html',
        '/api/system',
        '/health'
      ],
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(notFoundResponse, null, 2), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

console.log(`🚀 Simple Dashboard Server running on http://localhost:${server.port}`);
console.log(`📊 Dashboard: http://localhost:${server.port}/dashboard`);
console.log(`💚 Health: http://localhost:${server.port}/health`);
console.log(`🔍 System: http://localhost:${server.port}/api/system`);
console.log('\n🎯 Powered by Bun - No Tailwind, No Python, Pure Performance!');
