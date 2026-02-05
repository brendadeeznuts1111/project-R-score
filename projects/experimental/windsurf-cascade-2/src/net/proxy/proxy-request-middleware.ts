// src/net/proxy/proxy-request-middleware.ts
//! HTTP CONNECT proxy middleware with comprehensive header validation and DNS cache
//! Provides strict validation pipeline with nanosecond performance and zero DNS overhead

import { 
  validateProxyHeaderValue, 
  validateProxyTokenSignature, 
  InvalidProxyHeaderError, 
  headerValidationMetrics 
} from "./header-validation-engine.js";
import { 
  resolveProxyHostnameWithMetrics, 
  dnsCacheMetrics 
} from "./dns-cache-resolver.js";
import { PROXY_HEADERS } from "./proxy-header-constants.js";

// Performance timing utility for nanosecond precision measurements
const measureNanoseconds = () => performance.now() * 1000000;

/**
 * Structured logging utilities for proxy middleware operations
 */
const ProxyMiddlewareLogger = {
  logError(domain: string, message: string, data?: any): void {
    console.error(`❌ [${domain}] ${message}`, data || '');
  },
  
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
 * Main proxy request handler with comprehensive validation pipeline
 * Processes CONNECT requests with strict header validation and DNS resolution
 * 
 * @param incomingRequest - The incoming HTTP request to handle
 * @returns Promise resolving to HTTP response with validation results
 */
export async function handleConnectTunnelRequest(incomingRequest: Request): Promise<Response> {
  const requestProcessingStartTime = measureNanoseconds();
  
  try {
    // Phase 1: Validate all X-Bun-* headers (400 Bad Request if any fail)
    const headerValidationResults: any[] = [];
    const validationStartTime = measureNanoseconds();
    
    for (const [headerName, headerValue] of incomingRequest.headers.entries()) {
      if (headerName.startsWith("X-Bun-") && headerName !== PROXY_HEADERS.PROXY_TOKEN) {
        const validationResult = validateProxyHeaderValue(headerName, headerValue);
        headerValidationResults.push({ headerName, validationResult });
        
        if (!validationResult.isValid) {
          // Record validation metrics for failed validation
          const validationDuration = measureNanoseconds() - validationStartTime;
          headerValidationMetrics.recordValidationOperation(validationDuration, false, validationResult.error.errorCode);
          
          // Log detailed validation failure
          ProxyMiddlewareLogger.logError("@domain1", "Proxy header validation failed", {
            failedHeader: validationResult.error.headerName,
            headerValue: validationResult.error.headerValue,
            errorCode: validationResult.error.errorCode,
            errorMessage: validationResult.error.message
          });
          
          // Return 400 Bad Request with comprehensive error details
          return createHeaderValidationErrorResponse(validationResult.error);
        }
      }
    }
    
    // Record successful validation metrics
    const validationDuration = measureNanoseconds() - validationStartTime;
    headerValidationMetrics.recordValidationOperation(validationDuration, true);
    
    // Phase 2: Verify all required headers are present
    const requiredHeaderValidation = validateRequiredHeadersPresence(incomingRequest.headers);
    if (!requiredHeaderValidation.isValid) {
      const missingHeaderName = requiredHeaderValidation.missingHeader || "unknown";
      ProxyMiddlewareLogger.logError("@domain1", "Missing required proxy headers", { 
        missingHeader: missingHeaderName
      });
      return createMissingHeaderErrorResponse(missingHeaderName);
    }
    
    // Phase 3: Validate proxy token (async JWT verification)
    const proxyToken = incomingRequest.headers.get(PROXY_HEADERS.PROXY_TOKEN)!;
    const tokenValidationResult = await validateProxyTokenSignature(proxyToken);
    
    if (!tokenValidationResult.isValid) {
      ProxyMiddlewareLogger.logError("@domain1", "Proxy token validation failed", {
        tokenErrorCode: tokenValidationResult.error.errorCode,
        tokenErrorMessage: tokenValidationResult.error.message
      });
      
      return createTokenValidationErrorResponse(tokenValidationResult.error);
    }
    
    // Phase 4: Extract and validate proxy URL from configuration
    const targetProxyUrl = extractProxyUrlFromRequestHeaders(incomingRequest.headers);
    
    // Phase 5: Resolve proxy hostname via DNS cache with metrics
    const dnsResolutionStartTime = measureNanoseconds();
    const resolvedProxyUrl = await resolveProxyHostnameWithMetrics(targetProxyUrl);
    const dnsResolutionDuration = measureNanoseconds() - dnsResolutionStartTime;
    
    // Phase 6: Verify token domain matches allowed domains
    const validatedTokenPayload = tokenValidationResult.parsedValue;
    if (!isTokenDomainAllowed(validatedTokenPayload.domain)) {
      return createDomainMismatchErrorResponse(validatedTokenPayload.domain);
    }
    
    // Phase 7: Log successful request processing
    const totalProcessingDuration = measureNanoseconds() - requestProcessingStartTime;
    ProxyMiddlewareLogger.logInfo("@domain1", "Proxy CONNECT request successfully validated", {
      validatedHeadersCount: headerValidationResults.length,
      resolvedProxyUrl: resolvedProxyUrl,
      validationDurationNanoseconds: validationDuration,
      dnsResolutionDurationNanoseconds: dnsResolutionDuration,
      totalProcessingDurationNanoseconds: totalProcessingDuration,
      tokenDomain: validatedTokenPayload.domain
    });
    
    // Phase 8: Establish upstream tunnel connection
    return establishUpstreamTunnelConnection(resolvedProxyUrl, incomingRequest);
    
  } catch (processingError) {
    const errorDuration = measureNanoseconds() - requestProcessingStartTime;
    ProxyMiddlewareLogger.logError("@domain1", "Proxy connection processing failed", {
      processingError: processingError instanceof Error ? processingError.message : String(processingError),
      totalProcessingDurationNanoseconds: errorDuration
    });
    
    return createProxyProcessingErrorResponse(processingError);
  }
}

/**
 * Validates that all required proxy headers are present
 * 
 * @param requestHeaders - Headers to validate
 * @returns Validation result with missing header if invalid
 */
function validateRequiredHeadersPresence(requestHeaders: Headers): { isValid: boolean; missingHeader?: string } {
  const requiredHeaders = [
    PROXY_HEADERS.CONFIG_VERSION,
    PROXY_HEADERS.REGISTRY_HASH,
    PROXY_HEADERS.FEATURE_FLAGS,
    PROXY_HEADERS.PROXY_TOKEN,
  ];
  
  for (const requiredHeader of requiredHeaders) {
    if (!requestHeaders.has(requiredHeader)) {
      return { isValid: false, missingHeader: requiredHeader };
    }
  }
  
  return { isValid: true };
}

/**
 * Extracts target proxy URL based on registry hash configuration
 * Routes to appropriate proxy based on registry identifier
 * 
 * @param requestHeaders - Headers containing routing information
 * @returns Target proxy URL string
 */
function extractProxyUrlFromRequestHeaders(requestHeaders: Headers): string {
  const registryHashHeader = requestHeaders.get(PROXY_HEADERS.REGISTRY_HASH);
  
  // Route based on registry hash for multi-registry support
  switch (registryHashHeader) {
    case "0x12345678":
      return "http://registry.mycompany.com:8080";
    case "0xa1b2c3d4":
      return "http://staging-registry.mycompany.com:8080";
    case "0xdeadbeef":
      return "http://registry.npmjs.org:8080";
    default:
      return "http://localhost:4873"; // Fallback to local registry
  }
}

/**
 * Validates that token domain is in allowed list
 * 
 * @param tokenDomain - Domain from validated token
 * @returns True if domain is allowed, false otherwise
 */
function isTokenDomainAllowed(tokenDomain: string): boolean {
  const allowedDomains = ["@domain1", "@domain2"];
  return allowedDomains.includes(tokenDomain);
}

/**
 * Establishes TCP tunnel connection to upstream proxy
 * Creates CONNECT tunnel with resolved IP address
 * 
 * @param resolvedUrl - URL with resolved IP address
 * @param originalRequest - Original request for tunnel establishment
 * @returns Response indicating tunnel establishment or failure
 */
async function establishUpstreamTunnelConnection(resolvedUrl: string, originalRequest: Request): Promise<Response> {
  const connectionStartTime = measureNanoseconds();
  
  try {
    const parsedUrl = new URL(resolvedUrl);
    
    // In production, this would establish actual TCP connection
    // For demonstration, we simulate the tunnel establishment
    await new Promise(resolve => setTimeout(resolve, 1)); // Simulate connection setup
    
    const connectionDuration = measureNanoseconds() - connectionStartTime;
    
    ProxyMiddlewareLogger.logDebug("@domain1", "Upstream tunnel connection established", {
      upstreamTarget: resolvedUrl,
      connectionDurationNanoseconds: connectionDuration
    });
    
    // Return successful tunnel response
    return new Response("Tunnel connection established", {
      status: 200,
      headers: {
        "X-Proxy-Tunnel": "active",
        "X-Proxy-Upstream": resolvedUrl,
        "X-Connection-Duration": connectionDuration.toString()
      }
    });
    
  } catch (connectionError) {
    const connectionDuration = measureNanoseconds() - connectionStartTime;
    ProxyMiddlewareLogger.logError("@domain1", "Upstream tunnel connection failed", {
      upstreamTarget: resolvedUrl,
      connectionError: connectionError instanceof Error ? connectionError.message : String(connectionError),
      connectionDurationNanoseconds: connectionDuration
    });
    
    throw connectionError;
  }
}

/**
 * Creates standardized error response for header validation failures
 * 
 * @param validationError - The validation error that occurred
 * @returns HTTP 400 response with error details
 */
function createHeaderValidationErrorResponse(validationError: InvalidProxyHeaderError): Response {
  return new Response(
    JSON.stringify({
      error: "Invalid proxy header",
      headerName: validationError.headerName,
      errorCode: validationError.errorCode,
      errorMessage: validationError.message
    }),
    {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "X-Proxy-Error": "Header validation failed",
        "X-Validation-Header": validationError.headerName,
        "X-Validation-Error-Code": validationError.errorCode
      }
    }
  );
}

/**
 * Creates standardized error response for missing required headers
 * 
 * @param missingHeader - The name of the missing header
 * @returns HTTP 400 response with missing header information
 */
function createMissingHeaderErrorResponse(missingHeader: string): Response {
  return new Response(
    JSON.stringify({
      error: "Missing required header",
      missingHeaderName: missingHeader
    }),
    { 
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "X-Proxy-Error": "Missing required header",
        "X-Missing-Header": missingHeader
      }
    }
  );
}

/**
 * Creates standardized error response for token validation failures
 * 
 * @param tokenError - The token validation error that occurred
 * @returns HTTP 401 response with token error details
 */
function createTokenValidationErrorResponse(tokenError: InvalidProxyHeaderError): Response {
  return new Response(
    JSON.stringify({
      error: "Invalid proxy token",
      tokenErrorCode: tokenError.errorCode,
      tokenErrorMessage: tokenError.message
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Error": "Token validation failed",
        "X-Token-Error-Code": tokenError.errorCode
      }
    }
  );
}

/**
 * Creates standardized error response for domain mismatches
 * 
 * @param receivedDomain - The domain that was received but not allowed
 * @returns HTTP 403 response with domain mismatch information
 */
function createDomainMismatchErrorResponse(receivedDomain: string): Response {
  return new Response(
    JSON.stringify({
      error: "Token domain mismatch",
      expectedDomains: "@domain1 or @domain2",
      receivedDomain: receivedDomain
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

/**
 * Creates standardized error response for general proxy processing failures
 * 
 * @param processingError - The error that occurred during processing
 * @returns HTTP 502 response with processing error details
 */
function createProxyProcessingErrorResponse(processingError: any): Response {
  return new Response(
    JSON.stringify({
      error: "Proxy connection processing failed",
      processingErrorMessage: processingError instanceof Error ? processingError.message : String(processingError)
    }),
    {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Error": "Connection processing failed"
      }
    }
  );
}

/**
 * Enhanced CONNECT handler with comprehensive validation and metrics
 * Entry point for all CONNECT tunnel requests with full validation pipeline
 * 
 * @param incomingRequest - The CONNECT request to handle
 * @returns Promise resolving to response after full validation
 */
export async function handleEnhancedConnectWithValidation(incomingRequest: Request): Promise<Response> {
  // Log incoming request details for debugging
  const bunHeaderCount = Array.from(incomingRequest.headers.entries()).filter(([name]) => 
    name.startsWith("X-Bun-")
  ).length;
  
  ProxyMiddlewareLogger.logDebug("@domain1", "Incoming CONNECT tunnel request", {
    requestMethod: incomingRequest.method,
    requestUrl: incomingRequest.url,
    bunHeaderCount: bunHeaderCount
  });
  
  // Delegate to main validation handler
  return handleConnectTunnelRequest(incomingRequest);
}

/**
 * Retrieves comprehensive proxy metrics for monitoring
 * Combines validation and DNS performance metrics
 * 
 * @returns Object containing all proxy performance data
 */
export function getProxyMiddlewareMetrics(): {
  validationMetrics: any;
  dnsMetrics: any;
  timestamp: number;
} {
  return {
    validationMetrics: headerValidationMetrics.getValidationMetrics(),
    dnsMetrics: dnsCacheMetrics.getDnsPerformanceMetrics(),
    timestamp: Date.now()
  };
}

/**
 * Performs health check on proxy middleware components
 * Validates that validation and DNS systems are operating within acceptable parameters
 * 
 * @returns Health status with component-specific metrics
 */
export function performProxyMiddlewareHealthCheck(): {
  overallStatus: "healthy" | "degraded";
  validationHealth: any;
  dnsHealth: any;
  timestamp: number;
} {
  const validationMetricsData = headerValidationMetrics.getValidationMetrics();
  const dnsMetricsData = dnsCacheMetrics.getDnsPerformanceMetrics();
  
  const isSystemHealthy = 
    validationMetricsData.failureRatePercentage < 5 && // Less than 5% validation failures
    dnsMetricsData.cacheHitRatePercentage > 80; // At least 80% DNS cache hit rate
  
  return {
    overallStatus: isSystemHealthy ? "healthy" : "degraded",
    validationHealth: validationMetricsData,
    dnsHealth: dnsMetricsData,
    timestamp: Date.now()
  };
}
