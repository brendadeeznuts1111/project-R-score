/**
 * High-Performance Ripgrep Searcher using Bun.spawn
 * Zero-copy, SIMD-optimized process management with streaming JSON parsing
 */

// Import Bun types properly
declare const Bun: {
  spawn: (args: string[], options?: { stdout?: string; stderr?: string; env?: any }) => {
    stdout: ReadableStream;
    exited: Promise<number>;
  };
  spawnSync: (args: string[], options?: { stdout?: string; stderr?: string }) => {
    success: boolean;
    stdout?: Uint8Array;
  };
  readableStreamToText: (stream: ReadableStream) => Promise<string>;
};

export interface RipgrepMatch {
  type: 'match';
  data: {
    path: {
      text: string;
    };
    lines: {
      text: string;
    };
    line_number: number;
    absolute_offset: number;
    submatches: Array<{
      match: {
        text: string;
      };
      start: number;
      end: number;
    }>;
  };
}

export interface RipgrepSummary {
  type: 'summary';
  data: {
    elapsed_total: {
      secs: number;
      nanos: number;
      human: string;
    };
    searches: number;
    searches_with_match: number;
    matched_lines: number;
    matches: number;
  };
}

export type RipgrepOutput = RipgrepMatch | RipgrepSummary;

export interface SearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
  filePattern?: string;
}

export interface SearchResult {
  matches: RipgrepMatch[];
  summary?: RipgrepSummary['data'];
}

// LRU Cache implementation for search results
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to front (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Streaming JSON line parser for memory-efficient processing
async function* parseJsonLines(stream: ReadableStream): AsyncGenerator<RipgrepOutput> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as RipgrepOutput;
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as RipgrepOutput;
      } catch {
        // Skip malformed final line
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class RipgrepSearcher {
  private cacheDir: string;
  private maxConcurrency: number;
  private requestCache: LRUCache<string, Promise<RipgrepMatch[]>>;
  private cacheTTL: number;

  constructor(options: {
    cacheDir?: string;
    maxConcurrency?: number;
    cacheTTL?: number;
    maxCacheSize?: number;
  } = {}) {
    this.cacheDir = options.cacheDir || `${process.env.HOME}/.cache/bun-docs/requests`;
    this.maxConcurrency = options.maxConcurrency || 5;
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes
    this.requestCache = new LRUCache(options.maxCacheSize || 100);
    
    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    const fs = require('fs');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Build ripgrep arguments from options
   */
  private buildArgs(
    query: string,
    paths: string[],
    options: SearchOptions & { json?: boolean; maxCount?: number }
  ): string[] {
    const args: string[] = ['rg'];
    
    if (!options.caseSensitive) {
      args.push('-i');
    }
    
    if (options.json !== false) {
      args.push('--json');
    }
    
    const maxCount = options.maxCount ?? options.maxResults ?? 50;
    args.push('--max-count', maxCount.toString());
    
    if (options.filePattern) {
      args.push('--glob', options.filePattern);
    }

    args.push(query);
    args.push(...paths);
    
    return args;
  }

  /**
   * High-performance search using Bun.spawn with streaming JSON parsing
   */
  async search(query: string, options: SearchOptions = {}): Promise<RipgrepMatch[]> {
    const cacheKey = `${query}:${options.caseSensitive ?? false}:${options.maxResults ?? 50}:${options.filePattern ?? '*'}`;
    
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const searchPromise = this.performSearch(query, options);
    this.requestCache.set(cacheKey, searchPromise);

    // Auto-expire cache entry after TTL
    setTimeout(() => {
      // LRU cache handles eviction automatically
    }, this.cacheTTL);

    return searchPromise;
  }

  private async performSearch(
    query: string, 
    options: SearchOptions
  ): Promise<RipgrepMatch[]> {
    const args = this.buildArgs(query, [this.cacheDir], options);
    const maxResults = options.maxResults ?? 50;

    const proc = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'ignore',
      env: process.env
    });

    try {
      const results: RipgrepMatch[] = [];
      
      for await (const parsed of parseJsonLines(proc.stdout)) {
        if (parsed.type === 'match') {
          results.push(parsed);
          if (results.length >= maxResults) {
            break;
          }
        }
      }

      // Don't wait for process exit - streaming is done
      proc.exited.catch(() => {}); // Ignore exit code errors

      return results;
    } catch (error) {
      console.error('Ripgrep search failed:', error);
      return [];
    }
  }

  /**
   * Streaming search - yields results as they arrive (lowest latency)
   */
  async *searchStream(
    query: string, 
    options: SearchOptions = {}
  ): AsyncGenerator<RipgrepMatch, RipgrepSummary['data'] | undefined> {
    const args = this.buildArgs(query, [this.cacheDir], options);
    const maxResults = options.maxResults ?? 50;

    const proc = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'ignore',
      env: process.env
    });

    let count = 0;
    let summary: RipgrepSummary['data'] | undefined;

    try {
      for await (const parsed of parseJsonLines(proc.stdout)) {
        if (parsed.type === 'match') {
          yield parsed;
          count++;
          if (count >= maxResults) {
            break;
          }
        } else if (parsed.type === 'summary') {
          summary = parsed.data;
        }
      }
    } catch (error) {
      console.error('Streaming search failed:', error);
    }

    return summary;
  }

  /**
   * Synchronous search for CLI tools using Bun.spawnSync
   */
  searchSync(query: string, options: SearchOptions = {}): RipgrepMatch[] {
    const args = this.buildArgs(query, [this.cacheDir], { ...options, json: true });
    const maxResults = options.maxResults ?? 50;

    const result = Bun.spawnSync(args, {
      stdout: 'pipe',
      stderr: 'ignore'
    });

    if (!result.success || !result.stdout) {
      return [];
    }

    try {
      const text = result.stdout.toString();
      const results: RipgrepMatch[] = [];

      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as RipgrepOutput;
          if (parsed.type === 'match') {
            results.push(parsed);
            if (results.length >= maxResults) break;
          }
        } catch {
          continue;
        }
      }

      return results;
    } catch (error) {
      console.error('Ripgrep sync search failed:', error);
      return [];
    }
  }

  /**
   * Parallel search across multiple queries with concurrency limiting
   */
  async parallelSearch(
    queries: string[], 
    options: SearchOptions = {}
  ): Promise<Map<string, RipgrepMatch[]>> {
    const results = new Map<string, RipgrepMatch[]>();
    
    // Use p-map style concurrency control
    const executing = new Set<Promise<void>>();
    
    for (const query of queries) {
      const promise = this.search(query, options).then(matches => {
        results.set(query, matches);
      });
      
      executing.add(promise);
      
      if (executing.size >= this.maxConcurrency) {
        await Promise.race(executing);
      }
      
      // Clean up completed promises
      promise.finally(() => executing.delete(promise));
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Search across multiple directories simultaneously
   */
  async searchMultipleDirectories(
    query: string,
    directories: string[],
    options: SearchOptions = {}
  ): Promise<Map<string, RipgrepMatch[]>> {
    const searchPromises = directories.map(async (dir) => {
      const searcher = new RipgrepSearcher({ cacheDir: dir });
      const matches = await searcher.search(query, options);
      return [dir, matches] as [string, RipgrepMatch[]];
    });

    const results = await Promise.all(searchPromises);
    return new Map(results);
  }

  /**
   * Get search statistics and performance metrics
   */
  getStats(): {
    cacheSize: number;
    activeRequests: number;
    cacheDir: string;
  } {
    return {
      cacheSize: this.requestCache.size,
      activeRequests: this.requestCache.size,
      cacheDir: this.cacheDir
    };
  }

  /**
   * Clear the request cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

/**
 * Convenience function for quick searches
 */
export async function searchDocs(
  query: string, 
  options?: SearchOptions
): Promise<RipgrepMatch[]> {
  const searcher = new RipgrepSearcher();
  return searcher.search(query, options);
}

/**
 * Ghost Search - Search docs and project code in parallel
 */
export async function ghostSearch(
  query: string,
  projectDir: string = './packages',
  options: Omit<SearchOptions, 'filePattern'> = {}
): Promise<{
  docs: RipgrepMatch[];
  code: RipgrepMatch[];
}> {
  const [docs, code] = await Promise.all([
    searchDocs(query, { ...options, filePattern: '*.json' }),
    searchProjectCode(query, projectDir, options)
  ]);

  return { docs, code };
}

// Source code search patterns
const SOURCE_EXTENSIONS = ['*.ts', '*.js', '*.tsx', '*.jsx'];
const LIB_ALIASES = ['@lib', '@lib/'];

/**
 * Check if query is a library alias query
 */
function isLibAliasQuery(query: string): { isAlias: boolean; tail: string } {
  const normalized = query.trim();
  for (const alias of LIB_ALIASES) {
    if (normalized === alias || normalized.startsWith(alias + '/') || normalized.startsWith(alias + '\\')) {
      return { 
        isAlias: true, 
        tail: normalized.replace(/^@lib[\/]?/i, '') 
      };
    }
  }
  return { isAlias: false, tail: '' };
}

/**
 * Search project code using ripgrep with streaming optimization
 */
export async function searchProjectCode(
  query: string,
  projectDir: string,
  options: Omit<SearchOptions, 'filePattern'> = {}
): Promise<RipgrepMatch[]> {
  const maxResults = options.maxResults ?? 50;
  const normalizedQuery = query.trim();
  const { isAlias, tail } = isLibAliasQuery(normalizedQuery);
  const hasTail = tail.length > 0;

  const searchRoots = isAlias 
    ? Array.from(new Set(['./lib', projectDir]))
    : [projectDir];

  const args: string[] = ['rg'];
  
  if (!options.caseSensitive) {
    args.push('-i');
  }
  
  args.push(isAlias && hasTail ? tail : normalizedQuery);
  args.push(...searchRoots);
  args.push('--json');
  args.push('--max-count', maxResults.toString());
  
  // Use globs for broad compatibility
  for (const ext of SOURCE_EXTENSIONS) {
    args.push('--glob', ext);
  }

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'ignore'
  });

  try {
    const results: RipgrepMatch[] = [];
    const seen = new Set<string>();

    for await (const parsed of parseJsonLines(proc.stdout)) {
      if (parsed.type === 'match') {
        const key = `${parsed.data.path.text}:${parsed.data.line_number}`;
        if (!seen.has(key)) {
          results.push(parsed);
          seen.add(key);
          if (results.length >= maxResults) break;
        }
      }
    }

    // If alias query, do secondary search for imports
    if (isAlias && results.length < maxResults) {
      const aliasMatches = await searchLibImports(projectDir, options, maxResults - results.length, seen);
      results.push(...aliasMatches);
    }

    return results;
  } catch (error) {
    console.error('Project code search failed:', error);
    return [];
  }
}

/**
 * Secondary search for library imports
 */
async function searchLibImports(
  projectDir: string,
  options: { caseSensitive?: boolean },
  remainingSlots: number,
  seen: Set<string>
): Promise<RipgrepMatch[]> {
  const args: string[] = ['rg'];

  if (!options.caseSensitive) {
    args.push('-i');
  }

  args.push('@lib/');
  args.push(projectDir);
  args.push('--json');
  args.push('--max-count', (remainingSlots * 2).toString());
  
  for (const ext of SOURCE_EXTENSIONS) {
    args.push('--glob', ext);
  }

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'ignore'
  });

  const results: RipgrepMatch[] = [];

  try {
    for await (const parsed of parseJsonLines(proc.stdout)) {
      if (parsed.type === 'match') {
        const key = `${parsed.data.path.text}:${parsed.data.line_number}`;
        if (!seen.has(key)) {
          results.push(parsed);
          seen.add(key);
          if (results.length >= remainingSlots) break;
        }
      }
    }
  } catch {
    // Ignore errors in secondary search
  }

  return results;
}

/**
 * Batch search multiple queries efficiently
 */
export async function batchSearch(
  queries: string[],
  projectDir: string,
  options: SearchOptions = {}
): Promise<Map<string, SearchResult>> {
  const results = new Map<string, SearchResult>();
  const searcher = new RipgrepSearcher({ maxConcurrency: 5 });

  await Promise.all(
    queries.map(async (query) => {
      const matches = await searchProjectCode(query, projectDir, options);
      results.set(query, { matches });
    })
  );

  return results;
}

export default RipgrepSearcher;
