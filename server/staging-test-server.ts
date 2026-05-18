#!/usr/bin/env bun

// Simple staging test server with environment validation
import { validateHost, validatePort } from '../lib/utils/env-validator';

const PORT = validatePort(process.env.SERVER_PORT || process.env.PORT, 3000);
const HOST = validateHost(process.env.SERVER_HOST) || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

console.info(`🚀 Starting Staging Test Server`);
console.info(`📍 Environment: ${NODE_ENV}`);
console.info(`🌐 Host: ${HOST}`);
console.info(`🔌 Port: ${PORT}`);

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const startTime = Date.now();

    // Add security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Health check endpoint
    if (url.pathname === '/health') {
      const response = Response.json({
        status: 'healthy',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0-staging',
        features: {
          security: true,
          logging: true,
          validation: true,
          errorHandling: true
        }
      }, { headers });
      
      if (process.env.DEBUG === '1') {
        console.info(`✅ Health check - ${Date.now() - startTime}ms`);
      }
      return response;
    }

    // Test input validation endpoint
    if (url.pathname === '/api/test-validation' && req.method === 'POST') {
      try {
        const body = await req.json();
        
        // Simulate input validation
        const validation = {
          isValid: true,
          sanitized: true,
          data: body,
          warnings: []
        };

        if (body.url && typeof body.url === 'string') {
          // Test URL validation
          try {
            new URL(body.url);
            if (body.url.includes('localhost') && NODE_ENV === 'production') {
              validation.warnings.push('Localhost URL detected in production');
            }
          } catch {
            validation.isValid = false;
            validation.warnings.push('Invalid URL format');
          }
        }

        const response = Response.json(validation, { headers });
        if (process.env.DEBUG === '1') {
          console.info(`✅ Validation test - ${Date.now() - startTime}ms`);
        }
        return response;
      } catch (error) {
        const response = Response.json({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        }, { status: 400, headers });
        
        if (process.env.DEBUG === '1') {
          console.info(`❌ Validation test failed - ${Date.now() - startTime}ms`);
        }
        return response;
      }
    }

    // Test error handling endpoint
    if (url.pathname === '/api/test-error') {
      const errorType = url.searchParams.get('type') || 'generic';
      
      const errorResponse = {
        error: 'Test error endpoint',
        type: errorType,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substr(2, 9),
        sanitized: true
      };

      const response = Response.json(errorResponse, { 
        status: 500,
        headers
      });
      
      if (process.env.DEBUG === '1') {
        console.info(`⚠️ Error test (${errorType}) - ${Date.now() - startTime}ms`);
      }
      return response;
    }

    // Default response
    const response = Response.json({
      message: 'Staging Test Server',
      environment: NODE_ENV,
      endpoints: {
        health: '/health',
        validation: '/api/test-validation (POST)',
        errorTest: '/api/test-error?type=<error-type>'
      },
      security: {
        headers: Object.keys(headers).filter(h => h.startsWith('X-') || h.startsWith('Strict-')),
        validation: 'enabled',
        sanitization: 'enabled'
      }
    }, { headers });

    if (process.env.DEBUG === '1') {
      console.info(`✅ Default response - ${Date.now() - startTime}ms`);
    }
    return response;
  }
});

console.info(`🎉 Staging Test Server running on http://${HOST}:${PORT}`);
console.info(`🏥 Health check: http://${HOST}:${PORT}/health`);
console.info(`🧪 Validation test: http://${HOST}:${PORT}/api/test-validation`);
console.info(`⚠️  Error test: http://${HOST}:${PORT}/api/test-error`);
console.info(`📊 Environment: ${NODE_ENV}`);
console.info(`🔒 Security: Enabled`);
console.info(`📝 Logging: ${process.env.DEBUG === '1' ? 'Debug' : 'Standard'}`);
