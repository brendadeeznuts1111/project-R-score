// src/performance/monitoring-middleware.ts
import type { Bun } from 'bun';
import type { RequestMetrics, CompressionStats } from '../core/types/bun-extended';

export class PerformanceMonitor {
  private metrics: Map<string, RequestMetrics> = new Map();
  private server: Bun.Server | null = null;
  private options: {
    enableMetrics?: boolean;
    logSlowRequests?: boolean;
    slowThreshold?: number;
  };
  
  constructor(options: {
    server: Bun.Server;
    enableMetrics?: boolean;
    logSlowRequests?: boolean;
    slowThreshold?: number;
  }) {
    this.server = options.server;
    this.options = {
      enableMetrics: options.enableMetrics ?? true,
      logSlowRequests: options.logSlowRequests ?? true,
      slowThreshold: options.slowThreshold ?? 1000,
    };
    this.setupMonitoring();
  }
  
  private setupMonitoring(): void {
    if (!this.server) return;
    
    // Log server protocol info
    console.log(`🚀 Server running with protocol: ${this.server.protocol}`);
    
    // Set up performance monitoring interval
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Every minute
  }
  
  public async middleware(request: Request): Promise<Response> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const url = new URL(request.url);
    
    // Record request start
    this.metrics.set(requestId, {
      id: requestId,
      method: request.method,
      url: url.pathname,
      startTime,
      endTime: 0,
      duration: 0,
      status: 0,
      bytesSent: 0,
      bytesReceived: request.headers.get('content-length') 
        ? parseInt(request.headers.get('content-length') || '0', 10) 
        : 0,
      protocol: this.server?.protocol || 'http',
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') 
        ? request.headers.get('x-forwarded-for')!.split(',')[0]
        : 'unknown',
    });
    
    try {
      // Process the request
      const response = await this.handleRequest(request);
      
      // Calculate metrics
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Update metrics
      const metric = this.metrics.get(requestId);
      if (metric) {
        metric.endTime = endTime;
        metric.duration = duration;
        metric.status = response.status;
        
        // Get response size (if available)
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          metric.bytesSent = parseInt(contentLength, 10);
        }
        
        // Log slow requests
        if (this.options.logSlowRequests && duration > this.options.slowThreshold!) {
          console.warn(`⚠️ Slow request detected: ${duration}ms - ${request.method} ${url.pathname}`);
        }
        
        // Log to metrics endpoint if enabled
        if (url.pathname === '/_metrics' && this.server) {
          return this.getMetricsResponse();
        }
      }
      
      return response;
    } catch (error) {
      // Record error in metrics
      const metric = this.metrics.get(requestId);
      if (metric) {
        metric.endTime = Date.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.status = 500;
      }
      
      throw error;
    } finally {
      // Clean up old metrics (keep last 1000 requests)
      this.cleanupMetrics();
    }
  }
  
  private async getMetricsResponse(): Promise<Response> {
    const metrics = Array.from(this.metrics.values());
    
    // Calculate stats
    const totalRequests = metrics.length;
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const slowRequests = metrics.filter(m => m.duration > this.options.slowThreshold!).length;
    
    const protocolStats = {
      protocol: this.server?.protocol,
      requests: totalRequests,
      averageDuration: avgDuration.toFixed(2),
      slowRequests,
      compression: await this.getCompressionStats(),
      cache: await this.getCacheStats(),
    };
    
    return Response.json(protocolStats, {
      headers: {
        'cache-control': 'no-cache',
      },
    });
  }
  
  private async getCompressionStats(): Promise<any> {
    if (!this.server) return null;
    
    try {
      // Get compression stats from server
      const stats = await this.server.getCompressionStats?.();
      return stats || { enabled: false };
    } catch {
      return { enabled: false };
    }
  }
  
  private async getCacheStats(): Promise<any> {
    if (!this.server) return null;
    
    try {
      // Get cache stats from server
      const stats = this.server.performance?.cacheStats;
      return stats || { hits: 0, misses: 0, ratio: 0 };
    } catch {
      return { hits: 0, misses: 0, ratio: 0 };
    }
  }
  
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private cleanupMetrics(): void {
    // Keep only the last 1000 requests
    if (this.metrics.size > 1000) {
      const sortedKeys = Array.from(this.metrics.keys())
        .sort((a, b) => {
          const aTime = this.metrics.get(a)!.startTime;
          const bTime = this.metrics.get(b)!.startTime;
          return aTime - bTime;
        });
      
      // Remove oldest entries
      const toRemove = sortedKeys.slice(0, this.metrics.size - 1000);
      toRemove.forEach(key => this.metrics.delete(key));
    }
  }
  
  private async handleRequest(request: Request): Promise<Response> {
    // Your request handling logic here
    // This would be replaced with your actual route handling
    
    const url = new URL(request.url);
    
    // Example: Serve performance dashboard
    if (url.pathname === '/_perf') {
      return this.servePerformanceDashboard();
    }
    
    // Example: Default response
    return new Response('Hello from Bun!', {
      status: 200,
      headers: {
        'content-type': 'text/plain',
        'x-protocol': this.server?.protocol || 'unknown',
      },
    });
  }
  
  private servePerformanceDashboard(): Response {
    const metrics = Array.from(this.metrics.values());
    const recentMetrics = metrics.slice(-100); // Last 100 requests
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bun Performance Dashboard</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; background: #f5f5f5; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { margin: 10px 0; font-size: 14px; }
        .protocol-badge { 
          display: inline-block; 
          padding: 4px 8px; 
          border-radius: 4px; 
          background: #007acc; 
          color: white; 
          font-weight: bold;
          margin-bottom: 20px;
        }
        h1 { color: #333; }
        h3 { color: #666; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
      </style>
    </head>
    <body>
      <h1>📊 Bun Performance Dashboard</h1>
      
      <div class="protocol-badge">Protocol: ${this.server?.protocol || 'unknown'}</div>
      
      <div class="dashboard">
        <div class="card">
          <h3>📈 Request Metrics</h3>
          <div class="metric">Total Requests: ${metrics.length}</div>
          <div class="metric">Active Connections: ${this.server?.performance?.activeConnections || 0}</div>
          <div class="metric">Requests/sec: ${this.server?.performance?.requestsPerSecond?.toFixed(2) || 0}</div>
        </div>
        
        <div class="card">
          <h3>⚡ Response Times</h3>
          <div class="metric">Avg Response Time: ${this.server?.performance?.avgResponseTime?.toFixed(2) || 0}ms</div>
          <div class="metric">Bytes Transferred: ${this.formatBytes(this.server?.performance?.bytesTransferred?.total || 0)}</div>
          <canvas id="responseTimeChart" width="400" height="200"></canvas>
        </div>
        
        <div class="card">
          <h3>🗜️ Compression</h3>
          <div class="metric">Compression Ratio: ${((this.server?.performance?.bytesTransferred?.compressionRatio || 0) * 100).toFixed(1)}%</div>
          <div class="metric">Bytes Saved: ${this.formatBytes(
            (this.server?.performance?.bytesTransferred?.uncompressed || 0) - 
            (this.server?.performance?.bytesTransferred?.compressed || 0)
          )}</div>
        </div>
      </div>
      
      <div class="card" style="margin-top: 20px;">
        <h3>📋 Recent Requests</h3>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>URL</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            ${recentMetrics.map(m => `
              <tr>
                <td>${m.method}</td>
                <td>${m.url}</td>
                <td>${m.status}</td>
                <td>${m.duration}ms</td>
                <td>${this.formatBytes(m.bytesSent)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <script>
        // Chart for response times
        const ctx = document.getElementById('responseTimeChart').getContext('2d');
        const durations = ${JSON.stringify(recentMetrics.map(m => m.duration))};
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: durations.map((_, i) => i + 1),
            datasets: [{
              label: 'Response Time (ms)',
              data: durations,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      </script>
    </body>
    </html>
    `;
    
    return new Response(html, {
      headers: {
        'content-type': 'text/html',
        'cache-control': 'no-cache',
      },
    });
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  private logPerformanceMetrics(): void {
    if (!this.server) return;
    
    const metrics = this.server.performance;
    const protocol = this.server.protocol;
    
    console.log(`
    📊 Performance Metrics (${protocol}):
    ──────────────────────────────────
    • Requests/sec: ${metrics?.requestsPerSecond?.toFixed(2) || 0}
    • Avg Response Time: ${metrics?.avgResponseTime?.toFixed(2) || 0}ms
    • Active Connections: ${metrics?.activeConnections || 0}
    • Bytes Transferred: ${this.formatBytes(metrics?.bytesTransferred?.total || 0)}
    • Compression Ratio: ${((metrics?.bytesTransferred?.compressionRatio || 0) * 100).toFixed(1)}%
    • Cache Hit Ratio: ${((metrics?.cacheStats?.ratio || 0) * 100).toFixed(1)}%
    `);
  }
}
