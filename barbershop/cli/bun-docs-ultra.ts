#!/usr/bin/env bun
/**
 * bun-docs-ultra - Ultra-Zen Documentation Search
 * ================================================
 * High-performance search using Bun.spawn + ripgrep
 *
 * Features:
 * - Zero-copy streaming with ReadableStream
 * - ripgrep integration for blazing-fast search
 * - Resource usage monitoring
 * - AbortSignal for cancellation
 * - AsyncDisposable with `using` keyword
 *
 * @version 2.0.0
 * @author Barbershop CLI
 */

import { nanoseconds, spawn, which } from 'bun';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.cache', 'bun-docs');
const FLAT_DOCS_PATH = join(CACHE_DIR, 'docs-flat.txt');
const DOCS_INDEX_URL = 'https://bun.com/docs/llms.txt';
const DEBOUNCE_MS = 100;
const MAX_RESULTS = 15;

// Colors
const c = {
  reset: '\x1b[0m',
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

interface SearchResult {
  path: string;
  line: number;
  text: string;
  score: number;
  context?: string;
}

interface ResourceMetrics {
  maxRSS: number;
  cpuTime: { user: number; system: number; total: number };
  wallTime: number;
}

interface SearchOptions {
  maxResults?: number;
  contextLines?: number;
  caseSensitive?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ULTRA-ZEN SEARCH WITH BUN.SPAWN
// ═══════════════════════════════════════════════════════════════════════════════

class UltraZenSearcher {
  private abortController: AbortController | null = null;
  private currentQuery: string = '';
  private cacheValid = false;

  /**
   * Ultra-fast search using ripgrep with zero-copy streaming
   */
  async *searchStream(
    query: string,
    options: SearchOptions = {}
  ): AsyncGenerator<SearchResult, void, unknown> {
    const { contextLines = 2 } = options;

    if (!query.trim()) return;

    // Cancel previous search
    this.cancel();
    this.currentQuery = query;
    this.abortController = new AbortController();

    const startNs = nanoseconds();

    // Check if ripgrep is available
    const rgPath = which('rg');
    if (!rgPath) {
      console.log(c.yellow('⚠️  ripgrep not found, falling back to JS search'));
      yield* this.fallbackSearch(query);
      return;
    }

    // Ensure flat docs exist
    await this.ensureFlatDocs();

    try {
      const caseFlag = options.caseSensitive ? '' : '--smart-case';
      const cmd = ['rg', '--json', caseFlag, '-C', String(contextLines), query, FLAT_DOCS_PATH].filter(Boolean);

      // Using `using` for automatic cleanup (AsyncDisposable)
      await using proc = spawn({
        cmd,
        stdout: 'pipe',
        stderr: 'pipe',
        signal: this.abortController.signal,
      });
      
      const decoder = new TextDecoder();
      let resultCount = 0;
      
      // Zero-copy streaming from stdout
      if (proc.stdout instanceof ReadableStream) {
        for await (const chunk of proc.stdout) {
          // Check for abort
          if (this.abortController.signal.aborted) {
            console.log(c.gray('  [Search cancelled]'));
            return;
          }
          
          const lines = decoder.decode(chunk).split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'match') {
                resultCount++;

                const matchData = parsed.data;
                const result: SearchResult = {
                  path: this.extractUrl(matchData.path?.text || ''),
                  line: matchData.line_number,
                  text: matchData.lines?.text?.trim() || '',
                  score: this.calculateScore(query, matchData),
                  context: this.extractContext(matchData.lines?.text || ''),
                };

                yield result;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      // Wait for process to complete and get resource usage
      const exitCode = await proc.exited;
      const wallTime = Number(nanoseconds() - startNs) / 1e6;

      // Log resource usage if available
      if (proc.resourceUsage) {
        const { maxRSS, cpuTime } = proc.resourceUsage;
        console.log(c.gray(`  📊 ripgrep: ${resultCount} results, ${(maxRSS / 1024).toFixed(1)}KB RAM, ${cpuTime.total.toFixed(1)}ms CPU, ${wallTime.toFixed(1)}ms wall`));
      }

      // Exit code 1 means no matches found (normal for ripgrep)
      if (exitCode !== 0 && exitCode !== 1) {
        console.log(c.gray(`  (ripgrep exit: ${exitCode})`));
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log(c.gray('  [Search aborted]'));
      } else {
        console.error(c.red(`  Search error: ${(error as Error).message}`));
      }
    }
  }
  
  /**
   * Cancel current search
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Invalidate cache to force re-fetch
   */
  invalidateCache(): void {
    this.cacheValid = false;
  }

  async refreshIndex(): Promise<void> {
    this.invalidateCache();
    await this.ensureFlatDocs();
  }
  
  /**
   * Fallback JS search (no ripgrep)
   */
  private async *fallbackSearch(query: string): AsyncGenerator<SearchResult, void, unknown> {
    const content = await readFile(FLAT_DOCS_PATH, 'utf-8').catch(() => '');
    if (!content) {
      console.log(c.yellow('  No documentation cached. Run with --index first.'));
      return;
    }

    const lines = content.split('\n');
    const q = query.toLowerCase();
    const queryTerms = q.split(/\s+/).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();

      // Check if all query terms are present
      const matchScore = queryTerms.reduce((score, term) => {
        return score + (lineLower.includes(term) ? 1 : 0);
      }, 0);

      if (matchScore === queryTerms.length) {
        yield {
          path: this.extractUrlFromLine(lines[i]),
          line: i + 1,
          text: lines[i].trim(),
          score: matchScore,
          context: this.extractContext(lines[i]),
        };
      }
    }
  }
  
  /**
   * Ensure flat docs file exists for ripgrep
   */
  private async ensureFlatDocs(): Promise<void> {
    if (this.cacheValid) return;

    try {
      const stats = await stat(FLAT_DOCS_PATH);
      // Cache is valid for 24 hours
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - stats.mtimeMs < maxAge) {
        this.cacheValid = true;
        return;
      }
    } catch {
      // File doesn't exist, fetch it
    }

    // Fetch and flatten docs
    console.log(c.yellow('📡 Fetching documentation...'));

    try {
      const response = await fetch(DOCS_INDEX_URL, {
        headers: { 'User-Agent': `bun-docs-ultra/2.0` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();

      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(FLAT_DOCS_PATH, content);

      console.log(c.green(`✓ Cached ${(content.length / 1024).toFixed(1)}KB to ${FLAT_DOCS_PATH}`));
      this.cacheValid = true;
    } catch (error) {
      console.error(c.red(`Failed to fetch docs: ${(error as Error).message}`));
      throw error;
    }
  }
  
  /**
   * Extract URL from path or content
   */
  private extractUrl(path: string): string {
    // Try to extract URL from the path
    const urlMatch = path.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) return urlMatch[0];
    return 'https://bun.com/docs';
  }

  /**
   * Extract URL from a line of content
   */
  private extractUrlFromLine(line: string): string {
    const urlMatch = line.match(/https?:\/\/bun\.(com|sh)[^\s)]*/);
    return urlMatch ? urlMatch[0] : 'https://bun.com/docs';
  }

  /**
   * Extract context snippet from text
   */
  private extractContext(text: string, maxLength = 150): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength - 3) + '...';
  }
  
  /**
   * Calculate relevance score
   */
  private calculateScore(query: string, match: { lines?: { text?: string } }): number {
    const text = (match.lines?.text || '').toLowerCase();
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);

    let score = 0;

    // Exact phrase match
    if (text.includes(q)) score += 10;

    // Starts with query
    if (text.startsWith(q)) score += 5;

    // Individual term matches
    for (const term of terms) {
      if (text.includes(term)) score += 2;
      if (text.includes(` ${term} `)) score += 1; // Word boundary
    }

    // Boost for title-like patterns (lines starting with #)
    if (text.startsWith('#')) score += 3;

    return score;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED STREAMING WITH BACKPRESSURE
// ═══════════════════════════════════════════════════════════════════════════════

class StreamingProcessor {
  private pendingChunks: Uint8Array[] = [];
  private totalSize = 0;
  private highWaterMark: number;

  constructor(highWaterMark = 1024 * 1024) { // 1MB default
    this.highWaterMark = highWaterMark;
  }
  /**
   * Process stream with backpressure handling
   */
  async processWithBackpressure<T>(
    source: ReadableStream<Uint8Array>,
    processor: (chunk: string) => T[],
    maxInFlight = 100
  ): Promise<T[]> {
    const results: T[] = [];
    const reader = source.getReader();
    const decoder = new TextDecoder();

    try {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Track memory usage
        this.totalSize += value.byteLength;
        this.pendingChunks.push(value);

        // Apply backpressure if buffer too large
        if (this.totalSize > this.highWaterMark) {
          await new Promise((r) => setImmediate(r));
          this.pendingChunks = [];
          this.totalSize = 0;
        }

        // Check results backpressure
        if (results.length > maxInFlight) {
          await new Promise((r) => setImmediate(r));
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          try {
            const items = processor(line);
            results.push(...items);
          } catch {
            // Skip lines that fail processing
          }
        }
      }

      // Process remaining buffer
      if (buffer) {
        try {
          const items = processor(buffer);
          results.push(...items);
        } catch {
          // Skip if processing fails
        }
      }

    } finally {
      reader.releaseLock();
    }

    return results;
  }

  /**
   * Get total bytes processed
   */
  getBytesProcessed(): number {
    return this.totalSize;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE SEARCH WITH ADAPTIVE CANCELLATION
// ═══════════════════════════════════════════════════════════════════════════════

class InteractiveSearcher {
  private searcher = new UltraZenSearcher();
  private lastQuery = '';
  private debounceTimer: Timer | null = null;
  private results: SearchResult[] = [];

  async adaptiveSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { maxResults = MAX_RESULTS } = options;

    // Debounce: cancel if query changed rapidly
    if (query !== this.lastQuery) {
      this.searcher.cancel();
      this.lastQuery = query;

      // Clear previous timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Wait for debounce period
      await new Promise((r) => {
        this.debounceTimer = setTimeout(r, DEBOUNCE_MS);
      });

      // Check if query changed during delay
      if (query !== this.lastQuery) return this.results;
    }

    console.log(c.bold(c.cyan(`\n🔍 "${query}"`)));
    console.log(c.gray('─'.repeat(60)));

    this.results = [];
    let count = 0;
    const startNs = nanoseconds();

    for await (const result of this.searcher.searchStream(query, options)) {
      count++;
      this.results.push(result);

      const truncatedText = result.text.length > 80
        ? result.text.slice(0, 77) + '...'
        : result.text;

      console.log(`${c.green(`${count}.`)} ${c.bold(truncatedText)}`);
      console.log(`   ${c.gray(`${result.path}:${result.line}`)} ${c.gray(`(score: ${result.score})`)}`);

      if (count >= maxResults) {
        console.log(c.gray(`   ... and more results available`));
        break;
      }
    }

    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;

    if (count === 0) {
      console.log(c.yellow('   No results found'));
      console.log(c.gray('   Try: bun-docs-ultra --index (to refresh cache)'));
    } else {
      console.log(c.gray(`\n  ${count} results in ${elapsedMs.toFixed(2)}ms`));
    }

    return this.results;
  }

  /**
   * Get last search results
   */
  getResults(): SearchResult[] {
    return this.results;
  }

  /**
   * Force cache refresh
   */
  async refreshCache(): Promise<void> {
    await this.searcher.refreshIndex();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🔍 bun-docs-ultra - Ultra-Zen Documentation Search v2.0        ║
╠══════════════════════════════════════════════════════════════════╣
║  Bun.spawn • ripgrep • Zero-copy streaming • AbortSignal        ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  bun-docs-ultra "<search query>" [options]

Options:
  --index         Force refresh documentation cache
  --max <n>       Maximum results to show (default: 15)
  --context <n>   Context lines around matches (default: 2)
  --case          Case-sensitive search
  --json          Output as JSON
  -h, --help      Show this help

Examples:
  bun-docs-ultra "Bun.serve"
  bun-docs-ultra "WebSocket" --max 20
  bun-docs-ultra "sqlite" --case
  bun-docs-ultra --index
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options: SearchOptions = {
    maxResults: args.includes('--max')
      ? parseInt(args[args.indexOf('--max') + 1], 10) || MAX_RESULTS
      : MAX_RESULTS,
    contextLines: args.includes('--context')
      ? parseInt(args[args.indexOf('--context') + 1], 10) || 2
      : 2,
    caseSensitive: args.includes('--case'),
  };

  const outputJson = args.includes('--json');
  const forceIndex = args.includes('--index');
  const showHelpFlag = args.includes('-h') || args.includes('--help');

  // Remove options (and option values) from args to get query.
  const queryArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--max' || arg === '--context') {
      i += 1;
      continue;
    }
    if (
      arg === '--index' ||
      arg === '--json' ||
      arg === '--case' ||
      arg === '--help' ||
      arg === '-h'
    ) {
      continue;
    }
    if (arg.startsWith('-')) {
      continue;
    }
    queryArgs.push(arg);
  }
  const query = queryArgs.join(' ');

  if (showHelpFlag) {
    showHelp();
    process.exit(0);
  }

  if (!query && !forceIndex) {
    showHelp();
    process.exit(1);
  }

  const interactive = new InteractiveSearcher();

  if (forceIndex) {
    await interactive.refreshCache();
    if (!query) {
      console.log(c.green('✓ Cache refreshed'));
      process.exit(0);
    }
  }

  const results = await interactive.adaptiveSearch(query, options);

  if (outputJson) {
    console.log(JSON.stringify(results, null, 2));
  }

  console.log();
}

if (import.meta.main) {
  main().catch(console.error);
}

export { UltraZenSearcher, StreamingProcessor, InteractiveSearcher };
