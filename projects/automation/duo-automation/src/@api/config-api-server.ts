#!/usr/bin/env bun

/**
 * Configuration API Server
 * RESTful API for Secrets-Only Configuration Management
 */

import { SecretsOnlyConfigManager } from '../config/secrets-only-config.js';
import { serve } from 'bun';

const configManager = new SecretsOnlyConfigManager();

const server = serve({
  port: process.env.CONFIG_API_PORT || 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/api/config' && method === 'GET') {
        // Get all configuration
        const config = await configManager.getAllConfig();
        return Response.json(config, {
          headers: corsHeaders
        });
      }

      if (path === '/api/config/validate' && method === 'GET') {
        // Validate all configuration
        const isValid = await configManager.validateConfig();
        return Response.json({ valid: isValid }, {
          headers: corsHeaders
        });
      }

      if (path === '/api/config/export' && method === 'GET') {
        // Export configuration as environment variables
        const config = await configManager.getAllConfig();
        const envVars = Object.entries(config)
          .map(([key, value]) => `export ${key}="${value}"`)
          .join('\n');
        
        return new Response(envVars, {
          headers: { 'Content-Type': 'text/plain', ...corsHeaders }
        });
      }

      if (path === '/api/config/health' && method === 'GET') {
        // Health check
        const config = await configManager.getAllConfig();
        const totalRequired = 17;
        const foundCount = Object.keys(config).length;
        const healthy = foundCount === totalRequired;
        
        return Response.json({
          healthy,
          totalRequired,
          foundCount,
          missing: totalRequired - foundCount,
          service: 'empire-pro-config-empire'
        }, {
          status: healthy ? 200 : 503,
          headers: corsHeaders
        });
      }

      if (path.startsWith('/api/config/') && method === 'GET') {
        // Get specific configuration value
        const key = path.split('/').pop() as keyof any;
        const value = await configManager.getConfig(key);
        
        if (value === null) {
          return Response.json({ error: 'Configuration not found' }, {
            status: 404,
            headers: corsHeaders
          });
        }

        return Response.json({ key, value }, {
          headers: corsHeaders
        });
      }

      if (path === '/api/config' && method === 'POST') {
        // Set configuration value
        const body = await req.json() as { key: string; value: string };
        
        if (!body.key || !body.value) {
          return Response.json({ error: 'key and value required' }, {
            status: 400,
            headers: corsHeaders
          });
        }

        await configManager.setConfig(body.key as keyof any, body.value);
        return Response.json({ success: true, message: `Stored ${body.key}` }, {
          headers: corsHeaders
        });
      }

      if (path === '/api/config' && method === 'DELETE') {
        // Delete all configuration (dangerous operation)
        await configManager.deleteAllConfig();
        return Response.json({ success: true, message: 'All configuration deleted' }, {
          headers: corsHeaders
        });
      }

      if (path.startsWith('/api/config/') && method === 'DELETE') {
        // Delete specific configuration value
        const key = path.split('/').pop();
        
        // Note: This would need to be implemented in SecretsOnlyConfigManager
        return Response.json({ error: 'Delete specific key not implemented yet' }, {
          status: 501,
          headers: corsHeaders
        });
      }

      // API Documentation
      if (path === '/api' && method === 'GET') {
        const docs = {
          title: 'Empire Pro Configuration API',
          version: '1.0.0',
          description: 'RESTful API for Secrets-Only Configuration Management',
          endpoints: {
            'GET /api/config': 'Get all configuration',
            'GET /api/config/{key}': 'Get specific configuration value',
            'POST /api/config': 'Set configuration value (body: {key, value})',
            'GET /api/config/validate': 'Validate all configuration',
            'GET /api/config/export': 'Export as environment variables',
            'GET /api/config/health': 'Health check',
            'DELETE /api/config': 'Delete all configuration',
            'GET /api': 'This documentation'
          },
          security: 'All configuration is stored in Bun Secrets API (OS credential manager)',
          port: process.env.CONFIG_API_PORT || 3001
        };

        return Response.json(docs, {
          headers: corsHeaders
        });
      }

      // 404 for unknown routes
      return Response.json({ error: 'Endpoint not found' }, {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('API Error:', error);
      return Response.json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
});

console.log(`🌐 Configuration API Server running on port ${server.port}`);
console.log(`📚 API Documentation: http://localhost:${server.port}/api`);
console.log(`🔒 All configuration served from Bun Secrets API`);
console.log(`🚫 No files, no environment variables, no fallbacks`);

export { server };
