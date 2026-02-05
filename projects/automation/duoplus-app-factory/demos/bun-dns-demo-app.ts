#!/usr/bin/env bun
/**
 * DNS Cache Demo App
 * Makes repeated DNS lookups to demonstrate cache behavior
 * Run alongside bun-dns-live-stats.ts to see cache in action
 * 
 * Usage:
 *   Terminal 1: bun bun-dns-demo-app.ts
 *   Terminal 2: bun bun-dns-live-stats.ts
 */

import { serve } from "bun";

// List of domains to query (mix of popular services)
const DOMAINS = [
  "https://api.github.com",
  "https://api.example.com",
  "https://cdn.example.com",
  "https://analytics.example.com",
  "https://api.stripe.com",
  "https://api.openai.com",
  "https://api.anthropic.com",
];

let requestCount = 0;
let dnsLookupCount = 0;

console.log("🚀 DNS Demo App starting on http://localhost:3003");
console.log("📊 Making repeated DNS lookups to demonstrate caching");
console.log("🌐 Run 'bun bun-dns-live-stats.ts' in another terminal to monitor\n");

serve({
  port: 3003,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        requestCount,
        dnsLookupCount,
      });
    }

    // Trigger DNS lookups
    if (url.pathname === "/trigger") {
      requestCount++;
      const results: Record<string, { status: number; time: number }> = {};

      // Make requests to all domains (will trigger DNS lookups)
      const promises = DOMAINS.map(async (domain) => {
        const start = performance.now();
        try {
          const res = await fetch(domain, { method: "HEAD" });
          const time = performance.now() - start;
          results[domain] = { status: res.status, time: Math.round(time) };
          dnsLookupCount++;
        } catch (e) {
          const time = performance.now() - start;
          results[domain] = { status: 0, time: Math.round(time) };
        }
      });

      await Promise.all(promises);

      return Response.json({
        message: "DNS lookups triggered",
        requestCount,
        dnsLookupCount,
        results,
      });
    }

    // Auto-trigger endpoint (for continuous testing)
    if (url.pathname === "/auto") {
      // Trigger lookups every 2 seconds for 30 seconds
      let count = 0;
      const interval = setInterval(async () => {
        count++;
        if (count > 15) {
          clearInterval(interval);
          return;
        }

        requestCount++;
        const promises = DOMAINS.map(async (domain) => {
          try {
            await fetch(domain, { method: "HEAD" });
            dnsLookupCount++;
          } catch (e) {
            // Ignore errors
          }
        });

        await Promise.all(promises);
        console.log(`[${new Date().toLocaleTimeString()}] Triggered DNS lookups (${count}/15)`);
      }, 2000);

      return Response.json({
        message: "Auto-triggering DNS lookups every 2 seconds for 30 seconds",
        requestCount,
      });
    }

    // Info page
    if (url.pathname === "/") {
      return new Response(`
DNS Cache Demo App

Endpoints:
  GET /health  - Check app status
  GET /trigger - Make one round of DNS lookups
  GET /auto    - Auto-trigger lookups every 2s for 30s

Usage:
  1. Terminal 1: bun bun-dns-demo-app.ts
  2. Terminal 2: bun bun-dns-live-stats.ts
  3. Terminal 3: curl http://localhost:3003/auto

Watch the DNS cache dashboard update in real-time!
      `, {
        headers: { "content-type": "text/plain" }
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("📝 Endpoints:");
console.log("   GET /health  - Check app status");
console.log("   GET /trigger - Make one round of DNS lookups");
console.log("   GET /auto    - Auto-trigger lookups every 2s for 30s");
console.log("\n🧪 Test with:");
console.log("   curl http://localhost:3003/trigger");
console.log("   curl http://localhost:3003/auto\n");

