import { validateAllHeaders, HEADERS } from "./validator";
import { dnsCache } from "./dns";
import { PROXY_CONFIG } from "../config";

// ============================================
// PROXY HANDLER
// ============================================

export async function handleProxyConnect(req: Request): Promise<Response> {
  const start = nanoseconds();
  
  // 1. Validate CONNECT method
  if (req.method !== "CONNECT") {
    return errorResponse(405, "Method Not Allowed", "Only CONNECT method is allowed");
  }
  
  // 2. Extract target from URL
  const target = req.headers.get("Host") || new URL(req.url).hostname;
  if (!target) {
    return errorResponse(400, "Bad Request", "Missing target host");
  }
  
  // 3. Validate headers
  const validation = validateAllHeaders(req.headers);
  
  if (validation.invalid > 0) {
    const errors = Object.entries(validation.results)
      .filter(([_, result]) => !result.valid)
      .map(([header, result]) => `${header}: ${(result as any).error.message}`)
      .join("\n");
    
    console.error(`[proxy] Header validation failed: ${validation.invalid} errors`);
    
    return errorResponse(400, "Invalid Headers", errors);
  }
  
  // 4. Check required headers
  const missing = checkRequiredHeaders(req.headers);
  if (missing.length > 0) {
    return errorResponse(400, "Missing Headers", `Required: ${missing.join(", ")}`);
  }
  
  // 5. Verify domain
  const domain = req.headers.get(HEADERS.DOMAIN);
  if (!PROXY_CONFIG.allowedDomains.includes(domain as any)) {
    return errorResponse(403, "Forbidden", `Domain not allowed: ${domain}`);
  }
  
  // 6. Resolve target via DNS cache
  let targetIp: string;
  try {
    targetIp = await dnsCache.resolve(target);
  } catch (error) {
    return errorResponse(502, "Bad Gateway", `DNS resolution failed: ${error}`);
  }
  
  // 7. Log successful validation
  console.log(`[proxy] CONNECT validated: ${target} -> ${targetIp}`);
  
  // 8. Return success response
  return new Response(null, {
    status: 200,
    headers: {
      "X-Proxy-Status": "connected",
      "X-Target": targetIp,
      "X-Validation-Time": `${validation.totalDuration}ns`,
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function checkRequiredHeaders(headers: Headers): string[] {
  const required = [
    HEADERS.CONFIG_VERSION,
    HEADERS.REGISTRY_HASH,
    HEADERS.FEATURE_FLAGS,
    HEADERS.DOMAIN,
  ];
  
  if (PROXY_CONFIG.requireToken) {
    required.push(HEADERS.PROXY_TOKEN);
  }
  
  return required.filter(header => !headers.has(header));
}

function errorResponse(
  status: number,
  title: string,
  detail: string
): Response {
  console.log(`[proxy] Error ${status}: ${title} - ${detail}`);
  
  return new Response(
    JSON.stringify({
      error: {
        code: status,
        title,
        detail,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

function nanoseconds(): number {
  return process.hrtime.bigint() as unknown as number;
}

// ============================================
// PROXY SERVER
// ============================================

export async function startProxyServer(port = PROXY_CONFIG.port) {
  // Warm up DNS cache
  await dnsCache.warmup();
  
  // Start server
  const server = Bun.serve({
    port,
    async fetch(req) {
      // Handle CONNECT for proxy
      if (req.method === "CONNECT") {
        return handleProxyConnect(req);
      }
      
      // Handle health check
      if (req.url.endsWith("/health")) {
        const stats = dnsCache.getStats();
        return new Response(
          JSON.stringify({
            status: "healthy",
            uptime: process.uptime(),
            dns: stats,
            timestamp: new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Default response
      return new Response("Bun Proxy Server\n\nUse CONNECT method for proxying", {
        headers: { "Content-Type": "text/plain" },
      });
    },
  });
  
  console.log(`[proxy] Server started on port ${server.port}`);
  
  return server;
}
