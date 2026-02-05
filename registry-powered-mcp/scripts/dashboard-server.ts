#!/usr/bin/env bun

/**
 * MCP Registry Dashboard Server with Integrated Telemetry Analysis
 * Real-time monitoring, analysis, and optimization recommendations
 */

import { serve } from "bun";

// Import dashboard components and data
import { MOCK_DATA, REGISTRY_MATRIX } from "./src/constants";

// Telemetry Analysis Integration
interface TelemetryAnalysis {
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    outliers: number[];
    status: 'excellent' | 'good' | 'acceptable' | 'degraded';
  };
  memory: {
    initial: number;
    final: number;
    growth: number;
    growthRate: number;
    status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
  };
  throughput: {
    avg: number;
    peak: number;
    stability: number;
    status: 'excellent' | 'good' | 'acceptable' | 'low';
  };
  recommendations: string[];
  overallStatus: 'excellent' | 'good' | 'acceptable' | 'degraded';
}

class TelemetryAnalyzer {
  private telemetry: any;

  constructor(telemetry: any) {
    this.telemetry = telemetry;
  }

  analyzeLatency(): TelemetryAnalysis['latency'] {
    const latencies = this.telemetry.telemetry_buffers.latency.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;

    // Detect outliers (> 3 standard deviations)
    const mean = avg;
    const std = Math.sqrt(latencies.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / latencies.length);
    const outliers = latencies.filter((l: number) => Math.abs(l - mean) > 3 * std);

    let status: 'excellent' | 'good' | 'acceptable' | 'degraded' = 'excellent';
    if (p99 > 20) status = 'degraded';
    else if (p99 > 15) status = 'acceptable';
    else if (p99 > 12) status = 'good';

    return { p50, p95, p99, avg, outliers, status };
  }

  analyzeMemory(): TelemetryAnalysis['memory'] {
    const heap = this.telemetry.telemetry_buffers.heap;
    const initial = heap[0];
    const final = heap[heap.length - 1];
    const growth = final - initial;
    const growthRate = growth / this.telemetry.uptime_seconds;

    let status: 'optimal' | 'acceptable' | 'concerning' | 'critical' = 'optimal';
    if (growthRate > 0.1) status = 'critical';
    else if (growthRate > 0.05) status = 'concerning';
    else if (growthRate > 0.01) status = 'acceptable';

    return { initial, final, growth, growthRate, status };
  }

  analyzeThroughput(): TelemetryAnalysis['throughput'] {
    const requests = this.telemetry.telemetry_buffers.requests;
    const avg = requests.reduce((a: number, b: number) => a + b, 0) / requests.length;
    const peak = Math.max(...requests);

    const mean = avg;
    const variance = requests.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / requests.length;
    const stability = Math.sqrt(variance) / mean;

    let status: 'excellent' | 'good' | 'acceptable' | 'low' = 'excellent';
    if (avg < 200) status = 'low';
    else if (avg < 250) status = 'acceptable';
    else if (avg < 300) status = 'good';

    return { avg, peak, stability, status };
  }

  generateRecommendations(latency: any, memory: any, throughput: any): string[] {
    const recommendations: string[] = [];

    if (latency.p99 > 15) {
      recommendations.push('⚡ HIGH PRIORITY: P99 latency exceeds 15ms - investigate GC pauses or routing bottlenecks');
    }

    if (latency.outliers.length > 2) {
      recommendations.push('📊 MONITOR: Multiple latency outliers detected - check for intermittent issues');
    }

    if (memory.status === 'critical') {
      recommendations.push('💾 CRITICAL: High memory growth rate - implement memory leak detection');
    } else if (memory.status === 'concerning') {
      recommendations.push('💾 MONITOR: Elevated memory growth - track heap usage trends');
    }

    if (throughput.status === 'low') {
      recommendations.push('🚀 OPTIMIZE: Low throughput detected - consider connection pooling improvements');
    }

    if (this.telemetry.active_pty_sessions > 10) {
      recommendations.push('🖥️ SCALE: High PTY session count - consider load balancing');
    }

    return recommendations;
  }

  generateAnalysis(): TelemetryAnalysis {
    const latency = this.analyzeLatency();
    const memory = this.analyzeMemory();
    const throughput = this.analyzeThroughput();
    const recommendations = this.generateRecommendations(latency, memory, throughput);

    // Determine overall status
    const statuses = [latency.status, memory.status, throughput.status];
    let overallStatus: 'excellent' | 'good' | 'acceptable' | 'degraded' = 'excellent';

    if (statuses.includes('degraded') || memory.status === 'critical') {
      overallStatus = 'degraded';
    } else if (statuses.includes('acceptable') || memory.status === 'concerning') {
      overallStatus = 'acceptable';
    } else if (statuses.includes('good')) {
      overallStatus = 'good';
    }

    return {
      latency,
      memory,
      throughput,
      recommendations,
      overallStatus
    };
  }
}

// Enhanced Response Builder with ArrayBufferSink optimization
class StreamingResponseBuilder {
  private sink: InstanceType<typeof Bun.ArrayBufferSink> | null = null;
  private chunks: Uint8Array[] = [];
  private useArrayBufferSink = false;

  constructor(options: { highWaterMark?: number; stream?: boolean } = {}) {
    const { highWaterMark = 65536, stream = false } = options;

    // Try to use ArrayBufferSink for optimal performance
    try {
      if (typeof Bun !== 'undefined' && Bun.ArrayBufferSink) {
        this.sink = new Bun.ArrayBufferSink();
        this.sink.start({ highWaterMark, stream, asUint8Array: true });
        this.useArrayBufferSink = true;
      }
    } catch (error) {
      this.useArrayBufferSink = false;
    }
  }

  write(chunk: string | ArrayBuffer | Uint8Array): void {
    if (this.useArrayBufferSink && this.sink) {
      this.sink.write(chunk);
    } else {
      // Fallback: encode and store chunks
      let data: Uint8Array;
      if (typeof chunk === 'string') {
        data = new TextEncoder().encode(chunk);
      } else if (chunk instanceof ArrayBuffer) {
        data = new Uint8Array(chunk);
      } else if (chunk instanceof Uint8Array) {
        data = chunk;
      } else {
        throw new Error('Unsupported chunk type');
      }
      this.chunks.push(data);
    }
  }

  flush(): number | Uint8Array | ArrayBuffer | null {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.flush();
    }
    return null; // No-op for fallback
  }

  end(): ArrayBuffer | Uint8Array {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.end();
    } else {
      // Fallback: concatenate all chunks
      const totalSize = this.chunks.reduce((size, chunk) => size + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of this.chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      this.chunks = []; // Clear for potential reuse
      return result;
    }
  }

  getSize(): number {
    if (this.useArrayBufferSink) {
      // ArrayBufferSink doesn't expose size directly
      return -1; // Unknown
    } else {
      return this.chunks.reduce((size, chunk) => size + chunk.length, 0);
    }
  }

  isUsingArrayBufferSink(): boolean {
    return this.useArrayBufferSink;
  }
}

// Binary Data Processing with Bun Optimizations
class BinaryDataProcessor {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();

  // High-performance JSON serialization using ArrayBufferSink
  static createJSONResponse(data: any): Response {
    const builder = new StreamingResponseBuilder({ highWaterMark: 32768 });

    // Efficient JSON building with streaming
    builder.write('{"timestamp":"');
    builder.write(new Date().toISOString());
    builder.write('","data":');

    // Serialize data efficiently
    builder.write(JSON.stringify(data));
    builder.write('}');

    const buffer = builder.end();
    const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    return new Response(uint8Buffer as any, {
      headers: {
        "Content-Type": "application/json",
        "X-Binary-Optimized": builder.isUsingArrayBufferSink() ? "ArrayBufferSink" : "Fallback",
        "X-Data-Size": uint8Buffer.length.toString()
      },
    });
  }

  // Binary protocol encoding/decoding using DataView
  static encodeBinaryProtocol(data: {
    version: number;
    type: number;
    payload: Uint8Array;
    checksum?: number;
  }): ArrayBuffer {
    const payloadSize = data.payload.length;
    const totalSize = 4 + 4 + 4 + payloadSize + 4; // version + type + size + payload + checksum
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write protocol header
    view.setUint32(0, data.version, true); // little-endian
    view.setUint32(4, data.type, true);
    view.setUint32(8, payloadSize, true);

    // Write payload
    const payloadView = new Uint8Array(buffer, 12, payloadSize);
    payloadView.set(data.payload);

    // Calculate and write checksum
    const checksum = this.calculateChecksum(new Uint8Array(buffer, 0, 12 + payloadSize));
    view.setUint32(12 + payloadSize, checksum, true);

    return buffer;
  }

  static decodeBinaryProtocol(buffer: ArrayBuffer): {
    version: number;
    type: number;
    payload: Uint8Array;
    checksum: number;
    isValid: boolean;
  } {
    const view = new DataView(buffer);

    const version = view.getUint32(0, true);
    const type = view.getUint32(4, true);
    const payloadSize = view.getUint32(8, true);

    const payload = new Uint8Array(buffer, 12, payloadSize);
    const checksum = view.getUint32(12 + payloadSize, true);

    // Validate checksum
    const calculatedChecksum = this.calculateChecksum(new Uint8Array(buffer, 0, 12 + payloadSize));
    const isValid = checksum === calculatedChecksum;

    return { version, type, payload, checksum, isValid };
  }

  // Efficient base64/hex encoding using Uint8Array methods
  static encodeBase64(data: Uint8Array): string {
    return data.toBase64();
  }

  static decodeBase64(base64: string): Uint8Array {
    return Uint8Array.fromBase64(base64);
  }

  static encodeHex(data: Uint8Array): string {
    return data.toHex();
  }

  static decodeHex(hex: string): Uint8Array {
    return Uint8Array.fromHex(hex);
  }

  // Memory-efficient file processing using Bun.file
  static async processFile(filePath: string): Promise<{
    size: number;
    type: string;
    text?: string;
    bytes?: Uint8Array;
    buffer?: ArrayBuffer;
    hash?: string;
  }> {
    const file = Bun.file(filePath);
    const results: any = {
      size: file.size,
      type: file.type || 'application/octet-stream'
    };

    // Calculate file hash using Bun's crypto
    try {
      const hash = new Bun.CryptoHasher('sha256');
      hash.update(await file.arrayBuffer());
      results.hash = hash.digest('hex');
    } catch (error) {
      console.warn('Hash calculation failed:', error);
    }

    // Read content based on size
    if (file.size < 1024 * 1024) { // < 1MB
      results.buffer = await file.arrayBuffer();
      results.bytes = new Uint8Array(results.buffer);
      results.text = await file.text();
    } else {
      // For large files, provide streaming access
      results.stream = file.stream();
    }

    return results;
  }

  // Private utility methods
  private static calculateChecksum(data: Uint8Array): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) & 0xFFFFFFFF;
    }
    return checksum;
  }
}

// Dashboard Server with Integrated Telemetry Analysis
class UnifiedDashboard {
  private port = 3001;
  private data: any;
  private analyzer: TelemetryAnalyzer | null = null;

  constructor() {
    this.data = this.generateDashboardData();
    console.log('🚀 MCP Registry Dashboard with Integrated Telemetry Analysis');
  }

  private generateDashboardData() {
    // Generate mock telemetry data for demonstration
    return {
      telemetry: {
        timestamp: new Date().toISOString(),
        service: "registry-powered-mcp",
        version: "2.4.1",
        uptime_seconds: Math.floor(Math.random() * 3600) + 100,
        active_pty_sessions: Math.floor(Math.random() * 8) + 2,
        telemetry_buffers: {
          latency: Array.from({ length: 30 }, () => 7 + Math.random() * 6),
          requests: Array.from({ length: 30 }, () => 300 + Math.random() * 50),
          heap: Array.from({ length: 30 }, () => 40 + Math.random() * 20),
          pty: Array.from({ length: 30 }, () => 2 + Math.floor(Math.random() * 4))
        },
        registry_status: "operational",
        topology_verified: true,
        region: "NODE_ORD_01"
      }
    };
  }

  private async serveDashboard(): Promise<void> {
    const self = this;

    const server = serve({
      port: this.port,
      async fetch(req) {
        const url = new URL(req.url);

        // API endpoints
        if (url.pathname === "/api/data") {
          return new Response(JSON.stringify(self.data), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Telemetry Analysis Endpoint
        if (url.pathname === "/api/telemetry/analysis") {
          if (!self.analyzer) {
            self.analyzer = new TelemetryAnalyzer(self.data.telemetry);
          }

          const analysis = self.analyzer.generateAnalysis();
          return BinaryDataProcessor.createJSONResponse(analysis);
        }

        // Live telemetry data endpoint
        if (url.pathname === "/api/telemetry") {
          return new Response(JSON.stringify(self.data.telemetry), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Binary data processing endpoints
        if (url.pathname === "/api/binary/encode") {
          if (req.method === "POST") {
            try {
              const body = await req.json();
              const { data, format } = body;

              let result: any;

              if (typeof data === 'string') {
                const bytes = BinaryDataProcessor.textEncoder.encode(data);
                switch (format) {
                  case 'base64':
                    result = { encoded: BinaryDataProcessor.encodeBase64(bytes), format: 'base64' };
                    break;
                  case 'hex':
                    result = { encoded: BinaryDataProcessor.encodeHex(bytes), format: 'hex' };
                    break;
                  default:
                    result = { encoded: Array.from(bytes), format: 'bytes' };
                }
              } else if (Array.isArray(data)) {
                const bytes = new Uint8Array(data);
                switch (format) {
                  case 'base64':
                    result = { encoded: BinaryDataProcessor.encodeBase64(bytes), format: 'base64' };
                    break;
                  case 'hex':
                    result = { encoded: BinaryDataProcessor.encodeHex(bytes), format: 'hex' };
                    break;
                  default:
                    result = { encoded: Array.from(bytes), format: 'bytes' };
                }
              }

              return BinaryDataProcessor.createJSONResponse(result);
            } catch (error) {
              return new Response(JSON.stringify({ error: "Encoding failed" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        }

        // Binary protocol endpoints
        if (url.pathname === "/api/binary/protocol") {
          if (req.method === "POST") {
            try {
              const body = await req.json();
              const { action, data } = body;

              if (action === 'encode') {
                const buffer = BinaryDataProcessor.encodeBinaryProtocol(data);
                const bytes = new Uint8Array(buffer);
                const result = {
                  encoded: Array.from(bytes),
                  size: buffer.byteLength,
                  base64: BinaryDataProcessor.encodeBase64(bytes)
                };
                return BinaryDataProcessor.createJSONResponse(result);
              } else if (action === 'decode') {
                const buffer = new ArrayBuffer(data.length);
                const view = new Uint8Array(buffer);
                view.set(data);
                const decoded = BinaryDataProcessor.decodeBinaryProtocol(buffer);
                return BinaryDataProcessor.createJSONResponse(decoded);
              }

              return new Response(JSON.stringify({ error: "Invalid action" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            } catch (error) {
              return new Response(JSON.stringify({ error: "Protocol processing failed" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        }

        // ArrayBufferSink streaming demo
        if (url.pathname === "/api/stream/demo") {
          const builder = new StreamingResponseBuilder({ highWaterMark: 8192 });

          // Stream JSON data efficiently
          builder.write('{"type":"stream_start","timestamp":"');
          builder.write(new Date().toISOString());
          builder.write('","data":{');

          // Add telemetry data chunks
          builder.write('"latency":[');
          for (let i = 0; i < self.data.telemetry.telemetry_buffers.latency.length; i++) {
            if (i > 0) builder.write(',');
            builder.write(self.data.telemetry.telemetry_buffers.latency[i].toString());
          }
          builder.write(']}}');

          const buffer = builder.end();
          const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

          return new Response(uint8Buffer as any, {
            headers: {
              "Content-Type": "application/json",
              "X-Stream-Optimized": builder.isUsingArrayBufferSink() ? "ArrayBufferSink" : "Fallback",
              "X-Buffer-Size": uint8Buffer.length.toString()
            },
          });
        }

        // Default: Serve the dashboard HTML
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>MCP Registry Dashboard</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 2rem; }
                .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
                .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; }
                .metric-title { font-size: 0.875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                .metric-value { font-size: 2rem; font-weight: 700; color: #1e293b; }
                .status-good { color: #10b981; }
                .status-warning { color: #f59e0b; }
                .status-error { color: #ef4444; }
                .analysis-section { background: #f1f5f9; border-radius: 8px; padding: 1.5rem; margin-top: 2rem; }
                .recommendations { margin-top: 1rem; }
                .recommendation { background: white; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 0.5rem; border-radius: 0 4px 4px 0; }
                button { background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; margin: 0.5rem; }
                button:hover { background: #2563eb; }
                pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 4px; overflow-x: auto; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🔬 MCP Registry Telemetry Analysis Dashboard</h1>
                <p>Real-time performance monitoring with integrated analysis and optimization recommendations</p>
              </div>

              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-title">System Status</div>
                  <div class="metric-value status-good" id="overall-status">Loading...</div>
                </div>
                <div class="metric-card">
                  <div class="metric-title">P99 Latency</div>
                  <div class="metric-value" id="p99-latency">Loading...</div>
                </div>
                <div class="metric-card">
                  <div class="metric-title">Throughput</div>
                  <div class="metric-value" id="throughput">Loading...</div>
                </div>
                <div class="metric-card">
                  <div class="metric-title">Memory Growth</div>
                  <div class="metric-value" id="memory-growth">Loading...</div>
                </div>
              </div>

              <div class="analysis-section">
                <h2>📊 Detailed Analysis</h2>
                <button onclick="loadAnalysis()">Load Telemetry Analysis</button>
                <div id="analysis-content"></div>

                <div class="recommendations">
                  <h3>🎯 Optimization Recommendations</h3>
                  <div id="recommendations-content"></div>
                </div>
              </div>

              <script>
                async function loadAnalysis() {
                  try {
                    const response = await fetch('/api/telemetry/analysis');
                    const analysis = await response.json();

                    // Update metrics
                    document.getElementById('overall-status').textContent = analysis.overallStatus.toUpperCase();
                    document.getElementById('overall-status').className = 'metric-value status-' +
                      (analysis.overallStatus === 'excellent' ? 'good' :
                       analysis.overallStatus === 'good' ? 'good' :
                       analysis.overallStatus === 'acceptable' ? 'warning' : 'error');

                    document.getElementById('p99-latency').textContent = analysis.latency.p99.toFixed(1) + 'ms';
                    document.getElementById('p99-latency').className = 'metric-value status-' +
                      (analysis.latency.status === 'excellent' ? 'good' :
                       analysis.latency.status === 'good' ? 'good' :
                       analysis.latency.status === 'acceptable' ? 'warning' : 'error');

                    document.getElementById('throughput').textContent = analysis.throughput.avg.toFixed(0) + ' req/s';
                    document.getElementById('throughput').className = 'metric-value status-' +
                      (analysis.throughput.status === 'excellent' ? 'good' :
                       analysis.throughput.status === 'good' ? 'good' :
                       analysis.throughput.status === 'acceptable' ? 'warning' : 'error');

                    document.getElementById('memory-growth').textContent = analysis.memory.growthRate.toFixed(3) + ' MB/s';
                    document.getElementById('memory-growth').className = 'metric-value status-' +
                      (analysis.memory.status === 'optimal' ? 'good' :
                       analysis.memory.status === 'acceptable' ? 'warning' : 'error');

                    // Show detailed analysis
                    const analysisHtml = \`
                      <h4>Latency Analysis</h4>
                      <pre>P50: \${analysis.latency.p50.toFixed(3)}ms | P95: \${analysis.latency.p95.toFixed(3)}ms | P99: \${analysis.latency.p99.toFixed(3)}ms</pre>
                      <pre>Avg: \${analysis.latency.avg.toFixed(3)}ms | Outliers: \${analysis.latency.outliers.length}</pre>

                      <h4>Memory Analysis</h4>
                      <pre>Initial: \${analysis.memory.initial.toFixed(1)}MB | Final: \${analysis.memory.final.toFixed(1)}MB</pre>
                      <pre>Growth: \${analysis.memory.growth.toFixed(1)}MB | Rate: \${analysis.memory.growthRate.toFixed(3)}MB/s</pre>

                      <h4>Throughput Analysis</h4>
                      <pre>Average: \${analysis.throughput.avg.toFixed(1)} req/s | Peak: \${analysis.throughput.peak.toFixed(1)} req/s</pre>
                      <pre>Stability: \${(analysis.throughput.stability * 100).toFixed(1)}% variation</pre>
                    \`;

                    document.getElementById('analysis-content').innerHTML = analysisHtml;

                    // Show recommendations
                    const recommendationsHtml = analysis.recommendations.map(rec =>
                      \`<div class="recommendation">\${rec}</div>\`
                    ).join('');

                    document.getElementById('recommendations-content').innerHTML = recommendationsHtml;

                  } catch (error) {
                    console.error('Failed to load analysis:', error);
                    document.getElementById('analysis-content').innerHTML = '<p>Error loading analysis</p>';
                  }
                }

                // Auto-load analysis on page load
                loadAnalysis();
              </script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      },
    });

    console.log(\`🚀 Dashboard server running on http://localhost:\${this.port}\`);
    console.log(\`📊 Telemetry Analysis: http://localhost:\${this.port}/api/telemetry/analysis\`);
    console.log(\`🔄 Live Telemetry: http://localhost:\${this.port}/api/telemetry\`);
    console.log(\`🧪 Binary Processing: http://localhost:\${this.port}/api/binary/encode\`);
  }

  async start() {
    await this.serveDashboard();
  }
}

// Start the integrated dashboard server
if (import.meta.main) {
  const dashboard = new UnifiedDashboard();
  dashboard.start();
}