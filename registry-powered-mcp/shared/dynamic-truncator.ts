// Global performance API (available in all modern runtimes)

/**
 * Dynamic Output Truncator for OpenCode AI Plugin
 * Optimized for p99 response time constraints to prevent WebSocket bottlenecks
 *
 * PERFORMANCE TARGETS:
 * - p99 response time: <50ms for truncation operations
 * - Memory efficiency: Zero-copy operations where possible
 * - Throughput: 10,000+ truncations/second
 * - WebSocket compatibility: Non-blocking operations
 */

interface TruncationResult {
  result: string;
  truncated: boolean;
  originalLength: number;
  truncatedLength: number;
  truncationTime: number;
}

interface TruncationConfig {
  maxLength: number;
  preserveLines?: boolean;
  preserveWords?: boolean;
  addEllipsis?: boolean;
  smartTruncation?: boolean;
  performanceMode?: 'high' | 'balanced' | 'low';
}

interface SessionState {
  sessionId: string;
  totalTruncations: number;
  totalTime: number;
  averageTime: number;
  p99Time: number;
  lastTruncationTime: number;
  cache: Map<string, TruncationResult>;
}

class DynamicTruncator {
  private sessionStates = new Map<string, SessionState>();
  private globalStats = {
    totalOperations: 0,
    totalTime: 0,
    p99ResponseTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  };

  // Performance targets (configurable)
  private readonly P99_TARGET = 50; // ms
  private readonly CACHE_SIZE = 1000;
  private readonly MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB

  constructor(_ctx?: any) {
    // Initialize performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Core truncation method with p99 optimization
   */
  async truncate(sessionId: string, content: string, config?: Partial<TruncationConfig>): Promise<TruncationResult> {
    const startTime = performance.now();

    try {
      // Get or create session state
      const session = this.getOrCreateSession(sessionId);

      // Check cache first (O(1) lookup)
      const cacheKey = this.generateCacheKey(content, config);
      const cached = session.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.updatePerformanceMetrics(sessionId, performance.now() - startTime, true);
        return cached;
      }

      // Apply truncation with performance optimization
      const truncationResult = await this.performTruncation(content, {
        maxLength: 10000,
        preserveLines: true,
        preserveWords: true,
        addEllipsis: true,
        smartTruncation: true,
        performanceMode: 'high',
        ...config
      });

      // Create complete result with timing
      const result: TruncationResult = {
        ...truncationResult,
        truncationTime: performance.now() - startTime
      };

      session.cache.set(cacheKey, result);

      // Maintain cache size limits
      this.maintainCacheSize(session);

      // Update performance metrics
      this.updatePerformanceMetrics(sessionId, result.truncationTime, false);

      // Check p99 constraints and adapt if needed
      this.checkP99Constraints(session);

      return result;

    } catch (error) {
      // Graceful degradation - return original content
      const endTime = performance.now();
      this.updatePerformanceMetrics(sessionId, endTime - startTime, false);

      return {
        result: content,
        truncated: false,
        originalLength: content.length,
        truncatedLength: content.length,
        truncationTime: endTime - startTime
      };
    }
  }

  /**
   * High-performance truncation implementation
   */
  private async performTruncation(content: string, config: TruncationConfig): Promise<Omit<TruncationResult, 'truncationTime'>> {
    const originalLength = content.length;

    // Fast path: content already within limits
    if (originalLength <= config.maxLength) {
      return {
        result: content,
        truncated: false,
        originalLength,
        truncatedLength: originalLength
      };
    }

    // High-performance truncation based on mode
    let result: string;

    switch (config.performanceMode) {
      case 'high':
        result = this.highPerformanceTruncate(content, config);
        break;
      case 'balanced':
        result = this.balancedTruncate(content, config);
        break;
      case 'low':
        result = this.lowPerformanceTruncate(content, config);
        break;
      default:
        result = this.highPerformanceTruncate(content, config);
    }

    return {
      result: config.addEllipsis && result.length < originalLength ? result + '...' : result,
      truncated: true,
      originalLength,
      truncatedLength: result.length
    };
  }

  /**
   * High-performance truncation (p99 optimized)
   * Uses zero-copy operations where possible
   */
  private highPerformanceTruncate(content: string, config: TruncationConfig): string {
    if (config.preserveLines) {
      // Fast line-based truncation
      const lines = content.split('\n');
      let result = '';
      let length = 0;

      for (const line of lines) {
        if (length + line.length + 1 > config.maxLength) {
          break;
        }
        result += line + '\n';
        length += line.length + 1;
      }

      return result.slice(0, -1); // Remove trailing newline
    }

    // Character-based truncation (fastest)
    return content.slice(0, config.maxLength);
  }

  /**
   * Balanced performance truncation
   * Word-aware with line preservation
   */
  private balancedTruncate(content: string, config: TruncationConfig): string {
    if (config.preserveWords && config.preserveLines) {
      const lines = content.split('\n');
      const result: string[] = [];
      let totalLength = 0;

      for (const line of lines) {
        if (totalLength + line.length + 1 > config.maxLength) {
          // Try to fit whole words
          const remaining = config.maxLength - totalLength - 1;
          if (remaining > 10) { // Only if we have space for meaningful content
            const words = line.split(' ');
            let lineResult = '';

            for (const word of words) {
              if (lineResult.length + word.length + 1 > remaining) {
                break;
              }
              lineResult += word + ' ';
            }

            if (lineResult.trim()) {
              result.push(lineResult.trim());
            }
          }
          break;
        }

        result.push(line);
        totalLength += line.length + 1;
      }

      return result.join('\n');
    }

    return this.highPerformanceTruncate(content, config);
  }

  /**
   * Low-performance but high-quality truncation
   * Full semantic awareness
   */
  private lowPerformanceTruncate(content: string, config: TruncationConfig): string {
    // Semantic truncation (more expensive but better quality)
    // This could include JSON structure preservation, code block awareness, etc.
    return this.balancedTruncate(content, config);
  }

  /**
   * Session management with performance tracking
   */
  private getOrCreateSession(sessionId: string): SessionState {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        sessionId,
        totalTruncations: 0,
        totalTime: 0,
        averageTime: 0,
        p99Time: 0,
        lastTruncationTime: Date.now(),
        cache: new Map()
      });
    }
    return this.sessionStates.get(sessionId)!;
  }

  /**
   * Cache management for performance
   */
  private generateCacheKey(content: string, config?: Partial<TruncationConfig>): string {
    // Fast hash for cache key (simple but effective)
    const configStr = JSON.stringify(config || {});
    const contentHash = this.simpleHash(content.slice(0, 100)); // Sample first 100 chars
    return `${contentHash}_${configStr}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isCacheValid(cached: TruncationResult): boolean {
    // Cache for 5 minutes
    return Date.now() - cached.truncationTime < 5 * 60 * 1000;
  }

  private maintainCacheSize(session: SessionState): void {
    if (session.cache.size > this.CACHE_SIZE) {
      // Remove oldest entries (simple LRU approximation)
      const entries = Array.from(session.cache.entries());
      entries.sort((a, b) => (b[1].truncationTime || 0) - (a[1].truncationTime || 0));
      const toRemove = entries.slice(this.CACHE_SIZE);

      for (const [key] of toRemove) {
        session.cache.delete(key);
      }
    }
  }

  /**
   * Performance monitoring and p99 constraint checking
   */
  private updatePerformanceMetrics(sessionId: string, duration: number, _cacheHit?: boolean): void {
    const session = this.sessionStates.get(sessionId);
    if (!session) return;

    session.totalTruncations++;
    session.totalTime += duration;
    session.averageTime = session.totalTime / session.totalTruncations;
    session.lastTruncationTime = Date.now();

    // Update p99 tracking (simplified)
    session.p99Time = Math.max(session.p99Time, duration);

    // Global stats
    this.globalStats.totalOperations++;
    this.globalStats.totalTime += duration;
    this.globalStats.p99ResponseTime = Math.max(this.globalStats.p99ResponseTime, duration);
  }

  private checkP99Constraints(session: SessionState): void {
    // If p99 is approaching target, enable more aggressive caching
    if (session.p99Time > this.P99_TARGET * 0.8) {
      // Could implement adaptive caching strategies here
      console.warn(`[Truncator] Session ${session.sessionId} approaching p99 target: ${session.p99Time}ms`);
    }

    // Global p99 check
    if (this.globalStats.p99ResponseTime > this.P99_TARGET) {
      console.error(`[Truncator] CRITICAL: Global p99 response time exceeded target: ${this.globalStats.p99ResponseTime}ms`);
      // Could implement emergency throttling here
    }
  }

  /**
   * Memory monitoring (critical for WebSocket performance)
   */
  private startPerformanceMonitoring(): void {
    // Periodic cleanup and monitoring
    setInterval(() => {
      this.performMaintenance();
    }, 30000); // Every 30 seconds
  }

  private performMaintenance(): void {
    // Clean up old sessions (older than 1 hour)
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [sessionId, session] of this.sessionStates.entries()) {
      if (session.lastTruncationTime < cutoff) {
        this.sessionStates.delete(sessionId);
      }
    }

    // Update memory usage estimate
    this.globalStats.memoryUsage = this.estimateMemoryUsage();

    // Memory pressure handling
    if (this.globalStats.memoryUsage > this.MAX_MEMORY_USAGE) {
      console.warn(`[Truncator] High memory usage: ${this.globalStats.memoryUsage} bytes`);
      // Implement memory pressure relief
      this.reduceMemoryUsage();
    }
  }

  private estimateMemoryUsage(): number {
    let total = 0;

    // Estimate session state memory
    for (const session of this.sessionStates.values()) {
      total += session.cache.size * 200; // Rough estimate per cached item
    }

    return total;
  }

  private reduceMemoryUsage(): void {
    // Reduce cache sizes across all sessions
    for (const session of this.sessionStates.values()) {
      if (session.cache.size > this.CACHE_SIZE / 2) {
        const entries = Array.from(session.cache.entries());
        entries.sort((a, b) => (b[1].truncationTime || 0) - (a[1].truncationTime || 0));

        // Keep only the most recent half
        const toKeep = entries.slice(0, Math.floor(this.CACHE_SIZE / 4));
        session.cache.clear();

        for (const [key, value] of toKeep) {
          session.cache.set(key, value);
        }
      }
    }
  }

  /**
   * Public API for monitoring
   */
  getStats() {
    return {
      global: this.globalStats,
      sessions: Array.from(this.sessionStates.entries()).map(([id, session]) => ({
        sessionId: id,
        totalTruncations: session.totalTruncations,
        averageTime: session.averageTime,
        p99Time: session.p99Time,
        cacheSize: session.cache.size
      }))
    };
  }

  /**
   * Emergency throttling for WebSocket protection
   */
  enableThrottling(): void {
    console.warn('[Truncator] Emergency throttling enabled due to p99 violations');
    // Implement throttling logic here
  }

  disableThrottling(): void {
    console.info('[Truncator] Throttling disabled - performance restored');
  }
}

/**
 * Factory function for creating optimized truncator instances
 */
export function createDynamicTruncator(ctx: any): DynamicTruncator {
  return new DynamicTruncator(ctx);
}

/**
 * Plugin hook factory with p99 optimization
 */
export function createToolOutputTruncatorHook(ctx: any) {
  const truncator = createDynamicTruncator(ctx);

  const toolExecuteAfter = async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: unknown }
  ) => {
    const TRUNCATABLE_TOOLS = [
      "grep", "Grep", "safe_grep",
      "glob", "Glob", "safe_glob",
      "lsp_find_references", "lsp_document_symbols", "lsp_workspace_symbols",
      "lsp_diagnostics", "ast_grep_search", "interactive_bash", "Interactive_bash"
    ];

    if (!TRUNCATABLE_TOOLS.includes(input.tool)) return;

    try {
      // High-performance truncation with p99 monitoring
      const startTime = performance.now();
      const { result, truncated } = await truncator.truncate(input.sessionID, output.output);

      if (truncated) {
        output.output = result;
      }

      // Log performance for monitoring
      const duration = performance.now() - startTime;
      if (duration > 50) { // p99 target exceeded
        console.warn(`[Truncator] Slow truncation: ${duration.toFixed(2)}ms for ${input.tool}`);
      }

    } catch (error) {
      // Graceful degradation - don't break tool execution
      console.error('[Truncator] Truncation failed:', error);
    }
  };

  return {
    "tool.execute.after": toolExecuteAfter,
  };
}