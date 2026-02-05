import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// Core utilities for Odds Protocol with Bun v1.3 optimizations

import { hash, stripANSI } from 'bun';
import { fork } from 'child_process';
import type { OddsTick, ArbitrageOpportunity, Result, Sport } from './types.js';
import { DEFAULTS, PERFORMANCE_THRESHOLDS } from './constants.js';

/**
 * Bun v1.3: 6-57x faster ANSI code stripping
 */
export function cleanInput(text: string): string {
  return stripANSI(text);
}

/**
 * Bun v1.3: Rapidhash for fast non-cryptographic hashing
 */
export function rapidHash(data: string): bigint {
  return hash.rapidhash(data);
}

/**
 * Generate ID using Bun v1.3 rapidhash (faster than crypto)
 */
export function generateId(prefix: string = 'tick'): string {
  const input = `${prefix}-${Date.now()}-${Math.random()}`;
  return `${prefix}_${rapidHash(input).toString(16)}`;
}

/**
 * Convert American odds to implied probability
 */
export function americanToImpliedProbability(line: number, juice: number = -110): number {
  if (line > 0) {
    return 100 / (line + 100);
  } else {
    return Math.abs(line) / (Math.abs(line) + 100);
  }
}

/**
 * Calculate arbitrage edge between two odds
 */
export function calculateArbitrageEdge(
  lineA: number, 
  juiceA: number, 
  lineB: number, 
  juiceB: number
): number {
  const probA = americanToImpliedProbability(lineA, juiceA);
  const probB = americanToImpliedProbability(lineB, juiceB);
  return 1 - (probA + probB);
}

/**
 * Calculate Kelly Fraction
 */
export function calculateKellyFraction(edge: number, odds: number): number {
  // Handle potential undefined inputs
  if (edge === undefined || odds === undefined) {
    return 0;
  }
  
  // Kelly Criterion: f* = (bp - q) / b
  // where: b = odds, p = implied probability, q = 1-p
  const impliedProb = americanToImpliedProbability(odds);
  const actualProb = impliedProb * (1 + edge);
  const b = odds > 0 ? odds / 100 : -100 / odds;
  
  return (b * actualProb - (1 - actualProb)) / b;
}

/**
 * Calculate Kelly Criterion for bankroll management
 */
export function calculateKellyCriterion(
  edge: number,
  winProbability: number,
  lossProbability: number = 1 - winProbability
): number {
  if (edge <= 0) return 0;
  
  const kelly = (winProbability / lossProbability) - ((1 - winProbability) / edge);
  return Math.max(0, Math.min(kelly, DEFAULTS.ARB_KELLY_FRACTION));
}

/**
 * Check if an arbitrage opportunity is still valid
 */
export function isArbitrageValid(opportunity: ArbitrageOpportunity): boolean {
  return opportunity.expiry > new Date();
}

/**
 * Calculate tick velocity (points per second)
 */
export function calculateTickVelocity(ticks: OddsTick[]): number {
  if (ticks.length < 2) return 0;

  const recent = ticks.slice(-10); // Last 10 ticks
  let totalVelocity = 0;
  let validPairs = 0;

  for (let i = 1; i < recent.length; i++) {
    const timeDiff = recent[i].timestamp.getTime() - recent[i-1].timestamp.getTime();
    const lineDiff = Math.abs(recent[i].line - recent[i-1].line);
    
    if (timeDiff > 0) {
      totalVelocity += (lineDiff / (timeDiff / 1000)); // points per second
      validPairs++;
    }
  }

  return validPairs > 0 ? totalVelocity / validPairs : 0;
}

/**
 * Validate odds tick data quality
 */
export function validateTickQuality(tick: OddsTick): Result<boolean, string> {
  // Check timestamp (not in future, not too old)
  const now = Date.now();
  const tickTime = tick.timestamp.getTime();
  
  if (tickTime > now + 60000) { // 1 minute in future
    return { success: false, error: 'Tick timestamp is in the future' };
  }
  
  if (now - tickTime > 300000) { // 5 minutes old
    return { success: false, error: 'Tick is too old' };
  }

  // Check line bounds
  if (tick.line < -1000 || tick.line > 1000) {
    return { success: false, error: 'Line out of valid range' };
  }

  // Check juice bounds
  if (tick.juice < -1000 || tick.juice > 1000) {
    return { success: false, error: 'Juice out of valid range' };
  }

  return { success: true, data: true };
}

/**
 * Bun v1.3: Optimized batch processing with postMessage improvements
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private processing = false;
  
  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize: number = 100,
    private timeout: number = 1000
  ) {}
  
  async add(item: T): Promise<void> {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize && !this.processing) {
      await this.process();
    }
  }
  
  private async process(): Promise<void> {
    if (this.processing || this.batch.length === 0) return;
    
    this.processing = true;
    const items = this.batch.splice(0, this.batchSize);
    
    try {
      await this.processor(items);
    } catch (error) {
      console.error('Batch processing error:', error);
      // Re-add items to batch for retry
      this.batch.unshift(...items);
    } finally {
      this.processing = false;
      
      // Process remaining items if any
      if (this.batch.length > 0) {
        setTimeout(() => this.process(), 0);
      }
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private samples: number[] = [];
  private startTime: number = performance.now();

  recordSample(value: number): void {
    this.samples.push(value);
    
    // Keep only recent samples (last 1000)
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
    }
  }

  getStats() {
    if (this.samples.length === 0) {
      return { average: 0, p95: 0, p99: 0, count: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      average: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
      count: sorted.length,
      uptime: performance.now() - this.startTime
    };
  }

  isWithinThresholds(metric: keyof typeof PERFORMANCE_THRESHOLDS, value: number): boolean {
    const threshold = PERFORMANCE_THRESHOLDS[metric];
    return value <= threshold;
  }
}

/**
 * Bun v1.3: Enhanced performance monitoring with lower memory
 */
export class BunPerformanceMonitor {
  private samples: number[] = [];
  private startTime: number = performance.now();
  
  // Bun v1.3: Reduced memory usage for timers
  private timer: Timer | null = null;

  recordSample(value: number): void {
    this.samples.push(value);
    
    // Keep samples manageable with circular buffer behavior
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
    }
  }

  // Bun v1.3: 40x faster AbortSignal.timeout
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    abortController?: AbortController
  ): Promise<T> {
    const timeoutController = abortController || new AbortController();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        timeoutController.abort();
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      timeoutController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      });
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  // Bun v1.3: Optimized memory usage
  getMemoryStats() {
    const bunMemory = process.memoryUsage();
    return {
      heapUsed: bunMemory.heapUsed,
      heapTotal: bunMemory.heapTotal, // Use heapTotal instead of heapSize
      external: bunMemory.external,
      // Bun v1.3: Lower memory usage overall
      estimatedSavings: '10-30% lower vs v1.2'
    };
  }
}

/**
 * Backpressure management utilities
 */
export class BackpressureManager {
  private backpressureCount: number = 0;
  private readonly maxBackpressure: number;

  constructor(maxBackpressure: number = DEFAULTS.WS_BACKPRESSURE_LIMIT) {
    this.maxBackpressure = maxBackpressure;
  }

  recordBackpressure(): boolean {
    this.backpressureCount++;
    return this.backpressureCount > 10; // Threshold for aggressive action
  }

  clearBackpressure(): void {
    this.backpressureCount = Math.max(0, this.backpressureCount - 2);
  }

  shouldPause(): boolean {
    return this.backpressureCount > 5;
  }

  getStats() {
    return {
      backpressureCount: this.backpressureCount,
      maxBackpressure: this.maxBackpressure,
      isCritical: this.backpressureCount > 10
    };
  }
}

/**
 * Sport-specific utilities
 */
export class SportUtils {
  static isMarketOpen(sport: Sport, timestamp: Date = new Date()): boolean {
    // Implementation would check SPORTS_CONFIG market hours
    // Simplified implementation
    const hour = timestamp.getHours();
    
    switch (sport) {
      case 'nba':
        return hour >= 12 && hour <= 24; // 12 PM - 12 AM EST
      case 'nfl':
        return hour >= 13 && hour <= 23; // 1 PM - 11 PM EST
      case 'premier-league':
        return hour >= 7 && hour <= 17; // 7 AM - 5 PM EST
      default:
        return true;
    }
  }

  static getTypicalLineRange(sport: Sport): { min: number; max: number } {
    // Implementation would use SPORTS_CONFIG
    switch (sport) {
      case 'nba':
        return { min: 180, max: 250 };
      case 'nfl':
        return { min: 30, max: 60 };
      case 'premier-league':
        return { min: 1.5, max: 4.5 };
      default:
        return { min: -1000, max: 1000 };
    }
  }
}

/**
 * Bun v1.3: Process spawning with timeout and maxBuffer
 */
export async function spawnProcess(
  cmd: string[],
  options: {
    timeout?: number;
    maxBuffer?: number;
    cwd?: string;
  } = {}
) {
  const process = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: options.cwd,
    // Bun v1.3: New timeout option
    timeout: options.timeout || 30000,
    // Bun v1.3: Max buffer to prevent memory exhaustion
    maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB default
  });

  const stdout = await new Response(process.stdout).text();
  const stderr = await new Response(process.stderr).text();
  const exitCode = await process.exited;

  return {
    success: exitCode === 0,
    stdout: stripANSI(stdout), // Bun v1.3: Faster ANSI stripping
    stderr: stripANSI(stderr),
    exitCode,
  };
}

/**
 * Bun v1.3: Enhanced socket information for network diagnostics
 */
export async function getSocketInfo(hostname: string, port: number) {
  try {
    const socket = await Bun.connect({
      hostname,
      port,
      socket: {
        data(socket) {
          // Socket connected successfully
        },
        error(socket, error) {
          console.error('Socket connection failed:', error);
        },
      },
    });

    // Bun v1.3: Enhanced socket information with complete visibility
    const info = {
      localAddress: socket.localAddress,
      localPort: socket.localPort,
      localFamily: socket.localFamily,
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      remoteFamily: socket.remoteFamily,
      connectionTimestamp: Date.now(),
      protocol: 'TCP',
    };

    socket.end();
    return info;
  } catch (error) {
    console.error('Failed to get socket info:', error);
    return null;
  }
}

/**
 * Bun v1.3: Network diagnostics for multiple endpoints
 */
export async function performNetworkDiagnostics(endpoints: Array<{ hostname: string; port: number }>) {
  const results = await Promise.allSettled(
    endpoints.map(async endpoint => {
      const info = await getSocketInfo(endpoint.hostname, endpoint.port);
      return {
        endpoint: `${endpoint.hostname}:${endpoint.port}`,
        info,
        timestamp: Date.now()
      };
    })
  );

  return results.map((result, index) => ({
    endpoint: endpoints[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}

/**
 * Bun v1.3: Pipe streams to spawned processes with enhanced capabilities
 */
export async function pipeToProcess(
  stream: ReadableStream<Uint8Array>,
  cmd: string[],
  options: {
    stdout?: 'pipe' | 'inherit' | 'ignore';
    stderr?: 'pipe' | 'inherit' | 'ignore';
    cwd?: string;
    env?: Record<string, string>;
  } = {}
) {
  const process = Bun.spawn(cmd, {
    stdin: stream, // Bun v1.3: Direct stream piping
    stdout: options.stdout || 'pipe',
    stderr: options.stderr || 'pipe',
    cwd: options.cwd,
    env: options.env,
  });

  return {
    stdout: process.stdout,
    stderr: process.stderr,
    exited: process.exited,
    pid: process.pid,
  };
}

/**
 * Bun v1.3: Stream processing with JSON transformation
 */
export async function processJsonStream<T, R>(
  inputStream: ReadableStream<Uint8Array>,
  transformCmd: string[],
  parser?: (data: any) => T,
  mapper?: (item: T) => R
): Promise<R[]> {
  // Pipe input stream through transformation command (e.g., jq)
  const result = await pipeToProcess(inputStream, transformCmd);
  
  // Read the transformed output
  const output = await new Response(result.stdout).text();
  
  try {
    // Parse JSON output
    const parsed = JSON.parse(output);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    
    // Apply parser if provided
    const processedItems = parser ? items.map(parser) : items;
    
    // Apply mapper if provided
    return mapper ? processedItems.map(mapper) : processedItems as R[];
  } catch (error) {
    console.error('Failed to process JSON stream:', error);
    throw new Error(`JSON processing failed: ${(error as Error).message}`);
  }
}

/**
 * Bun v1.3: Real-time stream processing with backpressure handling
 */
export class StreamProcessor {
  private buffers: Map<string, Uint8Array[]> = new Map();
  private processing: Set<string> = new Set();

  async processStream(
    streamId: string,
    inputStream: ReadableStream<Uint8Array>,
    processor: (chunk: Uint8Array) => Promise<void>
  ): Promise<void> {
    if (this.processing.has(streamId)) {
      throw new Error(`Stream ${streamId} is already being processed`);
    }

    this.processing.add(streamId);
    this.buffers.set(streamId, []);

    try {
      const reader = inputStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Buffer chunk for potential retry
        this.buffers.get(streamId)!.push(value);
        
        // Process chunk
        await processor(value);
      }
    } finally {
      this.processing.delete(streamId);
      this.buffers.delete(streamId);
    }
  }

  getBufferedData(streamId: string): Uint8Array[] {
    return this.buffers.get(streamId) || [];
  }

  isProcessing(streamId: string): boolean {
    return this.processing.has(streamId);
  }
}

/**
 * Bun v1.3: Process control utilities with ref/unref management
 */
export class ProcessController {
  private refCount: number = 0;
  private isRefed: boolean = true;

  /**
   * Keep the event loop alive (prevent process from exiting)
   */
  ref(): void {
    if (this.refCount === 0 && !this.isRefed) {
      process.ref(); // No arguments needed in Node.js/Bun
      this.isRefed = true;
    }
    this.refCount++;
  }

  /**
   * Allow the event loop to exit if no other work is pending
   */
  unref(): void {
    if (this.refCount > 0) {
      this.refCount--;
    }
    if (this.refCount === 0 && this.isRefed) {
      process.unref(); // No arguments needed in Node.js/Bun
      this.isRefed = false;
    }
  }

  /**
   * Get current reference state
   */
  getRefState(): { count: number; isRefed: boolean } {
    return {
      count: this.refCount,
      isRefed: this.isRefed
    };
  }

  /**
   * Execute a function while keeping the process alive
   */
  async withRef<T>(fn: () => Promise<T>): Promise<T> {
    this.ref();
    try {
      return await fn();
    } finally {
      this.unref();
    }
  }

  /**
   * Execute a function allowing process to exit
   */
  async withUnref<T>(fn: () => Promise<T>): Promise<T> {
    const wasRefed = this.isRefed;
    this.unref();
    try {
      return await fn();
    } finally {
      if (wasRefed) {
        this.ref();
      }
    }
  }
}

/**
 * Bun v1.3: Enhanced process spawning with execArgv support
 */
export async function spawnProcessWithArgs(
  cmd: string[],
  options: {
    execArgv?: string[];
    timeout?: number;
    maxBuffer?: number;
    cwd?: string;
    env?: Record<string, string>;
    ref?: boolean;
  } = {}
) {
  const process = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeout || 30000,
    maxBuffer: options.maxBuffer || 1024 * 1024,
  });

  // Control event loop reference
  if (options.ref !== false) {
    process.ref();
  } else {
    process.unref();
  }

  const stdout = await new Response(process.stdout).text();
  const stderr = await new Response(process.stderr).text();
  const exitCode = await process.exited;

  return {
    success: exitCode === 0,
    stdout: stripANSI(stdout),
    stderr: stripANSI(stderr),
    exitCode,
    pid: process.pid,
  };
}

/**
 * Bun v1.3: Fork processes with runtime arguments
 */
export function forkProcessWithArgs(
  modulePath: string,
  args?: string[],
  options: {
    execArgv?: string[];
    silent?: boolean;
    env?: Record<string, string>;
  } = {}
) {
  // Use child_process.fork with execArgv support
  
  const child = fork(modulePath, args, {
    execArgv: options.execArgv || [],
    silent: options.silent || false,
    env: { ...Bun.env, ...options.env },
  });

  return child;
}

/**
 * Memory management utilities
 */
export function forceGarbageCollection(): void {
  if (globalThis.gc) {
    globalThis.gc();
  }
}

export function getMemoryStats() {
  const bunMemory = process.memoryUsage();
  const nodeMemory = process.memoryUsage();
  
  return {
    heapUsed: bunMemory.heapUsed,
    heapTotal: bunMemory.heapTotal, // Use heapTotal instead of heapSize
    external: bunMemory.external,
    rss: nodeMemory.rss,
    arrayBuffers: nodeMemory.arrayBuffers
  };
}

/**
 * Calculate arbitrage opportunity from multiple odds
 */
export function calculateArbitrageOpportunity(odds: Array<{bookmaker: string, odds: number, commission: number}>): ArbitrageOpportunity | null {
  if (odds.length < 2) return null;
  
  // Calculate implied probabilities including commission
  const impliedProbs = odds.map(o => {
    const impliedProb = 1 / o.odds;
    const adjustedProb = impliedProb * (1 + o.commission);
    return { bookmaker: o.bookmaker, probability: adjustedProb };
  });
  
  // Sum of adjusted probabilities
  const totalProb = impliedProbs.reduce((sum, p) => sum + p.probability, 0);
  
  // Arbitrage exists if total probability < 1
  if (totalProb >= 1) return null;
  
  // Calculate optimal stakes
  const totalStake = 100;
  const stakes = impliedProbs.map(p => ({
    bookmaker: p.bookmaker,
    stake: (p.probability / totalProb) * totalStake,
    odds: odds.find(o => o.bookmaker === p.bookmaker)!.odds
  }));
  
  // Calculate profit
  const profit = totalStake * (1 / totalProb - 1);
  
  return {
    opportunities: odds,
    profit,
    stakes,
    probability: totalProb,
    timestamp: new Date()
  };
}
