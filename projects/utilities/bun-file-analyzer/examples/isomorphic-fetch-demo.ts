#!/usr/bin/env bun

/**
 * Isomorphic Fetch Demo - Showcasing Bun's Dual-Purpose fetch
 * 
 * This demo demonstrates:
 * 1. Bun's fetch for both incoming (server) and outgoing (client) requests
 * 2. Isomorphic code patterns that work on both client and server
 * 3. Custom fetch client wrappers with cookie management
 * 4. Elimination of external libraries like Axios
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.log("🔄 Isomorphic Fetch Demo - Bun's Dual-Purpose fetch");
console.log("=" .repeat(60));

// ====== 1. Client-Side fetch (Outgoing Requests) ======

console.log("\n📤 1. Client-Side fetch - Outgoing Requests");

// Create custom fetch client with cookie management
const client = createCookieClient({
  securityPolicy: {
    secure: false, // For localhost demo
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 // 1 hour
  },
  monitoring: {
    enabled: true,
    logLevel: 'info'
  },
  interceptors: {
    request: async (url, options) => {
      console.log(`🔍 Request interceptor: ${options.method || 'GET'} ${url}`);
      
      // Add custom headers
      const headers = new Headers(options.headers);
      headers.set('X-Client-Version', '1.0.0');
      headers.set('X-Request-ID', crypto.randomUUID());
      
      return {
        url,
        options: { ...options, headers }
      };
    },
    response: async (response, url) => {
      console.log(`📥 Response interceptor: ${response.status} ${url}`);
      
      // Add custom response processing
      if (response.ok) {
        const cloned = response.clone();
        const data = await cloned.json().catch(() => null);
        if (data && data.timestamp) {
          console.log(`⏰ Server timestamp: ${data.timestamp}`);
        }
      }
      
      return response;
    }
  }
});

// Demonstrate client.fetch() pattern
async function demonstrateClientFetch() {
  try {
    console.log("\n🌐 Making client-side API calls...");
    
    // Example 1: GET request with automatic cookie handling
    const healthResponse = await client.fetch("https://httpbin.org/get", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log("✅ GET request successful:", data.headers?.Host);
    }
    
    // Example 2: POST request with JSON payload
    const postResponse = await client.fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Hello from isomorphic fetch!",
        timestamp: new Date().toISOString()
      })
    });
    
    if (postResponse.ok) {
      const result = await postResponse.json();
      console.log("✅ POST request successful:", result.json?.message);
    }
    
    // Show client metrics
    console.log("\n📊 Client Metrics:");
    console.log(`- Average response time: ${client.getAverageResponseTime()}ms`);
    console.log(`- Success rate: ${client.getSuccessRate()}%`);
    console.log(`- Total requests: ${client.getMetrics().length}`);
    
  } catch (error) {
    console.error("❌ Client fetch error:", error);
  }
}

// ====== 2. Server-Side fetch (Incoming Request Handler) ======

console.log("\n📥 2. Server-Side fetch - Incoming Request Handler");

// Create isomorphic request handler that works with Bun.serve
function createIsomorphicHandler() {
  return async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    
    console.log(`🎯 Server handling: ${method} ${url.pathname}`);
    
    // CORS headers for isomorphic demo
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true"
    };
    
    // Handle preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Route: GET /api/health
      if (url.pathname === "/api/health" && method === "GET") {
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          server: "Bun.serve with isomorphic fetch",
          version: "1.0.0"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      // Route: POST /api/echo
      if (url.pathname === "/api/echo" && method === "POST") {
        const body = await req.json().catch(() => ({}));
        return new Response(JSON.stringify({
          echo: body,
          receivedAt: new Date().toISOString(),
          userAgent: req.headers.get("User-Agent"),
          contentType: req.headers.get("Content-Type")
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      // Route: GET /api/proxy - Demonstrates server making outgoing fetch
      if (url.pathname === "/api/proxy" && method === "GET") {
        console.log("🔄 Server making outgoing fetch request...");
        
        // Server uses same fetch pattern as client!
        const externalResponse = await fetch("https://httpbin.org/json", {
          headers: {
            "User-Agent": "Bun-Server/1.0.0"
          }
        });
        
        if (externalResponse.ok) {
          const data = await externalResponse.json();
          return new Response(JSON.stringify({
            proxied: data,
            proxyNote: "This data was fetched by the server using the same fetch API",
            serverTimestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        throw new Error("External fetch failed");
      }
      
      // Route: POST /api/auth/login - Demonstrates cookie management
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const credentials = await req.json().catch(() => ({}));
        
        if (credentials.username === "demo" && credentials.password === "demo123") {
          const response = new Response(JSON.stringify({
            success: true,
            user: { id: 1, name: "Demo User" },
            message: "Login successful"
          }), {
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json"
            }
          });
          
          // Set authentication cookie
          response.headers.set("Set-Cookie", 
            "auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.signature; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax"
          );
          
          return response;
        }
        
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid credentials"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      // Default 404
      return new Response(JSON.stringify({
        error: "Route not found",
        availableRoutes: [
          "GET /api/health",
          "POST /api/echo", 
          "GET /api/proxy",
          "POST /api/auth/login"
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("🔥 Server error:", error);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  };
}

// ====== 3. Server Setup ======

console.log("\n🚀 3. Starting Isomorphic Server");

let server: any;

if (typeof Bun !== 'undefined' && Bun.serve) {
  server = Bun.serve({
    port: 3009,
    hostname: "localhost",
    fetch: createIsomorphicHandler(),
    error(error: Error) {
      console.error("🔥 Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
  
  console.log(`✅ Server running at http://localhost:${server.port}`);
} else {
  console.log("⚠️  Bun.serve not available, skipping server creation");
}

// ====== 4. Demonstrate Isomorphic Patterns ======

console.log("\n🔄 4. Demonstrating Isomorphic Patterns");

async function demonstrateIsomorphicPatterns() {
  const baseUrl = server ? `http://localhost:${server.port}` : "http://localhost:3009";
  
  try {
    // Pattern 1: Same fetch API works on both client and server
    console.log("\n📋 Pattern 1: Unified fetch API");
    
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const health = await healthResponse.json();
    console.log("✅ Server health:", health.status);
    
    // Pattern 2: Custom client wrapper works server-side too
    console.log("\n📋 Pattern 2: Client wrapper server usage");
    
    const echoResponse = await client.fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Isomorphic pattern test!" })
    });
    
    if (echoResponse.ok) {
      const echo = await echoResponse.json();
      console.log("✅ Echo response:", echo.echo?.message);
    }
    
    // Pattern 3: Server-to-server communication
    console.log("\n📋 Pattern 3: Server-to-server fetch");
    
    const proxyResponse = await fetch(`${baseUrl}/api/proxy`);
    if (proxyResponse.ok) {
      const proxy = await proxyResponse.json();
      console.log("✅ Proxy data received:", proxy.proxyNote);
    }
    
    // Pattern 4: Authentication flow with cookies
    console.log("\n📋 Pattern 4: Cookie-based authentication");
    
    const loginResponse = await client.fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "demo", password: "demo123" })
    });
    
    if (loginResponse.ok) {
      const login = await loginResponse.json();
      console.log("✅ Login successful:", login.message);
      
      // Show stored cookies
      const cookies = client.getCookies();
      console.log("🍪 Stored cookies:", Object.keys(cookies));
    }
    
    console.log("\n🎉 Isomorphic patterns demonstration complete!");
    
  } catch (error) {
    console.error("❌ Demonstration error:", error);
  }
}

// ====== 5. Cleanup and Export ======

async function runDemo() {
  console.log("\n🎬 Starting Isomorphic Fetch Demo");
  
  // Run client-side demonstrations
  await demonstrateClientFetch();
  
  // Run isomorphic patterns
  await demonstrateIsomorphicPatterns();
  
  console.log("\n📈 Benefits of Isomorphic Fetch:");
  console.log("✅ Single API for client and server requests");
  console.log("✅ No need for external libraries like Axios");
  console.log("✅ Consistent error handling and interceptors");
  console.log("✅ Automatic cookie management across environments");
  console.log("✅ Type safety with TypeScript interfaces");
  console.log("✅ Reduced bundle size and dependencies");
  
  // Cleanup
  if (server && typeof server.stop === "function") {
    console.log("\n🛑 Shutting down server...");
    server.stop();
  }
}

// Start the demo
runDemo().catch(console.error);

// Export for external use
export { client, server, createIsomorphicHandler, runDemo };
