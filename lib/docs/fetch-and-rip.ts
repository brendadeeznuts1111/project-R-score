/**
 * Fetch and Rip - Network-to-Process Streaming
 * Demonstrates direct streaming from fetch() to Bun.spawn without intermediate files
 */

import { ZenStreamSearcher } from './stream-search';

/**
 * Direct Network-to-Process Streaming
 * Streams web content directly into ripgrep without saving to disk
 */
export class FetchAndRipStreamer {
  /**
   * Stream search through a remote URL without downloading
   */
  async searchRemoteContent(url: string, query: string): Promise<void> {
    console.info(`🌐 Searching remote content: ${url}`);
    console.info(`🔍 Query: ${query}`);

    try {
      // Fetch the remote content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.info(`📥 Fetched ${response.headers.get('content-length') || 'unknown'} bytes`);

      // Stream directly to ripgrep - this is the magic!
      const startTime = performance.now();
      const proc = (Bun as Record<string, unknown>).spawn(['rg', '--line-number', '--color=always', query], {
        stdin: response.body, // Response body is a ReadableStream!
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Get the results as text
      const result = await proc.stdout.text();
      const endTime = performance.now();

      console.info(`\n✅ Search completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.info(`📊 Results:`);
      console.info(result);

      // Check for errors
      const stderr = await proc.stderr.text();
      if (stderr) {
        console.info(`⚠️ stderr: ${stderr}`);
      }

      const exitCode = await proc.exited;
      console.info(`🏁 Process exited with code: ${exitCode}`);
    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }

  /**
   * Advanced streaming with multiple queries
   */
  async searchMultipleQueries(url: string, queries: string[]): Promise<void> {
    console.info(`🔍 Multi-query search on: ${url}`);
    console.info(`📋 Queries: ${queries.join(', ')}`);

    // For multiple queries, we need to fetch multiple times or use a different approach
    // Option 1: Fetch once and use tee() (if available) or create multiple streams
    // Option 2: Fetch multiple times (simpler and more reliable)

    for (const query of queries) {
      console.info(`\n--- Searching for: ${query} ---`);

      try {
        // Fetch fresh for each query to avoid stream consumption issues
        const response = await fetch(url);
        if (!response.ok) {
          console.info(`❌ Failed to fetch: ${response.status}`);
          continue;
        }

        // Stream directly to ripgrep
        const proc = (Bun as Record<string, unknown>).spawn(['rg', '--line-number', '--heading', query], {
          stdin: response.body,
          stdout: 'pipe',
        });

        const result = await proc.stdout.text();
        if (result.trim()) {
          console.info(result);
        } else {
          console.info('No matches found.');
        }

        await proc.exited;
      } catch (error) {
        console.info(`❌ Error searching for '${query}': ${error.message}`);
      }
    }
  }

  /**
   * Stream with custom processing
   */
  async searchWithProcessing(url: string, query: string): Promise<any[]> {
    console.info(`🧠 Processing search results from: ${url}`);

    const response = await fetch(url);
    const proc = (Bun as Record<string, unknown>).spawn(['rg', '--json', query], {
      stdin: response.body,
      stdout: 'pipe',
    });

    // Process JSON results as they stream in
    const results: any[] = [];
    const decoder = new TextDecoder();

    for await (const chunk of proc.stdout) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const match = JSON.parse(line);
          if (match.type === 'match') {
            results.push({
              line: match.data.line_number,
              content: match.data.lines.text.trim(),
              path: match.data.path.text,
              submatches: match.data.submatches?.map((sm: any) => sm.match.text) || [],
            });
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }

    await proc.exited;
    console.info(`📈 Processed ${results.length} matches`);
    return results;
  }
}

/**
 * Documentation URL Collection
 * Common Bun documentation URLs for testing
 */
export const DOCUMENTATION_URLS = {
  main: 'https://bun.sh/docs',
  llms: 'https://bun.sh/docs/llms.txt',
  runtime: 'https://bun.sh/docs/runtime',
  bundler: 'https://bun.sh/docs/bundler',
  cli: 'https://bun.sh/docs/cli/bun',
  testRunner: 'https://bun.sh/docs/test-runner',
  typescript: 'https://bun.sh/docs/typescript',
};

/**
 * Demonstration function
 */
export async function demonstrateFetchAndRip() {
  console.info('🌐 Fetch & Rip - Network-to-Process Streaming Demo');
  console.info('='.repeat(60));

  const streamer = new FetchAndRipStreamer();

  // Demo 1: Basic remote search
  console.info('\n1️⃣ Basic Remote Content Search');
  console.info('-'.repeat(40));
  await streamer.searchRemoteContent(DOCUMENTATION_URLS.llms, 'spawn');

  // Demo 2: Multi-query search
  console.info('\n2️⃣ Multi-Query Search');
  console.info('-'.repeat(40));
  await streamer.searchMultipleQueries(DOCUMENTATION_URLS.llms, [
    'fetch',
    'spawn',
    'ReadableStream',
  ]);

  // Demo 3: Processed results
  console.info('\n3️⃣ Processed JSON Results');
  console.info('-'.repeat(40));
  const results = await streamer.searchWithProcessing(DOCUMENTATION_URLS.llms, 'bun');

  console.info('\n📊 Processed Results Summary:');
  results.slice(0, 5).forEach((result, i) => {
    console.info(`${i + 1}. Line ${result.line}: ${result.content.substring(0, 80)}...`);
  });

  console.info(`\n✨ Total matches: ${results.length}`);
}

/**
 * Integration with ZenStreamSearcher
 */
export class NetworkDocumentationSearcher extends ZenStreamSearcher {
  /**
   * Search remote documentation using the Zen streaming approach
   */
  async searchRemoteDocs(url: string, query: string): Promise<any> {
    console.info(`🔮 Remote Zen Search: ${query} in ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      // Use the enhanced searchResponse method from ZenStreamSearcher
      const stats = await this.searchResponse(response, query);

      console.info(`🎯 Remote search complete: ${stats.matchesFound} matches`);
      return stats;
    } catch (error) {
      console.error(`❌ Remote search failed:`, error);
      throw error;
    }
  }
}

// Basic example from the original snippet
async function basicExample() {
  const docUrl = 'https://bun.sh/docs/llms.txt';

  const proc = (Bun as Record<string, unknown>).spawn(['rg', 'Bun.spawn'], {
    stdin: await fetch(docUrl), // Direct streaming from network to rg
    stdout: 'pipe',
  });

  console.info(await proc.stdout.text());
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Uncomment to run the basic example
  // basicExample();

  // Or run the comprehensive demo
  demonstrateFetchAndRip().catch(console.error);
}
