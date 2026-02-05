/**
 * HTTP Server for T3-LATTICE v3.4
 * Provides REST API endpoints for the Sports Betting Fractal Dashboard
 */

import { startWebSocketServer } from "./websocket-server";

/**
 * Creates and starts the HTTP server with required endpoints
 */
export function createHTTPServer(port: number = 3000) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      
      // Health check endpoint
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({
            status: "ok",
            timestamp: Date.now(),
            version: "0.1.0",
            service: "T3-LATTICE-v3.4"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // API info endpoint
      if (url.pathname === "/api") {
        return new Response(
          JSON.stringify({
            message: "Sports API",
            version: "0.1.0",
            endpoints: [
              "/health",
              "/api",
              "/demo/colors",
              "/demo/microstructure",
              "/ws"
            ],
            description: "T3-LATTICE v3.4 Fractal Market Microstructure Engine"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Demo endpoints for visualization
      if (url.pathname === "/demo/colors") {
        const { fdToColor } = await import("./color-mapping");
        const testFDs = [1.0, 1.2, 1.5, 1.8, 2.1, 2.5, 2.8, 3.0];
        const colors = testFDs.map(fd => ({
          fd,
          color: fdToColor(fd),
          regime: getRegimeName(fd)
        }));
        
        return new Response(
          JSON.stringify({
            demo: "Color Mapping",
            data: colors
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      if (url.pathname === "/demo/microstructure") {
        const { MarketMicrostructureAnalyzer } = await import("./market-microstructure");
        const analyzer = new MarketMicrostructureAnalyzer();
        
        // Generate sample data with proper OddsTick structure
        const sampleTicks = Array.from({ length: 100 }, (_, i) => ({
          id: i,
          timestamp: Date.now() + i * 10,
          spread: -4.5 + Math.sin(i / 10) * 2 + (Math.random() - 0.5) * 0.5,
          ml: -180 + Math.random() * 20,
          total: 225 + Math.random() * 10,
          volume: Math.floor(Math.random() * 50000),
          hash: Number(Bun.hash.wyhash(`${i}`)),
          source: ["sharp", "public", "dark", "whale"][Math.floor(Math.random() * 4)] as "sharp" | "public" | "dark" | "whale"
        }));
        
        const result = await analyzer.analyzeMarketMicrostructure("DEMO@MARKET", sampleTicks);
        
        return new Response(
          JSON.stringify({
            demo: "Microstructure Analysis",
            data: result
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // WebSocket upgrade endpoint
      if (url.pathname === "/ws") {
        // Note: WebSocket upgrade would need to be handled differently
        // This is a placeholder for the WebSocket endpoint
        return new Response(
          JSON.stringify({
            message: "WebSocket endpoint",
            info: "Connect via ws://localhost:" + port + "/ws",
            demo: "Use 'bun start server' for full WebSocket functionality"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // 404 handler
      return new Response(
        JSON.stringify({
          error: "Not found",
          code: "ROUTE_NOT_FOUND",
          message: "API endpoint does not exist",
          details: {
            path: url.pathname,
            availableRoutes: [
              "/health",
              "/api",
              "/demo/colors",
              "/demo/microstructure",
              "/ws"
            ]
          }
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    },
    error() {
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  });

  return server;
}

/**
 * Helper function to get regime name from FD value
 */
function getRegimeName(fd: number): string {
  if (fd < 1.2) return "Ultra-Stable";
  if (fd < 1.5) return "Stable";
  if (fd < 1.8) return "Normal";
  if (fd < 2.2) return "Volatile";
  if (fd < 2.6) return "Chaotic";
  return "Black Swan";
}

/**
 * Main execution - starts HTTP server if run directly
 */
if (import.meta.main) {
  const port = parseInt(process.argv[2]) || 3000;
  const server = createHTTPServer(port);
  
  console.log(`🚀 T3-LATTICE v3.4 HTTP Server running on port ${port}`);
  console.log(`📊 Health: http://localhost:${port}/health`);
  console.log(`🔌 API: http://localhost:${port}/api`);
  console.log(`🎨 Demo: http://localhost:${port}/demo/colors`);
  console.log(`📈 Microstructure: http://localhost:${port}/demo/microstructure`);
  console.log(`💡 Press Ctrl+C to stop\n`);
  
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...");
    server.stop();
    process.exit(0);
  });
}
