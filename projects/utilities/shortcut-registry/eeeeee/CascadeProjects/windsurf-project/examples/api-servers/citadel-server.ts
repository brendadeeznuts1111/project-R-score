#!/usr/bin/env bun
// 🏛️ Citadel Dashboard Server - Configuration-driven
// Uses port variables from citadel-config.json

import { serve } from "bun";
import { readFileSync } from "fs";
import { join } from "path";

// Load configuration
const config = JSON.parse(readFileSync("./citadel-config.json", "utf-8"));

// Extract port configuration
const DASHBOARD_PORT = config.dashboard.port;
const API_PORT = config.api.port;
const WEBSOCKET_PORT = config.websocket.port;

console.log("🏛️ Citadel Dashboard Server Starting...");
console.log(`📊 Dashboard: http://localhost:${DASHBOARD_PORT}`);
console.log(`🔌 API Server: http://localhost:${API_PORT}`);
console.log(`🌐 WebSocket: ws://localhost:${WEBSOCKET_PORT}${config.websocket.path}`);
console.log(`⚙️ Config: ${JSON.stringify(config.timing, null, 2)}`);

// Serve static dashboard
serve({
  port: DASHBOARD_PORT,
  fetch(req) {
    const url = new URL(req.url);
    
    // Serve main dashboard
    if (url.pathname === "/" || url.pathname === "/citadel-dashboard.html") {
      const html = readFileSync("./citadel-dashboard.html", "utf-8");
      
      // Inject configuration into HTML
      const configScript = `<script>window.CONFIG = ${JSON.stringify(config, null, 2)};</script>`;
      const htmlWithConfig = html.replace(
        "</script>",
        `${configScript}</script>`
      );
      
      return new Response(htmlWithConfig, {
        headers: { "Content-Type": "text/html" }
      });
    }
    
    // Serve configuration as JSON
    if (url.pathname === "/config") {
      return new Response(JSON.stringify(config, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 404 for other routes
    return new Response("Not Found", { status: 404 });
  }
});

// Start API server
const apiServer = serve({
  port: API_PORT,
  fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": config.security.cors.origins.join(", "),
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // API endpoints
    if (url.pathname.startsWith("/api/")) {
      const headers = { ...corsHeaders, "Content-Type": "application/json" };
      
      switch (url.pathname) {
        case config.api.endpoints.metrics:
          return new Response(JSON.stringify({
            activeSilos: { active: 4, total: 5 },
            highRiskDevices: 1,
            incidents: { total: 155, recent: 5 },
            performance: 87,
            uptime: "24h 0m"
          }), { headers });
          
        case config.api.endpoints.incidents:
          return new Response(JSON.stringify({
            incidents: [
              {
                deviceId: "unknown_device",
                event: "SECURITY_INCIDENT",
                details: "captcha_failure cloud_vm_03 suspected_bot_detection",
                timestamp: Date.now(),
                severity: "medium"
              }
            ]
          }), { headers });
          
        case config.api.endpoints.devices:
          return new Response(JSON.stringify({
            devices: [
              { id: "cloud_vm_01", status: "ACTIVE", risk: "LOW", cycles: 3 },
              { id: "cloud_vm_02", status: "WARN", risk: "MED", cycles: 7 },
              { id: "cloud_vm_03", status: "ACTIVE", risk: "LOW", cycles: 2 },
              { id: "cloud_vm_04", status: "CRITICAL", risk: "HIGH", cycles: 12 },
              { id: "cloud_vm_05", status: "ACTIVE", risk: "LOW", cycles: 1 }
            ]
          }), { headers });
          
        default:
          return new Response("Endpoint not found", { 
            status: 404, 
            headers 
          });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  }
});

// WebSocket server for real-time updates
const wsServer = Bun.serve({
  port: WEBSOCKET_PORT,
  fetch(req: Request, server: any) {
    const url = new URL(req.url);
    
    // Upgrade to WebSocket for the configured path
    if (url.pathname === config.websocket.path) {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined; // WebSocket handled
      }
    }
    
    return new Response("Upgrade failed", { status: 400 });
  },
  websocket: {
    message(ws: any, message: string | Buffer) {
      // Echo messages or handle real-time updates
      console.log("WebSocket message received:", message);
    },
    open(ws: any) {
      console.log("WebSocket connection opened");
      ws.send(JSON.stringify({
        type: "connected",
        message: "Connected to Citadel WebSocket",
        timestamp: Date.now()
      }));
    },
    close(ws: any, code: number, message: string) {
      console.log("WebSocket connection closed");
    },
    drain(ws: any) {
      // Handle drain if needed
    }
  }
});

// Simulate real-time incident updates
setInterval(() => {
  if (config.features.realtimeUpdates) {
    const mockIncident = {
      type: "incident",
      payload: {
        deviceId: `cloud_vm_${Math.floor(Math.random() * 5) + 1}`,
        event: "SECURITY_INCIDENT",
        details: `simulated_incident_${Date.now()}`,
        timestamp: Date.now(),
        severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)]
      }
    };
    
    // Broadcast to all WebSocket clients
    wsServer.publish("citadel-updates", JSON.stringify(mockIncident));
  }
}, config.timing.metricsUpdateInterval);

console.log("🚀 All servers started successfully!");
console.log(`📱 Open http://localhost:${DASHBOARD_PORT} to view the dashboard`);
console.log(`🔧 API available at http://localhost:${API_PORT}/api/`);
console.log(`🌐 WebSocket listening on port ${WEBSOCKET_PORT}`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Citadel servers...");
  apiServer.stop();
  wsServer.stop();
  process.exit(0);
});
