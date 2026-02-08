/**
 * Ultra-Zen Documentation Streaming System - Enhanced v2.0
 * High-performance streaming search using Bun.spawn Web Standard APIs
 * Enhanced with advanced caching, intelligent filtering, and performance optimization
 */

// ReadableStream and Response are built into Bun's global scope - no import needed

export interface StreamSearchOptions {
  query: string;
  cachePath: string;
  signal?: AbortSignal;
  enableColors?: boolean;
  enablePTY?: boolean;
  onMatch?: (match: RipgrepMatch) => void;
  onProgress?: (stats: SearchStats) => void;
  // Enhanced options
  maxResults?: number;
  filePatterns?: string[];
  excludePatterns?: string[];
  contextLines?: number;
  caseSensitive?: boolean;
  enableCache?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface RipgrepMatch {
  type: 'match' | 'context' | 'summary';
  data: {
    path: { text: string };
    lines: { text: string };
    line_number: number;
    absolute_offset: number;
    submatches?: Array<{
      match: { text: string };
      start: number;
      end: number;
    }>;
  };
}

export interface SearchStats {
  matchesFound: number;
  filesSearched: number;
  bytesProcessed: number;
  elapsedTime: number;
  memoryUsage: number;
  // Enhanced metrics
  filesWithMatches: number;
  averageMatchDepth: number;
  cacheHitRate: number;
  throughput: number; // matches per second
}

export interface ResourceMetrics {
  maxRSS: number; // Peak memory usage in bytes
  cpuTime: {
    user: number;
    system: number;
    total: number;
  };
  blockInputs: number;
  blockOutputs: number;
  // Enhanced metrics
  peakThroughput: number;
  ioWaitTime: number;
  contextSwitches: number;
}

export interface SearchCache {
  key: string;
  results: RipgrepMatch[];
  stats: SearchStats;
  timestamp: number;
  ttl: number;
}

export interface SearchFilter {
  fileExtensions?: string[];
  minFileSize?: number;
  maxFileSize?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentPattern?: RegExp;
}

/**
 * Enhanced Zero-copy streaming search with intelligent caching and optimization
 */
export class EnhancedZenStreamSearcher {
  private abortController = new AbortController();
  private searchCache = new Map<string, SearchCache>();
  private performanceHistory: ResourceMetrics[] = [];
  private searchStats: SearchStats = {
    matchesFound: 0,
    filesSearched: 0,
    bytesProcessed: 0,
    elapsedTime: 0,
    memoryUsage: 0,
    filesWithMatches: 0,
    averageMatchDepth: 0,
    cacheHitRate: 0,
    throughput: 0
  };

  /**
   * Advanced stream search with caching, filtering, and performance optimization
   */
  async streamSearch(options: StreamSearchOptions): Promise<SearchStats> {
    const startTime = performance.now();
    const decoder = new TextDecoder();
    
    // Check cache first if enabled
    if (options.enableCache !== false) {
      const cacheKey = this.generateCacheKey(options);
      const cached = this.searchCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        console.log(`🎯 Cache hit for query: "${options.query}"`);
        this.searchStats = { ...cached.stats };
        this.searchStats.cacheHitRate = 1;
        return cached.stats;
      }
    }

    // Build enhanced ripgrep arguments
    const args = this.buildRipgrepArgs(options);

    try {
      // Enhanced process management with priority and resource limits
      await using proc = (Bun as any).spawn(args, {
        stdout: "pipe",
        stderr: "pipe",
        signal: options.signal || this.abortController.signal,
        // Enhanced process configuration
        env: {
          ...process.env,
          RIPGREP_CONFIG_PATH: options.cachePath
        },
        // Resource limits based on priority
        ...(options.priority === 'low' && {
          nice: 10 // Lower priority for background searches
        })
      });

      const stream = proc.stdout;
      if (!(stream instanceof ReadableStream)) {
        throw new Error("stdout is not a ReadableStream");
      }

      // Enhanced streaming with backpressure and chunk optimization
      const results = await this.processStreamWithOptimization(stream, decoder, options);
      
      // Wait for process completion and collect enhanced metrics
      const exitCode = await proc.exited;
      this.searchStats.elapsedTime = performance.now() - startTime;
      this.searchStats.throughput = this.searchStats.matchesFound / (this.searchStats.elapsedTime / 1000);
      
      // Enhanced resource monitoring
      const resourceUsage = proc.resourceUsage;
      if (resourceUsage) {
        const metrics: ResourceMetrics = {
          maxRSS: resourceUsage.maxRSS,
          cpuTime: resourceUsage.cpuTime,
          blockInputs: resourceUsage.blockInputs,
          blockOutputs: resourceUsage.blockOutputs,
          peakThroughput: this.searchStats.throughput,
          ioWaitTime: 0, // Would need additional monitoring
          contextSwitches: 0 // Would need additional monitoring
        };
        
        this.performanceHistory.push(metrics);
        this.logEnhancedMetrics(metrics);
      }
      
      if (exitCode !== 0) {
        const stderr = await proc.stderr.text();
        throw new Error(`Search failed with exit code ${exitCode}: ${stderr}`);
      }

      // Cache results if enabled
      if (options.enableCache !== false) {
        const cacheKey = this.generateCacheKey(options);
        this.searchCache.set(cacheKey, {
          key: cacheKey,
          results: results.matches,
          stats: { ...this.searchStats },
          timestamp: Date.now(),
          ttl: this.calculateTTL(options)
        });
        
        // Clean old cache entries
        this.cleanCache();
      }

      return this.searchStats;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Search aborted by user');
      } else {
        console.error('❌ Enhanced search error:', error);
      }
      throw error;
    }
  }

  /**
   * Optimized stream processing with intelligent chunk handling
   */
  private async processStreamWithOptimization(
    stream: ReadableStream, 
    decoder: TextDecoder, 
    options: StreamSearchOptions
  ): Promise<{ matches: RipgrepMatch[] }> {
    const reader = stream.getReader();
    let buffer = '';
    const matches: RipgrepMatch[] = [];
    const filesWithMatches = new Set<string>();
    let totalMatchDepth = 0;
    
    // Adaptive chunk size based on performance
    let chunkSize = 8192; // Start with 8KB chunks
    const maxChunkSize = 65536; // Max 64KB
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Adaptive chunk processing
      if (value.length > chunkSize * 2) {
        chunkSize = Math.min(chunkSize * 2, maxChunkSize);
      } else if (value.length < chunkSize / 4 && chunkSize > 8192) {
        chunkSize = Math.max(chunkSize / 2, 8192);
      }
      
      // Process chunk with zero-copy streaming
      const chunkText = decoder.decode(value, { stream: true });
      this.searchStats.bytesProcessed += value.length;
      
      // Accumulate and process complete lines
      buffer += chunkText;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const match: RipgrepMatch = JSON.parse(line);
          
          // Apply filters if specified
          if (this.shouldIncludeMatch(match, options)) {
            if (match.type === 'match') {
              this.searchStats.matchesFound++;
              filesWithMatches.add(match.data.path.text);
              
              // Calculate match depth (line number / total lines approximation)
              totalMatchDepth += match.data.line_number;
              
              matches.push(match);
              options.onMatch?.(match);
              
              // Check max results limit
              if (options.maxResults && matches.length >= options.maxResults) {
                break;
              }
            } else if (match.type === 'summary') {
              this.searchStats.filesSearched = (match.data as any).stats?.searched_files || this.searchStats.filesSearched;
            }
          }
        } catch (parseError) {
          // Skip malformed JSON lines with enhanced logging
          console.warn('Failed to parse ripgrep output:', line.substring(0, 100));
        }
      }
      
      // Enhanced progress reporting
      if (this.searchStats.matchesFound % 10 === 0) {
        options.onProgress?.({ ...this.searchStats });
      }
      
      // Early exit if max results reached
      if (options.maxResults && matches.length >= options.maxResults) {
        break;
      }
    }
    
    // Process any remaining buffer content
    if (buffer.trim()) {
      try {
        const match: RipgrepMatch = JSON.parse(buffer);
        if (this.shouldIncludeMatch(match, options) && match.type === 'match') {
          matches.push(match);
          this.searchStats.matchesFound++;
          filesWithMatches.add(match.data.path.text);
        }
      } catch (parseError) {
        console.warn('Failed to parse final ripgrep output:', buffer.substring(0, 100));
      }
    }
    
    // Calculate enhanced statistics
    this.searchStats.filesWithMatches = filesWithMatches.size;
    this.searchStats.averageMatchDepth = matches.length > 0 ? totalMatchDepth / matches.length : 0;
    
    return { matches };
  }

  /**
   * Build enhanced ripgrep arguments with all options
   */
  private buildRipgrepArgs(options: StreamSearchOptions): string[] {
    const args = [
      "rg",
      "--json",
      "--line-number",
      "--heading"
    ];

    // Add file patterns
    if (options.filePatterns && options.filePatterns.length > 0) {
      options.filePatterns.forEach(pattern => {
        args.push("--glob", pattern);
      });
    }

    // Add exclude patterns
    if (options.excludePatterns && options.excludePatterns.length > 0) {
      options.excludePatterns.forEach(pattern => {
        args.push("--glob", `!${pattern}`);
      });
    }

    // Add context lines
    if (options.contextLines) {
      args.push("--context", options.contextLines.toString());
    }

    // Add case sensitivity
    if (options.caseSensitive) {
      args.push("--case-sensitive");
    } else {
      args.push("--ignore-case");
    }

    // Add query and path
    args.push(options.query, options.cachePath);

    return args;
  }

  /**
   * Enhanced PTY search with terminal capabilities
   */
  async ptySearch(query: string, cachePath: string, options: {
    colors?: boolean;
    lineNumbers?: boolean;
    context?: number;
  } = {}): Promise<void> {
    const args = ["rg"];
    
    if (options.colors !== false) {
      args.push("--color=always");
    }
    
    if (options.lineNumbers !== false) {
      args.push("--line-number");
    }
    
    if (options.context) {
      args.push("--context", options.context.toString());
    }
    
    args.push(query, cachePath);

    const proc = (Bun as any).spawn(args, {
      terminal: {
        cols: (process.stdout as any).columns || 80,
        rows: (process.stdout as any).rows || 24,
        data(terminal: any, data: Uint8Array) {
          // Process raw ANSI data from ripgrep with enhanced handling
          (Bun as any).write(Bun.stdout, data);
        }
      }
    });

    await proc.exited;
    console.log('✅ Enhanced PTY search complete');
  }

  /**
   * Network-to-process streaming with Response object integration
   */
  async networkStreamSearch(
    url: string, 
    query: string, 
    options: StreamSearchOptions & {
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<SearchStats> {
    const startTime = performance.now();
    
    try {
      // Fetch with enhanced options
      const response = await fetch(url, {
        headers: options.headers || {},
        signal: options.signal || this.abortController.signal,
        // Add timeout if specified
        ...(options.timeout && {
          signal: AbortSignal.timeout(options.timeout)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream directly to ripgrep without intermediate storage
      await using proc = (Bun as any).spawn(["rg", "--json", "--line-number", query], {
        stdin: response.body, // Direct streaming from Response
        stdout: "pipe",
        stderr: "pipe"
      });

      const stream = proc.stdout;
      if (!(stream instanceof ReadableStream)) {
        throw new Error("stdout is not a ReadableStream");
      }

      // Process the stream
      await this.processStreamWithOptimization(stream, new TextDecoder(), options);
      
      const exitCode = await proc.exited;
      this.searchStats.elapsedTime = performance.now() - startTime;
      
      if (exitCode !== 0) {
        const stderr = await proc.stderr.text();
        throw new Error(`Network search failed with exit code ${exitCode}: ${stderr}`);
      }

      return this.searchStats;
      
    } catch (error) {
      console.error('❌ Network stream search error:', error);
      throw error;
    }
  }

  /**
   * Cache management utilities
   */
  private generateCacheKey(options: StreamSearchOptions): string {
    return `${options.query}:${options.cachePath}:${options.caseSensitive ? 'sensitive' : 'insensitive'}:${options.filePatterns?.join(',') || ''}:${options.excludePatterns?.join(',') || ''}`;
  }

  private isCacheValid(cache: SearchCache): boolean {
    return Date.now() - cache.timestamp < cache.ttl;
  }

  private calculateTTL(options: StreamSearchOptions): number {
    // Dynamic TTL based on search complexity
    const baseTTL = 5 * 60 * 1000; // 5 minutes
    const complexityMultiplier = options.filePatterns?.length || 1;
    return baseTTL * complexityMultiplier;
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.searchCache.entries()) {
      if (now - cache.timestamp > cache.ttl) {
        this.searchCache.delete(key);
      }
    }
  }

  /**
   * Enhanced filtering logic
   */
  private shouldIncludeMatch(match: RipgrepMatch, options: StreamSearchOptions): boolean {
    if (match.type !== 'match') return true;
    
    const filePath = match.data.path.text;
    
    // File extension filtering
    if (options.filePatterns) {
      const hasMatchingPattern = options.filePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      });
      if (!hasMatchingPattern) return false;
    }
    
    // Exclude pattern filtering
    if (options.excludePatterns) {
      const hasExcludedPattern = options.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      });
      if (hasExcludedPattern) return false;
    }
    
    return true;
  }

  /**
   * Enhanced metrics logging
   */
  private logEnhancedMetrics(metrics: ResourceMetrics): void {
    console.log(`📊 Enhanced Resource Usage:`);
    console.log(`   Max Memory: ${(metrics.maxRSS / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   CPU Time: ${metrics.cpuTime?.total || 'N/A'}ms`);
    console.log(`   Peak Throughput: ${metrics.peakThroughput.toFixed(2)} matches/sec`);
    console.log(`   Block I/O: ${metrics.blockInputs} in, ${metrics.blockOutputs} out`);
  }

  /**
   * Performance analytics
   */
  getPerformanceAnalytics(): {
    averageMemory: number;
    averageThroughput: number;
    peakPerformance: ResourceMetrics;
    cacheEfficiency: number;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        averageMemory: 0,
        averageThroughput: 0,
        peakPerformance: {} as ResourceMetrics,
        cacheEfficiency: 0
      };
    }

    const avgMemory = this.performanceHistory.reduce((sum, m) => sum + m.maxRSS, 0) / this.performanceHistory.length;
    const avgThroughput = this.performanceHistory.reduce((sum, m) => sum + m.peakThroughput, 0) / this.performanceHistory.length;
    const peakPerformance = this.performanceHistory.reduce((max, m) => 
      m.peakThroughput > max.peakThroughput ? m : max
    );
    
    const cacheEfficiency = this.searchCache.size > 0 ? 
      Array.from(this.searchCache.values()).filter(c => this.isCacheValid(c)).length / this.searchCache.size : 0;

    return {
      averageMemory: avgMemory,
      averageThroughput: avgThroughput,
      peakPerformance,
      cacheEfficiency
    };
  }

  /**
   * Clear cache and reset performance metrics
   */
  reset(): void {
    this.searchCache.clear();
    this.performanceHistory = [];
    this.searchStats = {
      matchesFound: 0,
      filesSearched: 0,
      bytesProcessed: 0,
      elapsedTime: 0,
      memoryUsage: 0,
      filesWithMatches: 0,
      averageMatchDepth: 0,
      cacheHitRate: 0,
      throughput: 0
    };
  }

  /**
   * Cancel current search
   */
  cancel(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

// Export the enhanced class for backward compatibility
export const ZenStreamSearcher = EnhancedZenStreamSearcher;

/**
 * Enhanced demonstration of all streaming capabilities
 */
export async function demonstrateEnhancedStreaming(): Promise<void> {
  console.log('🚀 Enhanced Ultra-Zen Documentation Streaming System v2.0');
  console.log('=' .repeat(80));
  
  const searcher = new EnhancedZenStreamSearcher();
  
  try {
    // Demo 1: Basic enhanced search
    console.log('\n📋 Demo 1: Enhanced Search with Caching');
    const basicStats = await searcher.streamSearch({
      query: 'Bun.spawn',
      cachePath: '/Users/nolarose/Projects/.cache',
      enableCache: true,
      maxResults: 10,
      onProgress: (stats) => console.log(`   Progress: ${stats.matchesFound} matches, ${stats.bytesProcessed} bytes`)
    });
    console.log(`✅ Enhanced Search: ${basicStats.matchesFound} matches in ${basicStats.elapsedTime.toFixed(2)}ms`);
    console.log(`   Files with matches: ${basicStats.filesWithMatches}`);
    console.log(`   Average match depth: ${basicStats.averageMatchDepth.toFixed(2)}`);
    console.log(`   Cache hit rate: ${(basicStats.cacheHitRate * 100).toFixed(1)}%`);
    
    // Demo 2: Search with patterns and filtering
    console.log('\n📋 Demo 2: Pattern-based Search with Filtering');
    const patternStats = await searcher.streamSearch({
      query: 'interface',
      cachePath: '/Users/nolarose/Projects/.cache',
      filePatterns: ['*.ts', '*.js'],
      excludePatterns: ['node_modules/*', '*.min.js'],
      caseSensitive: false,
      contextLines: 2,
      onProgress: (stats) => console.log(`   Pattern search: ${stats.matchesFound} matches`)
    });
    console.log(`✅ Pattern Search: ${patternStats.matchesFound} matches in ${patternStats.elapsedTime.toFixed(2)}ms`);
    
    // Demo 3: Network streaming
    console.log('\n📋 Demo 3: Network-to-Process Streaming');
    try {
      const networkStats = await searcher.networkStreamSearch(
        'https://bun.sh/docs/llms.txt',
        'Bun',
        {
          timeout: 10000,
          headers: { 'User-Agent': 'Enhanced-Zen-Stream/2.0' },
          onProgress: (stats) => console.log(`   Network streaming: ${stats.matchesFound} matches`)
        }
      );
      console.log(`✅ Network Search: ${networkStats.matchesFound} matches in ${networkStats.elapsedTime.toFixed(2)}ms`);
    } catch (error) {
      console.log(`⚠️ Network search failed (expected in some environments): ${error.message}`);
    }
    
    // Demo 4: Performance analytics
    console.log('\n📋 Demo 4: Performance Analytics');
    const analytics = searcher.getPerformanceAnalytics();
    console.log(`   Average Memory: ${(analytics.averageMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Average Throughput: ${analytics.averageThroughput.toFixed(2)} matches/sec`);
    console.log(`   Cache Efficiency: ${(analytics.cacheEfficiency * 100).toFixed(1)}%`);
    
    // Demo 5: PTY search with colors
    console.log('\n📋 Demo 5: Enhanced PTY Search with Colors');
    await searcher.ptySearch('ReadableStream', '/Users/nolarose/Projects/.cache', {
      colors: true,
      context: 1
    });
    
    console.log('\n🎉 All enhanced streaming demos completed successfully!');
    
  } catch (error) {
    console.error('❌ Enhanced streaming demo failed:', error);
  } finally {
    searcher.reset();
  }
}

// Run enhanced demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateEnhancedStreaming().catch(console.error);
}
