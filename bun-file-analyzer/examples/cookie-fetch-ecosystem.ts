#!/usr/bin/env bun

/**
 * Complete Cookie-Fetch Ecosystem Demo
 * Demonstrates Bun.CookieMap, createCookieClient, and Bun.serve working together
 */

import { log } from "../src/utils/logger";

// Type guard for Bun availability
declare const Bun: any | undefined;

// ====== 1. Bun.CookieMap - Manual Cookie Management ======

console.log("🍪 1. Bun.CookieMap - Manual Cookie Management");

// Create a CookieMap instance for manual cookie management
let cookieJar: any;
if (typeof Bun !== 'undefined' && Bun.CookieMap) {
  cookieJar = new Bun.CookieMap(new Request('https://api.example.com'), {});
} else {
  // Fallback for environments without Bun
  cookieJar = new Map();
  console.log("⚠️  Bun not available, using Map fallback");
}

// Manual cookie operations
if (typeof Bun !== 'undefined' && Bun.CookieMap && cookieJar.set) {
  cookieJar.set("session", "abc123", {
    domain: "localhost",
    path: "/",
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: false, // Set to false for localhost development
    sameSite: "strict",
  });
} else {
  // Map fallback
  (cookieJar as Map<string, string>).set("session", "abc123");
}

if (typeof Bun !== 'undefined' && Bun.CookieMap && cookieJar.set) {
  cookieJar.set("preferences", JSON.stringify({
    theme: "dark",
    language: "en",
    notifications: true
  }), {
    domain: "localhost",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
} else {
  // Map fallback
  (cookieJar as Map<string, string>).set("preferences", JSON.stringify({
    theme: "dark",
    language: "en",
    notifications: true
  }));
}

console.log("📊 Manual cookies set:", Object.fromEntries(cookieJar.entries()));

// Manual cookie retrieval
let sessionId: string | undefined;
let preferences: any;

if (typeof Bun !== 'undefined' && Bun.CookieMap && cookieJar.get) {
  sessionId = cookieJar.get("session");
  preferences = JSON.parse(cookieJar.get("preferences") || "{}");
} else {
  // Map fallback
  sessionId = (cookieJar as Map<string, string>).get("session");
  preferences = JSON.parse((cookieJar as Map<string, string>).get("preferences") || "{}");
}

console.log("🔍 Retrieved session:", sessionId);
console.log("🎨 Retrieved preferences:", preferences);

// ====== 2. createCookieClient - Automatic Cookie Management ======

console.log("\n🌐 2. createCookieClient - Automatic Cookie Management");

/**
 * Enhanced cookie client that integrates with Bun.CookieMap
 */
function createCookieClient(cookieMap: any) {
  return {
    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
      // Automatic cookie injection
      const cookieHeader = Array.from(cookieMap.entries())
        .map((entry: any) => {
          const [name, value] = entry;
          return `${name}=${value}`;
        })
        .join("; ");

      const headers = new Headers(options.headers);
      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
        console.log("🍪 Sending cookies:", cookieHeader);
      }

      // Add security headers
      headers.set("User-Agent", "Bun-Cookie-Client/1.0");
      headers.set("Accept", "application/json");

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: "include", // Still include for browser compatibility
        });

        // Automatic cookie extraction from Set-Cookie headers
        const setCookies = response.headers.getSetCookie?.() || [];
        for (const cookieHeader of setCookies) {
          let cookie;
          if (typeof Bun !== 'undefined' && Bun.Cookie) {
            cookie = Bun.Cookie.parse(cookieHeader);
          } else {
            // Simple fallback parsing
            const [nameValue] = cookieHeader.split(';');
            const [name, value] = nameValue.split('=');
            cookie = { name, value };
          }
          
          if (cookie.name && cookie.value) {
            if (typeof Bun !== 'undefined' && Bun.CookieMap && cookieJar.set) {
              cookieJar.set(cookie.name, cookie.value, {
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                sameSite: cookie.sameSite,
              });
            } else {
              // Map fallback
              (cookieJar as Map<string, string>).set(cookie.name, cookie.value);
            }
            console.log("✅ Stored cookie:", cookie.name, "=", cookie.value);
          }
        }

        return response;

      } catch (error) {
        console.error("❌ Fetch error:", (error as Error).message);
        throw error;
      }
    },

    // Manual cookie management methods
    setCookie(name: string, value: string, options?: any) {
      cookieMap.set(name, value, options);
      console.log("🔧 Manual cookie set:", name, "=", value);
    },

    getCookies() {
      return Object.fromEntries(cookieMap.entries());
    },

    clearCookies() {
      cookieMap.clear();
      console.log("🧹 All cookies cleared");
    },

    // Cookie inspection
    inspectCookies() {
      console.log("🔍 Current cookie jar:");
      for (const [name, value] of cookieMap.entries()) {
        console.log(`  ${name}: ${value}`);
      }
    }
  };
}

// Create cookie client with our cookie jar
const cookieClient = createCookieClient(cookieJar);

// ====== 3. Bun.serve - Server Implementation ======

console.log("\n🚀 3. Bun.serve - Server Implementation");

// Server that works with our cookie client
let server: any;
if (typeof Bun !== 'undefined' && Bun.serve) {
  server = Bun.serve({
    port: 3008,
    hostname: "localhost",
    
    fetch(req: Request) {
      const url = new URL(req.url);
      const method = req.method;
      
      console.log(`\n📡 ${method} ${url.pathname}`);
      
      // CORS headers for development
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        "Access-Control-Allow-Credentials": "true",
      };

      // Handle preflight requests
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      try {
        // ==== API Routes ====
        
        if (url.pathname === "/api/auth/login" && method === "POST") {
          return handleLogin(req, corsHeaders);
        }
        
        if (url.pathname === "/api/user/profile" && method === "GET") {
          return handleProfile(req, corsHeaders);
        }
        
        if (url.pathname === "/api/user/preferences" && method === "GET") {
          return handlePreferences(req, corsHeaders);
        }
        
        if (url.pathname === "/api/user/preferences" && method === "POST") {
          return handleUpdatePreferences(req, corsHeaders);
        }
        
        if (url.pathname === "/api/auth/logout" && method === "POST") {
          return handleLogout(req, corsHeaders);
        }
        
        if (url.pathname === "/api/health" && method === "GET") {
          return new Response(JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            server: "Bun.serve with CookieMap",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        // Default 404
        return new Response(JSON.stringify({
          error: "Route not found",
          availableRoutes: [
            "POST /api/auth/login",
            "GET /api/user/profile",
            "GET/POST /api/user/preferences",
            "POST /api/auth/logout",
            "GET /api/health"
          ]
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error("🔥 Server error:", (error as Error).message);
        return new Response(JSON.stringify({
          error: "Internal server error",
          message: (error as Error).message
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    },
    
    error(error: Error) {
      console.error("🔥 Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
} else {
  console.log("⚠️  Bun.serve not available, skipping server creation");
}

// Server route handlers
function handleLogin(req: Request, corsHeaders: Record<string, string>): Response {
  // Simulate authentication
  const response = new Response(JSON.stringify({
    success: true,
    user: {
      id: "user-123",
      name: "Demo User",
      email: "demo@example.com",
      role: "authenticated"
    },
    message: "Login successful"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  
  // Set session cookie
  response.headers.set("Set-Cookie", 
    "session=authenticated-session-456; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict"
  );
  
  // Set preferences cookie
  response.headers.set("Set-Cookie", 
    "preferences={\"theme\":\"light\",\"notifications\":true}; Path=/; Max-Age=2592000"
  );
  
  console.log("🔐 Login successful - session cookies set");
  return response;
}

function handleProfile(req: Request, corsHeaders: Record<string, string>): Response {
  // Check session cookie
  const cookieHeader = req.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  const session = cookies.session;
  
  if (!session || session !== "authenticated-session-456") {
    return new Response(JSON.stringify({
      error: "Authentication required",
      message: "Please login first"
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  return new Response(JSON.stringify({
    user: {
      id: "user-123",
      name: "Demo User",
      email: "demo@example.com",
      role: "authenticated",
      lastLogin: new Date().toISOString()
    },
    session: session.substring(0, 20) + "..." // Partial session for security
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function handlePreferences(req: Request, corsHeaders: Record<string, string>): Response {
  const cookieHeader = req.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  try {
    const preferences = JSON.parse(cookies.preferences || "{}");
    
    return new Response(JSON.stringify({
      preferences: {
        theme: preferences.theme || "light",
        notifications: preferences.notifications !== false,
        language: preferences.language || "en"
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      preferences: {
        theme: "light",
        notifications: true,
        language: "en"
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

function handleUpdatePreferences(req: Request, corsHeaders: Record<string, string>): Response {
  const cookieHeader = req.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  const session = cookies.session;
  
  if (!session || session !== "authenticated-session-456") {
    return new Response(JSON.stringify({
      error: "Authentication required"
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  // Get new preferences from request body
  let newPreferences;
  try {
    newPreferences = req.json();
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Invalid JSON in request body"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  const response = new Response(JSON.stringify({
    success: true,
    preferences: newPreferences
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  
  // Update preferences cookie
  response.headers.set("Set-Cookie", 
    `preferences=${JSON.stringify(newPreferences)}; Path=/; Max-Age=2592000`
  );
  
  return response;
}

function handleLogout(req: Request, corsHeaders: Record<string, string>): Response {
  const response = new Response(JSON.stringify({
    success: true,
    message: "Logged out successfully"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  
  // Clear cookies
  response.headers.set("Set-Cookie", "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  response.headers.set("Set-Cookie", "preferences=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  
  return response;
}

// ====== 4. Demonstration Functions ======

console.log("\n🎯 4. Running Ecosystem Demo");

async function demonstrateEcosystem() {
  const baseUrl = "http://localhost:3008";
  
  console.log(`🌐 Server running at ${baseUrl}`);
  console.log("🍪 Cookie jar initialized with manual cookies");
  
  try {
    // Step 1: Health check
    console.log("\n📋 Step 1: Health Check");
    const healthResponse = await cookieClient.fetch(`${baseUrl}/api/health`);
    const health = await healthResponse.json();
    console.log("✅ Health check:", health);
    
    // Step 2: Login (will receive new cookies from server)
    console.log("\n🔐 Step 2: Login");
    const loginResponse = await cookieClient.fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "demo", password: "demo123" })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log("✅ Login successful:", loginData);
      cookieClient.inspectCookies();
    }
    
    // Step 3: Access protected profile (uses cookies automatically)
    console.log("\n👤 Step 3: Access Protected Profile");
    const profileResponse = await cookieClient.fetch(`${baseUrl}/api/user/profile`);
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log("✅ Profile retrieved:", profile);
    } else {
      console.log("❌ Profile access failed:", await profileResponse.json());
    }
    
    // Step 4: Get preferences (uses cookies automatically)
    console.log("\n⚙️ Step 4: Get User Preferences");
    const prefsResponse = await cookieClient.fetch(`${baseUrl}/api/user/preferences`);
    
    if (prefsResponse.ok) {
      const prefs = await prefsResponse.json();
      console.log("✅ Preferences retrieved:", prefs);
    }
    
    // Step 5: Update preferences
    console.log("\n🔧 Step 5: Update Preferences");
    const updateResponse = await cookieClient.fetch(`${baseUrl}/api/user/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: "dark",
        notifications: false,
        language: "es"
      })
    });
    
    if (updateResponse.ok) {
      const updatedPrefs = await updateResponse.json();
      console.log("✅ Preferences updated:", updatedPrefs);
      cookieClient.inspectCookies();
    }
    
    // Step 6: Logout (clears cookies)
    console.log("\n🚪 Step 6: Logout");
    const logoutResponse = await cookieClient.fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST"
    });
    
    if (logoutResponse.ok) {
      const logoutData = await logoutResponse.json();
      console.log("✅ Logout successful:", logoutData);
      cookieClient.inspectCookies();
    }
    
    // Step 7: Try to access profile after logout (should fail)
    console.log("\n🚫 Step 7: Access Profile After Logout (Should Fail)");
    const postLogoutProfile = await cookieClient.fetch(`${baseUrl}/api/user/profile`);
    
    if (!postLogoutProfile.ok) {
      const error = await postLogoutProfile.json();
      console.log("✅ Correctly denied access:", error);
    }
    
  } catch (error) {
    console.error("❌ Demo error:", (error as Error).message);
  }
}

// ====== 5. Start Demo ======

console.log("\n🚀 Starting Cookie-Fetch Ecosystem Demo");
console.log("=" .repeat(60));

// Start the demonstration
demonstrateEcosystem().then(() => {
  console.log("\n✅ Demo completed successfully!");
}).catch((error) => {
  console.error("\n❌ Demo failed:", error);
}).finally(() => {
  console.log("\n🛑 Shutting down server...");
  if (server && typeof server.stop === "function") {
    server.stop();
  }
});

// Export for external use
export { cookieClient, server, demonstrateEcosystem };
