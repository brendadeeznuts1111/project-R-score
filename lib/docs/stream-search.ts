/**
 * Ultra-Zen Documentation Streaming System
 * High-performance streaming search using Bun.spawn Web Standard APIs
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
}

/**
 * Zero-copy streaming search with ReadableStream integration
 */
export class ZenStreamSearcher {
  private abortController = new AbortController();
  private searchStats: SearchStats = {
    matchesFound: 0,
    filesSearched: 0,
    bytesProcessed: 0,
    elapsedTime: 0,
    memoryUsage: 0
  };

  /**
   * Stream search results using ReadableStream without holding full text in memory
   * Enhanced with chunked processing, backpressure handling, and AsyncDisposable pattern
   */
  async streamSearch(options: StreamSearchOptions): Promise<SearchStats> {
    const startTime = performance.now();
    const decoder = new TextDecoder();
    
    // Prepare ripgrep arguments for JSON output (streamable)
    const args = [
      "rg",  // Add the executable name
      "--json",           // JSON output for easy parsing
      "--line-number",    // Include line numbers
      "--heading",        // Group by file
      options.query,
      options.cachePath
    ];

    try {
      // Using AsyncDisposable pattern (TS 5.2+) for automatic cleanup
      await using proc = (Bun as any).spawn(args, {
        stdout: "pipe",
        stderr: "pipe",
        signal: options.signal || this.abortController.signal
      });

      const stream = proc.stdout;
      if (!(stream instanceof ReadableStream)) {
        throw new Error("stdout is not a ReadableStream");
      }

      // Enhanced chunked processing with backpressure handling
      const reader = stream.getReader();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Process chunk as it arrives - zero-copy streaming
        const chunkText = decoder.decode(value, { stream: true });
        this.searchStats.bytesProcessed += value.length;
        
        // Accumulate and process complete lines
        buffer += chunkText;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const match: RipgrepMatch = JSON.parse(line);
            
            if (match.type === 'match') {
              this.searchStats.matchesFound++;
              options.onMatch?.(match);
            } else if (match.type === 'summary') {
              // Extract file count from summary if available
              // Note: ripgrep summary structure may vary, so we use a safe fallback
              this.searchStats.filesSearched = (match.data as any).stats?.searched_files || this.searchStats.filesSearched;
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            console.warn('Failed to parse ripgrep output:', line);
          }
        }
        
        // Report progress periodically
        if (this.searchStats.matchesFound % 10 === 0) {
          options.onProgress?.({ ...this.searchStats });
        }
      }
      
      // Process any remaining buffer content
      if (buffer.trim()) {
        try {
          const match: RipgrepMatch = JSON.parse(buffer);
          if (match.type === 'match') {
            this.searchStats.matchesFound++;
            options.onMatch?.(match);
          }
        } catch (parseError) {
          console.warn('Failed to parse final ripgrep output:', buffer);
        }
      }

      // Wait for process completion and get resource usage
      const exitCode = await proc.exited;
      this.searchStats.elapsedTime = performance.now() - startTime;
      
      // Log resource usage for performance monitoring
      const resourceUsage = proc.resourceUsage;
      if (resourceUsage) {
        const { maxRSS, cpuTime } = resourceUsage;
        console.log(`📊 Resource Usage - Max Memory: ${(maxRSS / 1024 / 1024).toFixed(2)}MB, CPU Time: ${cpuTime?.total || 'N/A'}ms`);
      }
      
      if (exitCode !== 0) {
        const stderr = await proc.stderr.text();
        throw new Error(`Search failed with exit code ${exitCode}: ${stderr}`);
      }

      return this.searchStats;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Search aborted by user');
      } else {
        console.error('❌ Search error:', error);
      }
      throw error;
    }
    // proc is automatically cleaned up here by the 'using' keyword!
  }

  /**
   * Advanced PTY search for interactive terminal applications
   */
  async ptySearch(query: string, cachePath: string): Promise<void> {
    const proc = (Bun as any).spawn(["rg", "--color=always", "--line-number", query, cachePath], {
      terminal: {
        cols: (process.stdout as any).columns || 80,
        rows: (process.stdout as any).rows || 24,
        data(terminal: any, data: Uint8Array) {
          // Process raw ANSI data from ripgrep
          (Bun as any).write(Bun.stdout, data);
        }
      }
    });

    await proc.exited;
    console.log('✅ PTY search complete');
  }

  /**
   * Resource-monitored search with detailed metrics
   */
  async monitoredSearch(query: string, cachePath: string): Promise<{ stats: SearchStats; resources: ResourceMetrics }> {
    const result = (Bun as any).spawnSync(["rg", "--json", "--line-number", query, cachePath]);
    
    // Extract resource usage metrics
    const resources: ResourceMetrics = result.resourceUsage;
    
    // Parse results from stdout
    let linesCount = 0;
    if (result.stdout) {
      const output = result.stdout.toString();
      const lines = output.split('\n').filter(line => line.trim());
      linesCount = lines.length;
      
      for (const line of lines) {
        try {
          const match: RipgrepMatch = JSON.parse(line);
          if (match.type === 'match') {
            this.searchStats.matchesFound++;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    this.searchStats.filesSearched = linesCount;
    this.searchStats.memoryUsage = resources.maxRSS;

    console.log(`📊 Max Memory: ${(resources.maxRSS / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  CPU Time: ${resources.cpuTime.total}ms`);
    console.log(`📁 Files Searched: ${this.searchStats.filesSearched}`);
    console.log(`🎯 Matches Found: ${this.searchStats.matchesFound}`);

    return {
      stats: this.searchStats,
      resources
    };
  }

  /**
   * Adaptive search with automatic cancellation of previous searches
   */
  async adaptiveSearch(query: string, cachePath: string, options: Partial<StreamSearchOptions> = {}): Promise<SearchStats> {
    // Cancel previous search if still running
    this.abortController.abort();
    this.abortController = new AbortController();
    
    // Reset stats for new search
    this.searchStats = {
      matchesFound: 0,
      filesSearched: 0,
      bytesProcessed: 0,
      elapsedTime: 0,
      memoryUsage: 0
    };

    return this.streamSearch({
      query,
      cachePath,
      signal: this.abortController.signal,
      onMatch: (match) => {
        console.log(`✨ Found in: ${match.data.path.text}:${match.data.line_number}`);
        console.log(`   ${match.data.lines.text.trim()}`);
      },
      onProgress: (stats) => {
        console.log(`📈 Progress: ${stats.matchesFound} matches, ${stats.bytesProcessed} bytes processed`);
      },
      ...options
    });
  }

  /**
   * Search through a Response object without saving to disk
   */
  async searchResponse(response: Response, query: string): Promise<SearchStats> {
    if (!response.body) {
      throw new Error("Response body is empty");
    }

    // Use the Response directly as stdin for ripgrep
    await using proc = (Bun as any).spawn(["rg", "--json", "--line-number", query], {
      stdin: response.body, // Response is a ReadableStream, perfect for stdin
      stdout: "pipe",
      stderr: "pipe"
    });

    const decoder = new TextDecoder();
    const stream = proc.stdout;

    if (!(stream instanceof ReadableStream)) {
      throw new Error("stdout is not a ReadableStream");
    }

    // Use proper ReadableStream reader instead of for await
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunkText = decoder.decode(value);
      const lines = chunkText.split("\n").filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const match: RipgrepMatch = JSON.parse(line);
          if (match.type === 'match') {
            this.searchStats.matchesFound++;
            console.log(`🌐 Found in response: ${match.data.lines.text.trim()}`);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    await proc.exited;
    return this.searchStats;
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    this.abortController.abort();
  }
}

/**
 * Enhanced Docs Fetcher with Ultra-Zen streaming
 */
export class EnhancedDocsFetcher {
  private searcher = new ZenStreamSearcher();

  async fetchAndSearch(query: string, docsUrl: string, cachePath: string): Promise<void> {
    try {
      console.log(`🔍 Searching for: ${query}`);
      console.log(`📂 Cache path: ${cachePath}`);
      
      // Perform adaptive search with automatic cancellation
      const stats = await this.searcher.adaptiveSearch(query, cachePath, {
        enableColors: true,
        onMatch: (match) => {
          const highlight = this.highlightMatch(match.data.lines.text, match.data.submatches);
          console.log(`\n📄 ${match.data.path.text}:${match.data.line_number}`);
          console.log(`   ${highlight}`);
        }
      });

      console.log(`\n✅ Search completed in ${stats.elapsedTime.toFixed(2)}ms`);
      console.log(`📊 Processed ${stats.bytesProcessed} bytes`);
      console.log(`🎯 Found ${stats.matchesFound} matches across ${stats.filesSearched} files`);
      
    } catch (error) {
      console.error('❌ Search failed:', error);
    }
  }

  private highlightMatch(text: string, submatches?: Array<{ match: { text: string }; start: number; end: number }>): string {
    if (!submatches || submatches.length === 0) {
      return text;
    }

    let highlighted = text;
    let offset = 0;

    for (const submatch of submatches) {
      const start = submatch.start + offset;
      const end = submatch.end + offset;
      const matchText = submatch.match.text;
      
      const before = highlighted.slice(0, start);
      const after = highlighted.slice(end);
      const highlightedMatch = `\x1b[33m${matchText}\x1b[0m`; // Yellow highlight
      
      highlighted = before + highlightedMatch + after;
      offset += highlightedMatch.length - matchText.length;
    }

    return highlighted;
  }

  async dispose(): Promise<void> {
    this.searcher.dispose();
  }
}

// Export for use in demos
export default ZenStreamSearcher;
