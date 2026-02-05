// src/net/proxy/middleware.ts
//! HTTP CONNECT proxy with header validation and DNS cache

import { validateProxyHeader, validateProxyToken, ProxyHeaderError, validationMetrics } from "./validator.js";
import { resolveProxyWithMetrics, dnsMetrics } from "./dns.js";
import { HEADERS } from "./headers.js";

// Performance timing
const nanoseconds = () => performance.now() * 1000000;

// Logging functions
const logError = (domain: string, message: string, data?: any) => {
  console.error(`❌ [${domain}] ${message}`, data || '');
};

const logInfo = (domain: string, message: string, data?: any) => {
  console.log(`ℹ️ [${domain}] ${message}`, data || '');
};

const logDebug = (domain: string, message: string, data?: any) => {
  if (process.env.DEBUG) {
    console.debug(`🐛 [${domain}] ${message}`, data || '');
  }
};

// Main proxy handler
export async function handleProxyConnect(req: Request): Promise<Response> {
  const start = nanoseconds();
  
  try {
    // 1. Validate all X-Bun-* headers (400 Bad Request if any fail)
    const validationResults: any[] = [];
    const validationStart = nanoseconds();
    
    for (const [name, value] of req.headers.entries()) {
      if (name.startsWith("X-Bun-") && name !== HEADERS.PROXY_TOKEN) {
        const result = validateProxyHeader(name, value);
        validationResults.push({ name, result });
        
        if (!result.valid) {
          // Record validation metrics
          const validationDuration = nanoseconds() - validationStart;
          validationMetrics.recordValidation(validationDuration, false, result.error.code);
          
          // Log validation error
          logError("@domain1", "Proxy header validation failed", {
            header: result.error.header,
            value: result.error.value,
            code: result.error.code,
            message: result.error.message
          });
          
          // Return 400 Bad Request with error details
          return new Response(
            JSON.stringify({
              error: "Invalid proxy header",
              header: result.error.header,
              code: result.error.code,
              message: result.error.message
            }),
            {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                "X-Proxy-Error": "Header validation failed",
                "X-Validation-Header": result.error.header,
                "X-Validation-Code": result.error.code
              }
            }
          );
        }
      }
    }
    
    // Record successful validation metrics
    const validationDuration = nanoseconds() - validationStart;
    validationMetrics.recordValidation(validationDuration, true);
    
    // 2. Check all required headers are present
    const required = [
      HEADERS.CONFIG_VERSION,
      HEADERS.REGISTRY_HASH,
      HEADERS.FEATURE_FLAGS,
      HEADERS.PROXY_TOKEN,
    ];
    
    for (const header of required) {
      if (!req.headers.has(header)) {
        logError("@domain1", "Missing required header", { header });
        return new Response(
          JSON.stringify({
            error: "Missing required header",
            header: header
          }),
          { 
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              "X-Proxy-Error": "Missing required header",
              "X-Missing-Header": header
            }
          }
        );
      }
    }
    
    // 3. Validate proxy token (async)
    const token = req.headers.get(HEADERS.PROXY_TOKEN)!;
    const tokenResult = await validateProxyToken(token);
    
    if (!tokenResult.valid) {
      logError("@domain1", "Proxy token validation failed", {
        code: tokenResult.error.code,
        message: tokenResult.error.message
      });
      
      return new Response(
        JSON.stringify({
          error: "Invalid proxy token",
          code: tokenResult.error.code,
          message: tokenResult.error.message
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "X-Proxy-Error": "Token validation failed",
            "X-Token-Error": tokenResult.error.code
          }
        }
      );
    }
    
    // 4. Extract and validate proxy URL from config
    const proxyUrl = getProxyUrlFromConfig(req.headers);
    
    // 5. Resolve proxy hostname via DNS cache
    const dnsStart = nanoseconds();
    const resolvedUrl = await resolveProxyWithMetrics(proxyUrl);
    const dnsDuration = nanoseconds() - dnsStart;
    
    // 6. Verify token domain matches
    const payload = tokenResult.parsed;
    if (payload.domain !== "@domain1" && payload.domain !== "@domain2") {
      return new Response(
        JSON.stringify({
          error: "Token domain mismatch",
          expected: "@domain1 or @domain2",
          received: payload.domain
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Proxy-Error": "Domain mismatch"
          }
        }
      );
    }
    
    // 7. Log validated request
    const totalDuration = nanoseconds() - start;
    logInfo("@domain1", "Proxy CONNECT validated", {
      headers_validated: validationResults.length,
      proxy: resolvedUrl,
      validation_duration_ns: validationDuration,
      dns_duration_ns: dnsDuration,
      total_duration_ns: totalDuration,
      domain: payload.domain
    });
    
    // 8. Establish tunnel (network-bound)
    return connectToUpstream(resolvedUrl, req);
    
  } catch (error) {
    const duration = nanoseconds() - start;
    logError("@domain1", "Proxy connection failed", {
      error: error instanceof Error ? error.message : String(error),
      duration_ns: duration
    });
    
    return new Response(
      JSON.stringify({
        error: "Proxy connection failed",
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Error": "Connection failed",
          "X-Proxy-Duration": duration.toString()
        }
      }
    );
  }
}

// Helper: Get proxy URL from config headers
function getProxyUrlFromConfig(headers: Headers): string {
  const registryHash = headers.get(HEADERS.REGISTRY_HASH);
  
  // Route based on registry hash
  switch (registryHash) {
    case "0x12345678":
      return "http://registry.mycompany.com:8080";
    case "0xa1b2c3d4":
      return "http://staging-registry.mycompany.com:8080";
    case "0xdeadbeef":
      return "http://registry.npmjs.org:8080";
    default:
      return "http://localhost:4873"; // Fallback
  }
}

// Helper: Connect to upstream (with DNS-resolved IP)
async function connectToUpstream(resolvedUrl: string, req: Request): Promise<Response> {
  const start = nanoseconds();
  
  try {
    const url = new URL(resolvedUrl);
    
    // In a real implementation, this would establish a TCP connection
    // For now, we'll simulate the tunnel response
    
    // Simulate connection setup
    await new Promise(resolve => setTimeout(resolve, 1)); // Simulate network delay
    
    const duration = nanoseconds() - start;
    
    logDebug("@domain1", "Upstream connection established", {
      upstream: resolvedUrl,
      duration_ns: duration
    });
    
    // Return successful tunnel response
    return new Response("Connection established", {
      status: 200,
      headers: {
        "X-Proxy-Tunnel": "active",
        "X-Proxy-Upstream": resolvedUrl,
        "X-Connection-Duration": duration.toString()
      }
    });
    
  } catch (error) {
    const duration = nanoseconds() - start;
    logError("@domain1", "Upstream connection failed", {
      upstream: resolvedUrl,
      error: error instanceof Error ? error.message : String(error),
      duration_ns: duration
    });
    
    throw error;
  }
}

// Enhanced CONNECT handler with full validation
export async function handleEnhancedConnect(req: Request): Promise<Response> {
  // Add pre-validation logging
  const headerCount = Array.from(req.headers.entries()).filter(([name]) => 
    name.startsWith("X-Bun-")
  ).length;
  
  logDebug("@domain1", "Incoming CONNECT request", {
    method: req.method,
    url: req.url,
    x_bun_headers: headerCount
  });
  
  // Delegate to main handler
  return handleProxyConnect(req);
}

// Metrics endpoint
export function getProxyMetrics() {
  return {
    validation: validationMetrics.getMetrics(),
    dns: dnsMetrics.getMetrics(),
    timestamp: Date.now()
  };
}

// Health check endpoint
export function healthCheck() {
  const validationMetrics_data = validationMetrics.getMetrics();
  const dnsMetrics_data = dnsMetrics.getMetrics();
  
  const isHealthy = 
    validationMetrics_data.failureRate < 5 && // Less than 5% validation failures
    dnsMetrics_data.hitRate > 80; // At least 80% DNS cache hit rate
  
  return {
    status: isHealthy ? "healthy" : "degraded",
    validation: validationMetrics_data,
    dns: dnsMetrics_data,
    timestamp: Date.now()
  };
}
