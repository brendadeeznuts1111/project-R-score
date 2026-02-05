// bun-serve-development-demo.ts - Complete Bun.serve() development configuration demo

console.log("🎯 Bun.serve() Development Configuration Demo");
console.log("============================================");

import { serve } from "bun";

// 1. Basic development server with HMR and console logging
console.log("\n📋 1. Basic Development Server Setup:");
const basicDevServer = serve({
  development: {
    // Enable Hot Module Reloading
    hmr: true,

    // Echo console logs from the browser to the terminal
    console: true,
  },

  routes: {
    "/": new Response(
      "<h1>Basic Dev Server</h1><script>console.log('Hello from browser!');</script>",
      {
        headers: { "Content-Type": "text/html" },
      }
    ),
  },

  port: 3000,
});

console.log("✅ Basic dev server running on http://localhost:3000");
console.log("📝 Features: HMR enabled, Browser console → Terminal");

// 2. Advanced development configuration
console.log("\n🔧 2. Advanced Development Configuration:");
const advancedDevServer = serve({
  development: {
    hmr: true,
    console: true,
  },

  routes: {
    "/": new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Advanced Dev Server</title>
      </head>
      <body>
        <h1>Advanced Development Server</h1>
        <div id="app"></div>
        <script>
          console.log('🚀 Page loaded');
          console.log('📊 Performance:', performance.now());

          // Test different console methods
          console.info('ℹ️ Info message');
          console.warn('⚠️ Warning message');
          console.error('❌ Error message');
          console.debug('🐛 Debug message');

          // Test object logging
          const user = { name: 'Alice', age: 30, score: 95.5 };
          console.log('👤 User data:', user);

          // Test array logging
          const numbers = [1, 2, 3, 4, 5];
          console.log('🔢 Numbers:', numbers);

          // Test error logging
          try {
            throw new Error('Test error for console logging');
          } catch (error) {
            console.error('💥 Caught error:', error);
          }

          // Test performance logging
          console.time('Timer Test');
          setTimeout(() => {
            console.timeEnd('Timer Test');
            console.log('⏱️ Timer completed');
          }, 1000);
        </script>
      </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      }
    ),

    "/api/data": new Response(
      JSON.stringify({
        message: "Development API response",
        timestamp: new Date().toISOString(),
        features: ["HMR", "Console Logging", "Hot Reloading"],
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    ),
  },

  port: 3001,
});

console.log("✅ Advanced dev server running on http://localhost:3001");
console.log("📝 Features: HMR, Console logging, API endpoints");

// 3. Production mode configuration
console.log("\n🏭 3. Production Mode Configuration:");
const productionServer = serve({
  development: false, // Production mode

  routes: {
    "/": new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production Server</title>
      </head>
      <body>
        <h1>Production Server</h1>
        <p>Development features disabled</p>
        <script>
          console.log('🏭 Production mode - no HMR, no console forwarding');
        </script>
      </body>
      </html>
    `,
      {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=31536000", // Production caching
        },
      }
    ),
  },

  port: 3002,
});

console.log("✅ Production server running on http://localhost:3002");
console.log("📝 Features: Production mode, caching, minification");

// 4. Development vs Production comparison
console.log("\n📊 4. Development vs Production Comparison:");

const comparisonTable = [
  ["Feature", "Development", "Production"],
  ["Source maps", "✅ Enabled", "❌ Disabled"],
  ["Minification", "❌ Disabled", "✅ Enabled"],
  ["Hot reloading", "✅ Enabled", "❌ Disabled"],
  ["Asset bundling", "🔄 On each request", "💾 Cached"],
  ["Console logging", "🖥️ Browser → Terminal", "❌ Disabled"],
  ["Error details", "📝 Detailed", "🔒 Minimal"],
  ["Cache headers", "❌ Disabled", "✅ Enabled"],
  ["Performance", "🐢 Slower", "🚀 Faster"],
];

console.log("\n📋 Feature Comparison:");
comparisonTable.forEach((row) => {
  console.log(row.map((cell) => cell.padEnd(25)).join(" | "));
});

// 5. Demonstrate console.log forwarding
console.log("\n🖥️ 5. Console Log Forwarding Demonstration:");
console.log("When console: true is set in development mode:");
console.log("• Browser console.log() → Terminal output");
console.log("• Uses existing WebSocket connection from HMR");
console.log("• Supports all console methods (log, info, warn, error, debug)");
console.log("• Forwards objects, arrays, and errors");
console.log("• Maintains stack traces and formatting");

// 6. Hot Module Reloading demonstration
console.log("\n🔄 6. Hot Module Reloading Demonstration:");
console.log("When hmr: true is set in development mode:");
console.log("• Automatically reloads browser on file changes");
console.log("• Preserves application state during reloads");
console.log("• Works with TypeScript, JavaScript, CSS, and HTML");
console.log("• Uses WebSocket connection for live updates");

// 7. Asset bundling demonstration
console.log("\n📦 7. Asset Bundling Demonstration:");
console.log("Development mode:");
console.log("• Bundles assets on each request");
console.log("• No caching for rapid iteration");
console.log("• Source maps enabled for debugging");

console.log("\nProduction mode:");
console.log("• Bundles assets once and caches in memory");
console.log("• Enables Cache-Control and ETag headers");
console.log("• Minifies JavaScript/TypeScript/TSX/JSX files");

// 8. Error handling comparison
console.log("\n❌ 8. Error Handling Comparison:");
console.log("Development mode:");
console.log("• Detailed error messages");
console.log("• Full stack traces");
console.log("• Source file references");
console.log("• Interactive error pages");

console.log("\nProduction mode:");
console.log("• Minimal error details");
console.log("• Generic error messages");
console.log("• No source file exposure");
console.log("• Secure error handling");

// 9. Performance comparison
console.log("\n⚡ 9. Performance Comparison:");
console.log("Development mode:");
console.log("• Slower initial load");
console.log("• No asset caching");
console.log("• Source map overhead");
console.log("• HMR WebSocket connection");

console.log("\nProduction mode:");
console.log("• Faster initial load");
console.log("• Asset caching enabled");
console.log("• Minified code");
console.log("• No development overhead");

// 10. Configuration examples
console.log("\n🔧 10. Configuration Examples:");

console.log("\n📝 Development Configuration:");
console.log(`
serve({
  development: {
    hmr: true,      // Hot Module Reloading
    console: true,  // Browser console → Terminal
  },
  routes: { "/": homepage },
  port: 3000,
});
`);

console.log("\n🏭 Production Configuration:");
console.log(`
serve({
  development: false,  // Production mode
  routes: { "/": homepage },
  port: 3000,
});
`);

console.log("\n⚙️ Mixed Configuration:");
console.log(`
serve({
  development: {
    hmr: false,     // Disable HMR
    console: true,  // Keep console logging
  },
  routes: { "/": homepage },
  port: 3000,
});
`);

// 11. Best practices
console.log("\n🎯 11. Best Practices:");
console.log("✅ Development:");
console.log("  • Use hmr: true for rapid iteration");
console.log("  • Use console: true for debugging");
console.log("  • Keep development: true for dev environment");
console.log("  • Use source maps for debugging");

console.log("\n✅ Production:");
console.log("  • Set development: false for production");
console.log("  • Enable caching headers");
console.log("  • Use minified assets");
console.log("  • Disable console forwarding");

// 12. Environment detection
console.log("\n🌍 12. Environment Detection:");
const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

console.log(`Current environment: ${process.env.NODE_ENV || "development"}`);
console.log(`Is development: ${isDevelopment}`);
console.log(`Is production: ${isProduction}`);

const envBasedServer = serve({
  development: isDevelopment,
  routes: {
    "/": new Response(
      `
      <h1>Environment-based Server</h1>
      <p>Environment: ${process.env.NODE_ENV || "development"}</p>
      <p>Development mode: ${isDevelopment ? "enabled" : "disabled"}</p>
    `,
      {
        headers: { "Content-Type": "text/html" },
      }
    ),
  },
  port: 3003,
});

console.log("✅ Environment-based server running on http://localhost:3003");

// 13. Advanced features demonstration
console.log("\n🚀 13. Advanced Features:");
console.log("• WebSocket integration for HMR and console forwarding");
console.log("• Automatic asset bundling and caching");
console.log("• TypeScript and JSX support");
console.log("• CSS preprocessing and bundling");
console.log("• Static file serving with proper headers");

// 14. Monitoring and debugging
console.log("\n📊 14. Monitoring and Debugging:");
console.log("Development monitoring:");
console.log("• Console log forwarding");
console.log("• HMR connection status");
console.log("• Asset bundling logs");
console.log("• Error stack traces");

console.log("\nProduction monitoring:");
console.log("• Request logging");
console.log("• Performance metrics");
console.log("• Error tracking");
console.log("• Cache hit rates");

console.log("\n🎉 All servers are running!");
console.log("📋 Server URLs:");
console.log("  • Basic Dev: http://localhost:3000");
console.log("  • Advanced Dev: http://localhost:3001");
console.log("  • Production: http://localhost:3002");
console.log("  • Environment-based: http://localhost:3003");

console.log("\n🔧 Test console forwarding by visiting:");
console.log("  • http://localhost:3000 (basic)");
console.log("  • http://localhost:3001 (advanced with console tests)");

// Keep servers running
console.log("\n⏹️  Press Ctrl+C to stop all servers");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down servers...");
  basicDevServer.stop();
  advancedDevServer.stop();
  productionServer.stop();
  envBasedServer.stop();
  console.log("✅ All servers stopped");
  process.exit(0);
});
