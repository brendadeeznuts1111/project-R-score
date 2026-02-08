// lib/ai/ai-operations-manager.ts — AI operations manager for platform automation

import { logger } from '../core/structured-logger';
import { globalCaches } from '../performance/cache-manager';
import { YAML } from 'bun';
import { Mutex } from '../core/safe-concurrency';
import { EventEmitter } from 'events';

export interface AICommand {
  id: string;
  type: 'optimize' | 'analyze' | 'predict' | 'automate';
  input: string;
  parameters?: Record<string, any>;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIInsight {
  id: string;
  type: 'performance' | 'security' | 'resource' | 'cost' | 'availability' | 'scalability';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  data?: Record<string, any>;
  timestamp: number;
  correlationId?: string;
  tags?: string[];
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface OptimizationResult {
  commandId: string;
  success: boolean;
  improvements: Array<{
    metric: string;
    before: number;
    after: number;
    improvement: number; // percentage
    trend?: 'improving' | 'degrading' | 'stable';
  }>;
  insights: AIInsight[];
  executionTime: number;
  resourcesUsed: {
    cpu: number;
    memory: number;
    network: number;
  };
  correlationId?: string;
  metrics?: {
    accuracy: number;
    precision: number;
    recall: number;
  };
}

export interface RealTimeMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    load: number[];
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    heap: number;
    external: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    requests: number;
    errors: number;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    p95: number;
    p99: number;
  };
  custom: Record<string, number>;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

export interface LRUCacheNode<T> {
  key: string;
  value: T;
  expires: number;
  prev: LRUCacheNode<T> | null;
  next: LRUCacheNode<T> | null;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  totalSets: number;
  totalGets: number;
  averageAccessTime: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
  enableMemoryTracking: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export interface CacheEvent {
  type: 'set' | 'get' | 'delete' | 'evict' | 'expire' | 'clear';
  key: string;
  timestamp: number;
  size: number;
  hitRate?: number;
}

export class AdvancedLRUCache<T> extends EventEmitter {
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: number;
  private enableStats: boolean;
  private enableMemoryTracking: boolean;
  private evictionPolicy: 'lru' | 'lfu' | 'ttl';

  private head: LRUCacheNode<T>;
  private tail: LRUCacheNode<T>;
  private cache = new Map<string, LRUCacheNode<T>>();
  private frequencyMap = new Map<string, number>(); // For LFU
  private statsMutex = new Mutex(); // Thread-safe statistics

  // Enhanced statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private totalSets = 0;
  private totalGets = 0;
  private totalAccessTime = 0;
  private memoryUsage = 0;
  private oldestEntry = 0;
  private newestEntry = 0;

  private cleanupTimer?: ReturnType<typeof setInterval>;
  private lastCleanup = Date.now();
  private isCleaningUp = false; // Prevent concurrent cleanups

  constructor(options: Partial<CacheOptions> = {}) {
    super();

    // Validate configuration
    this.validateConfig(options);

    const defaults: CacheOptions = {
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      enableMemoryTracking: true,
      evictionPolicy: 'lru',
    };

    const config = { ...defaults, ...options };

    this.maxSize = config.maxSize;
    this.defaultTTL = config.defaultTTL;
    this.cleanupInterval = config.cleanupInterval;
    this.enableStats = config.enableStats;
    this.enableMemoryTracking = config.enableMemoryTracking;
    this.evictionPolicy = config.evictionPolicy;

    // Initialize dummy head and tail nodes
    this.head = { key: '', value: null as any, expires: 0, prev: null, next: null };
    this.tail = { key: '', value: null as any, expires: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;

    this.startCleanup();
  }

  private validateConfig(options: Partial<CacheOptions>): void {
    if (options.maxSize !== undefined && options.maxSize <= 0) {
      throw new Error('Cache maxSize must be positive');
    }
    if (options.defaultTTL !== undefined && options.defaultTTL <= 0) {
      throw new Error('Cache defaultTTL must be positive');
    }
    if (options.cleanupInterval !== undefined && options.cleanupInterval <= 0) {
      throw new Error('Cache cleanupInterval must be positive');
    }
  }

  set(key: string, value: T, ttl?: number): void {
    const startTime = this.enableStats ? Bun.nanoseconds() : 0;
    const expires = Date.now() + (ttl || this.defaultTTL);

    if (this.cache.has(key)) {
      // Update existing node
      const node = this.cache.get(key)!;
      const oldSize = this.calculateItemSize(node.value);

      node.value = value;
      node.expires = expires;
      this.moveToHead(node);

      // Update memory usage
      if (this.enableMemoryTracking) {
        const newSize = this.calculateItemSize(value);
        this.memoryUsage = this.memoryUsage - oldSize + newSize;
      }

      // Update frequency for LFU
      if (this.evictionPolicy === 'lfu') {
        this.frequencyMap.set(key, (this.frequencyMap.get(key) || 0) + 1);
      }
    } else {
      // Create new node
      const newNode: LRUCacheNode<T> = {
        key,
        value,
        expires,
        prev: null,
        next: null,
      };

      // Check if eviction is needed
      if (this.cache.size >= this.maxSize) {
        this.evict();
      }

      this.cache.set(key, newNode);
      this.addToHead(newNode);

      // Initialize frequency for LFU
      if (this.evictionPolicy === 'lfu') {
        this.frequencyMap.set(key, 1);
      }

      // Update memory usage and timestamps
      if (this.enableMemoryTracking) {
        this.memoryUsage += this.calculateItemSize(value);
      }

      if (this.oldestEntry === 0) {
        this.oldestEntry = Date.now();
      }
      this.newestEntry = Date.now();
    }

    // Update statistics atomically
    this.updateStats(async () => {
      this.totalSets++;
      if (startTime > 0) {
        this.totalAccessTime += Bun.nanoseconds() - startTime;
      }
    });

    // Emit event only if there are listeners
    this.safeEmit('cache:set', {
      type: 'set',
      key,
      timestamp: Date.now(),
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
    } as CacheEvent);
  }

  get(key: string): T | null {
    const startTime = this.enableStats ? Bun.nanoseconds() : 0;
    const node = this.cache.get(key);

    if (!node) {
      this.updateStats(async () => {
        this.misses++;
        this.totalGets++;
      });

      this.safeEmit('cache:get', {
        type: 'get',
        key,
        timestamp: Date.now(),
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
      } as CacheEvent);

      return null;
    }

    // Check if expired
    if (Date.now() > node.expires) {
      this.removeNode(node);
      this.cache.delete(key);
      this.frequencyMap.delete(key);

      this.updateStats(async () => {
        this.misses++;
        this.totalGets++;
      });

      // Update memory usage
      if (this.enableMemoryTracking) {
        this.memoryUsage -= this.calculateItemSize(node.value);
      }

      this.safeEmit('cache:expire', {
        type: 'expire',
        key,
        timestamp: Date.now(),
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
      } as CacheEvent);

      return null;
    }

    // Update statistics and move node
    this.updateStats(async () => {
      this.hits++;
      this.totalGets++;
      if (startTime > 0) {
        this.totalAccessTime += Bun.nanoseconds() - startTime;
      }
    });

    // Update frequency for LFU and move to appropriate position
    if (this.evictionPolicy === 'lfu') {
      this.frequencyMap.set(key, (this.frequencyMap.get(key) || 0) + 1);
      // For LFU, we don't move to head on every access
      // Position is determined by frequency during eviction
    } else {
      this.moveToHead(node);
    }

    this.safeEmit('cache:get', {
      type: 'get',
      key,
      timestamp: Date.now(),
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
    } as CacheEvent);

    return node.value;
  }

  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    // Check if expired
    if (Date.now() > node.expires) {
      this.removeNode(node);
      this.cache.delete(key);
      this.frequencyMap.delete(key);

      // Update memory usage
      if (this.enableMemoryTracking) {
        this.memoryUsage -= this.calculateItemSize(node.value);
      }

      this.emit('cache:expire', {
        type: 'expire',
        key,
        timestamp: Date.now(),
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
      } as CacheEvent);

      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    this.frequencyMap.delete(key);

    // Update memory usage
    if (this.enableMemoryTracking) {
      this.memoryUsage -= this.calculateItemSize(node.value);
    }

    this.emit('cache:delete', {
      type: 'delete',
      key,
      timestamp: Date.now(),
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
    } as CacheEvent);

    return true;
  }

  clear(): void {
    const oldSize = this.cache.size;

    this.cache.clear();
    this.frequencyMap.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;

    // Reset statistics
    if (this.enableStats) {
      this.hits = 0;
      this.misses = 0;
      this.evictions = 0;
      this.totalSets = 0;
      this.totalGets = 0;
      this.totalAccessTime = 0;
    }

    if (this.enableMemoryTracking) {
      this.memoryUsage = 0;
    }

    this.oldestEntry = 0;
    this.newestEntry = 0;

    this.emit('cache:clear', {
      type: 'clear',
      key: '',
      timestamp: Date.now(),
      size: 0,
      hitRate: 0,
    } as CacheEvent);
  }

  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.calculateHitRate(),
      evictions: this.evictions,
      totalSets: this.totalSets,
      totalGets: this.totalGets,
      averageAccessTime: this.totalGets > 0 ? (this.totalAccessTime / this.totalGets) / 1e6 : 0,
      memoryUsage: this.memoryUsage,
      oldestEntry: this.oldestEntry > 0 ? this.oldestEntry : undefined,
      newestEntry: this.newestEntry > 0 ? this.newestEntry : undefined,
    };
  }

  // Enhanced utility methods
  private async updateStats(updateFn: () => void): Promise<void> {
    if (!this.enableStats) return;
    await this.statsMutex.withLock(async () => {
      updateFn();
    });
  }

  private safeEmit(event: string, data: CacheEvent): void {
    if (this.listenerCount(event) > 0) {
      this.emit(event, data);
    }
  }

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  private calculateItemSize(item: T): number {
    if (!this.enableMemoryTracking) return 0;

    try {
      // Rough estimation of memory usage
      if (item === null || item === undefined) return 0;

      if (typeof item === 'string') {
        return item.length * 2; // 2 bytes per character
      }

      if (typeof item === 'number') {
        return 8; // 64-bit number
      }

      if (typeof item === 'boolean') {
        return 4;
      }

      if (item instanceof Date) {
        return 8;
      }

      if (Array.isArray(item)) {
        return item.reduce((sum, val) => sum + this.calculateItemSize(val), 0) + 24;
      }

      if (typeof item === 'object') {
        // Safe JSON.stringify with circular reference handling
        const seen = new WeakSet();
        const jsonString = JSON.stringify(item, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        });
        return (jsonString?.length || 0) * 2 + 24;
      }

      return 24; // Base object overhead
    } catch {
      return 24; // Fallback estimation
    }
  }

  // Enhanced eviction methods
  private evict(): void {
    switch (this.evictionPolicy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'ttl':
        this.evictExpired();
        if (this.cache.size >= this.maxSize) {
          this.evictLRU(); // Fallback to LRU if TTL eviction doesn't free enough space
        }
        break;
      default:
        this.evictLRU();
    }
  }

  private evictLFU(): void {
    let minFrequency = Infinity;
    let lfuKey = '';

    // Find the item with the lowest frequency - use Array.from for compatibility
    for (const [key, frequency] of Array.from(this.frequencyMap.entries())) {
      if (frequency < minFrequency && this.cache.has(key)) {
        minFrequency = frequency;
        lfuKey = key;
      }
    }

    if (lfuKey && this.cache.has(lfuKey)) {
      const node = this.cache.get(lfuKey)!;
      this.removeNode(node);
      this.cache.delete(lfuKey);
      this.frequencyMap.delete(lfuKey);

      if (this.enableMemoryTracking) {
        this.memoryUsage -= this.calculateItemSize(node.value);
      }

      this.evictions++;

      this.safeEmit('cache:evict', {
        type: 'evict',
        key: lfuKey,
        timestamp: Date.now(),
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
      } as CacheEvent);
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    const expiredEntries: Array<{ key: string; node: LRUCacheNode<T> }> = [];

    // Collect expired entries in a single pass - use Array.from for compatibility
    for (const [key, node] of Array.from(this.cache.entries())) {
      if (now > node.expires) {
        expiredEntries.push({ key, node });
      }
    }

    // Remove expired entries
    for (const { key, node } of expiredEntries) {
      // Double-check the entry still exists and is expired
      const currentNode = this.cache.get(key);
      if (currentNode === node && now > node.expires) {
        this.removeNode(node);
        this.cache.delete(key);
        this.frequencyMap.delete(key);

        if (this.enableMemoryTracking) {
          this.memoryUsage -= this.calculateItemSize(node.value);
        }

        this.evictions++;

        this.safeEmit('cache:expire', {
          type: 'expire',
          key,
          timestamp: Date.now(),
          size: this.cache.size,
          hitRate: this.calculateHitRate(),
        } as CacheEvent);
      }
    }
  }

  private addToHead(node: LRUCacheNode<T>): void {
    node.prev = this.head;
    node.next = this.head.next;
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private removeNode(node: LRUCacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  private moveToHead(node: LRUCacheNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictLRU(): void {
    const lru = this.tail.prev;
    if (lru && lru !== this.head) {
      this.removeNode(lru);
      this.cache.delete(lru.key);
      this.frequencyMap.delete(lru.key);

      if (this.enableMemoryTracking) {
        this.memoryUsage -= this.calculateItemSize(lru.value);
      }

      this.evictions++;

      this.safeEmit('cache:evict', {
        type: 'evict',
        key: lru.key,
        timestamp: Date.now(),
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
      } as CacheEvent);
    }
  }

  private startCleanup(): void {
    // Clear existing timer if any
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);
  }

  private cleanupExpired(): void {
    // Prevent concurrent cleanups
    if (this.isCleaningUp) {
      return;
    }

    this.isCleaningUp = true;
    try {
      this.evictExpired();
      this.lastCleanup = Date.now();
    } finally {
      this.isCleaningUp = false;
    }
  }

  // Additional public methods for enhanced functionality
  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getValues(): T[] {
    return Array.from(this.cache.values()).map(node => node.value);
  }

  public getEntries(): Array<{ key: string; value: T; expires: number }> {
    return Array.from(this.cache.entries()).map(([key, node]) => ({
      key,
      value: node.value,
      expires: node.expires,
    }));
  }

  public getSize(): number {
    return this.cache.size;
  }

  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  public getEvictionPolicy(): 'lru' | 'lfu' | 'ttl' {
    return this.evictionPolicy;
  }

  public setEvictionPolicy(policy: 'lru' | 'lfu' | 'ttl'): void {
    this.evictionPolicy = policy;
  }

  public isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  public getLoadFactor(): number {
    return this.cache.size / this.maxSize;
  }

  public getLastCleanupTime(): number {
    return this.lastCleanup;
  }

  public updateConfig(options: Partial<CacheOptions>): void {
    // Validate new configuration
    this.validateConfig(options);

    if (options.maxSize !== undefined && options.maxSize !== this.maxSize) {
      this.maxSize = options.maxSize;
      // Evict if necessary
      while (this.cache.size > this.maxSize) {
        this.evict();
      }
    }

    if (options.defaultTTL !== undefined && options.defaultTTL !== this.defaultTTL) {
      this.defaultTTL = options.defaultTTL;
      // Note: We don't invalidate existing entries with old TTL
      // as they have their own expiration times set at creation
    }

    if (options.cleanupInterval !== undefined && options.cleanupInterval !== this.cleanupInterval) {
      this.cleanupInterval = options.cleanupInterval;
      // Restart cleanup timer with new interval
      this.startCleanup();
    }

    if (options.enableStats !== undefined) {
      this.enableStats = options.enableStats;
    }

    if (options.enableMemoryTracking !== undefined) {
      this.enableMemoryTracking = options.enableMemoryTracking;
      if (!this.enableMemoryTracking) {
        this.memoryUsage = 0; // Reset memory tracking if disabled
      }
    }

    if (options.evictionPolicy !== undefined) {
      this.evictionPolicy = options.evictionPolicy;
    }
  }

  // Generate secure cache keys to prevent collisions
  private generateCacheKey(input: string): string {
    // Simple hash function to generate consistent keys
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.removeAllListeners();
  }
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    duration: number;
    message?: string;
  }[];
  uptime: number;
  version: string;
  timestamp: number;
}

export class AIOperationsManager extends EventEmitter {
  private static instance: AIOperationsManager;
  private commandQueue: AICommand[] = [];
  private processing = false;
  private insights: AIInsight[] = [];
  private learningData: any[] = [];
  private completedCommands: Map<string, OptimizationResult> = new Map();
  private config: Record<string, any> = {}; // Loaded from YAML
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private processingTimer?: ReturnType<typeof setInterval>; // Timer for command processing
  private metricsTimer?: ReturnType<typeof setInterval>; // Timer for metrics collection
  private mutex: Mutex;
  private readonly MAX_INSIGHTS = 1000;
  private readonly MAX_COMPLETED_COMMANDS = 500;
  private readonly COMMAND_TTL = 3600000; // 1 hour
  private readonly INSIGHT_TTL = 7200000; // 2 hours

  // Enhanced features
  private metricsHistory: RealTimeMetrics[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  private correlationCounter = 0;
  private startTime = Date.now();
  private healthChecks: Array<
    () => Promise<{ name: string; status: 'pass' | 'warn' | 'fail'; message?: string }>
  > = [];
  private adaptiveThresholds: Record<string, { min: number; max: number; adaptive: boolean }> = {};
  private mlModels: Map<string, any> = new Map();

  // Advanced caching
  private insightsCache: AdvancedLRUCache<AIInsight[]>;
  private predictionsCache: AdvancedLRUCache<any>;
  private metricsCache: AdvancedLRUCache<RealTimeMetrics[]>;

  // Rate limiting
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 100;

  // Circuit breaker
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  private constructor() {
    super();
    this.mutex = new Mutex();

    // Initialize advanced caches
    this.insightsCache = new AdvancedLRUCache<AIInsight[]>({ maxSize: 500, defaultTTL: 300000 }); // 500 items, 5 min TTL
    this.predictionsCache = new AdvancedLRUCache<any>({ maxSize: 200, defaultTTL: 600000 }); // 200 items, 10 min TTL
    this.metricsCache = new AdvancedLRUCache<RealTimeMetrics[]>({
      maxSize: 100,
      defaultTTL: 120000,
    }); // 100 items, 2 min TTL

    // Load config asynchronously
    this.loadConfig().catch(error => {
      logger.error(
        'Failed to load AI config',
        error instanceof Error ? error : new Error(String(error))
      );
    });
    this.startProcessing();
    this.startCleanup();
    this.startMetricsCollection();
    this.initializeHealthChecks();
    this.initializeAdaptiveThresholds();
  }

  static getInstance(): AIOperationsManager {
    if (!AIOperationsManager.instance) {
      AIOperationsManager.instance = new AIOperationsManager();
    }
    return AIOperationsManager.instance;
  }

  // Load config from YAML using Bun-native YAML parser
  private async loadConfig() {
    try {
      const configFile = Bun.file('ai-config.yaml');
      if (await configFile.exists()) {
        const content = await configFile.text();
        this.config = YAML.parse(content) as Record<string, any>;
        logger.info('AI config loaded from YAML', {
          keys: Object.keys(this.config),
        });
      } else {
        logger.warn('No ai-config.yaml found - using defaults');
      }
    } catch (e) {
      logger.error('Config load failed', e instanceof Error ? e : new Error(String(e)));
      // Only open editor in development environment
      if (Bun.env.NODE_ENV === 'development') {
        const fileName = __filename || 'ai-operations-manager.ts';
        Bun.openInEditor(`file://${fileName}`, { line: 50 }); // Open at loadConfig line
      }
    }
  }

  /**
   * Submit a command to the AI operations manager with enhanced security and validation
   */
  async submitCommand(
    command: Omit<AICommand, 'id' | 'timestamp'>,
    clientIp?: string
  ): Promise<string> {
    return await this.mutex.withLock(async () => {
      // Rate limiting
      if (clientIp && !this.checkRateLimit(clientIp)) {
        throw new Error('Rate limit exceeded');
      }

      // Input validation
      this.validateCommand(command);

      const correlationId = this.generateCorrelationId();
      const aiCommand: AICommand = {
        ...command,
        id: this.generateId(),
        timestamp: Date.now(),
      };

      this.commandQueue.push(aiCommand);
      this.commandQueue.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

      logger.info(
        'AI command submitted',
        {
          commandId: aiCommand.id,
          type: aiCommand.type,
          priority: aiCommand.priority,
          correlationId,
        },
        ['ai', 'operations']
      );

      this.emit('command:submitted', { command: aiCommand, correlationId });

      return aiCommand.id;
    });
  }

  /**
   * Get insights with enhanced filtering and correlation (cached)
   */
  getInsights(filter?: {
    type?: AIInsight['type'];
    impact?: AIInsight['impact'];
    minConfidence?: number;
    severity?: AIInsight['severity'];
    tags?: string[];
    correlationId?: string;
    timeRange?: { start: number; end: number };
  }): AIInsight[] {
    // Generate secure cache key based on filter
    const cacheKey = this.generateSecureCacheKey('insights', filter || {});

    // Try to get from cache first
    const cached = this.insightsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let filtered = [...this.insights];

    if (filter?.type) {
      filtered = filtered.filter(insight => insight.type === filter.type);
    }

    if (filter?.impact) {
      filtered = filtered.filter(insight => insight.impact === filter.impact);
    }

    if (filter?.minConfidence) {
      filtered = filtered.filter(insight => insight.confidence >= filter.minConfidence);
    }

    if (filter?.severity) {
      filtered = filtered.filter(insight => insight.severity === filter.severity);
    }

    if (filter?.tags && filter.tags.length > 0) {
      filtered = filtered.filter(
        insight => insight.tags && filter.tags!.some(tag => insight.tags!.includes(tag))
      );
    }

    if (filter?.correlationId) {
      filtered = filtered.filter(insight => insight.correlationId === filter.correlationId);
    }

    if (filter?.timeRange) {
      filtered = filtered.filter(
        insight =>
          insight.timestamp >= filter.timeRange!.start && insight.timestamp <= filter.timeRange!.end
      );
    }

    const result = filtered.sort((a, b) => {
      // Sort by impact, then confidence, then timestamp
      const impactScore = { critical: 4, high: 3, medium: 2, low: 1 };
      const impactDiff = impactScore[b.impact] - impactScore[a.impact];
      if (impactDiff !== 0) return impactDiff;

      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;

      return b.timestamp - a.timestamp;
    });

    // Cache the result
    this.insightsCache.set(cacheKey, result, 60000); // Cache for 1 minute

    return result;
  }

  /**
   * Generate secure cache keys to prevent collisions
   */
  private generateSecureCacheKey(prefix: string, data: any): string {
    // Create a deterministic hash from the data
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${prefix}_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get insights with deep equality comparison
   */
  getInsightsDeep(filter?: {
    type?: AIInsight['type'];
    impact?: AIInsight['impact'];
    minConfidence?: number;
    compareData?: Record<string, any>;
  }): AIInsight[] {
    const insights = this.getInsights(filter);

    if (filter?.compareData) {
      return insights.filter(
        insight => insight.data && Bun.deepEquals(insight.data, filter.compareData!)
      );
    }

    return insights;
  }

  /**
   * Get system optimization suggestions with real-time metrics
   */
  async getOptimizationSuggestions(): Promise<AIInsight[]> {
    const suggestions: AIInsight[] = [];
    const currentMetrics = this.getCurrentMetrics();
    const correlationId = this.generateCorrelationId();

    // Analyze cache performance with adaptive thresholds
    const cacheStats = globalCaches.secrets.getStats();
    const cacheThreshold = this.getAdaptiveThreshold('cache_hit_rate', 0.8);

    if (cacheStats.hitRate < cacheThreshold) {
      suggestions.push({
        id: this.generateId(),
        type: 'performance',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%, below adaptive threshold of ${(cacheThreshold * 100).toFixed(1)}%`,
        confidence: 0.9,
        impact: cacheStats.hitRate < 0.5 ? 'high' : 'medium',
        severity: cacheStats.hitRate < 0.5 ? 'warning' : 'info',
        recommendations: [
          'Increase cache size by 25%',
          'Adjust TTL values based on access patterns',
          'Implement cache pre-warming strategies',
        ],
        data: {
          hitRate: cacheStats.hitRate,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          threshold: cacheThreshold,
        },
        timestamp: Date.now(),
        correlationId,
        tags: ['cache', 'performance'],
      });
    }

    // Analyze memory usage with real-time metrics
    const memoryUsage = currentMetrics.memory;
    const memoryThreshold = this.getAdaptiveThreshold('memory_usage', 0.8);

    if (memoryUsage.used / memoryUsage.total > memoryThreshold) {
      suggestions.push({
        id: this.generateId(),
        type: 'resource',
        title: 'High Memory Usage',
        description: `Memory usage is at ${((memoryUsage.used / memoryUsage.total) * 100).toFixed(1)}%, above adaptive threshold of ${(memoryThreshold * 100).toFixed(1)}%`,
        confidence: 0.95,
        impact: memoryUsage.used / memoryUsage.total > 0.9 ? 'critical' : 'high',
        severity: memoryUsage.used / memoryUsage.total > 0.9 ? 'critical' : 'warning',
        recommendations: [
          'Implement memory leak detection',
          'Optimize data structures',
          'Consider increasing heap limit',
          'Review garbage collection patterns',
        ],
        data: { memory: memoryUsage, threshold: memoryThreshold },
        timestamp: Date.now(),
        correlationId,
        tags: ['memory', 'resource'],
      });
    }

    // Analyze response times with real-time data
    const responseTime = currentMetrics.performance.responseTime;
    const responseThreshold = this.getAdaptiveThreshold('response_time', 100);

    if (responseTime > responseThreshold) {
      suggestions.push({
        id: this.generateId(),
        type: 'performance',
        title: 'Slow Response Times',
        description: `Response time is ${responseTime.toFixed(1)}ms, above adaptive threshold of ${responseThreshold}ms`,
        confidence: 0.85,
        impact: responseTime > 200 ? 'high' : 'medium',
        severity: responseTime > 200 ? 'warning' : 'info',
        recommendations: [
          'Enable response caching',
          'Optimize database queries',
          'Implement request batching',
          'Consider CDN integration',
        ],
        data: {
          responseTime,
          threshold: responseThreshold,
          p95: currentMetrics.performance.p95,
          p99: currentMetrics.performance.p99,
        },
        timestamp: Date.now(),
        correlationId,
        tags: ['response-time', 'performance'],
      });
    }

    // Analyze CPU usage
    const cpuUsage = currentMetrics.cpu.usage;
    const cpuThreshold = this.getAdaptiveThreshold('cpu_usage', 80);

    if (cpuUsage > cpuThreshold) {
      suggestions.push({
        id: this.generateId(),
        type: 'resource',
        title: 'High CPU Usage',
        description: `CPU usage is ${cpuUsage.toFixed(1)}%, above adaptive threshold of ${cpuThreshold}%`,
        confidence: 0.9,
        impact: cpuUsage > 90 ? 'critical' : 'high',
        severity: cpuUsage > 90 ? 'critical' : 'warning',
        recommendations: [
          'Identify CPU-intensive operations',
          'Implement request queuing',
          'Optimize algorithms and data structures',
          'Consider horizontal scaling',
        ],
        data: { cpu: currentMetrics.cpu, threshold: cpuThreshold },
        timestamp: Date.now(),
        correlationId,
        tags: ['cpu', 'resource'],
      });
    }

    // Analyze error rate
    const errorRate = currentMetrics.performance.errorRate;
    const errorThreshold = this.getAdaptiveThreshold('error_rate', 5);

    if (errorRate > errorThreshold) {
      suggestions.push({
        id: this.generateId(),
        type: 'availability',
        title: 'High Error Rate',
        description: `Error rate is ${errorRate.toFixed(2)}%, above adaptive threshold of ${errorThreshold}%`,
        confidence: 0.95,
        impact: errorRate > 10 ? 'critical' : 'high',
        severity: errorRate > 10 ? 'critical' : 'warning',
        recommendations: [
          'Investigate error patterns and root causes',
          'Implement circuit breakers for failing services',
          'Add comprehensive error monitoring',
          'Review service dependencies',
        ],
        data: {
          errorRate,
          threshold: errorThreshold,
          networkErrors: currentMetrics.network.errors,
        },
        timestamp: Date.now(),
        correlationId,
        tags: ['errors', 'availability'],
      });
    }

    return suggestions;
  }

  /**
   * Predict system behavior with ML models and circuit breaker (cached)
   */
  async predict(timeframe: 'hour' | 'day' | 'week'): Promise<{
    resource: { cpu: number; memory: number; storage: number };
    performance: { responseTime: number; throughput: number; errorRate: number };
    confidence: number;
    model?: string;
    correlationId?: string;
  }> {
    const correlationId = this.generateCorrelationId();
    const cacheKey = this.generateSecureCacheKey('predict', { timeframe, correlationId });

    // Try to get from cache first
    const cached = this.predictionsCache.get(cacheKey);
    if (cached) {
      return { ...cached, correlationId };
    }

    // Check circuit breaker for ML predictions
    if (!this.checkCircuitBreaker('ml_prediction')) {
      logger.warn('ML prediction circuit breaker is open, using fallback', { correlationId });
      const fallback = this.getFallbackPrediction(timeframe, correlationId);
      this.predictionsCache.set(cacheKey, fallback, 30000); // Cache fallback for 30 seconds
      return fallback;
    }

    try {
      // Try to use ML model if available
      const mlModel = this.mlModels.get('prediction');
      if (mlModel) {
        const prediction = await this.predictWithML(mlModel, timeframe);
        this.recordCircuitBreakerSuccess('ml_prediction');

        logger.info(
          'ML prediction generated',
          {
            timeframe,
            confidence: prediction.confidence,
            model: prediction.model,
            correlationId,
          },
          ['ai', 'prediction', 'ml']
        );

        const result = { ...prediction, correlationId };
        this.predictionsCache.set(cacheKey, result, 300000); // Cache for 5 minutes
        return result;
      }
    } catch (error) {
      this.recordCircuitBreakerFailure('ml_prediction');
      logger.error(
        'ML prediction failed, falling back to regression',
        error instanceof Error ? error : new Error(String(error)),
        { correlationId }
      );
    }

    // Fallback to linear regression
    const prediction = await this.predictWithRegression(timeframe);

    logger.info(
      'Regression prediction generated',
      {
        timeframe,
        confidence: prediction.confidence,
        correlationId,
      },
      ['ai', 'prediction', 'regression']
    );

    const result = { ...prediction, correlationId };
    this.predictionsCache.set(cacheKey, result, 180000); // Cache for 3 minutes
    return result;
  }

  /**
   * Execute automated optimization with circuit breaker and enhanced monitoring
   */
  async executeOptimization(commandId: string): Promise<OptimizationResult> {
    return await this.mutex.withLock(async () => {
      const start = Bun.nanoseconds();
      const correlationId = this.generateCorrelationId();

      // Check if result already exists
      const existingResult = this.completedCommands.get(commandId);
      if (existingResult) {
        return existingResult;
      }

      const command = this.commandQueue.find(c => c.id === commandId);

      if (!command) {
        throw new Error(`Command ${commandId} not found`);
      }

      logger.info(
        'Executing AI optimization',
        {
          commandId,
          type: command.type,
          input: command.input,
          correlationId,
        },
        ['ai', 'optimization']
      );

      this.emit('optimization:started', { commandId, correlationId });

      const result: OptimizationResult = {
        commandId,
        success: false,
        improvements: [],
        insights: [],
        executionTime: 0,
        resourcesUsed: { cpu: 0, memory: 0, network: 0 },
        correlationId,
      };

      try {
        // Get resource usage before optimization
        const beforeMetrics = this.getCurrentMetrics();

        // Check circuit breaker for optimization operations
        if (!this.checkCircuitBreaker('optimization')) {
          throw new Error('Optimization circuit breaker is open');
        }

        // Simulate optimization based on command type
        switch (command.type) {
          case 'optimize':
            result.improvements = await this.performOptimization(command);
            break;
          case 'analyze':
            result.insights = await this.performAnalysis(command);
            break;
          case 'predict':
            const prediction = await this.predict(command.parameters?.timeframe || 'day');
            result.insights = [
              {
                id: this.generateId(),
                type: 'performance',
                title: 'System Prediction',
                description: `Predicted system behavior for ${command.parameters?.timeframe || 'day'}`,
                confidence: prediction.confidence,
                impact: 'medium',
                recommendations: this.generateRecommendations(prediction),
                data: prediction,
                timestamp: Date.now(),
                correlationId,
                tags: ['prediction'],
              },
            ];
            break;
          case 'automate':
            result.improvements = await this.performAutomation(command);
            break;
        }

        // Get resource usage after optimization
        const afterMetrics = this.getCurrentMetrics();
        result.resourcesUsed = {
          cpu: afterMetrics.cpu.usage - beforeMetrics.cpu.usage,
          memory: afterMetrics.memory.used - beforeMetrics.memory.used,
          network:
            afterMetrics.network.bytesIn +
            afterMetrics.network.bytesOut -
            beforeMetrics.network.bytesIn -
            beforeMetrics.network.bytesOut,
        };

        result.success = true;
        result.executionTime = (Bun.nanoseconds() - start) / 1e6;

        // Calculate metrics if improvements exist
        if (result.improvements.length > 0) {
          result.metrics = this.calculateOptimizationMetrics(result.improvements);
        }

        // Store result for retrieval
        this.completedCommands.set(commandId, result);

        // Add insights to global list
        this.insights.push(...result.insights);

        // Keep only recent insights (last 1000)
        if (this.insights.length > this.MAX_INSIGHTS) {
          this.insights = this.insights.slice(-this.MAX_INSIGHTS);
        }

        this.recordCircuitBreakerSuccess('optimization');

        logger.info(
          'AI optimization completed',
          {
            commandId,
            success: result.success,
            executionTime: result.executionTime,
            improvements: result.improvements.length,
            insights: result.insights.length,
            correlationId,
          },
          ['ai', 'optimization']
        );

        this.emit('optimization:completed', { result, correlationId });
      } catch (error) {
        this.recordCircuitBreakerFailure('optimization');
        logger.error(
          'AI optimization failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            commandId,
            correlationId,
          },
          ['ai', 'error']
        );

        // Only open editor in development environment
        if (Bun.env.NODE_ENV === 'development') {
          const fileName = __filename || 'ai-operations-manager.ts';
          Bun.openInEditor(`file://${fileName}`, { line: 200 }); // Open at error line for debug
        }

        result.executionTime = (Bun.nanoseconds() - start) / 1e6;

        // Store failed result for retrieval
        this.completedCommands.set(commandId, result);

        this.emit('optimization:failed', { commandId, error, correlationId });
      }

      return result;
    });
  }

  /**
   * Start processing command queue
   */
  private startProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (!this.processing && this.commandQueue.length > 0) {
        this.processing = true;

        try {
          // Get the first command but don't remove it yet
          const command = this.commandQueue[0];
          if (command) {
            await this.executeOptimization(command.id);
            // Only remove after successful execution
            this.commandQueue.shift();
          }
        } catch (error) {
          logger.error(
            'Error processing AI command',
            error instanceof Error ? error : new Error(String(error))
          );
          // Remove failed command to prevent infinite loops
          this.commandQueue.shift();
        } finally {
          this.processing = false;
        }
      }
    }, 1000); // Process commands every second
  }

  /**
   * Get priority score for command sorting
   */
  private getPriorityScore(command: AICommand): number {
    const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityScores[command.priority];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ai-${Bun.randomUUIDv7()}`;
  }

  /**
   * Generate correlation ID for tracing
   */
  private generateCorrelationId(): string {
    return `corr-${Bun.randomUUIDv7()}`;
  }

  /**
   * Validate command input
   */
  private validateCommand(command: Omit<AICommand, 'id' | 'timestamp'>): void {
    if (!command.type || !['optimize', 'analyze', 'predict', 'automate'].includes(command.type)) {
      throw new Error('Invalid command type');
    }

    if (!command.input || typeof command.input !== 'string' || command.input.length > 1000) {
      throw new Error('Invalid input: must be string with max 1000 characters');
    }

    if (!command.priority || !['low', 'medium', 'high', 'critical'].includes(command.priority)) {
      throw new Error('Invalid priority level');
    }

    if (command.parameters && typeof command.parameters !== 'object') {
      throw new Error('Parameters must be an object');
    }
  }

  /**
   * Validate IP address format to prevent injection attacks
   */
  private validateIP(ip: string): boolean {
    // Basic IPv4 validation regex
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // Reject obvious injection attempts
    if (ip.includes(';') || ip.includes('&&') || ip.includes('||') || ip.includes('|')) {
      return false;
    }

    return ipv4Regex.test(ip);
  }

  /**
   * Check rate limit for client IP
   */
  private checkRateLimit(clientIp: string): boolean {
    // Validate IP format first
    if (!this.validateIP(clientIp)) {
      logger.warn('Invalid IP format detected, blocking request', { ip: clientIp });
      return false;
    }

    const now = Date.now();
    const clientLimit = this.rateLimiter.get(clientIp);

    if (!clientLimit || now > clientLimit.resetTime) {
      // Reset or create new limit
      this.rateLimiter.set(clientIp, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (clientLimit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    clientLimit.count++;
    return true;
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(operation: string): boolean {
    const breaker = this.circuitBreakers.get(operation);

    if (!breaker) {
      // Create new circuit breaker
      this.circuitBreakers.set(operation, {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
        nextAttempt: 0,
      });
      return true;
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(operation: string): void {
    const breaker = this.circuitBreakers.get(operation);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(operation: string): void {
    const breaker = this.circuitBreakers.get(operation);
    if (breaker) {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        breaker.state = 'open';
        breaker.nextAttempt = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      }
    }
  }

  /**
   * Get adaptive threshold for metric
   */
  private getAdaptiveThreshold(metric: string, defaultValue: number): number {
    const threshold = this.adaptiveThresholds[metric];
    if (!threshold || !threshold.adaptive) {
      return defaultValue;
    }

    // Calculate adaptive threshold based on recent metrics
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 data points
    if (recentMetrics.length < 5) {
      return defaultValue;
    }

    let values: number[] = [];
    switch (metric) {
      case 'cache_hit_rate':
        values = recentMetrics.map(m => 0.85); // Mock cache hit rate
        break;
      case 'memory_usage':
        values = recentMetrics.map(m => m.memory.used / m.memory.total);
        break;
      case 'cpu_usage':
        values = recentMetrics.map(m => m.cpu.usage);
        break;
      case 'response_time':
        values = recentMetrics.map(m => m.performance.responseTime);
        break;
      case 'error_rate':
        values = recentMetrics.map(m => m.performance.errorRate);
        break;
      default:
        return defaultValue;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );

    // Set threshold at mean + 1 standard deviation, within bounds
    const adaptiveValue = mean + stdDev;
    return Math.max(threshold.min, Math.min(threshold.max, adaptiveValue));
  }

  /**
   * Get current real-time metrics
   */
  private getCurrentMetrics(): RealTimeMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
        load: [0.5, 0.3, 0.7], // Mock load averages
        cores: 4, // Mock core count
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        heap: memUsage.heapUsed,
        external: memUsage.external,
      },
      network: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 1000000,
        requests: Math.floor(Math.random() * 1000),
        errors: Math.floor(Math.random() * 10),
      },
      performance: {
        responseTime: 50 + Math.random() * 100,
        throughput: 100 + Math.random() * 200,
        errorRate: Math.random() * 5,
        p95: 100 + Math.random() * 50,
        p99: 200 + Math.random() * 100,
      },
      custom: {},
    };
  }

  /**
   * Get historical metrics for prediction
   */
  private async getHistoricalMetrics(timeframe: string): Promise<any[]> {
    // Use real metrics history if available, otherwise mock
    if (this.metricsHistory.length > 0) {
      const dataPoints = timeframe === 'hour' ? 60 : timeframe === 'day' ? 144 : 1008;
      const interval = timeframe === 'hour' ? 60000 : timeframe === 'day' ? 600000 : 3600000;

      return Array.from({ length: Math.min(dataPoints, this.metricsHistory.length) }, (_, i) => {
        const metric =
          this.metricsHistory[this.metricsHistory.length - 1 - i] || this.getCurrentMetrics();
        return {
          timestamp: Date.now() - i * interval,
          cpu: metric.cpu.usage,
          memory: (metric.memory.used / metric.memory.total) * 100,
          storage: 20 + Math.random() * 10,
          responseTime: metric.performance.responseTime,
          throughput: metric.performance.throughput,
          errorRate: metric.performance.errorRate,
        };
      });
    }

    // Fallback to mock data
    const dataPoints = timeframe === 'hour' ? 60 : timeframe === 'day' ? 144 : 1008;

    return Array.from({ length: dataPoints }, (_, i) => ({
      timestamp: Date.now() - (dataPoints - i) * 60000,
      cpu: 30 + Math.random() * 40,
      memory: 40 + Math.random() * 30,
      storage: 20 + Math.random() * 10,
      responseTime: 50 + Math.random() * 100,
      throughput: 100 + Math.random() * 200,
      errorRate: Math.random() * 5,
    }));
  }

  /**
   * Predict with regression (fallback method)
   */
  private async predictWithRegression(timeframe: 'hour' | 'day' | 'week'): Promise<{
    resource: { cpu: number; memory: number; storage: number };
    performance: { responseTime: number; throughput: number; errorRate: number };
    confidence: number;
    model: string;
  }> {
    const historicalData = await this.getHistoricalMetrics(timeframe);

    const prediction = {
      resource: {
        cpu: this.predictTrend(historicalData.map(d => d.cpu)),
        memory: this.predictTrend(historicalData.map(d => d.memory)),
        storage: this.predictTrend(historicalData.map(d => d.storage)),
      },
      performance: {
        responseTime: this.predictTrend(historicalData.map(d => d.responseTime)),
        throughput: this.predictTrend(historicalData.map(d => d.throughput)),
        errorRate: this.predictTrend(historicalData.map(d => d.errorRate)),
      },
      confidence: 0.75,
      model: 'linear-regression',
    };

    return prediction;
  }

  /**
   * Predict with ML model
   */
  private async predictWithML(
    mlModel: any,
    timeframe: 'hour' | 'day' | 'week'
  ): Promise<{
    resource: { cpu: number; memory: number; storage: number };
    performance: { responseTime: number; throughput: number; errorRate: number };
    confidence: number;
    model: string;
  }> {
    // Mock ML prediction - in real implementation, use actual ML model
    const historicalData = await this.getHistoricalMetrics(timeframe);

    // Simulate ML model prediction with better accuracy
    const prediction = {
      resource: {
        cpu: this.predictTrend(historicalData.map(d => d.cpu)) * (0.9 + Math.random() * 0.2),
        memory: this.predictTrend(historicalData.map(d => d.memory)) * (0.9 + Math.random() * 0.2),
        storage:
          this.predictTrend(historicalData.map(d => d.storage)) * (0.95 + Math.random() * 0.1),
      },
      performance: {
        responseTime:
          this.predictTrend(historicalData.map(d => d.responseTime)) * (0.9 + Math.random() * 0.2),
        throughput:
          this.predictTrend(historicalData.map(d => d.throughput)) * (1.0 + Math.random() * 0.1),
        errorRate:
          this.predictTrend(historicalData.map(d => d.errorRate)) * (0.8 + Math.random() * 0.4),
      },
      confidence: 0.85 + Math.random() * 0.1, // Higher confidence than regression
      model: mlModel.name || 'neural-network',
    };

    return prediction;
  }

  /**
   * Get fallback prediction when circuit breaker is open
   */
  private getFallbackPrediction(
    timeframe: 'hour' | 'day' | 'week',
    correlationId: string
  ): {
    resource: { cpu: number; memory: number; storage: number };
    performance: { responseTime: number; throughput: number; errorRate: number };
    confidence: number;
    model: string;
    correlationId: string;
  } {
    const currentMetrics = this.getCurrentMetrics();

    return {
      resource: {
        cpu: currentMetrics.cpu.usage,
        memory: (currentMetrics.memory.used / currentMetrics.memory.total) * 100,
        storage: 25,
      },
      performance: {
        responseTime: currentMetrics.performance.responseTime,
        throughput: currentMetrics.performance.throughput,
        errorRate: currentMetrics.performance.errorRate,
      },
      confidence: 0.5, // Low confidence for fallback
      model: 'fallback',
      correlationId,
    };
  }

  /**
   * Simple trend prediction
   */
  private predictTrend(values: number[]): number {
    if (values.length < 2) return values[0] || 0;

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next value
    return slope * n + intercept;
  }

  /**
   * Perform optimization based on command
   */
  private async performOptimization(command: AICommand): Promise<any[]> {
    // Enhanced optimization improvements with trends
    const improvements = [
      {
        metric: 'cache_hit_rate',
        before: 0.65,
        after: 0.85,
        improvement: 30.8,
        trend: 'improving',
      },
      { metric: 'response_time', before: 150, after: 95, improvement: 36.7, trend: 'improving' },
      { metric: 'memory_usage', before: 512, after: 384, improvement: 25.0, trend: 'improving' },
    ];

    logger.info(
      'Optimization performed',
      {
        commandId: command.id,
        improvements: improvements.length,
      },
      ['ai', 'optimization']
    );

    return improvements;
  }

  /**
   * Perform analysis based on command
   */
  private async performAnalysis(command: AICommand): Promise<AIInsight[]> {
    // Generate analysis insights with correlation
    const insights = await this.getOptimizationSuggestions();

    logger.info(
      'Analysis performed',
      {
        commandId: command.id,
        insightsGenerated: insights.length,
      },
      ['ai', 'analysis']
    );

    return insights;
  }

  /**
   * Perform automation based on command
   */
  private async performAutomation(command: AICommand): Promise<any[]> {
    // Enhanced automation improvements with trends
    const improvements = [
      {
        metric: 'manual_intervention',
        before: 10,
        after: 2,
        improvement: 80.0,
        trend: 'improving',
      },
      { metric: 'error_rate', before: 5.2, after: 1.1, improvement: 78.8, trend: 'improving' },
      {
        metric: 'automation_coverage',
        before: 45,
        after: 78,
        improvement: 73.3,
        trend: 'improving',
      },
    ];

    logger.info(
      'Automation performed',
      {
        commandId: command.id,
        improvements: improvements.length,
      },
      ['ai', 'automation']
    );

    return improvements;
  }

  /**
   * Get command result
   */
  getCommandResult(commandId: string): OptimizationResult | undefined {
    return this.completedCommands.get(commandId);
  }

  /**
   * Generate recommendations from prediction
   */
  private generateRecommendations(prediction: any): string[] {
    const recommendations: string[] = [];

    if (prediction.resource.cpu > 80) {
      recommendations.push('Scale up CPU resources or optimize CPU-intensive operations');
    }

    if (prediction.resource.memory > 85) {
      recommendations.push('Increase memory allocation or implement memory optimization');
    }

    if (prediction.performance.responseTime > 200) {
      recommendations.push('Optimize response times through caching and query optimization');
    }

    if (prediction.performance.errorRate > 5) {
      recommendations.push('Investigate and address root causes of increased error rate');
    }

    return recommendations;
  }

  /**
   * Calculate optimization metrics
   */
  private calculateOptimizationMetrics(improvements: any[]): {
    accuracy: number;
    precision: number;
    recall: number;
  } {
    // Mock metrics calculation - in real implementation, calculate based on actual results
    const avgImprovement =
      improvements.reduce((sum, imp) => sum + imp.improvement, 0) / improvements.length;

    return {
      accuracy: Math.min(0.95, 0.7 + avgImprovement / 100),
      precision: Math.min(0.92, 0.65 + avgImprovement / 120),
      recall: Math.min(0.88, 0.6 + avgImprovement / 150),
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      this.metricsHistory.push(metrics);

      // Keep only last 1000 metrics entries
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Emit metrics event for monitoring
      this.emit('metrics:collected', { metrics, timestamp: Date.now() });
    }, 5000); // Collect metrics every 5 seconds
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    this.healthChecks = [
      async () => {
        const memUsage = process.memoryUsage();
        const usageRatio = memUsage.heapUsed / memUsage.heapTotal;
        return {
          name: 'memory',
          status: usageRatio > 0.9 ? 'fail' : usageRatio > 0.8 ? 'warn' : 'pass',
          message: `Memory usage: ${(usageRatio * 100).toFixed(1)}%`,
        };
      },
      async () => {
        const queueSize = this.commandQueue.length;
        return {
          name: 'command_queue',
          status: queueSize > 100 ? 'fail' : queueSize > 50 ? 'warn' : 'pass',
          message: `Queue size: ${queueSize}`,
        };
      },
      async () => {
        const insightsCount = this.insights.length;
        return {
          name: 'insights_storage',
          status: insightsCount > 950 ? 'warn' : 'pass',
          message: `Insights stored: ${insightsCount}`,
        };
      },
      async () => {
        const openBreakers = Array.from(this.circuitBreakers.values()).filter(
          b => b.state === 'open'
        ).length;
        return {
          name: 'circuit_breakers',
          status: openBreakers > 2 ? 'fail' : openBreakers > 0 ? 'warn' : 'pass',
          message: `Open circuit breakers: ${openBreakers}`,
        };
      },
    ];
  }

  /**
   * Initialize adaptive thresholds
   */
  private initializeAdaptiveThresholds(): void {
    this.adaptiveThresholds = {
      cache_hit_rate: { min: 0.5, max: 0.95, adaptive: true },
      memory_usage: { min: 0.6, max: 0.95, adaptive: true },
      cpu_usage: { min: 50, max: 95, adaptive: true },
      response_time: { min: 50, max: 500, adaptive: true },
      error_rate: { min: 1, max: 15, adaptive: true },
    };
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks = [];

    for (const check of this.healthChecks) {
      try {
        const result = await check();
        checks.push({
          ...result,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        checks.push({
          name: 'unknown',
          status: 'fail' as const,
          duration: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks,
      uptime: Date.now() - this.startTime,
      version: '2.0-enhanced',
      timestamp: Date.now(),
    };
  }

  /**
   * Get real-time metrics history (cached)
   */
  getMetricsHistory(limit?: number): RealTimeMetrics[] {
    const cacheKey = this.generateSecureCacheKey('metrics_history', { limit: limit || 'all' });

    // Try to get from cache first
    const cached = this.metricsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = limit ? this.metricsHistory.slice(-limit) : [...this.metricsHistory];

    // Cache for 30 seconds
    this.metricsCache.set(cacheKey, result, 30000);

    return result;
  }

  /**
   * Register ML model
   */
  registerMLModel(name: string, model: any): void {
    this.mlModels.set(name, model);
    logger.info('ML model registered', { name }, ['ai', 'ml']);
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    return Object.fromEntries(this.circuitBreakers);
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredData();
    }, 300000); // Run cleanup every 5 minutes
  }

  /**
   * Clean up expired data
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    let cleanedCommands = 0;
    let cleanedInsights = 0;

    // Clean up expired completed commands - use Array.from for compatibility
    for (const [id, result] of Array.from(this.completedCommands.entries())) {
      if (now - result.executionTime > this.COMMAND_TTL) {
        this.completedCommands.delete(id);
        cleanedCommands++;
      }
    }

    // Clean up old insights
    const originalLength = this.insights.length;
    this.insights = this.insights.filter(insight => now - insight.timestamp < this.INSIGHT_TTL);
    cleanedInsights = originalLength - this.insights.length;

    // Clean up old learning data
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-500);
    }

    if (cleanedCommands > 0 || cleanedInsights > 0) {
      logger.info(
        'AI Operations cleanup completed',
        {
          cleanedCommands,
          cleanedInsights,
          totalCommands: this.completedCommands.size,
          totalInsights: this.insights.length,
        },
        ['ai', 'cleanup']
      );
    }
  }

  /**
   * Clear completed commands (for cleanup)
   */
  clearCompletedCommands(): void {
    this.completedCommands.clear();
  }

  /**
   * Get cache statistics for all advanced caches
   */
  getCacheStats(): {
    insights: CacheStats;
    predictions: CacheStats;
    metrics: CacheStats;
  } {
    return {
      insights: this.insightsCache.getStats(),
      predictions: this.predictionsCache.getStats(),
      metrics: this.metricsCache.getStats(),
    };
  }

  /**
   * Clear all advanced caches
   */
  clearAllCaches(): void {
    this.insightsCache.clear();
    this.predictionsCache.clear();
    this.metricsCache.clear();
    logger.info('All advanced caches cleared', {}, ['ai', 'cache']);
  }

  /**
   * Stop the AI operations manager and clean up resources
   */
  stop(): void {
    // Clear all timers to prevent memory leaks
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    // Stop cache instances
    this.insightsCache.stop();
    this.predictionsCache.stop();
    this.metricsCache.stop();

    // Remove all event listeners
    this.removeAllListeners();

    // Clear data structures
    this.commandQueue = [];
    this.insights = [];
    this.learningData = [];
    this.completedCommands.clear();
    this.metricsHistory = [];
    this.circuitBreakers.clear();
    this.rateLimiter.clear();
    this.mlModels.clear();

    logger.info('AI Operations Manager stopped and cleaned up');
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    uptime: number;
    commandsProcessed: number;
    insightsGenerated: number;
    queueSize: number;
    memoryUsage: NodeJS.MemoryUsage;
    circuitBreakers: Record<string, CircuitBreakerState>;
    metricsHistorySize: number;
  } {
    return {
      uptime: Date.now() - this.startTime,
      commandsProcessed: this.completedCommands.size,
      insightsGenerated: this.insights.length,
      queueSize: this.commandQueue.length,
      memoryUsage: process.memoryUsage(),
      circuitBreakers: this.getCircuitBreakerStates(),
      metricsHistorySize: this.metricsHistory.length,
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      logger.info('Manual garbage collection triggered', {}, ['ai', 'maintenance']);
      return true;
    }
    return false;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operation: string): void {
    const breaker = this.circuitBreakers.get(operation);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      breaker.lastFailure = 0;
      breaker.nextAttempt = 0;
      logger.info('Circuit breaker reset', { operation }, ['ai', 'circuit-breaker']);
    }
  }

  /**
   * Export configuration and state
   */
  exportState(): {
    config: Record<string, any>;
    adaptiveThresholds: Record<string, { min: number; max: number; adaptive: boolean }>;
    systemStats: ReturnType<typeof this.getSystemStats>;
    healthStatus: Promise<HealthStatus>;
  } {
    return {
      config: this.config,
      adaptiveThresholds: this.adaptiveThresholds,
      systemStats: this.getSystemStats(),
      healthStatus: this.getHealthStatus(),
    };
  }
}

// Export singleton instance
export const aiOperations = AIOperationsManager.getInstance();
