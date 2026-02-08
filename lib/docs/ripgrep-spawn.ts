/**
 * High-Performance Ripgrep Searcher using Bun.spawn
 * Zero-copy, SIMD-optimized process management for documentation search
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

export class RipgrepSearcher {
  private cacheDir: string;
  private maxConcurrency: number;
  private requestCache: Map<string, Promise<RipgrepMatch[]>>;

  constructor(options: {
    cacheDir?: string;
    maxConcurrency?: number;
  } = {}) {
    this.cacheDir = options.cacheDir || `${process.env.HOME}/.cache/bun-docs/requests`;
    this.maxConcurrency = options.maxConcurrency || 5;
    this.requestCache = new Map();
    
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
   * High-performance search using Bun.spawn with zero-copy pipes
   */
  async search(query: string, options: {
    caseSensitive?: boolean;
    maxResults?: number;
    filePattern?: string;
  } = {}): Promise<RipgrepMatch[]> {
    const {
      caseSensitive = false,
      maxResults = 50,
      filePattern = '*.json'
    } = options;

    // Check cache first
    const cacheKey = `${query}:${caseSensitive}:${maxResults}:${filePattern}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)!;
    }

    const searchPromise = this.performSearch(query, { caseSensitive, maxResults, filePattern });
    this.requestCache.set(cacheKey, searchPromise);

    try {
      const results = await searchPromise;
      return results;
    } finally {
      // Clean up cache after 5 minutes
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);
    }
  }

  private async performSearch(
    query: string, 
    options: { caseSensitive: boolean; maxResults: number; filePattern: string }
  ): Promise<RipgrepMatch[]> {
    const args = ['rg'];
    
    // Add case sensitivity flag
    if (!options.caseSensitive) {
      args.push('-i');
    }
    
    // Add search query and directory
    args.push(query);
    args.push(this.cacheDir);
    
    // Add output format
    args.push('--json');
    
    // Add result limit
    args.push('--max-count');
    args.push(options.maxResults.toString());
    
    // Add file pattern
    args.push('--glob');
    args.push(options.filePattern);

    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "ignore",
      env: process.env
    });

    try {
      // Zero-copy pipe to Response - extremely memory efficient
      const text = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0 || !text) {
        return [];
      }

      // Parse JSON lines efficiently
      const lines = text.split('\n').filter(line => line.trim());
      const results: RipgrepMatch[] = [];

      for (const line of lines) {
        try {
          const parsed: RipgrepOutput = JSON.parse(line);
          if (parsed.type === 'match') {
            results.push(parsed);
            
            // Stop if we've reached max results
            if (results.length >= options.maxResults) {
              break;
            }
          }
        } catch (parseError) {
          // Skip malformed lines
          continue;
        }
      }

      return results;
    } catch (error) {
      console.error('Ripgrep search failed:', error);
      return [];
    }
  }

  /**
   * Synchronous search for CLI tools using Bun.spawnSync
   */
  searchSync(query: string, options: {
    caseSensitive?: boolean;
    maxResults?: number;
    filePattern?: string;
  } = {}): RipgrepMatch[] {
    const {
      caseSensitive = false,
      maxResults = 50,
      filePattern = '*.json'
    } = options;

    const args = [
      ...(caseSensitive ? [] : ['-i']),
      query,
      this.cacheDir,
      '--json',
      '--max-count', options.maxResults.toString(),
      '--glob', options.filePattern
    ];

    const result = Bun.spawnSync(args, {
      stdout: "pipe",
      stderr: "ignore"
    });

    if (!result.success || !result.stdout) {
      return [];
    }

    try {
      const text = result.stdout.toString();
      const lines = text.split('\n').filter(line => line.trim());
      const results: RipgrepMatch[] = [];

      for (const line of lines) {
        try {
          const parsed: RipgrepOutput = JSON.parse(line);
          if (parsed.type === 'match') {
            results.push(parsed);
            
            if (results.length >= options.maxResults) {
              break;
            }
          }
        } catch (parseError) {
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
   * Parallel search across multiple sources
   */
  async parallelSearch(queries: string[], options: {
    caseSensitive?: boolean;
    maxResults?: number;
    filePattern?: string;
  } = {}): Promise<Map<string, RipgrepMatch[]>> {
    const results = new Map<string, RipgrepMatch[]>();
    
    // Limit concurrency to prevent overwhelming the system
    const semaphore = new Array(this.maxConcurrency).fill(null);
    const promises: Promise<void>[] = [];

    for (const query of queries) {
      const slot = semaphore.shift();
      if (slot === undefined) {
        // Wait for a slot to become available
        await Promise.race(promises);
        promises.length = 0; // Clear resolved promises
      }

      const promise = this.search(query, options).then(matches => {
        results.set(query, matches);
        // Return the slot to the semaphore
        semaphore.push(null);
      });

      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Search across multiple directories simultaneously
   */
  async searchMultipleDirectories(
    query: string,
    directories: string[],
    options: {
      caseSensitive?: boolean;
      maxResults?: number;
      filePattern?: string;
    } = {}
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
export async function searchDocs(query: string, options?: {
  caseSensitive?: boolean;
  maxResults?: number;
  filePattern?: string;
}): Promise<RipgrepMatch[]> {
  const searcher = new RipgrepSearcher();
  return searcher.search(query, options);
}

/**
 * Ghost Search - Search docs and project code in parallel
 */
export async function ghostSearch(
  query: string,
  projectDir: string = './packages',
  options: {
    caseSensitive?: boolean;
    maxResults?: number;
  } = {}
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

/**
 * Search project code using ripgrep
 */
export async function searchProjectCode(
  query: string,
  projectDir: string,
  options: {
    caseSensitive?: boolean;
    maxResults?: number;
  } = {}
): Promise<RipgrepMatch[]> {
  const args: string[] = ['rg'];
  
  // Add case sensitivity flag
  if (!options.caseSensitive) {
    args.push('-i');
  }
  
  // Add search query and directory
  args.push(query);
  args.push(projectDir);
  
  // Add output format
  args.push('--json');
  
  // Add result limit
  args.push('--max-count');
  args.push((options.maxResults || 50).toString());
  
  // Add file types
  args.push('--type', 'ts');
  args.push('--type', 'js');
  args.push('--type', 'tsx');
  args.push('--type', 'jsx');

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "ignore"
  });

  try {
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0 || !text) {
      return [];
    }

    const lines = text.split('\n').filter(line => line.trim());
    const results: RipgrepMatch[] = [];

    for (const line of lines) {
      try {
        const parsed: RipgrepOutput = JSON.parse(line);
        if (parsed.type === 'match') {
          results.push(parsed);
          
          if (results.length >= (options.maxResults || 50)) {
            break;
          }
        }
      } catch (parseError) {
        continue;
      }
    }

    return results;
  } catch (error) {
    console.error('Project code search failed:', error);
    return [];
  }
}
