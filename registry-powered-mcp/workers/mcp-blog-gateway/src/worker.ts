/**
 * MCP Blog Gateway Worker
 * Hardened R2 proxy with security headers and caching
 *
 * Golden Matrix Entry:
 * | Infrastructure ID | Logic Tier | Resource Tax | Status |
 * |:------------------|:-----------|:-------------|:-------|
 * | **Blog-Gateway-ORD01** | **Level 1: CDN** | `CPU: <1ms` | **ACTIVE** |
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  ENVIRONMENT?: string;
  CACHE_TTL?: string;
}

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Security headers for all responses
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self';",
  "X-MCP-Gateway": "ord01",
  "X-MCP-Version": "2.4.1",
};

// Cache control by content type
const CACHE_CONTROL: Record<string, string> = {
  ".html": "public, max-age=300, s-maxage=3600",      // 5 min browser, 1 hr edge
  ".xml": "public, max-age=300, s-maxage=3600",       // RSS feed
  ".css": "public, max-age=31536000, immutable",      // 1 year (hashed filenames)
  ".js": "public, max-age=31536000, immutable",       // 1 year (hashed filenames)
  ".png": "public, max-age=31536000, immutable",
  ".jpg": "public, max-age=31536000, immutable",
  ".svg": "public, max-age=31536000, immutable",
};

function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.substring(lastDot).toLowerCase();
}

function getMimeType(path: string): string {
  const ext = getExtension(path);
  return MIME_TYPES[ext] || "application/octet-stream";
}

function getCacheControl(path: string): string {
  const ext = getExtension(path);
  return CACHE_CONTROL[ext] || "public, max-age=3600";
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;

    // Health check endpoint
    if (path === "/health" || path === "/_health") {
      return new Response(JSON.stringify({
        status: "healthy",
        gateway: "mcp-blog-gateway-ord01",
        version: "2.4.1",
        timestamp: new Date().toISOString(),
      }), {
        headers: {
          "Content-Type": "application/json",
          ...SECURITY_HEADERS,
        },
      });
    }

    // Normalize path: /blog -> /blog/index.html
    if (path === "/" || path === "") {
      path = "/blog/index.html";
    } else if (path === "/blog" || path === "/blog/") {
      path = "/blog/index.html";
    } else if (!path.startsWith("/blog/")) {
      // Redirect non-blog paths to blog root
      path = `/blog${path}`;
    }

    // Directory index handling
    if (path.endsWith("/")) {
      path = `${path}index.html`;
    }

    // Remove leading slash for R2 key
    const key = path.startsWith("/") ? path.substring(1) : path;

    try {
      // Fetch from R2
      const object = await env.R2_BUCKET.get(key);

      if (!object) {
        // Try with .html extension for clean URLs
        const htmlKey = key.endsWith(".html") ? key : `${key}.html`;
        const htmlObject = await env.R2_BUCKET.get(htmlKey);

        if (htmlObject) {
          return buildResponse(htmlObject, htmlKey);
        }

        // 404 response
        return new Response(
          `<!DOCTYPE html>
<html>
<head><title>404 - Not Found</title></head>
<body>
<h1>404 - Page Not Found</h1>
<p>The requested resource was not found.</p>
<p><a href="/blog/">Return to Blog</a></p>
</body>
</html>`,
          {
            status: 404,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              ...SECURITY_HEADERS,
            },
          }
        );
      }

      return buildResponse(object, key);
    } catch (error) {
      console.error("R2 fetch error:", error);
      return new Response("Internal Server Error", {
        status: 500,
        headers: SECURITY_HEADERS,
      });
    }

    function buildResponse(object: R2ObjectBody, key: string): Response {
      const headers = new Headers();

      // Content headers
      headers.set("Content-Type", getMimeType(key));
      headers.set("Cache-Control", getCacheControl(key));

      // ETag for conditional requests
      if (object.etag) {
        headers.set("ETag", object.etag);
      }

      // Last-Modified
      if (object.uploaded) {
        headers.set("Last-Modified", object.uploaded.toUTCString());
      }

      // Security headers
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        headers.set(name, value);
      }

      // CORS for RSS feed
      if (key.endsWith(".xml")) {
        headers.set("Access-Control-Allow-Origin", "*");
      }

      return new Response(object.body, {
        status: 200,
        headers,
      });
    }
  },
};
