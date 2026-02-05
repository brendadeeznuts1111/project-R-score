/**
 * BunNativePrometheusBridge - Infrastructure Metrics Exporter
 * Ticket ID: 12.1.1.1.2
 */

import { serve } from 'bun';

export class BunNativePrometheusBridge {
  private static readonly PORT = 9091; // Ticket 12.1.1.1.2
  private static server: any = null;

  static start() {
    if (this.server) return;

    try {
      this.server = serve({
        port: this.PORT,
        fetch(req) {
          const url = new URL(req.url);
          
          if (url.pathname === '/metrics') {
            return new Response(BunNativePrometheusBridge.generateMetrics(), {
              headers: { 'Content-Type': 'text/plain; version=0.0.4' }
            });
          }
          
          return new Response('Prometheus Bridge Active', { status: 200 });
        }
      });
      console.log(`📊 Prometheus Bridge exporting metrics on port ${this.PORT}`);
    } catch (e: any) {
      if (e.code === 'EADDRINUSE') {
        console.warn(`📊 Prometheus Bridge port ${this.PORT} already in use. Skipping start.`);
      } else {
        throw e;
      }
    }
  }

  private static generateMetrics(): string {
    // Export metrics in OpenMetrics format
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    let metrics = '';
    metrics += `# HELP empire_uptime_seconds Application uptime in seconds\n`;
    metrics += `# TYPE empire_uptime_seconds gauge\n`;
    metrics += `empire_uptime_seconds ${uptime}\n\n`;
    
    metrics += `# HELP empire_memory_rss_bytes System Memory RSS\n`;
    metrics += `# TYPE empire_memory_rss_bytes gauge\n`;
    metrics += `empire_memory_rss_bytes ${memory.rss}\n\n`;
    
    metrics += `# HELP empire_agent_count_total Current active agent sandboxes\n`;
    metrics += `# TYPE empire_agent_count_total gauge\n`;
    metrics += `empire_agent_count_total 0\n`; // Real implementations would pull from Isolator
    
    return metrics;
  }
}