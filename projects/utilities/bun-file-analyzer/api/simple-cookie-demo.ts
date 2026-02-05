// Simple Bun Cookie API Demo
// Based on https://bun.com/docs/runtime/http/cookies

const server = Bun.serve({
  port: 3006,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log(`🍪 ${req.method} ${path}`);
    
    // Reading cookies (per Bun docs)
    if (path === "/profile") {
      const userId = req.cookies.get("user_id");
      const theme = req.cookies.get("theme") || "light";
      const sessionId = req.cookies.get("sessionId");
      
      return Response.json({
        userId,
        theme,
        sessionId,
        message: "Profile page - using Bun's official cookie API",
        timestamp: new Date().toISOString(),
      });
    }

    // Setting cookies (per Bun docs)
    if (path === "/login") {
      const cookies = req.cookies;
      
      // Set a cookie with various options using Bun's CookieMap
      cookies.set("user_id", "12345", {
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: true,
        path: "/",
      });
      
      // Add a theme preference cookie
      cookies.set("theme", "dark", {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      
      // Add session cookie
      cookies.set("sessionId", crypto.randomUUID(), {
        maxAge: 60 * 60 * 2, // 2 hours
        httpOnly: true,
        secure: true,
        path: "/",
        sameSite: "strict",
      });
      
      return new Response("Login successful - cookies set using Bun's CookieMap");
    }

    // Deleting cookies (per Bun docs)
    if (path === "/logout") {
      req.cookies.delete("user_id", { path: "/" });
      req.cookies.delete("theme", { path: "/" });
      req.cookies.delete("sessionId", { path: "/" });
      
      return new Response("Logged out successfully - cookies deleted using Bun's API");
    }

    // Cookie management demo
    if (path === "/cookie-demo") {
      const cookies = req.cookies;
      const action = url.searchParams.get("action") || "read";
      
      switch (action) {
        case "set":
          cookies.set("demo_cookie", `demo_value_${Date.now()}`, {
            maxAge: 60 * 60, // 1 hour
            httpOnly: false,
            path: "/",
          });
          return Response.json({ message: "Demo cookie set", cookie: "demo_cookie" });
          
        case "delete":
          cookies.delete("demo_cookie");
          return Response.json({ message: "Demo cookie deleted" });
          
        case "read":
        default:
          const demoCookie = cookies.get("demo_cookie");
          const allCookies = {};
          
          // Read all cookies using Bun's CookieMap
          for (const [name, value] of cookies) {
            allCookies[name] = value;
          }
          
          return Response.json({
            demoCookie,
            allCookies,
            count: cookies.size,
            message: "All cookies read using Bun's CookieMap",
          });
      }
    }

    // Show CookieMap features
    if (path === "/cookie-map-demo") {
      const cookies = req.cookies;
      
      // Demonstrate CookieMap methods
      const features = {
        size: cookies.size,
        hasUserId: cookies.has("user_id"),
        hasTheme: cookies.has("theme"),
        keys: Array.from(cookies.keys()),
        values: Array.from(cookies.values()),
        entries: Array.from(cookies.entries()),
      };
      
      // Set a test cookie
      cookies.set("test_cookie", "test_value", {
        maxAge: 60, // 1 minute
        path: "/",
      });
      
      return Response.json({
        features,
        message: "Bun CookieMap API demonstration",
        timestamp: new Date().toISOString(),
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`🍪 Bun Cookie API Demo server starting on http://localhost:${server.port}`);
console.log(`📖 Based on: https://bun.com/docs/runtime/http/cookies`);
console.log("");
console.log("Available endpoints:");
console.log("  GET  /profile          - Read cookies");
console.log("  POST /login           - Set cookies");
console.log("  POST /logout          - Delete cookies");
console.log("  GET  /cookie-demo      - Cookie management demo");
console.log("  GET  /cookie-map-demo  - CookieMap features");
console.log("");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Cookie Demo server...");
  server.stop();
  process.exit(0);
});
