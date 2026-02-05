import { validateMatrixCompliance, getComplianceReport } from "../../utils/matrixValidator.ts";
import { getScopeContext } from "../../config/scope.config.ts";

/**
 * Compliance middleware for Bun.serve() - validates requests against scoping matrix
 */
export function complianceMiddleware(req: Request): Request {
  const result = validateMatrixCompliance();

  if (!result.valid) {
    console.warn("⚠️ Scope compliance violation:", result.reason);
    // Add compliance header
    req.headers.set("X-DuoPlus-Compliance", "violation");
    req.headers.set("X-DuoPlus-Compliance-Reason", result.reason || "Unknown");
  } else {
    req.headers.set("X-DuoPlus-Compliance", "ok");
  }

  // Add scope information headers
  const context = getScopeContext();
  req.headers.set("X-DuoPlus-Scope", context.detectedScope);
  req.headers.set("X-DuoPlus-Domain", context.domain);
  req.headers.set("X-DuoPlus-Platform", context.platform);

  return req;
}

/**
 * Strict compliance middleware - blocks non-compliant requests
 */
export function strictComplianceMiddleware(req: Request): Request | Response {
  const result = validateMatrixCompliance();

  if (!result.valid) {
    console.error("🚫 Request blocked due to compliance violation:", result.reason);

    return new Response(JSON.stringify({
      error: "Compliance Violation",
      reason: result.reason,
      violations: result.violations,
      timestamp: new Date().toISOString(),
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "X-DuoPlus-Compliance": "blocked",
        "X-DuoPlus-Compliance-Reason": result.reason || "Unknown",
      },
    });
  }

  // Add compliance headers
  req.headers.set("X-DuoPlus-Compliance", "ok");
  const context = getScopeContext();
  req.headers.set("X-DuoPlus-Scope", context.detectedScope);
  req.headers.set("X-DuoPlus-Domain", context.domain);
  req.headers.set("X-DuoPlus-Platform", context.platform);

  return req;
}

/**
 * Debug compliance middleware - adds detailed compliance information
 */
export async function debugComplianceMiddleware(req: Request): Promise<Request> {
  const startTime = Date.now();
  const result = validateMatrixCompliance();
  const context = getScopeContext();

  // Add detailed compliance headers
  req.headers.set("X-DuoPlus-Compliance", result.valid ? "ok" : "violation");
  req.headers.set("X-DuoPlus-Compliance-Reason", result.reason || "None");
  req.headers.set("X-DuoPlus-Scope", context.detectedScope);
  req.headers.set("X-DuoPlus-Domain", context.domain);
  req.headers.set("X-DuoPlus-Platform", context.platform);

  if (result.violations) {
    req.headers.set("X-DuoPlus-Compliance-Violations", result.violations.join("; "));
  }

  if (result.warnings) {
    req.headers.set("X-DuoPlus-Compliance-Warnings", result.warnings.join("; "));
  }

  // Log compliance check
  const duration = Date.now() - startTime;
  console.log(`🔍 Compliance check: ${result.valid ? "✅" : "❌"} (${duration}ms)`);

  if (!result.valid) {
    console.warn("⚠️ Compliance violations:", result.violations);
  }

  return req;
}

/**
 * Compliance endpoint middleware - serves compliance reports
 */
export async function complianceEndpointMiddleware(req: Request): Promise<Request | Response> {
  const url = new URL(req.url);

  // Handle compliance report endpoint
  if (url.pathname === "/compliance" && req.method === "GET") {
    try {
      const report = await getComplianceReport();
      return new Response(JSON.stringify(report, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "X-DuoPlus-Compliance": "report",
        },
      });
    } catch (error) {
      console.error("Failed to generate compliance report:", error);
      return new Response(JSON.stringify({
        error: "Failed to generate compliance report",
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Handle matrix debug endpoint
  if (url.pathname === "/matrix" && req.method === "GET") {
    try {
      const context = getScopeContext();
      const result = validateMatrixCompliance();

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        scope: {
          domain: context.domain,
          platform: context.platform,
          detectedScope: context.detectedScope,
        },
        compliance: result,
        limits: context.limits,
        features: context.features,
        integrations: context.integrations,
      }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "X-DuoPlus-Compliance": "matrix",
        },
      });
    } catch (error) {
      console.error("Failed to generate matrix report:", error);
      return new Response(JSON.stringify({
        error: "Failed to generate matrix report",
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Handle scope info endpoint
  if (url.pathname === "/scope.json" && req.method === "GET") {
    try {
      const context = getScopeContext();

      return new Response(JSON.stringify({
        domain: context.domain,
        platform: context.platform,
        detectedScope: context.detectedScope,
        features: context.features,
        limits: context.limits,
        integrations: context.integrations,
        timestamp: new Date().toISOString(),
      }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "X-DuoPlus-Compliance": "scope",
        },
      });
    } catch (error) {
      console.error("Failed to generate scope info:", error);
      return new Response(JSON.stringify({
        error: "Failed to generate scope info",
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return req;
}

/**
 * Rate limiting middleware based on scope limits
 */
export function rateLimitMiddleware(req: Request): Request | Response {
  const context = getScopeContext();

  if (!context.limits) {
    return new Response(JSON.stringify({
      error: "Rate limiting not configured",
      reason: "No limits defined for current scope",
    }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Simple in-memory rate limiting (for demo - use Redis in production)
  const clientId = req.headers.get("X-Client-ID") || req.headers.get("User-Agent") || "anonymous";
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = context.limits.apiRateLimit / 60; // per minute

  // This is a simplified example - in production use a proper rate limiter
  const key = `ratelimit:${clientId}`;
  const currentCount = 1; // Would track actual count in Redis/external store

  if (currentCount > maxRequests) {
    return new Response(JSON.stringify({
      error: "Rate limit exceeded",
      limit: maxRequests,
      windowMs,
      retryAfter: Math.ceil(windowMs / 1000),
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": maxRequests.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": (now + windowMs).toString(),
        "Retry-After": Math.ceil(windowMs / 1000).toString(),
      },
    });
  }

  // Add rate limit headers
  req.headers.set("X-RateLimit-Limit", maxRequests.toString());
  req.headers.set("X-RateLimit-Remaining", (maxRequests - currentCount).toString());
  req.headers.set("X-RateLimit-Reset", (now + windowMs).toString());

  return req;
}

/**
 * Feature flag middleware - blocks access to disabled features
 */
export function featureFlagMiddleware(feature: string) {
  return (req: Request): Request | Response => {
    const context = getScopeContext();

    if (!context.features || !context.features[feature as keyof typeof context.features]) {
      return new Response(JSON.stringify({
        error: "Feature not available",
        feature,
        reason: `Feature '${feature}' is not enabled for scope '${context.detectedScope}'`,
        scope: context.detectedScope,
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-DuoPlus-Feature": feature,
          "X-DuoPlus-Feature-Enabled": "false",
        },
      });
    }

    req.headers.set("X-DuoPlus-Feature", feature);
    req.headers.set("X-DuoPlus-Feature-Enabled", "true");

    return req;
  };
}

/**
 * Integration middleware - validates integration access
 */
export function integrationMiddleware(integration: string) {
  return (req: Request): Request | Response => {
    const context = getScopeContext();

    if (!context.integrations || !context.integrations[integration as keyof typeof context.integrations]) {
      return new Response(JSON.stringify({
        error: "Integration not available",
        integration,
        reason: `Integration '${integration}' is not enabled for scope '${context.detectedScope}'`,
        scope: context.detectedScope,
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-DuoPlus-Integration": integration,
          "X-DuoPlus-Integration-Enabled": "false",
        },
      });
    }

    req.headers.set("X-DuoPlus-Integration", integration);
    req.headers.set("X-DuoPlus-Integration-Enabled", "true");

    return req;
  };
}