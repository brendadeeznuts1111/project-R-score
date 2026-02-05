#!/usr/bin/env bun

/**
 * 🚀 Bun 1.3 Enhanced Server - Login-to-ETL Pipeline Citadel
 * JWT gsession auth + minified JS + WebSocket telemetry + ETL streams
 */

import { serve, YAML } from 'bun';
import { handleLogin } from './auth/login';
import { handleETLStart } from './etl/stream';
import { handleServeClient } from './client/serve';
import { telemetryWebSocket } from './websocket/telemetry';

// Load configuration
const config = YAML.parse(await Bun.file('bun.yaml').text());
const serverConfig = config.server || { port: 3003, host: '0.0.0.0' };

console.log('🚀 Starting Bun 1.3 Enhanced Server - Login-to-ETL Pipeline');
console.log('================================================');
console.log('🔑 Auth: JWT gsession cookies + CSRF protection');
console.log('🎨 Client: Minified JS with zstd compression');
console.log('📡 Telemetry: WebSocket streaming with JWT auth');
console.log('⚡ ETL: ReadableStream processing pipeline');
console.log('');

console.log('📋 Available endpoints:');
console.log(`   POST /api/auth/login - JWT gsession authentication`);
console.log(`   GET  /api/js/client.min.js - Minified client with zstd`);
console.log(`   WS   /ws/telemetry - Live telemetry streaming`);
console.log(`   POST /api/etl/start - ETL pipeline trigger`);
console.log('');

// Server with all handlers integrated
const server = serve({
  port: serverConfig.port,
  hostname: serverConfig.host,

  async fetch(request) {
    const url = new URL(request.url);
    const startTime = performance.now();

    try {
      // 🔑 Authentication endpoint
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        const response = await handleLogin(request);
        const totalTime = performance.now() - startTime;
        console.log(`🔑 Login request completed in ${totalTime.toFixed(2)}ms`);
        return response;
      }

      // 🎨 Minified client serving
      if (url.pathname === '/api/js/client.min.js' && request.method === 'GET') {
        const response = await handleServeClient(request);
        const totalTime = performance.now() - startTime;
        console.log(`🎨 Client serve request completed in ${totalTime.toFixed(2)}ms`);
        return response;
      }

      // ⚡ ETL pipeline endpoint
      if (url.pathname === '/api/etl/start' && request.method === 'POST') {
        const response = await handleETLStart(request);
        const totalTime = performance.now() - startTime;
        console.log(`⚡ ETL request completed in ${totalTime.toFixed(2)}ms`);
        return response;
      }

      // 🏥 Health check
      if (url.pathname === '/health' && request.method === 'GET') {
        const totalTime = performance.now() - startTime;
        return Response.json({
          status: 'healthy',
          version: '1.3.0-etl-pipeline',
          timestamp: new Date().toISOString(),
          features: ['jwt-auth', 'websocket-telemetry', 'etl-streams', 'minified-js'],
          performance: {
            responseTime: `${totalTime.toFixed(2)}ms`
          }
        });
      }

      // 📊 Debug endpoint
      if (url.pathname === '/debug' && request.method === 'GET') {
        const totalTime = performance.now() - startTime;
        return Response.json({
          server: {
            bun: Bun.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime()
          },
          config: {
            auth: 'JWT gsession enabled',
            websocket: 'Telemetry streaming enabled',
            etl: 'ReadableStream processing enabled',
            compression: 'zstd enabled'
          },
          endpoints: [
            'POST /api/auth/login',
            'GET /api/js/client.min.js',
            'WS /ws/telemetry',
            'POST /api/etl/start'
          ],
          responseTime: `${totalTime.toFixed(2)}ms`
        });
      }

      // 404 for unknown endpoints
      const totalTime = performance.now() - startTime;
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${url.pathname} not found`,
        availableEndpoints: [
          'POST /api/auth/login',
          'GET /api/js/client.min.js',
          'WS /ws/telemetry',
          'POST /api/etl/start',
          'GET /health',
          'GET /debug'
        ]
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${totalTime.toFixed(2)}ms`
        }
      });

    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error(`💥 Server error in ${errorTime.toFixed(2)}ms:`, error);

      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'Server encountered an error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Time': `${errorTime.toFixed(2)}ms`
        }
      });
    }
  },

  // 📡 WebSocket telemetry endpoint
  websocket: {
    '/ws/telemetry': telemetryWebSocket
  },

  // Error handling
  error(error) {
    console.error('🚨 Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`🎯 Bun 1.3 Enhanced Server running on http://${serverConfig.host}:${server.port}`);
console.log('');
console.log('🧪 Test commands:');
console.log('');
console.log('# 1. Health check:');
console.log(`curl http://${serverConfig.host}:${server.port}/health`);
console.log('');
console.log('# 2. Login test:');
console.log(`curl -X POST http://${serverConfig.host}:${server.port}/api/auth/login \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"username":"trader1","password":"password123"}' -v`);
console.log('');
console.log('# 3. Get minified client:');
console.log(`curl -H "Accept-Encoding: zstd" http://${serverConfig.host}:${server.port}/api/js/client.min.js | head -c 200`);
console.log('');
console.log('# 4. ETL test:');
console.log(`curl -X POST http://${serverConfig.host}:${server.port}/api/etl/start \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"dataType":"TELEMETRY","payload":{"cpu":75.5,"mem":134217728,"timestamp":"'$(date -Iseconds)'"}}'`);
console.log('');
console.log('📡 WebSocket telemetry available at:');
console.log(`ws://${serverConfig.host}:${server.port}/ws/telemetry`);
console.log('');
console.log('🎉 Login-to-ETL Pipeline Citadel operational!');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.stop();
  process.exit(0);
});
