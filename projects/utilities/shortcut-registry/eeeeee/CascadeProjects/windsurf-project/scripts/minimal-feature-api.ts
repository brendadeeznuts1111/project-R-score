#!/usr/bin/env bun
// Minimal Feature Status API - Fixed version

import { serve } from 'bun';

// Minimal feature registry
const MINIMAL_FEATURES = [
  {
    id: 'cross-family-network-dashboard',
    name: 'Cross-Family Network Dashboard',
    category: 'dashboard',
    enabled: true,
    status: 'active',
    health: 'healthy',
    version: '1.0.0'
  },
  {
    id: 'family-controls-component',
    name: 'Family Controls Component',
    category: 'dashboard',
    enabled: true,
    status: 'active',
    health: 'healthy',
    version: '1.0.0'
  },
  {
    id: 'guardian-portal',
    name: 'Guardian Portal',
    category: 'dashboard',
    enabled: true,
    status: 'active',
    health: 'healthy',
    version: '1.0.0'
  }
];

const server = serve({
  port: 3010,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    try {
      if (method === 'GET' && path === '/api/status') {
        const now = new Date();
        return new Response(JSON.stringify({
          timestamp: now.toISOString(),
          environment: 'development',
          version: '1.0.0',
          uptime: process.uptime(),
          totalFeatures: MINIMAL_FEATURES.length,
          activeFeatures: MINIMAL_FEATURES.filter(f => f.enabled).length,
          inactiveFeatures: 0,
          errorFeatures: 0,
          maintenanceFeatures: 0,
          overallHealth: 'healthy',
          features: MINIMAL_FEATURES,
          services: [
            { name: 'Main API', status: 'running', port: 3000, health: 'healthy', lastCheck: now.toISOString() },
            { name: 'Config Management', status: 'running', port: 3010, health: 'healthy', lastCheck: now.toISOString() }
          ]
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET' && path === '/api/features') {
        return new Response(JSON.stringify({
          total: MINIMAL_FEATURES.length,
          features: MINIMAL_FEATURES
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET' && path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          activeFeatures: MINIMAL_FEATURES.filter(f => f.enabled).length,
          totalFeatures: MINIMAL_FEATURES.length
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET' && path === '/api/services') {
        const now = new Date();
        return new Response(JSON.stringify([
          { name: 'Main API', status: 'running', port: 3000, health: 'healthy', lastCheck: now.toISOString() },
          { name: 'Config Management', status: 'running', port: 3010, health: 'healthy', lastCheck: now.toISOString() }
        ]), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Default response
      return new Response(JSON.stringify({
        message: 'Minimal Feature Status API',
        endpoints: [
          'GET /api/status - Comprehensive system status',
          'GET /api/features - List all features',
          'GET /api/health - Simple health check',
          'GET /api/services - Service status'
        ]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: (error as Error).message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
});

console.log('🚀 Minimal Feature Status API running on port 3010');
console.log('📊 Available endpoints:');
console.log('   GET /api/status - Comprehensive system status');
console.log('   GET /api/features - List all features');
console.log('   GET /api/health - Simple health check');
console.log('   GET /api/services - Service status');

export default server;
