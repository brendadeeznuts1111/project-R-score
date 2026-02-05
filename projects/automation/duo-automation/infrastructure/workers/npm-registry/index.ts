/**
 * RegistryGatewayEdgeAuth (Ticket 16.1.1.1.1)
 * Cloudflare Worker Registry Gateway with Bearer Token Validation
 */

interface Env {
  R2_BUCKET: R2Bucket;
  NPM_TOKEN: string;
  NPM_REGISTRY_BUCKET: R2Bucket;
}

import { PerfMetric, enhancePerfMetric } from '../../types/perf-metric';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const authHeader = request.headers.get("Authorization");

    // Bearer Token Validation
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== env.NPM_TOKEN) {
      return new Response("401 Unauthorized: Invalid Empire Registry Token", { status: 401 });
    }

    // Metrics telemetry endpoint
    if (url.pathname === "/-/metrics") {
      try {
        const metrics = await env.NPM_REGISTRY_BUCKET.get("perf-metrics.json");
        if (!metrics) {
          return new Response("[]", {
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const metricsData = await metrics.json();
        const enhancedMetrics = metricsData.map((m: PerfMetric) => enhancePerfMetric(m));
        
        return new Response(JSON.stringify(enhancedMetrics, null, 2), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch metrics" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Logic for routing npm traffic to R2
    const path = url.pathname.slice(1);
    
    if (request.method === "GET") {
      const object = await env.R2_BUCKET.get(path);
      if (!object) return new Response("Package Not Found", { status: 404 });

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=3600"); // Edge caching incentive

      return new Response(object.body, { headers });
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};