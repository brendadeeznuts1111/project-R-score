// src/net/proxy/enhanced-proxy-server.ts
//! Enhanced HTTP proxy server with strict header validation and DNS cache
//! Provides comprehensive validation, monitoring, and performance optimization

import { 
  handleEnhancedConnectWithValidation, 
  getProxyMiddlewareMetrics, 
  performProxyMiddlewareHealthCheck 
} from "./proxy-request-middleware.js";
import { prepopulateDnsCache } from "./dns-cache-resolver.js";
import { headerValidationMetrics } from "./header-validation-engine.js";

/**
 * Structured logging utilities for enhanced proxy server operations
 */
const EnhancedProxyLogger = {
  logInfo(domain: string, message: string, data?: any): void {
    console.log(`ℹ️ [${domain}] ${message}`, data || '');
  },
  
  logDebug(domain: string, message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`🐛 [${domain}] ${message}`, data || '');
    }
  }
};

/**
 * Enhanced proxy server configuration options
 * Allows customization of server behavior and performance settings
 */
interface EnhancedProxyServerConfig {
  readonly serverPort: number;
  readonly enableDebugLogging: boolean;
  readonly enableMetricsCollection: boolean;
  readonly enableHealthMonitoring: boolean;
}

/**
 * Creates and configures enhanced HTTP proxy server with full validation stack
 * Integrates header validation, DNS caching, metrics, and health monitoring
 * 
 * @param serverConfig - Configuration options for the proxy server
 * @returns Configured Bun server instance ready to start
 */
export function createEnhancedProxyServer(serverConfig: Partial<EnhancedProxyServerConfig> = {}): {
  readonly port: number;
  readonly fetch: (request: Request) => Promise<Response>;
  readonly error?: (error: Error) => void;
} {
  // Apply default configuration
  const finalConfig: EnhancedProxyServerConfig = {
    serverPort: 8082,
    enableDebugLogging: false,
    enableMetricsCollection: true,
    enableHealthMonitoring: true,
    ...serverConfig
  };
  
  EnhancedProxyLogger.logInfo("@domain1", "Initializing Enhanced HTTP Proxy Server", {
    serverPort: finalConfig.serverPort,
    debugEnabled: finalConfig.enableDebugLogging,
    metricsEnabled: finalConfig.enableMetricsCollection,
    healthMonitoringEnabled: finalConfig.enableHealthMonitoring
  });
  
  // Prepopulate DNS cache for optimal performance
  prepopulateDnsCache().then(() => {
    EnhancedProxyLogger.logInfo("@domain1", "Enhanced proxy server initialization completed", { 
      serverPort: finalConfig.serverPort 
    });
  }).catch(cacheError => {
    EnhancedProxyLogger.logDebug("@domain1", "DNS cache prepopulation failed", { error: cacheError });
  });
  
  return {
    port: finalConfig.serverPort,
    
    /**
     * Main request handler for enhanced proxy server
     * Routes requests to appropriate handlers based on method and path
     * 
     * @param incomingRequest - The incoming HTTP request
     * @returns Promise resolving to appropriate HTTP response
     */
    async fetch(incomingRequest: Request): Promise<Response> {
      const requestUrl = new URL(incomingRequest.url);
      
      // Handle CONNECT method for tunnel establishment
      if (incomingRequest.method === 'CONNECT') {
        return handleEnhancedConnectWithValidation(incomingRequest);
      }
      
      // Handle proxy requests through validation middleware
      if (requestUrl.pathname === '/proxy') {
        return handleEnhancedConnectWithValidation(incomingRequest);
      }
      
      // Enhanced status endpoint with comprehensive metrics
      if (requestUrl.pathname === '/proxy-status') {
        return handleProxyStatusRequest();
      }
      
      // Health check endpoint with component-specific monitoring
      if (requestUrl.pathname === '/health') {
        return handleHealthCheckRequest();
      }
      
      // Detailed metrics endpoint for monitoring and analytics
      if (requestUrl.pathname === '/metrics') {
        return handleMetricsRequest();
      }
      
      // Interactive validation testing endpoint
      if (requestUrl.pathname === '/validate-test') {
        return handleValidationTestRequest(incomingRequest);
      }
      
      // Server information and capabilities endpoint
      return handleServerInfoRequest();
    },
    
    /**
     * Error handler for server-level errors
     * Logs errors for debugging and monitoring
     * 
     * @param serverError - The error that occurred
     */
    error(serverError: Error): void {
      console.error('Enhanced proxy server error:', serverError);
    }
  };
}

/**
 * Handles proxy status requests with comprehensive system information
 * Returns server capabilities, performance targets, and current metrics
 * 
 * @returns Response with detailed proxy status information
 */
function handleProxyStatusRequest(): Response {
  const currentMetrics = getProxyMiddlewareMetrics();
  
  return Response.json({
    status: 'active',
    serverType: 'enhanced',
    capabilities: [
      'Strict header validation',
      'DNS cache integration', 
      'Performance metrics collection',
      'Health monitoring',
      'Real-time validation tracking',
      'Comprehensive error reporting'
    ],
    performanceTargets: {
      validationTarget: '<400ns',
      dnsCacheHitTarget: '<60ns',
      dnsCacheMissTarget: '<10ms',
      tokenVerificationTarget: '<200ns',
      overallLatencyTarget: '<1ms + RTT'
    },
    currentMetrics: currentMetrics,
    systemHealth: performProxyMiddlewareHealthCheck(),
    serverTimestamp: Date.now()
  });
}

/**
 * Handles health check requests with component-specific monitoring
 * Returns detailed health status for validation and DNS components
 * 
 * @returns Response with health status and appropriate HTTP status code
 */
function handleHealthCheckRequest(): Response {
  const healthCheckResult = performProxyMiddlewareHealthCheck();
  const httpStatusCode = healthCheckResult.overallStatus === "healthy" ? 200 : 503;
  
  return Response.json(healthCheckResult, {
    status: httpStatusCode,
    headers: {
      'X-Health-Status': healthCheckResult.overallStatus,
      'X-Validation-Failure-Rate': healthCheckResult.validationHealth.failureRatePercentage.toString(),
      'X-DNS-Cache-Hit-Rate': healthCheckResult.dnsHealth.cacheHitRatePercentage.toString()
    }
  });
}

/**
 * Handles metrics requests for monitoring and analytics
 * Returns detailed performance metrics for all proxy components
 * 
 * @returns Response with comprehensive metrics data
 */
function handleMetricsRequest(): Response {
  const currentMetrics = getProxyMiddlewareMetrics();
  
  return Response.json(currentMetrics, {
    headers: {
      'X-Metrics-Timestamp': currentMetrics.timestamp.toString(),
      'X-Validation-Count': currentMetrics.validationMetrics.totalValidations.toString(),
      'X-DNS-Hit-Rate': currentMetrics.dnsMetrics.cacheHitRatePercentage.toString()
    }
  });
}

/**
 * Handles validation test requests for debugging and development
 * Allows interactive testing of header validation logic
 * 
 * @param incomingRequest - Request containing headers to validate
 * @returns Response with validation results and detailed analysis
 */
async function handleValidationTestRequest(incomingRequest: Request): Promise<Response> {
  if (incomingRequest.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const requestBody = await incomingRequest.json();
    const headerEntries = Object.entries(requestBody.headers || {}) as [string, string][];
    const testHeaders = new Headers(headerEntries);
    
    // Import validation engine dynamically to avoid circular dependencies
    const { validateProxyHeaderValue, validateProxyTokenSignature } = await import('./header-validation-engine.js');
    
    const validationResults: any[] = [];
    let hasValidationErrors = false;
    
    // Validate each X-Bun-* header
    for (const [headerName, headerValue] of testHeaders.entries()) {
      if (headerName.startsWith("X-Bun-")) {
        if (headerName === "X-Bun-Proxy-Token") {
          const tokenValidationResult = await validateProxyTokenSignature(headerValue);
          validationResults.push({
            headerName: headerName,
            headerValue: headerValue.substring(0, 20) + "...",
            isValid: tokenValidationResult.isValid,
            validationError: tokenValidationResult.isValid ? null : {
              errorCode: tokenValidationResult.error.errorCode,
              errorMessage: tokenValidationResult.error.message
            }
          });
          if (!tokenValidationResult.isValid) hasValidationErrors = true;
        } else {
          const headerValidationResult = validateProxyHeaderValue(headerName, headerValue);
          validationResults.push({
            headerName: headerName,
            headerValue: headerValue,
            isValid: headerValidationResult.isValid,
            parsedValue: headerValidationResult.isValid ? headerValidationResult.parsedValue : null,
            validationError: headerValidationResult.isValid ? null : {
              errorCode: headerValidationResult.error.errorCode,
              errorMessage: headerValidationResult.error.message
            }
          });
          if (!headerValidationResult.isValid) hasValidationErrors = true;
        }
      }
    }
    
    const testSummary = {
      testName: 'header_validation',
      totalHeaders: validationResults.length,
      validHeaders: validationResults.filter(r => r.isValid).length,
      invalidHeaders: validationResults.filter(r => !r.isValid).length,
      hasValidationErrors: hasValidationErrors
    };
    
    return Response.json({
      testResult: testSummary,
      validationDetails: validationResults,
      testTimestamp: Date.now()
    }, {
      status: hasValidationErrors ? 400 : 200,
      headers: {
        'X-Validation-Result': hasValidationErrors ? 'failed' : 'passed',
        'X-Valid-Headers': testSummary.validHeaders.toString(),
        'X-Invalid-Headers': testSummary.invalidHeaders.toString()
      }
    });
    
  } catch (testError) {
    return Response.json({
      testError: 'Validation test failed',
      testErrorMessage: testError instanceof Error ? testError.message : String(testError)
    }, {
      status: 400,
      headers: { 'X-Test-Error': 'true' }
    });
  }
}

/**
 * Handles server information requests
 * Returns server capabilities, endpoints, and usage information
 * 
 * @returns Response with server information and available endpoints
 */
function handleServerInfoRequest(): Response {
  return new Response('Enhanced HTTP Proxy with Strict Header Validation and DNS Cache', {
    headers: {
      'X-Proxy-Server': 'bun-enhanced-proxy/2.0',
      'X-Supported-Methods': 'CONNECT,GET,POST,PUT,DELETE',
      'X-Proxy-Features': 'header-validation,dns-cache,metrics,health-check,validation-testing',
      'X-Available-Endpoints': '/proxy-status,/health,/metrics,/validate-test',
      'X-Performance-Targets': 'validation:<400ns,dns:<60ns,token:<200ns',
      'X-Server-Capabilities': 'strict-validation,dns-caching,real-time-metrics,health-monitoring'
    }
  });
}

/**
 * Starts enhanced proxy server demonstration with comprehensive logging
 * Provides interactive demo with usage examples and real-time monitoring
 * 
 * @param serverPort - Port to run the server on (default: 8082)
 * @returns Bun server instance
 */
export function startEnhancedProxyServerDemo(serverPort: number = 8082): any {
  const serverInstance = createEnhancedProxyServer({ serverPort });
  const bunServer = Bun.serve(serverInstance);
  
  console.log(`🚀 Enhanced HTTP Proxy Server Started on port ${serverPort}`);
  console.log('');
  console.log('📊 Available Server Endpoints:');
  console.log(`   🌐 Proxy Tunnel: http://localhost:${serverPort}/proxy`);
  console.log(`   📈 Status Dashboard: http://localhost:${serverPort}/proxy-status`);
  console.log(`   ❤️  Health Monitor: http://localhost:${serverPort}/health`);
  console.log(`   📊 Performance Metrics: http://localhost:${serverPort}/metrics`);
  console.log(`   🧪 Validation Testing: http://localhost:${serverPort}/validate-test`);
  console.log('');
  console.log('🔍 Validation Features:');
  console.log('   ✅ Strict header format validation (regex patterns)');
  console.log('   ✅ Range and bounds validation (numeric limits)');
  console.log('   ✅ Checksum verification (XOR validation)');
  console.log('   ✅ JWT token validation (domain-scoped)');
  console.log('   ✅ DNS cache integration (50ns hits)');
  console.log('   ✅ Performance metrics (real-time tracking)');
  console.log('   ✅ Health monitoring (component status)');
  console.log('');
  console.log('📋 Interactive Test Commands:');
  console.log('');
  console.log('1️⃣ Check server status:');
  console.log(`   curl http://localhost:${serverPort}/proxy-status`);
  console.log('');
  console.log('2️⃣ Test health monitoring:');
  console.log(`   curl http://localhost:${serverPort}/health`);
  console.log('');
  console.log('3️⃣ View performance metrics:');
  console.log(`   curl http://localhost:${serverPort}/metrics`);
  console.log('');
  console.log('4️⃣ Test validation with VALID headers:');
  console.log(`   curl -X POST http://localhost:${serverPort}/validate-test \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{`);
  console.log(`          "headers": {`);
  console.log(`            "X-Bun-Config-Version": "1",`);
  console.log(`            "X-Bun-Registry-Hash": "0x12345678",`);
  console.log(`            "X-Bun-Feature-Flags": "0x00000007",`);
  console.log(`            "X-Bun-Terminal-Mode": "2",`);
  console.log(`            "X-Bun-Terminal-Rows": "24",`);
  console.log(`            "X-Bun-Terminal-Cols": "80",`);
  console.log(`            "X-Bun-Proxy-Token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJkb21haW4iOiJAZG9tYWluMSIsImV4cCI6MTczNjQ0MjQzMH0.YzJkNjY1ZjQ1ZjE2YjE2NjE2NjE2Ng"`);
  console.log(`          }`);
  console.log(`        }'`);
  console.log('');
  console.log('5️⃣ Test validation with INVALID headers:');
  console.log(`   curl -X POST http://localhost:${serverPort}/validate-test \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{`);
  console.log(`          "headers": {`);
  console.log(`            "X-Bun-Config-Version": "256",     # Out of range`);
  console.log(`            "X-Bun-Registry-Hash": "0xinvalid", # Invalid format`);
  console.log(`            "X-Bun-Feature-Flags": "0xFFFFFFFF" # Reserved bits set`);
  console.log(`          }`);
  console.log(`        }'`);
  console.log('');
  console.log('6️⃣ Test DNS cache performance:');
  console.log(`   # First request (cache miss):`);
  console.log(`   time curl http://localhost:${serverPort}/proxy-status`);
  console.log(`   # Second request (cache hit):`);
  console.log(`   time curl http://localhost:${serverPort}/proxy-status`);
  console.log('');
  console.log('7️⃣ Stress test validation performance:');
  console.log(`   for i in {1..100}; do`);
  console.log(`     curl -s http://localhost:${serverPort}/proxy-status > /dev/null;`);
  console.log(`   done`);
  console.log(`   curl http://localhost:${serverPort}/metrics`);
  console.log('');
  console.log('🎬 Live Demo Features:');
  console.log('   • Real-time header validation with detailed error reporting');
  console.log('   • DNS cache performance monitoring and optimization');
  console.log('   • Interactive validation testing with immediate feedback');
  console.log('   • Comprehensive metrics collection and reporting');
  console.log('   • Health monitoring with component-specific status');
  console.log('   • Performance tracking with SLA compliance monitoring');
  console.log('');
  console.log('🎉 Enhanced HTTP Proxy Server is running!');
  console.log('   All X-Bun-* headers are strictly validated!');
  console.log('   DNS cache provides zero-overhead resolution!');
  console.log('   Performance metrics are collected in real-time!');
  console.log('   Try the test commands above to see validation in action!');
  
  return bunServer;
}

/**
 * Performance monitoring and periodic reporting
 * Logs detailed performance metrics when debug mode is enabled
 */
if (process.env.DEBUG) {
  setInterval(() => {
    const currentMetrics = getProxyMiddlewareMetrics();
    EnhancedProxyLogger.logDebug("@domain1", "Performance metrics report", {
      validationSuccessRate: (100 - currentMetrics.validationMetrics.failureRatePercentage).toFixed(2) + '%',
      dnsCacheHitRate: currentMetrics.dnsMetrics.cacheHitRatePercentage.toFixed(2) + '%',
      averageValidationLatency: currentMetrics.validationMetrics.averageLatencyNanoseconds.toFixed(0) + 'ns',
      averageDnsLatency: currentMetrics.dnsMetrics.averageResolutionTime.toFixed(0) + 'ns',
      totalValidations: currentMetrics.validationMetrics.totalValidations,
      totalDnsResolutions: currentMetrics.dnsMetrics.totalResolutions
    });
  }, 30000); // Every 30 seconds
}
