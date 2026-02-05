// src/net/proxy/enhanced-http-proxy.ts
//! Enhanced HTTP CONNECT proxy with strict header validation and DNS cache

import { handleEnhancedConnect, getProxyMetrics, healthCheck } from "./middleware.js";
import { warmupDNSCache } from "./dns.js";
import { validationMetrics } from "./validator.js";

// Logging functions
const logInfo = (domain: string, message: string, data?: any) => {
  console.log(`ℹ️ [${domain}] ${message}`, data || '');
};

const logDebug = (domain: string, message: string, data?: any) => {
  if (process.env.DEBUG) {
    console.debug(`🐛 [${domain}] ${message}`, data || '');
  }
};

// Create enhanced proxy server with full validation
export function createEnhancedProxyServer(port: number = 8082) {
  console.log(`🚀 Starting Enhanced HTTP Proxy on port ${port}`);
  console.log(`📊 Features: Strict header validation, DNS cache, performance metrics`);
  
  // Warm up DNS cache on startup
  warmupDNSCache().then(() => {
    logInfo("@domain1", "Enhanced proxy ready", { port });
  }).catch(error => {
    logDebug("@domain1", "DNS warmup failed", { error });
  });
  
  return {
    port,
    
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      
      // Handle CONNECT method for tunneling
      if (req.method === 'CONNECT') {
        return handleEnhancedConnect(req);
      }
      
      // Handle proxy requests
      if (url.pathname === '/proxy') {
        return handleEnhancedConnect(req);
      }
      
      // Enhanced status endpoint with metrics
      if (url.pathname === '/proxy-status') {
        const metrics = getProxyMetrics();
        return Response.json({
          status: 'active',
          type: 'enhanced',
          features: [
            'Strict header validation',
            'DNS cache integration',
            'Performance metrics',
            'Health monitoring',
            'Real-time validation'
          ],
          performance: {
            validation_target: '<400ns',
            dns_cache_hit: '<60ns',
            dns_cache_miss: '<10ms',
            token_verification: '<200ns'
          },
          metrics: metrics,
          health: healthCheck(),
          timestamp: Date.now()
        });
      }
      
      // Health check endpoint
      if (url.pathname === '/health') {
        const health = healthCheck();
        return Response.json(health, {
          status: health.status === 'healthy' ? 200 : 503,
          headers: {
            'X-Health-Status': health.status,
            'X-Validation-Failure-Rate': health.validation.failureRate.toString(),
            'X-DNS-Cache-Hit-Rate': health.dns.hitRate.toString()
          }
        });
      }
      
      // Metrics endpoint
      if (url.pathname === '/metrics') {
        const metrics = getProxyMetrics();
        return Response.json(metrics, {
          headers: {
            'X-Metrics-Timestamp': metrics.timestamp.toString(),
            'X-Validation-Count': metrics.validation.validations.toString(),
            'X-DNS-Hit-Rate': metrics.dns.hitRate.toString()
          }
        });
      }
      
      // Validation test endpoint
      if (url.pathname === '/validate-test') {
        return handleValidationTest(req);
      }
      
      // Default response
      return new Response('Enhanced HTTP Proxy with Strict Validation', {
        headers: {
          'X-Proxy-Server': 'bun-enhanced-proxy/1.0',
          'X-Supported-Methods': 'CONNECT,GET,POST,PUT,DELETE',
          'X-Features': 'header-validation,dns-cache,metrics,health-check',
          'X-Endpoints': '/proxy-status,/health,/metrics,/validate-test'
        }
      });
    },
    
    error(error: Error) {
      console.error('Enhanced proxy server error:', error);
    }
  };
}

// Validation test endpoint
async function handleValidationTest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const body = await req.json();
    const headerEntries = Object.entries(body.headers || {}) as [string, string][];
    const headers = new Headers(headerEntries);
    
    // Import validator dynamically to avoid circular dependency
    const { validateProxyHeader, validateProxyToken } = await import('./validator.js');
    
    const results: any[] = [];
    let hasErrors = false;
    
    // Validate each header
    for (const [name, value] of headers.entries()) {
      if (name.startsWith("X-Bun-")) {
        if (name === "X-Bun-Proxy-Token") {
          const result = await validateProxyToken(value);
          results.push({
            header: name,
            value: value.substring(0, 20) + "...",
            valid: result.valid,
            error: result.valid ? null : {
              code: result.error.code,
              message: result.error.message
            }
          });
          if (!result.valid) hasErrors = true;
        } else {
          const result = validateProxyHeader(name, value);
          results.push({
            header: name,
            value: value,
            valid: result.valid,
            parsed: result.valid ? result.parsed : null,
            error: result.valid ? null : {
              code: result.error.code,
              message: result.error.message
            }
          });
          if (!result.valid) hasErrors = true;
        }
      }
    }
    
    return Response.json({
      test: 'header_validation',
      results: results,
      summary: {
        total: results.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
        has_errors: hasErrors
      },
      timestamp: Date.now()
    }, {
      status: hasErrors ? 400 : 200,
      headers: {
        'X-Validation-Result': hasErrors ? 'failed' : 'passed',
        'X-Valid-Headers': results.filter(r => r.valid).length.toString(),
        'X-Invalid-Headers': results.filter(r => !r.valid).length.toString()
      }
    });
    
  } catch (error) {
    return Response.json({
      error: 'Validation test failed',
      message: error instanceof Error ? error.message : String(error)
    }, {
      status: 400,
      headers: { 'X-Test-Error': 'true' }
    });
  }
}

// Demo server startup
export function startEnhancedProxyDemo() {
  const server = createEnhancedProxyServer(8082);
  const bunServer = Bun.serve(server);
  
  console.log('🎯 Enhanced HTTP Proxy Demo Started!');
  console.log('');
  console.log('📊 Available Endpoints:');
  console.log(`   🌐 Proxy: http://localhost:8082/proxy`);
  console.log(`   📈 Status: http://localhost:8082/proxy-status`);
  console.log(`   ❤️  Health: http://localhost:8082/health`);
  console.log(`   📊 Metrics: http://localhost:8082/metrics`);
  console.log(`   🧪 Test: http://localhost:8082/validate-test`);
  console.log('');
  console.log('🔍 Validation Features:');
  console.log('   ✅ Strict header format validation');
  console.log('   ✅ Range and checksum verification');
  console.log('   ✅ JWT token validation');
  console.log('   ✅ DNS cache integration');
  console.log('   ✅ Performance metrics');
  console.log('   ✅ Health monitoring');
  console.log('');
  console.log('📋 Test Commands:');
  console.log('   # Check proxy status');
  console.log('   curl http://localhost:8082/proxy-status');
  console.log('');
  console.log('   # Test validation with valid headers');
  console.log('   curl -X POST http://localhost:8082/validate-test \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"headers": {');
  console.log('          "X-Bun-Config-Version": "1",');
  console.log('          "X-Bun-Registry-Hash": "0x12345678",');
  console.log('          "X-Bun-Feature-Flags": "0x00000007",');
  console.log('          "X-Bun-Proxy-Token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJkb21haW4iOiJAZG9tYWluMSIsImV4cCI6MTczNjQ0MjQzMH0.YzJkNjY1ZjQ1ZjE2YjE2NjE2NjE2Ng"');
  console.log('        }}\'');
  console.log('');
  console.log('   # Test validation with invalid headers');
  console.log('   curl -X POST http://localhost:8082/validate-test \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"headers": {');
  console.log('          "X-Bun-Config-Version": "256",');
  console.log('          "X-Bun-Registry-Hash": "0xinvalid",');
  console.log('          "X-Bun-Feature-Flags": "0xFFFFFFFF"');
  console.log('        }}\'');
  
  return bunServer;
}

// Performance monitoring
if (process.env.DEBUG) {
  setInterval(() => {
    const metrics = getProxyMetrics();
    logDebug("@domain1", "Performance metrics", {
      validation_success_rate: (100 - metrics.validation.failureRate).toFixed(2) + '%',
      dns_hit_rate: metrics.dns.hitRate.toFixed(2) + '%',
      avg_validation_latency: metrics.validation.avgLatency.toFixed(0) + 'ns',
      avg_dns_latency: metrics.dns.avgLatency.toFixed(0) + 'ns'
    });
  }, 30000); // Every 30 seconds
}
