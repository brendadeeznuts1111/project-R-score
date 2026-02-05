// api/server-simplified.ts
import { Bun, fetch as bunFetch, dns } from "bun";
import { Palette } from "../src/utils/colors";

const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV === "development";

// Prefetch and Preconnect external APIs at startup for optimal performance
dns.prefetch("api.searchprovider.com");
bunFetch.preconnect("https://api.searchprovider.com");

// Type definition for our route handlers
type RouteParams = URLPatternResult["pathname"]["groups"] | null;
type Handler = (req: Request, params: RouteParams) => Promise<Response>;

// Pre-compiled route structure for optimal performance
const compiledRoutes = Object.entries({
  "GET /api/users/:id": handleGetUser,
  "POST /api/users/:id": handleUpdateUser,
  "GET /api/files/*": handleFileWildcard,
  "/api/health": handleHealth,
  "GET /api/search": {
    pattern: new URLPattern({ pathname: "/api/search" }),
    handler: handleSearch,
  },
  "POST /api/upload": {
    pattern: new URLPattern({ pathname: "/api/upload" }),
    handler: handleUpload,
  },
  "GET /docs/*": {
    pattern: new URLPattern({ pathname: "/docs/*" }),
    handler: handleDocsWildcard,
  },
  "GET /assets/:category/*": {
    pattern: new URLPattern({ pathname: "/assets/:category/*" }),
    handler: handleAssetsWildcard,
  },
  "GET /files/:year/:month/*": {
    pattern: new URLPattern({ pathname: "/files/:year/:month/*" }),
    handler: handleDateFilesWildcard,
  },
}).map(([key, value]) => {
  const parts = key.split(" ");
  const method = parts.length === 2 ? parts[0] : null;
  const path = parts.length === 2 ? parts[1] : parts[0];

  return {
    method,
    pattern:
      value instanceof Function
        ? new URLPattern({ pathname: path })
        : (value as any).pattern,
    handler: value instanceof Function ? value : (value as any).handler,
  };
});

async function handleGetUser(req: Request, params: RouteParams) {
  const userId = params?.id || "unknown";
  return Response.json({ userId, method: "GET" });
}

async function handleUpdateUser(req: Request, params: RouteParams) {
  // FASTEST: Bun optimizes this internal buffering
  const data = await req.json(); 
  return Response.json({ success: true, userId: params?.id || "unknown", ...data });
}

async function handleFileWildcard(req: Request, params: RouteParams) {
  const path = params?.[0] || "index.txt";
  const file = Bun.file(`./assets/${path}`);

  // Check if file exists before serving
  if (!(await file.exists())) {
    return new Response("File not found", { status: 404 });
  }

  // Zero-copy file serving using sendfile syscall for files >32KB
  return new Response(file);
}

async function handleHealth(req: Request) {
  return Response.json({ status: "ok", timestamp: Date.now() });
}

async function handleSearch(req: Request, params: RouteParams) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");
  
  // Demonstrate verbose logging in development for external API calls
  if (IS_DEV && query) {
    try {
      const upstreamResponse = await fetch("https://api.searchprovider.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
        verbose: IS_DEV // Automatically logs request/response headers in dev
      });
      return upstreamResponse;
    } catch (error) {
      // Fallback to local search if external API fails
      return Response.json({ query, results: [`Local result for "${query}"`] });
    }
  }
  
  return Response.json({ query, results: [`Result for "${query}"`] });
}

async function handleUpload(req: Request, params: RouteParams) {
  // Using Bun's optimized .bytes() method for binary data
  const data = await req.bytes(); 
  console.log(`Received ${data.length} bytes`);
  
  return Response.json({ success: true, size: data.length });
}

// Wildcard pattern handlers
async function handleDocsWildcard(req: Request, params: URLPatternResult["pathname"]["groups"] | null): Promise<Response> {
  // For pattern "/docs/*", the wildcard is in groups[0]
  const docPath = params?.[0] || "index";
  return Response.json({ 
    type: "docs-wildcard", 
    document: docPath,
    fullUrl: req.url 
  });
}

async function handleAssetsWildcard(req: Request, params: URLPatternResult["pathname"]["groups"] | null): Promise<Response> {
  // For pattern "/assets/:category/*", groups = { category: "images", "0": "logo.png" }
  const category = params?.category || "unknown";
  const assetPath = params?.[0] || "file";
  return Response.json({ 
    type: "assets-wildcard",
    category,
    asset: assetPath,
    fullUrl: req.url
  });
}

async function handleDateFilesWildcard(req: Request, params: URLPatternResult["pathname"]["groups"] | null): Promise<Response> {
  // For pattern "/files/:year/:month/*", groups = { year: "2024", month: "01", "0": "report.pdf" }
  const year = params?.year || "unknown";
  const month = params?.month || "unknown";
  const filename = params?.[0] || "file";
  return Response.json({ 
    type: "date-files-wildcard",
    year,
    month,
    filename,
    fullUrl: req.url
  });
}

// Generic route matcher using the pre-compiled routes
function matchRoute(
  req: Request
): [Function, URLPatternResult["pathname"]["groups"] | null] {
  for (const route of compiledRoutes) {
    // 1. Check method match (if method is null, it's a wildcard method)
    if (route.method && route.method !== req.method) continue;

    // 2. Execute the pre-compiled URLPattern
    const match = route.pattern.exec(req.url);

    if (match) {
      return [route.handler, match.pathname.groups];
    }
  }

  // Fallback for 404
  return [() => new Response("Not Found", { status: 404 }), null];
}

// Bun.serve with URLPattern routing
export const server = Bun.serve({
  port: PORT,   
  
  async fetch(req: Request): Promise<Response> {
    const [handler, params] = matchRoute(req);
    
    try {
      // Execute the handler
      const response = await handler(req, params);
      
      // Determine the color
      const statusDigit = response.status.toString()[0];
      const statusColor = {
        "2": Palette.api.primary,   // 2xx
        "4": Palette.error.primary, // 4xx
        "5": Palette.security.primary, // 5xx
      }[statusDigit] || Palette.frontend.primary;

      // Convert to hex using Bun's utility
      const hexColor = Bun.color(statusColor, "hex")!;

      // Create a NEW response if headers are immutable, or simply use the existing one
      // Note: response.headers.set() usually works unless the response is already consumed
      try {
        response.headers.set("X-Status-Color", hexColor);
        return response;
      } catch (e) {
        // Fallback: If the response is immutable, clone it with the new header
        const newHeaders = new Headers(response.headers);
        newHeaders.set("X-Status-Color", hexColor);
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    } catch (error) {
      console.error("Handler Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(
  `%c🚀 URLPattern server at ${server.url}`, 
  `color: ${Bun.color("hsl(195, 85%, 55%)", "ansi")}` 
);
