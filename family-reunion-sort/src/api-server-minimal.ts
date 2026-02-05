// Main API server for Venmo QR Code Dispute Handling System

import * as config from "./config/scope.config";
import { CreateDisputeRequest, MerchantResponse, DisputeDecision } from "./types";

console.log("Starting Bun.serve...");
const server = Bun.serve({
  port: 5681,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    try {
      if (path === "/") return new Response("🚀 Venmo Dispute API Server is running!");
      if (path === "/favicon.ico") return new Response(null, { status: 204 });
      if (path === "/health") return new Response(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error(`Error handling ${method} ${path}:`, err);
      return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
  },
  websocket: {
    open: (ws) => {
      console.log('WebSocket connection opened');
    },
    message: (ws, message) => {
      ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
    }
  },
  error(error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  },
  development: true,
});

console.log(`🚀 Venmo Dispute API Server running on http://localhost:${server.port}`);

export default server;
