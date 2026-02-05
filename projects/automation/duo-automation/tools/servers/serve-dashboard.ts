#!/usr/bin/env bun

/**
 * 🚀 Simple HTTP Server for Dashboard
 * 
 * Serves the dashboard and related files on port 8081
 */

import { serve } from 'bun';
import { join } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';

const PORT = 8082;
const PUBLIC_DIR = process.cwd();

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return mimeTypes[ext as keyof typeof mimeTypes] || 'text/plain';
}

function handleAPIRequest(request: Request): Response {
  const url = new URL(request.url);
  
  // Mock data for analytics dashboard
  const mockSystemData = {
    status: 'healthy',
    uptime: '99.9%',
    lastCheck: new Date().toISOString(),
    version: '1.0.0'
  };
  
  const mockSystemMatrix = {
    endpoints: [
      { name: 'API Gateway', method: 'GET', endpoint: '/', status: 'healthy', responseTime: 125, uptime: 100, category: 'status' },
      { name: 'Database', method: 'GET', endpoint: '/', status: 'healthy', responseTime: 45, uptime: 100, category: 'status' },
      { name: 'Cache', method: 'GET', endpoint: '/', status: 'healthy', responseTime: 12, uptime: 100, category: 'status' },
      { name: 'Storage', method: 'GET', endpoint: '/', status: 'healthy', responseTime: 89, uptime: 100, category: 'status' }
    ],
    totalEndpoints: 4,
    healthyEndpoints: 4,
    averageResponseTime: 67.75
  };
  
  const mockSubscriptions = {
    subscriptions: [
      { 
        id: '1', 
        name: 'Enterprise Plan', 
        type: 'WEBHOOK',
        status: 'active', 
        users: 150, 
        created: '2024-01-15',
        nextBilling: '2024-02-15',
        deliveryStats: { totalSent: 0, successRate: 1.0, lastDelivery: null }
      },
      { 
        id: '2', 
        name: 'Professional Plan', 
        type: 'WEBHOOK',
        status: 'active', 
        users: 75, 
        created: '2024-01-10',
        nextBilling: '2024-02-10',
        deliveryStats: { totalSent: 0, successRate: 1.0, lastDelivery: null }
      },
      { 
        id: '3', 
        name: 'Starter Plan', 
        type: 'WEBHOOK',
        status: 'trial', 
        users: 25, 
        created: '2024-01-20',
        nextBilling: '2024-02-20',
        deliveryStats: { totalSent: 0, successRate: 1.0, lastDelivery: null }
      }
    ],
    total: 3,
    active: 2,
    trial: 1
  };
  
  // Route the API requests
  if (url.pathname === '/') {
    return new Response(JSON.stringify(mockSystemData), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (url.pathname === '/api/v1/system-matrix') {
    return new Response(JSON.stringify(mockSystemMatrix), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (url.pathname === '/api/v1/subscriptions') {
    return new Response(JSON.stringify(mockSubscriptions), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  // Default 404 for unknown API endpoints
  return new Response('API endpoint not found', { 
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
}

function serveFile(filePath: string): Response {
  try {
    const fullPath = join(PUBLIC_DIR, filePath);
    
    // If it's a directory, try to serve index.html
    if (filePath.endsWith('/') || existsSync(fullPath) && (statSync(fullPath).isDirectory())) {
      const indexPath = join(fullPath, 'index.html');
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        return new Response(content, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }

    // Try to serve the file
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath);
      const mimeType = getMimeType(filePath);
      
      return new Response(content, {
        headers: { 
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // File not found
    return new Response('404 Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return new Response('500 Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

console.log(`🚀 Starting Dashboard Server`);
console.log(`📁 Serving directory: ${PUBLIC_DIR}`);
console.log(`🌐 Server running on: http://127.0.0.1:${PORT}`);
console.log(`📊 Dashboard: http://127.0.0.1:${PORT}/dashboard-landing.html`);
console.log('');

const server = serve({
  port: PORT,
  hostname: '127.0.0.1',
  fetch(request) {
    const url = new URL(request.url);
    let filePath = url.pathname.substring(1); // Remove leading slash
    
    // Handle API endpoints for analytics dashboard
    if (url.pathname === '/' || url.pathname.startsWith('/api/')) {
      return handleAPIRequest(request);
    }
    
    // Default to index.html or admin-dashboard-auth.html
    if (!filePath || filePath === '') {
      filePath = 'admin-dashboard-auth.html';
    }
    
    // Handle root path
    if (filePath === '/') {
      filePath = 'dashboard-landing.html';
    }
    
    console.log(`📄 Serving: ${filePath}`);
    return serveFile(filePath);
  },
});

console.log('✅ Server started successfully!');
console.log('🎯 Press Ctrl+C to stop the server');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  server.stop();
  process.exit(0);
});
