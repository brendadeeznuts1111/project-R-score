// bun-serve-development-demo.ts - Complete Bun.serve() development configuration demo

console.info("🎯 Bun.serve() Development Configuration Demo");
console.info("============================================");

import { serve } from "bun";

// 1. Basic development server with HMR and console logging
console.info("\n📋 1. Basic Development Server Setup:");
const basicDevServer = serve({
  development: {
    // Enable Hot Module Reloading
    hmr: true,

    // Echo console logs from the browser to the terminal
    console: true,
  },

  routes: {
    "/": new Response(
      "<h1>Basic Dev Server</h1><script>console.info('Hello from browser!');</script>",
      {
        headers: { "Content-Type": "text/html" },
      }
    ),
  },

  port: 3000,
});

console.info("✅ Basic dev server running on http://localhost:3000");
console.info("📝 Features: HMR enabled, Browser console → Terminal");

// 2. Advanced development configuration
console.info("\n🔧 2. Advanced Development Configuration:");
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
          console.info('🚀 Page loaded');
          console.info('📊 Performance:', performance.now());

          // Test different console methods
          console.info('ℹ️ Info message');
          console.warn('⚠️ Warning message');
          console.error('❌ Error message');
          console.debug('🐛 Debug message');

          // Test object logging
          const user = { name: 'Alice', age: 30, score: 95.5 };
          console.info('👤 User data:', user);

          // Test array logging
          const numbers = [1, 2, 3, 4, 5];
          console.info('🔢 Numbers:', numbers);

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
            console.info('⏱️ Timer completed');
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

console.info("✅ Advanced dev server running on http://localhost:3001");
console.info("📝 Features: HMR, Console logging, API endpoints");

// 3. Production mode configuration
console.info("\n🏭 3. Production Mode Configuration:");
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
          console.info('🏭 Production mode - no HMR, no console forwarding');
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

console.info("✅ Production server running on http://localhost:3002");
console.info("📝 Features: Production mode, caching, minification");

// 4. Development vs Production comparison
console.info("\n📊 4. Development vs Production Comparison:");

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

console.info("\n📋 Feature Comparison:");
comparisonTable.forEach((row) => {
  console.info(row.map((cell) => cell.padEnd(25)).join(" | "));
});

// 5. Demonstrate console.log forwarding
console.info("\n🖥️ 5. Console Log Forwarding Demonstration:");
console.info("When console: true is set in development mode:");
console.info("• Browser console.info() → Terminal output");
console.info("• Uses existing WebSocket connection from HMR");
console.info("• Supports all console methods (log, info, warn, error, debug)");
console.info("• Forwards objects, arrays, and errors");
console.info("• Maintains stack traces and formatting");

// 6. Hot Module Reloading demonstration
console.info("\n🔄 6. Hot Module Reloading Demonstration:");
console.info("When hmr: true is set in development mode:");
console.info("• Automatically reloads browser on file changes");
console.info("• Preserves application state during reloads");
console.info("• Works with TypeScript, JavaScript, CSS, and HTML");
console.info("• Uses WebSocket connection for live updates");

// 7. Asset bundling demonstration
console.info("\n📦 7. Asset Bundling Demonstration:");
console.info("Development mode:");
console.info("• Bundles assets on each request");
console.info("• No caching for rapid iteration");
console.info("• Source maps enabled for debugging");

console.info("\nProduction mode:");
console.info("• Bundles assets once and caches in memory");
console.info("• Enables Cache-Control and ETag headers");
console.info("• Minifies JavaScript/TypeScript/TSX/JSX files");

// 8. Error handling comparison
console.info("\n❌ 8. Error Handling Comparison:");
console.info("Development mode:");
console.info("• Detailed error messages");
console.info("• Full stack traces");
console.info("• Source file references");
console.info("• Interactive error pages");

console.info("\nProduction mode:");
console.info("• Minimal error details");
console.info("• Generic error messages");
console.info("• No source file exposure");
console.info("• Secure error handling");

// 9. Performance comparison
console.info("\n⚡ 9. Performance Comparison:");
console.info("Development mode:");
console.info("• Slower initial load");
console.info("• No asset caching");
console.info("• Source map overhead");
console.info("• HMR WebSocket connection");

console.info("\nProduction mode:");
console.info("• Faster initial load");
console.info("• Asset caching enabled");
console.info("• Minified code");
console.info("• No development overhead");

// 10. Configuration examples
console.info("\n🔧 10. Configuration Examples:");

console.info("\n📝 Development Configuration:");
console.info(`
serve({
  development: {
    hmr: true,      // Hot Module Reloading
    console: true,  // Browser console → Terminal
  },
  routes: { "/": homepage },
  port: 3000,
});
`);

console.info("\n🏭 Production Configuration:");
console.info(`
serve({
  development: false,  // Production mode
  routes: { "/": homepage },
  port: 3000,
});
`);

console.info("\n⚙️ Mixed Configuration:");
console.info(`
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
console.info("\n🎯 11. Best Practices:");
console.info("✅ Development:");
console.info("  • Use hmr: true for rapid iteration");
console.info("  • Use console: true for debugging");
console.info("  • Keep development: true for dev environment");
console.info("  • Use source maps for debugging");

console.info("\n✅ Production:");
console.info("  • Set development: false for production");
console.info("  • Enable caching headers");
console.info("  • Use minified assets");
console.info("  • Disable console forwarding");

// 12. Environment detection
console.info("\n🌍 12. Environment Detection:");
const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

console.info(`Current environment: ${process.env.NODE_ENV || "development"}`);
console.info(`Is development: ${isDevelopment}`);
console.info(`Is production: ${isProduction}`);

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

console.info("✅ Environment-based server running on http://localhost:3003");

// 13. Advanced features demonstration
console.info("\n🚀 13. Advanced Features:");
console.info("• WebSocket integration for HMR and console forwarding");
console.info("• Automatic asset bundling and caching");
console.info("• TypeScript and JSX support");
console.info("• CSS preprocessing and bundling");
console.info("• Static file serving with proper headers");

// 14. Monitoring and debugging
console.info("\n📊 14. Monitoring and Debugging:");
console.info("Development monitoring:");
console.info("• Console log forwarding");
console.info("• HMR connection status");
console.info("• Asset bundling logs");
console.info("• Error stack traces");

console.info("\nProduction monitoring:");
console.info("• Request logging");
console.info("• Performance metrics");
console.info("• Error tracking");
console.info("• Cache hit rates");

console.info("\n🎉 All servers are running!");
console.info("📋 Server URLs:");
console.info("  • Basic Dev: http://localhost:3000");
console.info("  • Advanced Dev: http://localhost:3001");
console.info("  • Production: http://localhost:3002");
console.info("  • Environment-based: http://localhost:3003");

console.info("\n🔧 Test console forwarding by visiting:");
console.info("  • http://localhost:3000 (basic)");
console.info("  • http://localhost:3001 (advanced with console tests)");

// Keep servers running
console.info("\n⏹️  Press Ctrl+C to stop all servers");

// Graceful shutdown
process.on("SIGINT", () => {
  console.info("\n🛑 Shutting down servers...");
  basicDevServer.stop();
  advancedDevServer.stop();
  productionServer.stop();
  envBasedServer.stop();
  console.info("✅ All servers stopped");
  process.exit(0);
});
