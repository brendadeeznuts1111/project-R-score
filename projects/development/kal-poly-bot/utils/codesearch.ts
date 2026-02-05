// utils/codesearch.ts - Ripgrep + Bun Terminal = Lightning Fast
import type { RipgrepMCP, CodeMatch, SearchStats, RgOutput } from '../mcp/ripgrep.ts';

export class RipgrepCodeSearch {
  async search(params: RipgrepMCP['params']): Promise<RipgrepMCP['result']> {
    const start = performance.now();

    const {
      query,
      path = '.',
      type = 'all',
      context = 2,
      maxResults = 50
    } = params;

    // Smart glob patterns based on type
    const glob = type === 'all' ? '**/*' : `**/*.{${type}}`;

    // Build ripgrep command with JSON output
    const rgArgs = [
      'rg',
      '--json',
      '--context', context.toString(),
      '--max-count', maxResults.toString(),
      '--glob', glob,
      query,
      path
    ];

    const proc = Bun.spawn(rgArgs, {
      stdout: 'pipe',
      stderr: 'inherit'
    });

    const results: RipgrepMCP['result'] = {
      matches: [],
      stats: { filesSearched: 0, matchesFound: 0, timeMs: 0 },
      files: []
    };

    try {
      const stdout = await new Response(proc.stdout).text();
      const lines = stdout.trim().split('\n').filter(Boolean);

      if (lines.length === 0) {
        // No matches found
        results.stats = {
          filesSearched: 0,
          matchesFound: 0,
          timeMs: performance.now() - start
        };
        return results;
      }

      // Parse ripgrep JSON output
      const outputs: RgOutput[] = [];
      for (const line of lines) {
        try {
          outputs.push(JSON.parse(line));
        } catch (e) {
          console.warn('Failed to parse ripgrep output line:', line);
        }
      }

      // Extract matches and summary
      const matches = outputs.filter((o): o is Extract<RgOutput, { type: 'match' }> =>
        o.type === 'match'
      );

      const summary = outputs.find((o): o is Extract<RgOutput, { type: 'summary' }> =>
        o.type === 'summary'
      );

      // Convert to our format
      const files = new Set<string>();
      for (const match of matches.slice(0, maxResults)) {
        const codeMatch: CodeMatch = {
          file: match.data.path.text,
          line: match.data.line_number,
          column: match.data.submatches[0]?.start || 0,
          content: match.data.lines.text.trim(),
          context: {
            before: match.data.context_pre?.map(l => l.text.trim()) || [],
            after: match.data.context_post?.map(l => l.text.trim()) || []
          }
        };

        results.matches.push(codeMatch);
        files.add(match.data.path.text);
      }

      results.files = Array.from(files);

      // Use summary stats if available, otherwise estimate
      if (summary) {
        results.stats = {
          filesSearched: summary.data.stats.searches,
          matchesFound: summary.data.stats.matches,
          timeMs: performance.now() - start
        };
      } else {
        results.stats = {
          filesSearched: files.size,
          matchesFound: results.matches.length,
          timeMs: performance.now() - start
        };
      }

    } catch (error) {
      console.error('Ripgrep search failed:', error);
      results.stats = {
        filesSearched: 0,
        matchesFound: 0,
        timeMs: performance.now() - start
      };
    }

    return results;
  }

  // Convenience method for simple text search
  async searchText(query: string, path: string = '.'): Promise<CodeMatch[]> {
    const result = await this.search({ query, path });
    return result.matches;
  }

  // Search for TypeScript/JavaScript symbols
  async searchSymbols(symbol: string, path: string = '.'): Promise<CodeMatch[]> {
    // Use word boundaries for symbol search
    const result = await this.search({
      query: `\\b${symbol}\\b`,
      path,
      type: 'ts',
      context: 1
    });
    return result.matches;
  }
}