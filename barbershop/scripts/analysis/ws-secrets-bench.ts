#!/usr/bin/env bun

// ws-secrets-bench.ts - WebSocket Secrets Benchmark CLI

import { SecretsFieldAPI } from '../lib/api/secrets-field-api';

interface BenchOptions {
  keys?: number;
  duration?: number;
  connections?: number;
  rate?: number;
  compression?: boolean;
  output?: 'console' | 'json' | 'csv';
  realTime?: boolean;
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

// Mock WebSocket for testing
class MockWebSocket {
  private url: string;
  private onopen: (() => void) | null = null;
  private onmessage: ((event: { data: string }) => void) | null = null;
  private onclose: (() => void) | null = null;
  private onerror: ((error: any) => void) | null = null;
  private readyState: number = 1; // OPEN
  private messageCount: number = 0;
  private totalBytes: number = 0;
  private startTime: number = Date.now();

  constructor(url: string) {
    this.url = url;
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
      this.startSendingMessages();
    }, Math.random() * 100 + 50);
  }

  set onopen(cb: (() => void) | null) {
    this.onopen = cb;
  }

  set onmessage(cb: ((event: { data: string }) => void) | null) {
    this.onmessage = cb;
  }

  set onclose(cb: (() => void) | null) {
    this.onclose = cb;
  }

  set onerror(cb: ((error: any) => void) | null) {
    this.onerror = cb;
  }

  get readyState(): number {
    return this.readyState;
  }

  send(data: string): void {
    // Simulate sending data (not used in this benchmark)
  }

  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  private async startSendingMessages(): Promise<void> {
    const systemId = `bench-${Math.random().toString(36).substr(2, 9)}`;
    
    while (this.readyState === 1) {
      try {
        // Generate field data
        const fieldData = await SecretsFieldAPI.getField3D(systemId);
        
        // Compress if enabled
        let dataToSend = fieldData;
        if (this.shouldCompress()) {
          dataToSend = this.compressData(fieldData);
        }
        
        const messageData = JSON.stringify({
          type: 'field-update',
          data: dataToSend,
          timestamp: new Date().toISOString(),
          compressed: this.shouldCompress()
        });
        
        // Calculate metrics
        this.messageCount++;
        this.totalBytes += messageData.length;
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        
        // Send message
        if (this.onmessage) {
          this.onmessage({ data: messageData });
        }
        
      } catch (error) {
        if (this.onerror) {
          this.onerror(error);
        }
        break;
      }
    }
  }

  private shouldCompress(): boolean {
    // Simulate compression logic (compress if > 1000 points)
    return Math.random() > 0.5;
  }

  private compressData(data: any): any {
    // Simulate compression by reducing precision
    return {
      ...data,
      points: data.points?.slice(0, Math.floor(data.points?.length / 2)) || [],
      compressed: true,
      originalSize: JSON.stringify(data).length,
      compressedSize: JSON.stringify(data).length / 2
    };
  }

  getMetrics(): any {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      messageCount: this.messageCount,
      totalBytes: this.totalBytes,
      elapsed,
      messagesPerSecond: this.messageCount / elapsed,
      bytesPerSecond: this.totalBytes / elapsed,
      averageMessageSize: this.messageCount > 0 ? this.totalBytes / this.messageCount : 0
    };
  }
}

class WebSocketBenchmarker {
  private options: BenchOptions = {
    keys: 1000,
    duration: 60,
    connections: 10,
    rate: 5, // messages per second per connection
    compression: true,
    output: 'console',
    realTime: false
  };

  private connections: MockWebSocket[] = [];
  private metrics: any[] = [];
  private startTime: number = 0;
  private isRunning: boolean = false;

  async run(args: string[]): Promise<void> {
    this.parseArgs(args);
    
    console.log(styled('🌐 WebSocket Secrets Benchmark', 'primary'));
    console.log(styled('==============================', 'muted'));
    console.log();
    
    console.log(styled('📊 Benchmark Configuration:', 'info'));
    console.log(styled(`   Keys: ${this.options.keys}`, 'muted'));
    console.log(styled(`   Duration: ${this.options.duration}s`, 'muted'));
    console.log(styled(`   Connections: ${this.options.connections}`, 'muted'));
    console.log(styled(`   Rate: ${this.options.rate} msg/s per connection`, 'muted'));
    console.log(styled(`   Compression: ${this.options.compression ? 'ENABLED' : 'DISABLED'}`, 'muted'));
    console.log(styled(`   Real-time: ${this.options.realTime ? 'YES' : 'NO'}`, 'muted'));
    console.log();
    
    await this.runBenchmark();
  }

  private parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--keys' && args[i + 1]) {
        this.options.keys = parseInt(args[++i]);
      }
      if (arg === '--duration' && args[i + 1]) {
        this.options.duration = parseInt(args[++i]);
      }
      if (arg === '--connections' && args[i + 1]) {
        this.options.connections = parseInt(args[++i]);
      }
      if (arg === '--rate' && args[i + 1]) {
        this.options.rate = parseInt(args[++i]);
      }
      if (arg === '--compression') {
        this.options.compression = true;
      }
      if (arg === '--no-compression') {
        this.options.compression = false;
      }
      if (arg === '--output' && args[i + 1]) {
        this.options.output = args[++i] as 'console' | 'json' | 'csv';
      }
      if (arg === '--realtime') {
        this.options.realTime = true;
      }
      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(styled('🌐 WebSocket Secrets Benchmark CLI', 'primary'));
    console.log(styled('==================================', 'muted'));
    console.log();
    console.log(styled('Usage:', 'info'));
    console.log('  bun run ws-secrets-bench.ts [options]');
    console.log();
    console.log(styled('Options:', 'info'));
    console.log('  --keys <number>        Number of keys to simulate');
    console.log('  --duration <seconds>   Benchmark duration');
    console.log('  --connections <num>    Concurrent WebSocket connections');
    console.log('  --rate <per-second>    Message rate per connection');
    console.log('  --compression          Enable data compression');
    console.log('  --no-compression       Disable data compression');
    console.log('  --output <format>      Output format: console, json, csv');
    console.log('  --realtime             Show real-time metrics');
    console.log('  --help, -h             Show this help');
    console.log();
    console.log(styled('Examples:', 'info'));
    console.log('  bun run ws-secrets-bench.ts --keys 1000');
    console.log('  bun run ws-secrets-bench.ts --connections 50 --duration 300');
    console.log('  bun run ws-secrets-bench.ts --compression --realtime');
    console.log();
    console.log(styled('📚 Documentation:', 'accent'));
    console.log('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
    console.log('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
  }

  private async runBenchmark(): Promise<void> {
    console.log(styled('🚀 Starting WebSocket benchmark...', 'accent'));
    console.log();
    
    this.startTime = Date.now();
    this.isRunning = true;
    
    // Setup real-time display
    let realTimeInterval: NodeJS.Timeout | null = null;
    if (this.options.realTime) {
      realTimeInterval = setInterval(() => this.showRealTimeMetrics(), 1000);
    }
    
    try {
      // Create connections
      console.log(styled(`🔗 Creating ${this.options.connections} WebSocket connections...`, 'info'));
      await this.createConnections();
      
      // Wait for benchmark duration
      console.log(styled(`⏱️  Running benchmark for ${this.options.duration} seconds...`, 'info'));
      await new Promise(resolve => setTimeout(resolve, this.options.duration * 1000));
      
      // Close connections
      console.log(styled('🔌 Closing connections...', 'info'));
      this.closeConnections();
      
      this.isRunning = false;
      
      // Clear real-time display
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
        this.showRealTimeMetrics(); // Final update
      }
      
      console.log();
      console.log(styled('✅ Benchmark completed!', 'success'));
      console.log();
      
      // Show results
      await this.showResults();
      
    } catch (error) {
      this.isRunning = false;
      if (realTimeInterval) clearInterval(realTimeInterval);
      console.error(styled(`❌ Benchmark failed: ${error.message}`, 'error'));
      throw error;
    }
  }

  private async createConnections(): Promise<void> {
    const connectionPromises = [];
    
    for (let i = 0; i < this.options.connections; i++) {
      const promise = new Promise<void>((resolve) => {
        const ws = new MockWebSocket(`ws://localhost:3002/ws/secrets-3d?connectionId=${i}`);
        
        ws.onopen = () => {
          console.log(styled(`   Connection ${i + 1}/${this.options.connections} established`, 'success'));
          this.connections.push(ws);
          resolve();
        };
        
        ws.onmessage = (event) => {
          // Handle incoming messages (metrics are tracked internally)
        };
        
        ws.onclose = () => {
          // Handle connection close
        };
        
        ws.onerror = (error) => {
          console.warn(styled(`   Connection ${i + 1} error: ${error}`, 'warning'));
          resolve(); // Continue even if this connection fails
        };
      });
      
      connectionPromises.push(promise);
    }
    
    await Promise.all(connectionPromises);
    console.log();
  }

  private closeConnections(): void {
    this.connections.forEach(ws => {
      try {
        ws.close();
      } catch (error) {
        // Ignore close errors
      }
    });
  }

  private showRealTimeMetrics(): void {
    if (!this.isRunning) return;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = Math.min(100, (elapsed / this.options.duration) * 100);
    
    // Collect metrics from all connections
    let totalMessages = 0;
    let totalBytes = 0;
    let activeConnections = 0;
    
    this.connections.forEach(ws => {
      if (ws.readyState === 1) { // OPEN
        const metrics = ws.getMetrics();
        totalMessages += metrics.messageCount;
        totalBytes += metrics.totalBytes;
        activeConnections++;
      }
    });
    
    const overallRate = totalMessages / elapsed;
    const throughput = totalBytes / elapsed;
    
    // Clear previous line and show progress
    process.stdout.write('\r' + ' '.repeat(120)); // Clear line
    process.stdout.write(`\r${styled('📊 Progress:', 'info')} ${progress.toFixed(1)}% | ${styled('Connections:', 'muted')} ${activeConnections}/${this.options.connections} | ${styled('Messages:', 'muted')} ${totalMessages.toLocaleString()} | ${styled('Rate:', 'muted')} ${overallRate.toFixed(1)}/s | ${styled('Throughput:', 'muted')} ${this.formatBytes(throughput)}/s | ${styled('Time:', 'muted')} ${elapsed.toFixed(1)}s`);
  }

  private async showResults(): Promise<void> {
    // Collect final metrics
    const connectionMetrics = this.connections.map((ws, index) => ({
      connectionId: index + 1,
      ...ws.getMetrics()
    }));
    
    const totalMessages = connectionMetrics.reduce((sum, m) => sum + m.messageCount, 0);
    const totalBytes = connectionMetrics.reduce((sum, m) => sum + m.totalBytes, 0);
    const totalTime = (Date.now() - this.startTime) / 1000;
    const avgRate = totalMessages / totalTime;
    const throughput = totalBytes / totalTime;
    
    console.log(styled('📊 Benchmark Results:', 'primary'));
    console.log();
    console.log(styled('   Overall Metrics:', 'accent'));
    console.log(styled(`   Total Messages:    ${totalMessages.toLocaleString()}`, 'info'));
    console.log(styled(`   Total Bytes:       ${this.formatBytes(totalBytes)}`, 'info'));
    console.log(styled(`   Duration:          ${totalTime.toFixed(2)}s`, 'info'));
    console.log(styled(`   Average Rate:      ${avgRate.toFixed(1)} messages/s`, 'info'));
    console.log(styled(`   Throughput:        ${this.formatBytes(throughput)}/s`, 'info'));
    
    // Connection statistics
    const rates = connectionMetrics.map(m => m.messagesPerSecond);
    const avgConnectionRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const maxConnectionRate = Math.max(...rates);
    const minConnectionRate = Math.min(...rates);
    
    console.log();
    console.log(styled('   Connection Statistics:', 'accent'));
    console.log(styled(`   Active Connections: ${this.connections.length}`, 'info'));
    console.log(styled(`   Avg Rate/Conn:      ${avgConnectionRate.toFixed(1)} msg/s`, 'info'));
    console.log(styled(`   Max Rate/Conn:      ${maxConnectionRate.toFixed(1)} msg/s`, 'success'));
    console.log(styled(`   Min Rate/Conn:      ${minConnectionRate.toFixed(1)} msg/s`, 'warning'));
    
    // Message size statistics
    const messageSizes = connectionMetrics.map(m => m.averageMessageSize);
    const avgMessageSize = messageSizes.reduce((sum, size) => sum + size, 0) / messageSizes.length;
    
    console.log();
    console.log(styled('   Message Statistics:', 'accent'));
    console.log(styled(`   Avg Message Size:  ${this.formatBytes(avgMessageSize)}`, 'info'));
    console.log(styled(`   Compression:       ${this.options.compression ? 'ENABLED' : 'DISABLED'}`, this.options.compression ? 'success' : 'muted'));
    
    // Performance classification
    let performance = 'UNKNOWN';
    let perfColor = 'muted';
    
    if (avgRate > 100 && throughput > 1024 * 1024) { // >100 msg/s, >1MB/s
      performance = 'EXCELLENT';
      perfColor = 'success';
    } else if (avgRate > 50 && throughput > 512 * 1024) { // >50 msg/s, >512KB/s
      performance = 'GOOD';
      perfColor = 'info';
    } else if (avgRate > 20 && throughput > 256 * 1024) { // >20 msg/s, >256KB/s
      performance = 'FAIR';
      perfColor = 'warning';
    } else {
      performance = 'POOR';
      perfColor = 'error';
    }
    
    console.log();
    console.log(styled(`🏆 Overall Performance: ${performance}`, perfColor));
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      results: {
        totalMessages,
        totalBytes,
        duration: totalTime,
        averageRate: avgRate,
        throughput,
        connectionMetrics
      }
    };
    
    if (this.options.output === 'json') {
      await Bun.write(`ws-bench-results-${Date.now()}.json`, JSON.stringify(results, null, 2));
      console.log();
      console.log(styled('📄 Results saved to JSON file', 'success'));
    } else if (this.options.output === 'csv') {
      const csv = this.generateCSV(results);
      await Bun.write(`ws-bench-results-${Date.now()}.csv`, csv);
      console.log();
      console.log(styled('📄 Results saved to CSV file', 'success'));
    }
    
    console.log();
    console.log(styled('🎉 WebSocket benchmark completed successfully!', 'success'));
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${bytes}B`;
  }

  private generateCSV(results: any): string {
    const headers = ['ConnectionID', 'MessageCount', 'TotalBytes', 'Elapsed', 'MessagesPerSecond', 'BytesPerSecond', 'AvgMessageSize'];
    const rows = results.results.connectionMetrics.map((metric: any) => [
      metric.connectionId,
      metric.messageCount,
      metric.totalBytes,
      metric.elapsed.toFixed(2),
      metric.messagesPerSecond.toFixed(2),
      metric.bytesPerSecond.toFixed(2),
      metric.averageMessageSize.toFixed(2)
    ]);
    
    // Add summary row
    rows.push([
      'TOTAL',
      results.results.totalMessages,
      results.results.totalBytes,
      results.results.duration.toFixed(2),
      results.results.averageRate.toFixed(2),
      results.results.throughput.toFixed(2),
      (results.results.totalBytes / results.results.totalMessages).toFixed(2)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Run the CLI
const benchmarker = new WebSocketBenchmarker();
benchmarker.run(Bun.argv.slice(2)).catch(console.error);
