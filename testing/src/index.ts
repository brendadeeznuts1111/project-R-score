import { Glob } from "bun";
import { stat } from "node:fs/promises";

export * from "./testing/chaos-engineer";
export * from "./quality/gatekeeper";
export * from "./monitoring/anomaly-dashboard";
export * from "./quality/remediator";
export * from "./types";

import { dnsCache } from "./proxy/dns";
import { PhoneSystem } from "./systems/phone-system";
import { IntelligentAutoScaler } from "./systems/auto-scaler";

const phoneSystem = new PhoneSystem();
const autoScaler = new IntelligentAutoScaler(phoneSystem, {
  getMetrics: () => ({
    dns: dnsCache.getStats(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  })
});

/**
 * 🌐 WebSocket Metrics Bridge
 * Broadcasts real-time system metrics to the dashboard
 */
export function startMetricsBridge(port = 3001) {
  const server = Bun.serve({
    port,
    fetch(req, server) {
      if (server.upgrade(req)) return;
      if (req.method === "POST" && new URL(req.url).pathname === "/control") {
        const body = await req.json();
        console.log(`[Control] Action: ${body.action}`);
        
        let result = { success: true };
        if (body.action === "run_quality_gate" && body.phoneId) {
          const results = await phoneSystem.runQualityGate(body.phoneId);
          result = { success: true, results };
        } else if (body.action === "inject_latency") {
          // Mock latency injection
          await Bun.sleep(1000);
          result = { success: true, message: "Latency injected" };
        }
        
        return new Response(JSON.stringify(result));
      }
      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      open(ws) {
        ws.subscribe("metrics");
        console.log("[ws] Dashboard connected");
      },
      message(ws, message) {
        console.log(`[ws] Received: ${message}`);
      },
    },
  });

  // Broadcast loop
  setInterval(async () => {
    const devices = await phoneSystem.getDeviceStatuses();
    const scalingDecision = await autoScaler.analyzeAndScale();
    
    // Record metrics in scaler
    autoScaler.recordMetric('dns_hit_rate', dnsCache.getStats().hitRate);
    autoScaler.recordMetric('memory_usage', process.memoryUsage().rss / 1024 / 1024);

    const data = {
      type: "metrics_update",
      timestamp: Date.now(),
      proxy: {
        dns: dnsCache.getStats(),
        uptime: process.uptime(),
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        scaling: scalingDecision,
      },
      devices,
    };
    server.publish("metrics", JSON.stringify(data));
  }, 2000);

  console.log(`[ws] Metrics Bridge started on port ${port}`);
  return server;
}

/**
 * Core System Analytics
 * Enhanced with real file system discovery
 */
export async function analyzeCodebase() {
  const glob = new Glob("**/*.{ts,tsx,js,jsx}");
  const files: any[] = [];
  let totalComplexity = 0;
  
  for await (const file of glob.scan(".")) {
    if (
      file.includes("node_modules") || 
      file.includes("dist") || 
      file.includes(".git")
    ) continue;
    
    try {
      const content = await Bun.file(file).text();
      const lines = content.split('\n');
      const info = await stat(file);
      
      // Heuristic complexity: depth of indentation + line count + size
      const indentationDepth = lines.reduce((acc, line) => {
        const match = line.match(/^(\s+)/);
        return acc + (match ? Math.floor(match[1].length / 2) : 0);
      }, 0);
      
      const cognitiveLoad = (indentationDepth / lines.length) * 10;
      const baseComplexity = (lines.length / 50) + cognitiveLoad;
      const finalComplexity = Math.min(baseComplexity + (info.size / 5000), 100);
      
      const health = finalComplexity > 40 ? "Needs Review" : finalComplexity > 20 ? "Maintainable" : "Excellent";
      
      files.push({
        name: file,
        health: health,
        complexity: Math.round(finalComplexity),
        size: info.size,
        lines: lines.length
      });
      
      totalComplexity += finalComplexity;
    } catch (e) {
      console.warn(`Could not analyze ${file}:`, e instanceof Error ? e.message : 'Unknown error');
    }
  }

  const avgComplexity = totalComplexity / files.length || 0;
  const healthScore = Math.max(0, Math.round(100 - avgComplexity));

  return {
    stats: {
      healthScore: healthScore,
      totalFiles: files.length,
      complexity: healthScore > 80 ? "Low" : healthScore > 50 ? "Medium" : "High",
    },
    files: files.sort((a, b) => b.complexity - a.complexity).slice(0, 10)
  };
}
