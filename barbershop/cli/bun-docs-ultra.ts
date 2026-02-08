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
 */

import { nanoseconds, spawn, which } from 'bun';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.cache', 'bun-docs');
const FLAT_DOCS_PATH = join(CACHE_DIR, 'docs-flat.txt');

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
}

interface ResourceMetrics {
  maxRSS: number;
  cpuTime: { user: number; system: number; total: number };
  wallTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ULTRA-ZEN SEARCH WITH BUN.SPAWN
// ═══════════════════════════════════════════════════════════════════════════════

class UltraZenSearcher {
  private abortController: AbortController | null = null;
  private currentQuery: string = '';
  
  /**
   * Ultra-fast search using ripgrep with zero-copy streaming
   */
  async *searchStream(query: string): AsyncGenerator<SearchResult, void, unknown> {
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
      // Using `using` for automatic cleanup (AsyncDisposable)
      await using proc = spawn({
        cmd: ['rg', '--json', '--smart-case', '-C', '2', query, FLAT_DOCS_PATH],
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
                
                const result: SearchResult = {
                  path: this.extractUrl(parsed.data.path.text),
                  line: parsed.data.line_number,
                  text: parsed.data.lines.text.trim(),
                  score: this.calculateScore(query, parsed),
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
      
      if (exitCode !== 0 && exitCode !== 1) {
        // Exit code 1 means no matches found (normal for ripgrep)
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
   * Fallback JS search (no ripgrep)
   */
  private async *fallbackSearch(query: string): AsyncGenerator<SearchResult, void, unknown> {
    const content = await readFile(FLAT_DOCS_PATH, 'utf-8').catch(() => '');
    const lines = content.split('\n');
    const q = query.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        yield {
          path: 'https://bun.com/docs',
          line: i + 1,
          text: lines[i].trim(),
          score: 1,
        };
      }
    }
  }
  
  /**
   * Ensure flat docs file exists for ripgrep
   */
  private async ensureFlatDocs(): Promise<void> {
    try {
      await stat(FLAT_DOCS_PATH);
    } catch {
      // Fetch and flatten docs
      console.log(c.yellow('📡 Fetching documentation...'));
      
      const response = await fetch('https://bun.com/docs/llms.txt');
      const content = await response.text();
      
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(FLAT_DOCS_PATH, content);
      
      console.log(c.green(`✓ Cached to ${FLAT_DOCS_PATH}`));
    }
  }
  
  /**
   * Extract URL from path text
   */
  private extractUrl(path: string): string {
    // The path is our flat file, extract URLs from content
    return 'https://bun.com/docs';
  }
  
  /**
   * Calculate relevance score
   */
  private calculateScore(query: string, match: any): number {
    const text = match.data.lines.text.toLowerCase();
    const q = query.toLowerCase();
    
    let score = 1;
    if (text.startsWith(q)) score += 3;
    if (text.includes(` ${q} `)) score += 2;
    if (text.includes(q)) score += 1;
    
    return score;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED STREAMING WITH BACKPRESSURE
// ═══════════════════════════════════════════════════════════════════════════════

class StreamingProcessor {
  /**
   * Process stream with backpressure handling
   */
  async processWithBackpressure<T>(
    source: ReadableStream<Uint8Array>,
    processor: (chunk: string) => T[],
    highWaterMark = 16
  ): Promise<T[]> {
    const results: T[] = [];
    const reader = source.getReader();
    const decoder = new TextDecoder();
    
    try {
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Check backpressure
        if (results.length > highWaterMark * 10) {
          await new Promise(r => setImmediate(r));
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const items = processor(line);
          results.push(...items);
        }
      }
      
      // Process remaining buffer
      if (buffer) {
        const items = processor(buffer);
        results.push(...items);
      }
      
    } finally {
      reader.releaseLock();
    }
    
    return results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE SEARCH WITH ADAPTIVE CANCELLATION
// ═══════════════════════════════════════════════════════════════════════════════

class InteractiveSearcher {
  private searcher = new UltraZenSearcher();
  private lastQuery = '';
  
  async adaptiveSearch(query: string): Promise<void> {
    // Debounce: cancel if query changed rapidly
    if (query !== this.lastQuery) {
      this.searcher.cancel();
      this.lastQuery = query;
      
      // Small delay for typing
      await new Promise(r => setTimeout(r, 50));
      
      // Check if query changed during delay
      if (query !== this.lastQuery) return;
    }
    
    console.log(c.bold(c.cyan(`\n🔍 "${query}"`)));
    console.log(c.gray('─'.repeat(60)));
    
    let count = 0;
    const startNs = nanoseconds();
    
    for await (const result of this.searcher.searchStream(query)) {
      count++;
      
      console.log(`${c.green(`${count}.`)} ${c.bold(result.text.slice(0, 80))}`);
      console.log(`   ${c.gray(`${result.path}:${result.line}`)}`);
      
      if (count >= 10) {
        console.log(c.gray(`   ... and more`));
        break;
      }
    }
    
    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    
    if (count === 0) {
      console.log(c.yellow('   No results found'));
    } else {
      console.log(c.gray(`\n  ${count} results in ${elapsedMs.toFixed(2)}ms`));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const query = args.join(' ');
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🔍 bun-docs-ultra - Ultra-Zen Documentation Search             ║
╠══════════════════════════════════════════════════════════════════╣
║  Bun.spawn • ripgrep • Zero-copy streaming • AbortSignal        ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  if (!query) {
    console.log('Usage: bun-docs-ultra "<search query>"');
    console.log();
    console.log('Examples:');
    console.log('  bun-docs-ultra "Bun.serve"');
    console.log('  bun-docs-ultra "WebSocket"');
    console.log('  bun-docs-ultra "sqlite"');
    process.exit(1);
  }
  
  const interactive = new InteractiveSearcher();
  await interactive.adaptiveSearch(query);
  
  console.log();
}

if (import.meta.main) {
  main().catch(console.error);
}

export { UltraZenSearcher, StreamingProcessor, InteractiveSearcher };
