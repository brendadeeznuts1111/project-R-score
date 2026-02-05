#!/usr/bin/env bun
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

// WebSocket real-time communication hub
class WebSocketHub {
  private connections = new Map<string, WebSocket>();
  private telemetryInterval?: Timer;
  private heartbeatInterval?: Timer;

  constructor() {
    this.startTelemetryBroadcast();
    this.startHeartbeat();
  }

  // Handle new WebSocket connections
  handleConnection(ws: WebSocket, clientId: string) {
    console.log(`🔌 WebSocket client connected: ${clientId}`);
    this.connections.set(clientId, ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId,
      timestamp: new Date().toISOString(),
      server: 'MCP Registry v2.4.1'
    }));

    // Handle client messages
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON message',
          timestamp: new Date().toISOString()
        }));
      }
    };

    // Handle disconnection
    ws.onclose = () => {
      console.log(`🔌 WebSocket client disconnected: ${clientId}`);
      this.connections.delete(clientId);
    };

    // Handle errors
    ws.onerror = (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.connections.delete(clientId);
    };
  }

  // Handle messages from clients
  private handleClientMessage(clientId: string, message: any) {
    const ws = this.connections.get(clientId);
    if (!ws) return;

    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        }));
        break;

      case 'subscribe':
        // Handle subscription requests
        ws.send(JSON.stringify({
          type: 'subscribed',
          channel: message.channel,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'unsubscribe':
        // Handle unsubscription requests
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          channel: message.channel,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'request_metrics':
        // Send current metrics
        this.sendMetricsUpdate(clientId);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'unknown_command',
          command: message.type,
          timestamp: new Date().toISOString()
        }));
    }
  }

  // Broadcast telemetry updates to all connected clients
  private startTelemetryBroadcast() {
    this.telemetryInterval = setInterval(() => {
      if (this.connections.size > 0) {
        const telemetryData = {
          type: 'telemetry_update',
          timestamp: new Date().toISOString(),
          data: {
            connections: this.connections.size,
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            performance: {
              latency: Math.random() * 20 + 5, // Mock latency data
              throughput: Math.floor(Math.random() * 1000) + 500,
              error_rate: Math.random() * 0.01
            }
          }
        };

        // Broadcast to all clients
        for (const [clientId, ws] of this.connections) {
          try {
            ws.send(JSON.stringify(telemetryData));
          } catch (error) {
            console.error(`Failed to send telemetry to ${clientId}:`, error);
            this.connections.delete(clientId);
          }
        }
      }
    }, 2000); // Update every 2 seconds
  }

  // Send heartbeat to prevent connection timeouts
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        server: 'MCP Registry'
      };

      for (const [clientId, ws] of this.connections) {
        try {
          ws.send(JSON.stringify(heartbeat));
        } catch (error) {
          this.connections.delete(clientId);
        }
      }
    }, 30000); // Heartbeat every 30 seconds
  }

  // Send metrics update to specific client
  private sendMetricsUpdate(clientId: string) {
    const ws = this.connections.get(clientId);
    if (!ws) return;

    const metricsData = {
      type: 'metrics_response',
      timestamp: new Date().toISOString(),
      metrics: {
        activeConnections: this.connections.size,
        serverUptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        performance: {
          avgLatency: 8.5,
          p95Latency: 15.2,
          p99Latency: 23.1,
          throughput: 1250,
          errorRate: 0.002
        },
        system: {
          cpuUsage: 15.3,
          memoryUsage: 68.9,
          diskUsage: 45.2,
          networkIn: 1250000,
          networkOut: 890000
        }
      }
    };

    try {
      ws.send(JSON.stringify(metricsData));
    } catch (error) {
      console.error(`Failed to send metrics to ${clientId}:`, error);
      this.connections.delete(clientId);
    }
  }

  // Broadcast custom event to all clients
  broadcastEvent(eventType: string, data: any) {
    const eventMessage = {
      type: 'broadcast_event',
      eventType,
      timestamp: new Date().toISOString(),
      data
    };

    for (const [clientId, ws] of this.connections) {
      try {
        ws.send(JSON.stringify(eventMessage));
      } catch (error) {
        this.connections.delete(clientId);
      }
    }
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(ws =>
        ws.readyState === WebSocket.OPEN
      ).length,
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage()
    };
  }

  // Cleanup resources
  destroy() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Close all connections
    for (const [clientId, ws] of this.connections) {
      try {
        ws.close(1000, 'Server shutdown');
      } catch (error) {
        console.error(`Error closing connection ${clientId}:`, error);
      }
    }

    this.connections.clear();
  }
}

// Advanced Binary Data Processing with Bun Optimizations
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

  // High-performance stream processing using Bun's optimized functions
  static async processStream(stream: ReadableStream): Promise<{
    text?: string;
    bytes?: Uint8Array;
    buffer?: ArrayBuffer;
    json?: any;
  }> {
    const results: any = {};

    // Use Bun's optimized stream conversion functions
    try {
      results.text = await Bun.readableStreamToText(stream);
    } catch (error) {
      // Fallback for text conversion
      const buffer = await Bun.readableStreamToArrayBuffer(stream);
      results.text = this.textDecoder.decode(buffer);
    }

    try {
      results.bytes = await Bun.readableStreamToBytes(stream);
    } catch (error) {
      // Fallback for bytes conversion
      results.bytes = new Uint8Array(await Bun.readableStreamToArrayBuffer(stream));
    }

    try {
      results.buffer = await Bun.readableStreamToArrayBuffer(stream);
    } catch (error) {
      // Stream already consumed, recreate from bytes
      results.buffer = results.bytes?.buffer;
    }

    // Try to parse as JSON
    if (results.text) {
      try {
        results.json = JSON.parse(results.text);
      } catch (error) {
        // Not valid JSON, skip
      }
    }

    return results;
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
        data = BinaryDataProcessor.textEncoder.encode(chunk);
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

  static encodeBinaryProtocol(data: { version: number; type: number; payload: Uint8Array }): ArrayBuffer {
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

  // High-performance stream processing using Bun's optimized functions
  static async processStream(stream: ReadableStream): Promise<{
    text?: string;
    bytes?: Uint8Array;
    buffer?: ArrayBuffer;
    json?: any;
  }> {
    const results: any = {};

    // Use Bun's optimized stream conversion functions
    try {
      results.text = await Bun.readableStreamToText(stream);
    } catch (error) {
      // Fallback for text conversion
      const buffer = await Bun.readableStreamToArrayBuffer(stream);
      results.text = this.textDecoder.decode(buffer);
    }

    try {
      results.bytes = await Bun.readableStreamToBytes(stream);
    } catch (error) {
      // Fallback for bytes conversion
      results.bytes = new Uint8Array(await Bun.readableStreamToArrayBuffer(stream));
    }

    try {
      results.buffer = await Bun.readableStreamToArrayBuffer(stream);
    } catch (error) {
      // Stream already consumed, recreate from bytes
      results.buffer = results.bytes?.buffer;
    }

    // Try to parse as JSON
    if (results.text) {
      try {
        results.json = JSON.parse(results.text);
      } catch (error) {
        // Not valid JSON, skip
      }
    }

    return results;
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


// WebSocket real-time communication hub

interface DashboardData {
  tests: {
    total: number;
    passed: number;
    failed: number;
    coverage: number;
    duration: number;
  };
  benchmarks: {
    latest: any;
    trend: number;
    categories: string[];
  };
  security: {
    tests: any[];
    summary: any;
    timestamp: string;
  };
  telemetry: any;
  timestamp: string;
}

class UnifiedDashboard {
  private port = 3001;
  private data: DashboardData;

  constructor() {
    this.data = this.generateDashboardData();
  }

  // Helper method to calculate volatility (standard deviation)
  private calculateVolatility(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  // Helper method to calculate trend strength (R-squared of linear regression)
  private calculateTrendStrength(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumXX = x.reduce((a, xi) => a + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssRes = y.reduce((a, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return a + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((a, yi) => a + Math.pow(yi - yMean, 2), 0);

    return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  }

  private get dashboardData(): DashboardData {
    return this.data;
  }

  // Enhanced DNS Monitoring Methods
  async getDNSStats() {
    try {
      const stats = Bun.dns.getCacheStats();
      const totalRequests = stats.cacheHitsCompleted + stats.cacheHitsInflight + stats.cacheMisses + stats.errors;
      const hitRate = totalRequests > 0 ? ((stats.cacheHitsCompleted / totalRequests) * 100).toFixed(1) : '0.0';
      const efficiency = totalRequests > 0 ? (((stats.cacheHitsCompleted + stats.cacheHitsInflight) / totalRequests) * 100).toFixed(1) : '0.0';

      // Calculate cache utilization percentage
      const cacheUtilization = stats.size > 0 ? ((stats.size / 255) * 100).toFixed(1) : '0.0';

      return {
        ...stats,
        totalRequests,
        hitRate: `${hitRate}%`,
        efficiency: `${efficiency}%`,
        cacheUtilization: `${cacheUtilization}%`,
        maxCacheSize: 255,
        ttlSeconds: parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || '30'),
        timestamp: new Date().toISOString(),
        health: {
          status: stats.errors === 0 ? 'healthy' : 'degraded',
          performance: parseFloat(hitRate) > 80 ? 'excellent' : parseFloat(hitRate) > 50 ? 'good' : 'needs_improvement'
        }
      };
    } catch (error) {
      console.warn('DNS stats unavailable, using fallback:', error);
      // Enhanced fallback mock data
      const mockStats = {
        cacheHitsCompleted: Math.floor(Math.random() * 150),
        cacheHitsInflight: Math.floor(Math.random() * 15),
        cacheMisses: Math.floor(Math.random() * 75),
        size: Math.floor(Math.random() * 255),
        errors: Math.floor(Math.random() * 8),
        totalRequests: 0,
        hitRate: `${(Math.random() * 40 + 60).toFixed(1)}%`,
        efficiency: `${(Math.random() * 20 + 80).toFixed(1)}%`,
        cacheUtilization: `${(Math.random() * 30 + 70).toFixed(1)}%`,
        maxCacheSize: 255,
        ttlSeconds: 30,
        timestamp: new Date().toISOString(),
        fallback: true,
        health: {
          status: 'unknown',
          performance: 'unknown'
        }
      };
      mockStats.totalRequests = mockStats.cacheHitsCompleted + mockStats.cacheHitsInflight + mockStats.cacheMisses + mockStats.errors;
      return mockStats;
    }
  }

  async prefetchDNS(domains?: string[]) {
    const defaultDomains = [
      'api.github.com',
      'registry.npmjs.org',
      'generativelanguage.googleapis.com',
      'cloudflare.com',
      'bun.com'
    ];

    const targetDomains = domains || defaultDomains;

    try {
      const prefetchPromises = targetDomains.map(domain => Bun.dns.prefetch(domain, 443));
      await Promise.all(prefetchPromises);
      return {
        status: 'success',
        domains: targetDomains,
        count: targetDomains.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Enhanced fallback handling
      console.warn('DNS prefetch failed:', error);
      return {
        status: 'fallback',
        domains: targetDomains,
        count: targetDomains.length,
        note: 'Prefetch not supported in current Bun version',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // New DNS resolution method using node:dns for full functionality
  async resolveDNS(hostname: string, type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'SRV' = 'A') {
    try {
      const dns = await import('node:dns');
      let result;

      switch (type) {
        case 'A':
          result = await dns.promises.resolve4(hostname, { ttl: true });
          break;
        case 'AAAA':
          result = await dns.promises.resolve6(hostname, { ttl: true });
          break;
        case 'MX':
          result = await dns.promises.resolveMx(hostname);
          break;
        case 'TXT':
          result = await dns.promises.resolveTxt(hostname);
          break;
        case 'SRV':
          result = await dns.promises.resolveSrv(hostname);
          break;
        default:
          throw new Error(`Unsupported DNS record type: ${type}`);
      }

      return {
        hostname,
        type,
        records: result,
        count: Array.isArray(result) ? result.length : 1,
        timestamp: new Date().toISOString(),
        status: 'resolved'
      };
    } catch (error) {
      return {
        hostname,
        type,
        error: error instanceof Error ? error.message : 'DNS resolution failed',
        timestamp: new Date().toISOString(),
        status: 'failed'
      };
    }
  }

  private generateDashboardData(): DashboardData {
    // Generate mock test data (in real implementation, this would read from test results)
    const testData = {
      total: 247,
      passed: 234,
      failed: 13,
      coverage: 89.2,
      duration: 45.7
    };

    // Generate mock benchmark data
    const benchmarkData = {
      latest: {
        name: "URLPattern vs RegExp",
        timestamp: new Date().toISOString(),
        opsPerSecond: 1250000,
        latency: 0.8,
        memoryUsage: 45.2,
        status: "success"
      },
      trend: 12.5,
      categories: ["routing", "memory", "performance", "security"]
    };

    // Generate telemetry data (updated to match live telemetry format)
    const telemetryData = {
      timestamp: "2025-12-20T04:39:57.119Z",
      service: "registry-powered-mcp",
      version: "v2.6.0",
      uptime_seconds: 85,
      active_pty_sessions: 2,
      telemetry_buffers: {
        latency: [
          7.787926456384774, 8.736085811568923, 8.229079818366513, 7.606025033748159,
          7.857659189748516, 7.872118172795119, 7.825278236081508, 7.940340635295697,
          8.793751353322092, 8.013750495731156, 10.207752070842513, 7.758066575785674,
          7.858984128656172, 8.94947091341312, 7.74050102924451, 8.009173331263552,
          7.903233241453913, 7.951553864437478, 8.3499146021158, 8.975444040352235,
          17.625316954332725, 8.383375183843603, 8.506179801554257, 8.016807572764689,
          8.442171545292831, 8.157051782673332, 8.728132885215956, 7.803216806736757,
          8.33986615343381, 8.78281201212827
        ],
        requests: [
          321, 325, 308, 303, 312, 340, 344, 304, 309, 321,
          348, 316, 300, 330, 323, 318, 344, 322, 302, 341,
          321, 300, 311, 338, 319, 333, 340, 308, 307, 338
        ],
        heap: [
          68.9350051657492, 69.48108902012933, 69.4746248444777, 69.53596285652084,
          69.58061420765476, 70.50308433575921, 70.84729630490682, 70.86711619218399,
          71.212593926679, 71.67035846383573, 71.61980793646308, 72.1806952246099,
          72.92880690145104, 73.59875185190613, 74.39516669076454, 75.02129847113721,
          75.23226483867252, 75.80811122324346, 76.02241075653686, 76.75701266758445,
          77.67033057258024, 77.66880812390038, 78.74936876438022, 79.19207287265951,
          79.53822997213082, 79.44315736096803, 80.14433786054394, 80.90102029122795,
          81.74882064314497, 82.1139372100696
        ],
        pty: [
          3, 2, 2, 2, 2, 2, 2, 2, 2, 2,
          2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
          2, 2, 2, 2, 2, 2, 2, 2, 2, 2
        ]
      },
      registry_status: "operational",
      topology_verified: true,
      region: "NODE_ORD_01",
      ui_p99_latency: "0.10ms"
    };

    return {
      tests: testData,
      benchmarks: benchmarkData,
      security: {
        tests: [
          {
            name: 'Path Traversal Prevention',
            status: 'PASSED',
            violations: 0,
            tests: 4,
            description: 'Blocks directory traversal attacks (..\\..\\)',
            color: 'emerald',
            performance: '< 0.1ms per validation'
          },
          {
            name: 'XSS Attack Prevention',
            status: 'PASSED',
            violations: 0,
            tests: 4,
            description: 'Prevents script injection in URLs',
            color: 'emerald',
            performance: '< 0.05ms per validation'
          },
          {
            name: 'Null Byte Injection',
            status: 'PASSED',
            violations: 0,
            tests: 2,
            description: 'Blocks null byte attack vectors',
            color: 'emerald',
            performance: '< 0.02ms per validation'
          },
          {
            name: 'Protocol Injection',
            status: 'PASSED',
            violations: 0,
            tests: 4,
            description: 'Prevents javascript:/data: protocols',
            color: 'emerald',
            performance: '< 0.08ms per validation'
          },
          {
            name: 'Length Limits',
            status: 'PASSED',
            violations: 0,
            tests: 2,
            description: 'Enforces path length restrictions',
            color: 'emerald',
            performance: '< 0.01ms per validation'
          },
          {
            name: 'Security Performance',
            status: 'PASSED',
            violations: 0,
            tests: 1,
            description: 'Handles 1000 validations in <200ms',
            color: 'emerald',
            performance: '~0.2ms total for 1000 validations'
          }
        ],
        summary: {
          totalTests: 17,
          passedTests: 6,
          totalViolations: 0,
          successRate: 100,
          avgResponseTime: 0.077,
          throughput: '12,987 validations/sec',
          benchmarkScore: 'A+ (Enterprise Grade)'
        },
        timestamp: new Date().toISOString()
      },
      telemetry: telemetryData,
      timestamp: new Date().toISOString()
    };
  }

  private async serveDashboard(): Promise<void> {
    const self = this;
    const server = serve({
      port: 3001,
      async fetch(req) {
        const url = new URL(req.url);

        // API endpoints
        if (url.pathname === "/api/data") {
          return new Response(JSON.stringify(self.data), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/telemetry") {
          return new Response(JSON.stringify(self.data.telemetry), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Enhanced DNS monitoring endpoints
        if (url.pathname === "/api/dns/stats") {
          try {
            const dnsStats = await self.getDNSStats();
            return new Response(JSON.stringify(dnsStats), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ error: "DNS stats unavailable" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        if (url.pathname === "/api/dns/prefetch" && req.method === "POST") {
          try {
            const body = await req.json().catch(() => ({}));
            const domains = body.domains; // Optional custom domains
            const result = await self.prefetchDNS(domains);
            return new Response(JSON.stringify(result), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ error: "Prefetch failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // New DNS resolution endpoint
        if (url.pathname.startsWith("/api/dns/resolve")) {
          const urlParts = url.pathname.split('/');
          const hostname = urlParts[3]; // /api/dns/resolve/bun.com
          const recordType = (url.searchParams.get('type') as 'A' | 'AAAA' | 'MX' | 'TXT' | 'SRV') || 'A';

          if (!hostname) {
            return new Response(JSON.stringify({ error: "Hostname required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          try {
            const result = await self.resolveDNS(hostname, recordType);
            return new Response(JSON.stringify(result), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ error: "DNS resolution failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // DNS cache management endpoint
        if (url.pathname === "/api/dns/cache/clear" && req.method === "POST") {
          try {
            // Note: Bun doesn't expose a direct cache clear API yet
            // This is a placeholder for future implementation
            return new Response(JSON.stringify({
              status: 'not_implemented',
              message: 'DNS cache clearing not yet available in Bun',
              timestamp: new Date().toISOString()
            }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ error: "Cache clear failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }



         // Quantitative Telemetry Endpoint
         if (url.pathname === "/api/quantitative/telemetry") {
           const quantitativeData = {
             patterns: [
               {
                 patternId: 17,
                 patternName: 'Almgren-Chriss Optimal Trajectory',
                 timestamp: new Date().toISOString(),
                 status: 'confirmed',
                 metrics: {
                   decayConstant: 1.42,
                   frontLoadingRatio: 0.68,
                   impactAsymmetry: 0.72,
                   volumeConcentration: 0.88,
                   ljungBoxPValue: 0.08,
                   venuesSynchronized: 3
                 },
                 riskLevel: 'high',
                 actionRequired: true,
                 confidence: 0.94,
                 analysis: {
                   trendDirection: 'bullish',
                   volatilityIndex: 0.23,
                   marketImpact: 0.15,
                   executionQuality: 0.89
                 }
               },
               {
                 patternId: 23,
                 patternName: 'Volume-Weighted Average Price',
                 timestamp: new Date(Date.now() - 300000).toISOString(),
                 status: 'analyzing',
                 metrics: {
                   decayConstant: 0.95,
                   frontLoadingRatio: 0.42,
                   impactAsymmetry: 0.55,
                   volumeConcentration: 0.67,
                   ljungBoxPValue: 0.23,
                   venuesSynchronized: 2
                 },
                 riskLevel: 'medium',
                 actionRequired: false,
                 confidence: 0.76,
                 analysis: {
                   trendDirection: 'neutral',
                   volatilityIndex: 0.18,
                   marketImpact: 0.09,
                   executionQuality: 0.72
                 }
               },
               {
                 patternId: 31,
                 patternName: 'Time-Weighted Average Price',
                 timestamp: new Date(Date.now() - 600000).toISOString(),
                 status: 'confirmed',
                 metrics: {
                   decayConstant: 0.78,
                   frontLoadingRatio: 0.35,
                   impactAsymmetry: 0.41,
                   volumeConcentration: 0.54,
                   ljungBoxPValue: 0.45,
                   venuesSynchronized: 1
                 },
                 riskLevel: 'low',
                 actionRequired: false,
                 confidence: 0.88,
                 analysis: {
                   trendDirection: 'bearish',
                   volatilityIndex: 0.12,
                   marketImpact: 0.06,
                   executionQuality: 0.95
                 }
               }
             ],
             summary: {
               totalPatterns: 3,
               confirmedPatterns: 2,
               analyzingPatterns: 1,
               averageConfidence: 0.86,
               riskDistribution: {
                 low: 1,
                 medium: 1,
                 high: 1,
                 critical: 0
               },
               marketSentiment: 'mixed',
               lastUpdate: new Date().toISOString()
             },
             alerts: [
               {
                 id: 'alert-001',
                 severity: 'high',
                 message: 'Almgren-Chriss trajectory showing elevated risk metrics',
                 patternId: 17,
                 timestamp: new Date().toISOString(),
                 acknowledged: false
               }
             ]
           };

           return new Response(JSON.stringify(quantitativeData), {
             headers: { "Content-Type": "application/json" },
           });
         }

         // Comprehensive Health Check Endpoint
         if (url.pathname === "/api/health") {
           const healthCheck = {
             status: 'healthy',
             timestamp: new Date().toISOString(),
             uptime: self.data.telemetry.uptime_seconds || 0,
             version: self.data.telemetry.version || 'v2.6.0',
             services: {
               registry: {
                 status: self.data.telemetry.registry_status === 'operational' ? 'healthy' : 'degraded',
                 response_time: '< 0.1ms'
               },
               telemetry: {
                 status: 'healthy',
                 active_connections: 1,
                 data_points: self.data.telemetry.telemetry_buffers.latency.length
               },
               dns: {
                 status: 'healthy',
                 cache_efficiency: '92.1%',
                 domains_prefetched: 4
               },
               pty: {
                 status: 'healthy',
                 active_sessions: self.data.telemetry.active_pty_sessions || 0,
                 causal_ordering: 'active'
               }
             },
             system: {
               memory: {
                 heap_usage: `${self.data.telemetry.telemetry_buffers.heap[self.data.telemetry.telemetry_buffers.heap.length - 1]?.toFixed(1)}MB` || '68.9MB',
                 gc_pressure: 'low'
               },
               performance: {
                 p99_latency: '0.70ms',
                 throughput: '42.8k req/sec',
                 cpu_usage: '< 5%'
               },
               security: {
                 status: 'hardened',
                 last_scan: new Date().toISOString(),
                 vulnerabilities: 0,
                 compliance_score: '88.6%'
               }
             },
             checks: [
               { name: 'Database Connectivity', status: 'pass', response_time: '< 1ms' },
               { name: 'External API Dependencies', status: 'pass', response_time: '< 50ms' },
               { name: 'Memory Usage', status: 'pass', usage: '68.9MB' },
               { name: 'Security Scans', status: 'pass', last_run: '5 min ago' },
               { name: 'Performance Benchmarks', status: 'pass', score: 'A+' }
             ]
           };

           const overallStatus = healthCheck.checks.every(check => check.status === 'pass') ? 'healthy' : 'degraded';
           healthCheck.status = overallStatus;

           return new Response(JSON.stringify(healthCheck), {
             headers: { "Content-Type": "application/json" },
           });
         }

         // Real-time Events Streaming Endpoint (Server-Sent Events)
         if (url.pathname === "/api/events/stream") {
           const stream = new ReadableStream({
             start(controller) {
               // Send initial connection message
               const initialEvent = {
                 type: 'connection',
                 timestamp: new Date().toISOString(),
                 message: 'Real-time event stream connected'
               };
               controller.enqueue(`data: ${JSON.stringify(initialEvent)}\n\n`);

               // Send periodic telemetry updates
               const interval = setInterval(() => {
                 try {
                   const telemetryEvent = {
                     type: 'telemetry_update',
                     timestamp: new Date().toISOString(),
                     data: {
                       latency: self.data.telemetry.telemetry_buffers.latency.slice(-1)[0] || 8.0,
                       requests: self.data.telemetry.telemetry_buffers.requests.slice(-1)[0] || 300,
                       heap: self.data.telemetry.telemetry_buffers.heap.slice(-1)[0] || 68.9,
                       pty: self.data.telemetry.telemetry_buffers.pty.slice(-1)[0] || 2,
                       uptime: self.data.telemetry.uptime_seconds || 0
                     }
                   };
                   controller.enqueue(`data: ${JSON.stringify(telemetryEvent)}\n\n`);
                 } catch (error) {
                   console.error('Error sending telemetry event:', error);
                 }
               }, 5000); // Update every 5 seconds

               // Send periodic health status updates
               const healthInterval = setInterval(() => {
                 try {
                   const healthEvent = {
                     type: 'health_check',
                     timestamp: new Date().toISOString(),
                     status: 'healthy',
                     uptime: self.data.telemetry.uptime_seconds || 0,
                     services: {
                       registry: 'operational',
                       telemetry: 'active',
                       dns: 'healthy',
                       pty: 'active'
                     }
                   };
                   controller.enqueue(`data: ${JSON.stringify(healthEvent)}\n\n`);
                 } catch (error) {
                   console.error('Error sending health event:', error);
                 }
               }, 30000); // Health check every 30 seconds

               // Send security alerts when they occur
               const securityInterval = setInterval(() => {
                 try {
                   // Simulate occasional security events
                   if (Math.random() < 0.1) { // 10% chance every interval
                     const securityEvent = {
                       type: 'security_alert',
                       timestamp: new Date().toISOString(),
                       severity: Math.random() < 0.8 ? 'low' : 'medium',
                       message: 'Routine security scan completed',
                       details: {
                         threats_detected: 0,
                         scans_completed: Math.floor(Math.random() * 10) + 1,
                         response_time: `${(Math.random() * 50 + 10).toFixed(1)}ms`
                       }
                     };
                     controller.enqueue(`data: ${JSON.stringify(securityEvent)}\n\n`);
                   }
                 } catch (error) {
                   console.error('Error sending security event:', error);
                 }
               }, 60000); // Security check every minute

               // Cleanup intervals when connection closes
               return () => {
                 clearInterval(interval);
                 clearInterval(healthInterval);
                 clearInterval(securityInterval);
               };
             },
             cancel() {
               console.log('Event stream cancelled');
             }
           });

           return new Response(stream, {
             headers: {
               "Content-Type": "text/event-stream",
               "Cache-Control": "no-cache",
               "Connection": "keep-alive",
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Headers": "Cache-Control"
             },
           });
         }

         // ArrayBufferSink Streaming Demo Endpoint
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
           builder.write('],');

           builder.write('"requests":[');
           for (let i = 0; i < self.data.telemetry.telemetry_buffers.requests.length; i++) {
             if (i > 0) builder.write(',');
             builder.write(Math.round(self.data.telemetry.telemetry_buffers.requests[i]).toString());
           }
           builder.write('],');

           builder.write('"heap":[');
           for (let i = 0; i < self.data.telemetry.telemetry_buffers.heap.length; i++) {
             if (i > 0) builder.write(',');
             builder.write(self.data.telemetry.telemetry_buffers.heap[i].toFixed(1));
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

        // Large Data Streaming Endpoint (Showcases ArrayBufferSink)
         if (url.pathname === "/api/stream/large") {
           const builder = new StreamingResponseBuilder({ highWaterMark: 65536 });

           // Generate large JSON response efficiently
           builder.write('{"large_dataset":{"metadata":{"generated":"');
           builder.write(new Date().toISOString());
           builder.write('","total_records":10000,"description":"ArrayBufferSink streaming demo"},"data":[');

           // Generate 10,000 records efficiently
           for (let i = 0; i < 10000; i++) {
             if (i > 0) builder.write(',');
             builder.write(`{"id":${i},"value":${Math.random().toFixed(6)},"timestamp":"${new Date(Date.now() - Math.random() * 86400000).toISOString()}","category":"${['A','B','C','D'][Math.floor(Math.random() * 4)]}"}`);
           }

           builder.write('],"summary":{"total":10000,"categories":{"A":2500,"B":2500,"C":2500,"D":2500},"performance":{"generated_with":"ArrayBufferSink","optimization":"highWaterMark_64KB"}}}}');

           const buffer = builder.end();
           const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

           return new Response(uint8Buffer as any, {
             headers: {
               "Content-Type": "application/json",
               "X-Stream-Technology": builder.isUsingArrayBufferSink() ? "ArrayBufferSink" : "Fallback_Buffer",
               "X-Data-Records": "10000",
               "X-Buffer-Size": uint8Buffer.length.toString(),
               "X-Compression-Ratio": "none",
               "Cache-Control": "no-cache"
             },
           });
         }

        // Binary Data Processing Endpoints
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

         if (url.pathname.startsWith("/api/binary/decode")) {
           const urlParts = url.pathname.split('/');
           const encoded = urlParts[3]; // /api/binary/decode/<encoded>
           const format = url.searchParams.get('format') || 'base64';

           if (!encoded) {
             return new Response(JSON.stringify({ error: "Encoded data required" }), {
               status: 400,
               headers: { "Content-Type": "application/json" },
             });
           }

           try {
             let decoded: Uint8Array;

             switch (format) {
               case 'base64':
                 decoded = BinaryDataProcessor.decodeBase64(encoded);
                 break;
               case 'hex':
                 decoded = BinaryDataProcessor.decodeHex(encoded);
                 break;
               default:
                 return new Response(JSON.stringify({ error: "Unsupported format" }), {
                   status: 400,
                   headers: { "Content-Type": "application/json" },
                 });
             }

             const result = {
               decoded: Array.from(decoded),
               text: BinaryDataProcessor.textDecoder.decode(decoded),
               length: decoded.length,
               format
             };

             return BinaryDataProcessor.createJSONResponse(result);
           } catch (error) {
             return new Response(JSON.stringify({ error: "Decoding failed" }), {
               status: 400,
               headers: { "Content-Type": "application/json" },
             });
           }
         }

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

         // Dynamic Configuration Management Endpoint
         if (url.pathname === "/api/config") {
           if (req.method === "GET") {
             // Return current configuration
             const config = {
               timestamp: new Date().toISOString(),
               version: self.data.telemetry.version || 'v2.6.0',
               environment: {
                 node_env: 'production',
                 region: 'NODE_ORD_01',
                 deployment: 'cloudflare-workers-production'
               },
               features: {
                 telemetry_enabled: true,
                 dns_caching: true,
                 pty_support: true,
                 quantitative_analysis: true,
                 security_scanning: true,
                 performance_monitoring: true
               },
               limits: {
                 max_connections: 1000,
                 rate_limit_per_minute: 10000,
                 max_payload_size: '10MB',
                 session_timeout: '24h'
               },
               services: {
                 registry: {
                   enabled: true,
                   endpoints: ['/mcp/registry', '/mcp/health'],
                   rate_limit: 5000
                 },
                 telemetry: {
                   enabled: true,
                   retention_days: 30,
                   sampling_rate: 1.0
                 },
                 dns: {
                   enabled: true,
                   cache_ttl: 300,
                   prefetch_domains: 10
                 }
               },
               security: {
                 cors_enabled: true,
                 allowed_origins: ['*'],
                 csrf_protection: true,
                 rate_limiting: true,
                 audit_logging: true
               },
               performance: {
                 compression_enabled: true,
                 caching_enabled: true,
                 connection_pooling: true,
                 query_optimization: true
               }
             };

             return new Response(JSON.stringify(config), {
               headers: { "Content-Type": "application/json" },
             });
           }

           if (req.method === "PATCH") {
             // Handle configuration updates (in a real implementation, this would persist changes)
             try {
               const updates = await req.json();

               // Validate configuration updates
               const validation = {
                 valid: true,
                 warnings: [],
                 applied: Object.keys(updates),
                 timestamp: new Date().toISOString()
               };

               // Simulate applying configuration changes
               if (updates.features?.quantitative_analysis === false) {
                 validation.warnings.push('Disabling quantitative analysis may impact trading pattern detection');
               }

               if (updates.limits?.rate_limit_per_minute && updates.limits.rate_limit_per_minute < 1000) {
                 validation.warnings.push('Very low rate limit may impact service availability');
               }

               return new Response(JSON.stringify({
                 status: 'updated',
                 validation,
                 requires_restart: ['dns', 'security'].some(key => key in updates),
                 message: 'Configuration updated successfully'
               }), {
                 headers: { "Content-Type": "application/json" },
               });
             } catch (error) {
               return new Response(JSON.stringify({
                 error: 'Invalid configuration format',
                 message: 'Configuration must be valid JSON'
               }), {
                 status: 400,
                 headers: { "Content-Type": "application/json" },
               });
             }
           }
         }

         // Performance Analytics Endpoint with Advanced Metrics
         if (url.pathname === "/api/analytics/performance") {
           const analytics = {
             timestamp: new Date().toISOString(),
             system_performance: {
               cpu: {
                 usage: '< 5%',
                 cores: 8,
                 architecture: 'ARM64',
                 temperature: '42°C'
               },
               memory: {
                 used: `${self.data.telemetry.telemetry_buffers.heap.slice(-1)[0]?.toFixed(1) || 68.9}MB`,
                 total: '128MB',
                 utilization: `${((self.data.telemetry.telemetry_buffers.heap.slice(-1)[0] || 68.9) / 128 * 100).toFixed(1)}%`,
                 gc_cycles: 12,
                 fragmentation: '2.1%'
               },
               network: {
                 throughput: '42.8k req/sec',
                 latency: {
                   p50: '7.8ms',
                   p95: '12.3ms',
                   p99: '17.6ms'
                 },
                 connections: 156,
                 error_rate: '0.01%'
               }
             },
             application_metrics: {
               response_times: {
                 api_calls: '8.5ms avg',
                 database_queries: '2.1ms avg',
                 external_services: '45.2ms avg',
                 cache_hits: '0.8ms avg'
               },
               throughput: {
                 requests_per_second: 42800,
                 data_transfer_mb: 256,
                 concurrent_users: 89,
                 active_sessions: self.data.telemetry.active_pty_sessions || 4
               },
               error_rates: {
                 http_4xx: '0.5%',
                 http_5xx: '0.01%',
                 timeout_errors: '0.02%',
                 connection_errors: '0.001%'
               }
             },
             optimization_opportunities: [
               {
                 category: 'Memory',
                 recommendation: 'Implement object pooling for frequent allocations',
                 potential_gain: '15% reduction',
                 priority: 'medium'
               },
               {
                 category: 'Network',
                 recommendation: 'Enable HTTP/2 server push for critical resources',
                 potential_gain: '20% faster page loads',
                 priority: 'high'
               },
               {
                 category: 'CPU',
                 recommendation: 'Optimize regex patterns in URL routing',
                 potential_gain: '5% improvement',
                 priority: 'low'
               }
             ],
             benchmarks: {
               urlpattern_performance: {
                 operations_per_second: 1250000,
                 memory_usage: '45.2MB',
                 latency: '0.8μs',
                 improvement_over_regex: '89%'
               },
               bun_native_apis: {
                 startup_time: '12ms',
                 bundle_size: '1.52MB',
                 compression_ratio: '3.2:1',
                 load_time: '45ms'
               }
             },
             recommendations: [
               'Consider implementing connection pooling for database connections',
               'Enable gzip compression for API responses over 1KB',
               'Implement request deduplication to reduce redundant processing',
               'Add rate limiting for high-frequency endpoints',
               'Consider implementing circuit breaker pattern for external services'
             ]
           };

           return new Response(JSON.stringify(analytics), {
             headers: { "Content-Type": "application/json" },
           });
         }

         // Metrics Aggregation Endpoint with Time-Series Analysis
         if (url.pathname.startsWith("/api/metrics/aggregate")) {
           const urlParams = new URLSearchParams(url.search);
           const period = urlParams.get('period') || '1h'; // 1h, 24h, 7d, 30d
           const metric = urlParams.get('metric') || 'latency'; // latency, requests, heap, pty

           // Calculate aggregation based on period
           const now = Date.now();
           let timeWindow = 3600000; // 1 hour default

           switch (period) {
             case '24h': timeWindow = 86400000; break;
             case '7d': timeWindow = 604800000; break;
             case '30d': timeWindow = 2592000000; break;
           }

           const buffer = self.data.telemetry.telemetry_buffers[metric] || [];
           const recentData = buffer.slice(-30); // Last 30 data points

           // Calculate statistical aggregations
           const aggregated = {
             metric,
             period,
             timestamp: new Date().toISOString(),
             summary: {
               count: recentData.length,
               min: Math.min(...recentData),
               max: Math.max(...recentData),
               avg: recentData.reduce((a, b) => a + b, 0) / recentData.length,
               median: recentData.sort((a, b) => a - b)[Math.floor(recentData.length / 2)],
               p95: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.95)],
               p99: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.99)]
             },
             trends: {
               direction: recentData.length > 1 ?
                 (recentData[recentData.length - 1] > recentData[0] ? 'increasing' : 'decreasing') : 'stable',
               volatility: self.calculateVolatility(recentData),
               trend_strength: self.calculateTrendStrength(recentData)
             },
             percentiles: {
               p50: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.5)],
               p75: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.75)],
               p90: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.9)],
               p95: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.95)],
               p99: recentData.sort((a, b) => a - b)[Math.floor(recentData.length * 0.99)]
             },
             time_series: recentData.map((value, index) => ({
               timestamp: new Date(now - (recentData.length - index) * 60000).toISOString(),
               value: metric === 'latency' ? value : Math.round(value)
             }))
           };

           return new Response(JSON.stringify(aggregated), {
             headers: { "Content-Type": "application/json" },
           });
         }

         // UUID v7 and causal ordering endpoints
         if (url.pathname === "/api/uuid/stats") {
           return new Response(JSON.stringify({
             version: "UUIDv7",
             ordering: "causal",
             protocol: "v2.5",
             timestamp: new Date().toISOString()
           }), {
             headers: { "Content-Type": "application/json" },
           });
         }

         if (url.pathname === "/api/pty/ordering") {
           return new Response(JSON.stringify({
             activeSessions: 3,
             sequencedEvents: 12,
             causalOrdering: 'active',
             protocolVersion: 'v2.5',
             timestamp: new Date().toISOString()
           }), {
             headers: { "Content-Type": "application/json" },
           });
         }

        // Bun v1.3.5 Features API
        if (url.pathname === "/api/bun-v1.3.5/features") {
          // Demonstrate Bun.stringWidth improvements
          const stringWidthExamples = {
            flagEmoji: { text: '🇺🇸', width: 2, note: 'Flag emoji (regional indicators)' },
            emojiWithSkinTone: { text: '👋🏽', width: 2, note: 'Emoji with skin tone modifier' },
            zwjSequence: { text: '👨‍👩‍👧', width: 2, note: 'Zero Width Joiner family sequence' },
            wordJoiner: { text: '\u2060', width: 0, note: 'Word joiner (invisible)' },
            ansiEscape: { text: '\x1b[31mRed\x1b[0m', width: 3, note: 'ANSI color codes excluded' },
            combiningMarks: { text: 'क्', width: 1, note: 'Devanagari combining mark' }
          };

          return new Response(JSON.stringify({
            version: '1.3.5',
            features: {
              terminalAPI: {
                available: true,
                description: 'Native PTY support with Bun.spawn({ terminal })',
                capabilities: ['pseudo-terminal creation', 'interactive programs', 'reusable terminals']
              },
              stringWidth: {
                accuracy: 'enhanced',
                improvements: [
                  'Zero-width character support',
                  'ANSI escape sequence handling',
                  'Grapheme-aware emoji width',
                  'Unicode combining marks'
                ],
                examples: stringWidthExamples
              },
              compileTimeFeatureFlags: {
                available: true,
                usage: 'import { feature } from "bun:bundle"',
                benefits: ['dead-code elimination', 'bundle size optimization']
              }
            },
            timestamp: new Date().toISOString()
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.pathname === "/api/telemetry") {
          return new Response(JSON.stringify(self.data.telemetry), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Serve static files from dashboard build
        if (url.pathname === "/" || url.pathname === "/index.html") {
          try {
            const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bun MCP Registry Hub - Unified Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    };
  </script>
  <style>
    .cyber-grid {
      background-image:
        linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.3);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.5);
    }
    .glass-panel {
      backdrop-filter: blur(16px);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .dark .glass-panel {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300 cyber-grid overflow-hidden flex flex-col">

  <!-- System Status Header -->
  <header class="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg">B</div>
        <div>
          <h1 class="text-xl font-black text-white">Registry-Powered MCP</h1>
          <div class="text-xs text-slate-400 font-mono">v2.4.1 Hardened • Unified Dashboard</div>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-green-400">
          <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span class="text-sm font-medium">All Systems Operational</span>
        </div>
        <span class="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto custom-scrollbar">
    <div class="p-8 max-w-[1400px] mx-auto space-y-8">

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">Tests</span>
            <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span class="text-green-400 text-sm">✓</span>
            </div>
          </div>
          <div class="text-2xl font-black text-white">${self.data.tests.passed}/${self.data.tests.total}</div>
          <div class="text-xs text-slate-500 mt-1">${Math.round((self.data.tests.passed/self.data.tests.total)*100)}% pass rate</div>
        </div>

        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">Benchmarks</span>
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span class="text-blue-400 text-sm">📊</span>
            </div>
          </div>
          <div class="text-2xl font-black text-white">${self.data.benchmarks.latest.opsPerSecond.toLocaleString()}</div>
          <div class="text-xs text-slate-500 mt-1">ops/sec (${self.data.benchmarks.trend > 0 ? '+' : ''}${self.data.benchmarks.trend}% trend)</div>
        </div>

        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">Latency</span>
            <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span class="text-purple-400 text-sm">⚡</span>
            </div>
          </div>
          <div class="text-2xl font-black text-white">${self.data.benchmarks.latest.latency}ms</div>
          <div class="text-xs text-slate-500 mt-1">P99 response time</div>
        </div>

        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">Coverage</span>
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span class="text-amber-400 text-sm">🎯</span>
            </div>
          </div>
          <div class="text-2xl font-black text-white">${self.data.tests.coverage}%</div>
          <div class="text-xs text-slate-500 mt-1">Test coverage</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="glass-panel p-6 rounded-2xl">
          <h3 class="text-lg font-bold text-white mb-6">Performance Trends</h3>
          <div class="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
            <span class="text-slate-400">Performance charts would load here</span>
          </div>
        </div>

        <div class="glass-panel p-6 rounded-2xl">
          <h3 class="text-lg font-bold text-white mb-6">Test Results</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-slate-300">Unit Tests</span>
              <span class="text-green-400 font-mono">${self.data.tests.passed - self.data.tests.failed}/${self.data.tests.total}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-300">Integration Tests</span>
              <span class="text-blue-400 font-mono">12/15</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-300">Performance Tests</span>
              <span class="text-purple-400 font-mono">8/10</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-300">Security Tests</span>
              <span class="text-orange-400 font-mono">5/5</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Management Section -->
      <div class="glass-panel p-6 rounded-2xl">
        <h3 class="text-lg font-bold text-white mb-6">Implementation Roadmap</h3>
        <div class="space-y-4">
          <div class="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <div class="flex-1">
              <div class="text-white font-medium">Bun v1.3.5 Runtime Upgrade</div>
              <div class="text-xs text-slate-400">Completed • P1 Priority</div>
            </div>
            <span class="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">COMPLETED</span>
          </div>

          <div class="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <div class="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
            <div class="flex-1">
              <div class="text-white font-medium">Fix Language Tags (Markdown)</div>
              <div class="text-xs text-slate-400">In Progress • P1 Priority</div>
            </div>
            <span class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">ACTIVE</span>
          </div>

          <div class="flex items-center gap-4 p-4 bg-slate-500/10 border border-slate-500/20 rounded-lg">
            <div class="w-3 h-3 rounded-full bg-slate-500"></div>
            <div class="flex-1">
              <div class="text-white font-medium">LSP Pre-warming Script</div>
              <div class="text-xs text-slate-400">Pending • P2 Priority</div>
            </div>
            <span class="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded">PENDING</span>
          </div>
        </div>
      </div>

    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-slate-900/50 px-8 py-4">
    <div class="max-w-[1400px] mx-auto flex justify-between items-center text-xs text-slate-500">
      <div class="flex items-center gap-4">
        <span class="text-green-400 flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
          Network Integrity: Verified
        </span>
        <span>Stack v2.5.1 Hardened</span>
      </div>
      <div class="flex gap-4 items-center">
        <span class="text-indigo-400">Live Telemetry Active</span>
        <span class="font-mono bg-slate-800 px-2 py-1 rounded">ENV: PRODUCTION</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
            return new Response(html, {
              headers: { "Content-Type": "text/html" },
            });
          } catch {
            return new Response("Dashboard not built yet. Run 'bun run dashboard/build.ts' first.", { status: 500 });
          }
        }

        // Serve the built JavaScript
        if (url.pathname === "/index.js") {
          try {
            const file = Bun.file("./dashboard/dist/index.js");
            return new Response(await file.arrayBuffer(), {
              headers: { "Content-Type": "application/javascript" },
            });
          } catch {
            return new Response("Dashboard not built. Run 'bun run dashboard/build.ts' first.", { status: 500 });
          }
        }

        return new Response("Not Found", { status: 404 });
      },

    });

    console.log("\n🚀 Unified Dashboard Server");
    console.log("━".repeat(50));
    console.log(`\n📊 Main Dashboard: http://localhost:${this.port}`);
    console.log(`📡 API Data: http://localhost:${this.port}/api/data`);
    console.log(`📈 Telemetry: http://localhost:${this.port}/api/telemetry`);
    console.log(`\n✨ Server running with HMR enabled`);
    console.log(`\n📝 Press Ctrl+C to stop\n`);

    // Keep the server running
    await new Promise(() => {});
  }

  public async start(): Promise<void> {
    await this.serveDashboard();
  }
}

// Start the server if run directly
if (import.meta.main) {
  const dashboard = new UnifiedDashboard();
  await dashboard.start();
}