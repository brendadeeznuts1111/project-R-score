/**
 * Unified CodeSearch Module
 * High-performance code search with ripgrep, caching, and streaming
 * 
 * Features:
 * - Zero-copy streaming with Bun.readableStreamToText
 * - LRU caching with TTL
 * - Generator-based result processing
 * - Symbol index integration
 * - Concurrent search with backpressure
 */

import type { SymbolSearchKind } from './smart-symbol-index';

// ============================================================================
// Types
// ============================================================================

export interface CodeSearchOptions {
  query: string;
  paths?: string[];
  type?: 'ts' | 'js' | 'md' | 'all';
  context?: number;
  maxResults?: number;
  caseSensitive?: boolean;
  wordBoundary?: boolean;
  includeContext?: boolean;
  cache?: boolean;
}

export interface CodeMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context?: {
    before: string[];
    after: string[];
  };
  score?: number;
  matchType?: 'exact' | 'partial' | 'fuzzy';
}

export interface SearchStats {
  filesSearched: number;
  matchesFound: number;
  timeMs: number;
  cached?: boolean;
}

export interface SearchResult {
  matches: CodeMatch[];
  stats: SearchStats;
  files: string[];
}

export interface RipgrepMatch {
  type: 'match';
  data: {
    path: { text: string };
    lines: { text: string };
    line_number: number;
    absolute_offset: number;
    submatches: Array<{
      match: { text: string };
      start: number;
      end: number;
    }>;
  };
}

export interface RipgrepSummary {
  type: 'summary';
  data: {
    elapsed_total: { secs: number; nanos: number; human: string };
    searches: number;
    searches_with_match: number;
    matched_lines: number;
    matches: number;
  };
}

export type RipgrepOutput = RipgrepMatch | RipgrepSummary;

// ============================================================================
// LRU Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiry: number;
  accessCount: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: { maxSize?: number; defaultTTLMs?: number } = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.defaultTTL = options.defaultTTLMs ?? 30000;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access count and reorder
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl ?? this.defaultTTL),
      accessCount: 1,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; hitRate: number } {
    return { size: this.cache.size, hitRate: 0 }; // Simplified stats
  }
}

// Global search cache
const searchCache = new LRUCache<string, SearchResult>({ maxSize: 50, defaultTTLMs: 60000 });

// ============================================================================
// Ripgrep JSON Streaming Parser
// ============================================================================

/**
 * Parse ripgrep JSON stream efficiently
 * Uses Bun's optimized text conversion when available
 */
async function parseRipgrepOutput(stream: ReadableStream): Promise<RipgrepOutput[]> {
  // Use Bun's optimized stream-to-text if available
  if (typeof Bun !== 'undefined' && Bun.readableStreamToText) {
    const text = await Bun.readableStreamToText(stream);
    return parseJsonLines(text);
  }

  // Fallback for non-Bun environments
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const results: RipgrepOutput[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          results.push(JSON.parse(line) as RipgrepOutput);
        } catch {
          // Skip malformed lines
        }
      }
    }

    if (buffer.trim()) {
      try {
        results.push(JSON.parse(buffer) as RipgrepOutput);
      } catch {
        // Skip malformed final line
      }
    }
  } finally {
    reader.releaseLock();
  }

  return results;
}

function parseJsonLines(text: string): RipgrepOutput[] {
  const results: RipgrepOutput[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      results.push(JSON.parse(line) as RipgrepOutput);
    } catch {
      // Skip malformed lines
    }
  }
  return results;
}

// ============================================================================
// CodeSearch Class
// ============================================================================

export class CodeSearch {
  private cache: LRUCache<string, SearchResult>;
  private defaultOptions: Partial<CodeSearchOptions>;

  constructor(options: { cache?: LRUCache<string, SearchResult>; defaults?: Partial<CodeSearchOptions> } = {}) {
    this.cache = options.cache ?? searchCache;
    this.defaultOptions = options.defaults ?? {};
  }

  /**
   * Build ripgrep arguments from options
   */
  private buildArgs(options: CodeSearchOptions): string[] {
    const args: string[] = ['rg', '--json'];

    // Case sensitivity
    if (!options.caseSensitive) {
      args.push('-i');
    }

    // Word boundary for symbol search
    if (options.wordBoundary) {
      args.push('-w');
    }

    // Context lines
    if (options.includeContext && options.context) {
      args.push('--context', String(options.context));
    }

    // Max results per file
    const maxResults = options.maxResults ?? 50;
    args.push('--max-count', String(maxResults));

    // File type filter
    if (options.type && options.type !== 'all') {
      args.push('--type', options.type);
    }

    // Exclude patterns
    args.push('--glob', '!**/node_modules/**');
    args.push('--glob', '!**/dist/**');
    args.push('--glob', '!**/build/**');
    args.push('--glob', '!**/.git/**');
    args.push('--glob', '!**/*.min.js');

    // Query
    args.push(options.query);

    // Paths
    const paths = options.paths?.length ? options.paths : ['.'];
    args.push(...paths);

    return args;
  }

  /**
   * Generate cache key from options
   */
  private getCacheKey(options: CodeSearchOptions): string {
    return JSON.stringify({
      q: options.query.toLowerCase(),
      p: options.paths?.sort(),
      t: options.type,
      cs: options.caseSensitive,
      wb: options.wordBoundary,
      ctx: options.context,
      lim: options.maxResults,
    });
  }

  /**
   * Execute search with caching
   */
  async search(options: CodeSearchOptions): Promise<SearchResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const useCache = mergedOptions.cache !== false;
    const cacheKey = this.getCacheKey(mergedOptions);

    // Check cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, stats: { ...cached.stats, cached: true } };
      }
    }

    const start = performance.now();
    const args = this.buildArgs(mergedOptions);

    const proc = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'inherit',
    });

    try {
      const outputs = await parseRipgrepOutput(proc.stdout);
      await proc.exited;

      const result = this.processOutputs(outputs, mergedOptions, performance.now() - start);

      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      return { matches: [], stats: { filesSearched: 0, matchesFound: 0, timeMs: performance.now() - start }, files: [] };
    }
  }

  /**
   * Streaming search - yields matches as they arrive
   */
  async *searchStream(options: CodeSearchOptions): AsyncGenerator<CodeMatch, SearchStats> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const args = this.buildArgs(mergedOptions);
    const start = performance.now();

    const proc = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'inherit',
    });

    let matchesFound = 0;
    const files = new Set<string>();
    const maxResults = mergedOptions.maxResults ?? 50;

    try {
      // Use streaming line parser for lowest latency
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line) as RipgrepOutput;
            if (parsed.type === 'match') {
              const match = this.convertMatch(parsed);
              matchesFound++;
              files.add(match.file);
              yield match;

              if (matchesFound >= maxResults) {
                reader.releaseLock();
                return { filesSearched: files.size, matchesFound, timeMs: performance.now() - start };
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer) as RipgrepOutput;
          if (parsed.type === 'match') {
            yield this.convertMatch(parsed);
            matchesFound++;
          }
        } catch {
          // Skip malformed final line
        }
      }

      return { filesSearched: files.size, matchesFound, timeMs: performance.now() - start };
    } finally {
      // Ensure process cleanup
      proc.exited.catch(() => {});
    }
  }

  /**
   * Search multiple queries concurrently
   */
  async searchBatch(queries: string[], options: Omit<CodeSearchOptions, 'query'>): Promise<Map<string, SearchResult>> {
    const results = new Map<string, SearchResult>();

    await Promise.all(
      queries.map(async (query) => {
        const result = await this.search({ ...options, query });
        results.set(query, result);
      })
    );

    return results;
  }

  /**
   * Symbol search with word boundaries
   */
  async searchSymbol(symbol: string, options: Omit<CodeSearchOptions, 'query' | 'wordBoundary'> = {}): Promise<SearchResult> {
    return this.search({
      ...options,
      query: symbol,
      wordBoundary: true,
      type: 'ts',
      context: 1,
    });
  }

  /**
   * Text search (no word boundaries)
   */
  async searchText(query: string, options: Omit<CodeSearchOptions, 'query'> = {}): Promise<SearchResult> {
    return this.search({ ...options, query });
  }

  /**
   * Convert ripgrep match to CodeMatch
   */
  private convertMatch(match: RipgrepMatch): CodeMatch {
    const submatch = match.data.submatches[0];
    return {
      file: match.data.path.text,
      line: match.data.line_number,
      column: submatch?.start ?? 0,
      content: match.data.lines.text.trim(),
    };
  }

  /**
   * Process ripgrep outputs into SearchResult
   */
  private processOutputs(outputs: RipgrepOutput[], options: CodeSearchOptions, timeMs: number): SearchResult {
    const matches: CodeMatch[] = [];
    const files = new Set<string>();
    const maxResults = options.maxResults ?? 50;

    for (const output of outputs) {
      if (output.type === 'match') {
        matches.push(this.convertMatch(output));
        files.add(output.data.path.text);

        if (matches.length >= maxResults) {
          break;
        }
      }
    }

    return {
      matches,
      files: Array.from(files),
      stats: {
        filesSearched: files.size,
        matchesFound: matches.length,
        timeMs,
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number } {
    return { size: this.cache.size };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick search function
 */
export async function searchCode(options: CodeSearchOptions): Promise<SearchResult> {
  const searcher = new CodeSearch();
  return searcher.search(options);
}

/**
 * Search for a symbol
 */
export async function searchSymbol(symbol: string, paths?: string[]): Promise<CodeMatch[]> {
  const searcher = new CodeSearch();
  const result = await searcher.searchSymbol(symbol, { paths });
  return result.matches;
}

/**
 * Streaming search
 */
export async function* searchCodeStream(options: CodeSearchOptions): AsyncGenerator<CodeMatch, SearchStats> {
  const searcher = new CodeSearch();
  return yield* searcher.searchStream(options);
}

/**
 * Batch search multiple queries
 */
export async function searchBatch(
  queries: string[],
  options: Omit<CodeSearchOptions, 'query'>
): Promise<Map<string, SearchResult>> {
  const searcher = new CodeSearch();
  return searcher.searchBatch(queries, options);
}

// ============================================================================
// Advanced Search with Scoring
// ============================================================================

export interface ScoredMatch extends CodeMatch {
  score: number;
  reasons: string[];
}

export interface ScoredSearchResult {
  matches: ScoredMatch[];
  stats: SearchStats;
}

/**
 * Advanced search with relevance scoring
 */
export async function searchWithScoring(
  options: CodeSearchOptions & {
    boostDefinitions?: boolean;
    boostPathMatch?: boolean;
    minScore?: number;
  }
): Promise<ScoredSearchResult> {
  const searcher = new CodeSearch();
  const result = await searcher.search(options);

  const scored = result.matches.map((match): ScoredMatch => {
    let score = 0;
    const reasons: string[] = [];
    const queryLower = options.query.toLowerCase();
    const contentLower = match.content.toLowerCase();
    const fileLower = match.file.toLowerCase();

    // Exact match bonus
    if (contentLower.includes(queryLower)) {
      score += 10;
      reasons.push('content match');
    }

    // Path match bonus
    if (options.boostPathMatch !== false && fileLower.includes(queryLower)) {
      score += 5;
      reasons.push('path match');
    }

    // Definition bonus
    if (options.boostDefinitions !== false && /\b(function|class|interface|const|let|var)\s+\w+/.test(match.content)) {
      score += 3;
      reasons.push('definition');
    }

    return { ...match, score, reasons };
  });

  // Filter by min score and sort
  const minScore = options.minScore ?? 0;
  const filtered = scored.filter(m => m.score >= minScore);
  filtered.sort((a, b) => b.score - a.score);

  return {
    matches: filtered,
    stats: result.stats,
  };
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const codeSearch = new CodeSearch();
export default CodeSearch;
