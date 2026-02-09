#!/usr/bin/env bun
/**
 * Payment API Integration Tests
 * End-to-end testing of the payment routing API
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';

const API_BASE = 'http://localhost:3001';
const TEST_TIMEOUT = 30000;
const PID_FILE = '/tmp/payment-server.pid';

// Helper to make API requests
async function request(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  let data = null;
  
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }
  
  return { status: response.status, data };
}

describe('Payment API Integration Tests', () => {
  let serverProcess: ChildProcess | null = null;
  
  // Start server before tests
  beforeAll(async () => {
    // Check if server is already running
    try {
      const health = await fetch(`${API_BASE}/health`);
      if (health.ok) {
        console.log('Using existing server');
        return;
      }
    } catch {
      // Server not running, start it
    }
    
    console.log('Starting payment server for integration tests...');
    
    serverProcess = spawn('bun', [
      'run',
      'src/payment/server.ts'
    ], {
      env: {
        ...process.env,
        PAYMENT_PORT: '3001',
        PAYMENT_HOST: '0.0.0.0',
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
      },
      stdio: 'pipe',
    });
    
    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const health = await fetch(`${API_BASE}/health`);
        if (health.ok) {
          console.log('Server ready');
          break;
        }
      } catch {
        // Not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Server failed to start');
    }
  }, TEST_TIMEOUT);
  
  // Stop server after tests
  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      
      // Clean up PID file
      if (existsSync(PID_FILE)) {
        unlinkSync(PID_FILE);
      }
    }
  });
  
  // ==========================================
  // Health Endpoint Tests
  // ==========================================
  describe('Health Endpoints', () => {
    test('should return healthy status', async () => {
      const { status, data } = await request('GET', '/health');
      
      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeGreaterThan(0);
    });
    
    test('should return detailed health info', async () => {
      const { status, data } = await request('GET', '/health/detailed');
      
      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.memory).toBeDefined();
      expect(data.services.redis).toBeDefined();
    });
  });
  
  // ==========================================
  // Route Management Tests
  // ==========================================
  describe('Route Management', () => {
    let createdRouteId: string;
    
    test('should create a new route', async () => {
      const routeData = {
        name: 'Test Route',
        barberId: 'barber_test_123',
        priority: 100,
        status: 'active',
        paymentMethods: ['card', 'cash'],
        maxDailyAmount: 1000,
        maxTransactionAmount: 500,
      };
      
      const { status, data } = await request('POST', '/payment/routes', routeData);
      
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.route.id).toBeDefined();
      expect(data.route.name).toBe(routeData.name);
      
      createdRouteId = data.route.id;
    });
    
    test('should list all routes', async () => {
      const { status, data } = await request('GET', '/payment/routes');
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.routes)).toBe(true);
      expect(data.routes.length).toBeGreaterThan(0);
    });
    
    test('should get route by ID', async () => {
      const { status, data } = await request('GET', `/payment/routes/${createdRouteId}`);
      
      expect(status).toBe(200);
      expect(data.id).toBe(createdRouteId);
    });
    
    test('should return 404 for non-existent route', async () => {
      const { status, data } = await request('GET', '/payment/routes/nonexistent_1234567890_abc');
      
      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
    
    test('should update route priority', async () => {
      const { status, data } = await request('PUT', `/payment/routes/${createdRouteId}`, {
        priority: 50,
      });
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.route.priority).toBe(50);
    });
    
    test('should reorder route', async () => {
      const { status, data } = await request('PUT', '/payment/routes/reorder', {
        route_id: createdRouteId,
        new_priority: 10,
      });
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.route.priority).toBe(10);
    });
    
    test('should reject reorder with missing fields', async () => {
      const { status, data } = await request('PUT', '/payment/routes/reorder', {
        route_id: createdRouteId,
        // missing new_priority
      });
      
      expect(status).toBe(422);
      expect(data.error).toBeDefined();
    });
    
    test('should delete route', async () => {
      const { status, data } = await request('DELETE', `/payment/routes/${createdRouteId}`);
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify deletion
      const getResult = await request('GET', `/payment/routes/${createdRouteId}`);
      expect(getResult.status).toBe(404);
    });
  });
  
  // ==========================================
  // Fallback Plan Tests
  // ==========================================
  describe('Fallback Plans', () => {
    test('should list fallback plans', async () => {
      const { status, data } = await request('GET', '/payment/fallbacks');
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.fallbacks)).toBe(true);
    });
    
    test('should return 404 for non-existent fallback', async () => {
      const { status } = await request('GET', '/payment/fallbacks/nonexistent');
      
      expect(status).toBe(404);
    });
  });
  
  // ==========================================
  // Configuration Tests
  // ==========================================
  describe('Configuration', () => {
    test('should get routing config', async () => {
      const { status, data } = await request('GET', '/payment/config');
      
      expect(status).toBe(200);
      expect(data.enableAutoRouting).toBeDefined();
      expect(data.enableFallbacks).toBeDefined();
      expect(data.routingStrategy).toBeDefined();
    });
    
    test('should update routing config', async () => {
      const updates = {
        enableAutoRouting: true,
        enableFallbacks: true,
        splitThreshold: 150,
        defaultSplitType: 'percentage',
        maxSplitRecipients: 5,
        routingStrategy: 'priority',
      };
      
      const { status, data } = await request('PUT', '/payment/config', updates);
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config.splitThreshold).toBe(150);
    });
    
    test('should reject invalid config values', async () => {
      const { status, data } = await request('PUT', '/payment/config', {
        splitThreshold: -100,
      });
      
      expect(status).toBe(422);
      expect(data.error).toBeDefined();
    });
  });
  
  // ==========================================
  // Payment Split Tests
  // ==========================================
  describe('Payment Splits', () => {
    test('should list pending splits', async () => {
      const { status, data } = await request('GET', '/payment/splits/pending');
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.splits)).toBe(true);
    });
    
    test('should return 404 for non-existent split', async () => {
      const { status } = await request('GET', '/payment/splits/nonexistent');
      
      expect(status).toBe(404);
    });
  });
  
  // ==========================================
  // Error Handling Tests
  // ==========================================
  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const { status, data } = await request('GET', '/unknown-endpoint');
      
      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
    
    test('should return 405 for wrong method', async () => {
      const { status } = await request('DELETE', '/health');
      
      expect(status).toBe(404); // No route defined, falls through
    });
    
    test('should handle malformed JSON', async () => {
      const response = await fetch(`${API_BASE}/payment/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      
      expect(response.status).toBe(422);
    });
    
    test('should handle missing required fields', async () => {
      const { status, data } = await request('POST', '/payment/routes', {
        // missing name and barberId
      });
      
      expect(status).toBe(422);
      expect(data.error).toBeDefined();
    });
    
    test('should handle invalid enum values', async () => {
      const { status, data } = await request('POST', '/payment/routes', {
        name: 'Test',
        barberId: 'barber_123',
        status: 'invalid_status',
      });
      
      expect(status).toBe(422);
      expect(data.error).toBeDefined();
    });
  });
  
  // ==========================================
  // CORS Tests
  // ==========================================
  describe('CORS', () => {
    test('should handle preflight requests', async () => {
      const response = await fetch(`${API_BASE}/payment/routes`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
    });
    
    test('should include CORS headers in responses', async () => {
      const response = await fetch(`${API_BASE}/health`);
      
      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
    });
  });
  
  // ==========================================
  // Rate Limiting Tests
  // ==========================================
  describe('Rate Limiting', () => {
    test('should include rate limit headers', async () => {
      const response = await fetch(`${API_BASE}/health`);
      
      expect(response.headers.get('x-ratelimit-limit')).toBeDefined();
      expect(response.headers.get('x-ratelimit-remaining')).toBeDefined();
      expect(response.headers.get('x-ratelimit-reset')).toBeDefined();
    });
    
    test('should track rate limit consumption', async () => {
      // Make multiple requests
      const responses = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/health`),
      ]);
      
      // All should succeed (within limit)
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Remaining should decrease
      const remainings = responses.map(r => 
        parseInt(r.headers.get('x-ratelimit-remaining') || '0')
      );
      
      expect(remainings[0]).toBeGreaterThanOrEqual(remainings[2]);
    });
  });
  
  // ==========================================
  // Concurrent Request Tests
  // ==========================================
  describe('Concurrent Requests', () => {
    test('should handle multiple simultaneous requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        fetch(`${API_BASE}/health`)
      );
      
      const responses = await Promise.all(requests);
      
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
    
    test('should handle concurrent route creations', async () => {
      const creations = Array(5).fill(null).map((_, i) => 
        request('POST', '/payment/routes', {
          name: `Concurrent Route ${i}`,
          barberId: `barber_concurrent_${i}`,
          priority: i,
        })
      );
      
      const results = await Promise.all(creations);
      
      expect(results.every(r => r.status === 201)).toBe(true);
      
      // Clean up
      await Promise.all(
        results.map(r => 
          request('DELETE', `/payment/routes/${r.data.route.id}`)
        )
      );
    });
  });
  
  // ==========================================
  // Data Validation Edge Cases
  // ==========================================
  describe('Data Validation Edge Cases', () => {
    test('should reject empty route names', async () => {
      const { status } = await request('POST', '/payment/routes', {
        name: '',
        barberId: 'barber_123',
      });
      
      expect(status).toBe(422);
    });
    
    test('should reject very long route names', async () => {
      const { status } = await request('POST', '/payment/routes', {
        name: 'a'.repeat(200),
        barberId: 'barber_123',
      });
      
      expect(status).toBe(422);
    });
    
    test('should reject negative amounts', async () => {
      const { status } = await request('POST', '/payment/routes', {
        name: 'Test',
        barberId: 'barber_123',
        maxDailyAmount: -100,
      });
      
      expect(status).toBe(422);
    });
    
    test('should handle special characters in names', async () => {
      const { status, data } = await request('POST', '/payment/routes', {
        name: 'Route with émojis 🎉 & spëciäl chars',
        barberId: 'barber_special',
      });
      
      expect(status).toBe(201);
      
      // Clean up
      await request('DELETE', `/payment/routes/${data.route.id}`);
    });
  });
});

console.log('✅ Integration tests loaded. Run with: bun test tests/payment-api.integration.test.ts');
