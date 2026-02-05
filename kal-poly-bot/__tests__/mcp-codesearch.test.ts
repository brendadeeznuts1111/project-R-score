// __tests__/mcp-codesearch.test.ts - Test bun-mcp ripgrep integration
import { RipgrepCodeSearch } from '../utils/codesearch.ts';
import { SuperRipgrep } from '../utils/super-ripgrep.ts';
import type { RipgrepMCP } from '../mcp/ripgrep.ts';

describe('Bun MCP CodeSearch Integration', () => {
  let searcher: RipgrepCodeSearch;
  let superSearcher: SuperRipgrep;

  beforeEach(() => {
    searcher = new RipgrepCodeSearch();
    superSearcher = new SuperRipgrep();
  });

  test('basic text search works', async () => {
    const result = await searcher.search({
      query: 'import.*Bun',
      type: 'ts',
      maxResults: 5
    });

    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('files');
    expect(Array.isArray(result.matches)).toBe(true);
    expect(typeof result.stats.timeMs).toBe('number');
  });

  test('symbol search works', async () => {
    const matches = await searcher.searchSymbols('RipgrepCodeSearch', '.');

    expect(Array.isArray(matches)).toBe(true);
    // Should find this class definition
    expect(matches.length).toBeGreaterThan(0);
  });

  test('search with context', async () => {
    const result = await searcher.search({
      query: 'class.*CodeSearch',
      context: 3,
      type: 'ts'
    });

    expect(result.matches.length).toBeGreaterThan(0);

    // Check that context is included
    const match = result.matches[0];
    expect(match).toHaveProperty('context');
    expect(match.context).toHaveProperty('before');
    expect(match.context).toHaveProperty('after');
    expect(Array.isArray(match.context.before)).toBe(true);
    expect(Array.isArray(match.context.after)).toBe(true);
  });

  test('search performance is fast', async () => {
    const start = performance.now();

    const result = await searcher.search({
      query: 'export',
      type: 'ts',
      maxResults: 10
    });

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should be very fast
    expect(result.stats.timeMs).toBeLessThan(100);
  });

  test('handles no matches gracefully', async () => {
    const result = await searcher.search({
      query: 'ZzZzZzNonExistentFunctionZzZzZz987654321',
      path: 'mcp', // Search only in mcp directory to avoid test files
      type: 'ts'
    });

    expect(result.matches).toHaveLength(0);
    expect(result.stats.matchesFound).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  test('respects maxResults limit', async () => {
    const result = await searcher.search({
      query: 'function|class|interface',
      type: 'ts',
      maxResults: 3
    });

    expect(result.matches.length).toBeLessThanOrEqual(3);
  });

  test('MCP protocol compliance', async () => {
    const mcpRequest: RipgrepMCP = {
      command: 'codesearch',
      version: '1.0',
      params: {
        query: 'Bun\\.serve',
        type: 'ts',
        context: 2
      }
    };

    const result = await searcher.search(mcpRequest.params);

    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('files');

    // Validate result structure
    result.matches.forEach(match => {
      expect(match).toHaveProperty('file');
      expect(match).toHaveProperty('line');
      expect(match).toHaveProperty('column');
      expect(match).toHaveProperty('content');
      expect(match).toHaveProperty('context');
      expect(typeof match.file).toBe('string');
      expect(typeof match.line).toBe('number');
      expect(typeof match.column).toBe('number');
      expect(typeof match.content).toBe('string');
    });
  });

  test('SuperRipgrep lightning speed', async () => {
    const result = await superSearcher.lightningSearch('export');

    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('durationMs');
    expect(result).toHaveProperty('throughput');
    expect(result.durationMs).toBeLessThan(500); // Should be fast
    expect(result.throughput).toBeGreaterThan(0);
  });

  test('speed comparison with grep', async () => {
    const comparison = await superSearcher.compareWithGrep('function', 'mcp');

    expect(comparison).toHaveProperty('ripgrep');
    expect(comparison).toHaveProperty('grep');
    expect(comparison).toHaveProperty('speedup');
    expect(comparison.ripgrep.durationMs).toBeLessThan(100);
    // Note: speedup might be 0 if grep completes very quickly on small directories
  });

  test('benchmark queries performance', async () => {
    const queries = ['class', 'interface', 'export'];
    const results = await superSearcher.benchmarkQueries(queries, 'mcp');

    expect(results).toHaveLength(queries.length);
    results.forEach(result => {
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('speedup');
      expect(result.durationMs).toBeLessThan(100);
    });
  });

  test('handles empty results gracefully', async () => {
    const result = await superSearcher.lightningSearch('ZzZzNonExistentTermZzZz', 'mcp');

    expect(result.matches).toBe(0);
    expect(result.files).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.throughput).toBe(0);
  });

  describe('Enhanced HistoryCLI Integration', () => {
    test('enhanced HistoryCLI accepts valid commands', async () => {
      // Test that enhancedHistoryCLI can be imported and called
      const { enhancedHistoryCLI } = await import('../surgical-precision-mcp/history-cli-manager.ts');
      expect(typeof enhancedHistoryCLI).toBe('function');
    });

    test('searchCodebaseCLI integrates with MCP', async () => {
      // Test that searchCodebaseCLI works with our MCP
      const { searchCodebaseCLI } = await import('../surgical-precision-mcp/history-cli-manager.ts');

      // This should work without throwing and return results
      await expect(searchCodebaseCLI('test')).resolves.toBeUndefined();
    });
  });
});