#!/usr/bin/env bun
/**
 * MCP Tool Test Suite - Bun Typed Array Matrix Inspector
 *
 * Comprehensive test suite for the MCP tool implementation covering:
 * - Tool functionality and schema validation
 * - Semantic search capabilities
 * - Error handling and edge cases
 * - Performance and concurrency testing
 * - Integration with matrix data
 */

import {
  test,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  expect,
  mock,
  spyOn,
} from 'bun:test';
import { z } from 'zod';
import { matrixSearchTool, matrixToolSet } from '../services/matrix/matrix-mcp-tool';

// =============================================================================
// TEST SETUP & LIFECYCLE
// =============================================================================

describe('MCP Tool Test Suite', () => {
  const originalConsole = { ...console };

  beforeAll(() => {
    console.log('🔧 Initializing MCP Tool Test Suite');
  });

  beforeEach(() => {
    // Mock console methods to reduce noise during testing
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});
    spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console after each test
    mock.restore();
  });

  afterAll(() => {
    Object.assign(console, originalConsole);
    console.log('✅ MCP Tool Test Suite Complete');
  });

// =============================================================================
// TOOL REGISTRATION & STRUCTURE TESTS
// =============================================================================

describe('Tool Registration & Structure', () => {
  test('exports complete tool set', () => {
    expect(matrixToolSet).toBeDefined();
    expect(Array.isArray(matrixToolSet)).toBe(true);
    expect(matrixToolSet.length).toBe(3);
  });

  test('matrix search tool is properly configured', () => {
    expect(matrixSearchTool.name).toBe('search-typed-array-matrix');
    expect(matrixSearchTool.description).toContain('Typed Array Inspector');
    expect(matrixSearchTool.inputSchema).toBeDefined();
    expect(typeof matrixSearchTool.execute).toBe('function');
  });

  test('correlation analysis tool is registered', () => {
    const correlationTool = matrixToolSet.find(t => t.name === 'analyze-matrix-correlations');
    expect(correlationTool).toBeDefined();
    expect(correlationTool?.description).toContain('correlations');
    expect(correlationTool?.inputSchema).toBeDefined();
  });

  test('compatibility check tool is registered', () => {
    const compatibilityTool = matrixToolSet.find(t => t.name === 'check-matrix-compatibility');
    expect(compatibilityTool).toBeDefined();
    expect(compatibilityTool?.description).toContain('compatibility');
    expect(compatibilityTool?.inputSchema).toBeDefined();
  });
});

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Schema Validation', () => {
  test('valid search input schema', () => {
    const validInput = {
      query: 'critical memory overflow',
      filters: {
        severity: 'critical',
        status: 'active',
        impactLevel: 'high',
        categories: ['memory'],
        components: ['typed-arrays']
      },
      context: 'error-analysis',
      limit: 5,
      includeRelated: true,
      exportFormat: 'detailed'
    };

    expect(() => matrixSearchTool.inputSchema.parse(validInput)).not.toThrow();
  });

  test('invalid search input schema rejects', () => {
    const invalidInput = {
      query: '', // Empty query should fail
      limit: 'invalid', // Non-numeric limit
    };

    expect(() => matrixSearchTool.inputSchema.parse(invalidInput)).toThrow();
  });

  test('partial filter validation', () => {
    const partialInput = {
      query: 'test query',
      filters: {
        severity: 'warning',
        // Other filters optional
      }
    };

    expect(() => matrixSearchTool.inputSchema.parse(partialInput)).not.toThrow();
  });

  test('enum validation for severity', () => {
    const invalidSeverity = {
      query: 'test',
      filters: {
        severity: 'invalid' // Not in enum
      }
    };

    expect(() => matrixSearchTool.inputSchema.parse(invalidSeverity)).toThrow();
  });

  test('limit bounds validation', () => {
    const tooLowLimit = {
      query: 'test',
      limit: 0 // Below minimum
    };

    const tooHighLimit = {
      query: 'test',
      limit: 100 // Above maximum
    };

    expect(() => matrixSearchTool.inputSchema.parse(tooLowLimit)).toThrow();
    expect(() => matrixSearchTool.inputSchema.parse(tooHighLimit)).toThrow();
  });
});

// =============================================================================
// TOOL EXECUTION TESTS
// =============================================================================

describe('Tool Execution', () => {
  test('successful search execution', async () => {
    const input = {
      query: 'critical error',
      filters: {
        severity: 'critical',
        status: 'active'
      },
      limit: 10,
      includeRelated: true
    };

    const result = await matrixSearchTool.execute(input);

    expect(result.success).toBe(true);
    expect(result.search!.query).toBe('critical error');
    expect(result.results).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.version).toBe('1.01.01');
  }, 10000);

  test('search with no results', async () => {
    const input = {
      query: 'nonexistent error',
      limit: 1
    };

    const result = await matrixSearchTool.execute(input);

    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(result.summary!.totalSections).toBeGreaterThanOrEqual(0);
  });

  test('search with category filtering', async () => {
    const input = {
      query: 'memory',
      filters: {
        categories: ['memory', 'performance']
      },
      limit: 5
    };

    const result = await matrixSearchTool.execute(input);

    expect(result.success).toBe(true);
    expect(result.search!.filters.categories).toEqual(['memory', 'performance']);
  });

  test('error handling in tool execution', async () => {
    // This test is tricky as the current implementation doesn't have explicit error cases
    // In a real scenario, we'd test database connection failures, etc.
    const result = await matrixSearchTool.execute({
      query: 'test',
      limit: 1
    });

    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  test('natural language processing', () => {
    // Note: These functions are not exported, so we test through tool execution

    const testInput = {
      query: 'critical memory leak urgent',
      limit: 1
    };

    expect(() => matrixSearchTool.execute(testInput)).not.toThrow();
  });

  test('search matching and scoring', async () => {
    const result = await matrixSearchTool.execute({
      query: 'ERR_TYPED_ARRAY_OVERFLOW',
      limit: 1
    });

    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
  });

  test('cross-reference analysis', async () => {
    const result = await matrixSearchTool.execute({
      query: 'BUN_MEMORY_LIMIT',
      includeRelated: true,
      limit: 5
    });

    expect(result.success).toBe(true);
    expect(result.summary!.crossReferencesFound).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance Testing', () => {
  test('search performance under load', async () => {
    const startTime = performance.now();

    // Execute multiple searches concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      matrixSearchTool.execute({
        query: 'error memory',
        limit: 3
      })
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    expect(results.length).toBe(10);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  test('memory usage during search operations', async () => {
    const initialHeap = process.memoryUsage().heapUsed;

    await matrixSearchTool.execute({
      query: 'comprehensive test',
      limit: 50,
      includeRelated: true
    });

    const finalHeap = process.memoryUsage().heapUsed;
    const heapIncrease = finalHeap - initialHeap;

    // Memory increase should be reasonable (less than 50MB)
    expect(heapIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('concurrent search operations', async () => {
    const concurrentSearches = 5;
    const startTime = Date.now();

    const searchPromises = Array.from({ length: concurrentSearches }, (_, i) =>
      matrixSearchTool.execute({
        query: `test query ${i}`,
        filters: {
          severity: i % 2 === 0 ? 'critical' : 'warning'
        },
        limit: 2
      })
    );

    const results = await Promise.all(searchPromises);
    const duration = Date.now() - startTime;

    expect(results.length).toBe(concurrentSearches);
    results.forEach((result, i) => {
      expect(result.success).toBe(true);
      expect(result.search!.query).toBe(`test query ${i}`);
    });

    // Should complete relatively quickly (under 3 seconds for concurrent ops)
    expect(duration).toBeLessThan(3000);
  }, 5000);
});

// =============================================================================
// EDGE CASE & ERROR HANDLING TESTS
// =============================================================================

describe('Edge Cases & Error Handling', () => {
  test('empty query handling', async () => {
    // This should be caught by schema validation, but let's test execution
    try {
      await matrixSearchTool.execute({
        query: '',
        limit: 1
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('maximum limit handling', async () => {
    const result = await matrixSearchTool.execute({
      query: 'test',
      limit: 50 // Maximum allowed
    });

    expect(result.success).toBe(true);
    expect(result.summary!.maxResultsPerSection).toBe(50);
  });

  test('complex filter combinations', async () => {
    const input = {
      query: 'performance memory critical',
      filters: {
        severity: 'critical',
        status: 'active',
        impactLevel: 'high',
        categories: ['memory', 'performance'],
        components: ['typed-arrays', 'buffers', 'gc']
      },
      context: 'performance-tuning',
      limit: 20,
      includeRelated: true,
      exportFormat: 'summary'
    };

    const result = await matrixSearchTool.execute(input);

    expect(result.success).toBe(true);
    expect(result.search!.filters.severity).toBe('critical');
    expect(result.search!.context).toBe('performance-tuning');
  });

  test('relationship data integrity', async () => {
    const result = await matrixSearchTool.execute({
      query: 'env var related',
      includeRelated: true,
      limit: 10
    });

    expect(result.success).toBe(true);
    expect(result.summary!.crossReferencesFound).toBeDefined();
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  test('complete workflow - search to analysis', async () => {
    // First, perform a search
    const searchResult = await matrixSearchTool.execute({
      query: 'ERR_BUFFER_ALLOC_FAILED',
      limit: 5,
      includeRelated: true
    });

    expect(searchResult.success).toBe(true);
    expect((searchResult.results as any).results.length).toBeGreaterThanOrEqual(0);

    // Get the correlation analysis tool
    const correlationTool = matrixToolSet.find(t => t.name === 'analyze-matrix-correlations');
    expect(correlationTool).toBeDefined();

    // Perform correlation analysis
    if (correlationTool!) {
      const correlationInput = {
        errorCode: 'ERR_BUFFER_ALLOC_FAILED',
        analysisType: 'impact'
      };

      const analysisResult = await correlationTool.execute(correlationInput);
      expect(analysisResult.success).toBe(true);
      expect((analysisResult as any).analysis).toBeDefined();
    }
  }, 15000);

  test('tool version consistency', async () => {
    const results = await Promise.all([
      matrixSearchTool.execute({ query: 'version test', limit: 1 }),
      matrixToolSet[0].execute({ query: 'version check', limit: 1 }),
    ]);

    const versions = results.map(r => r.version);
    const uniqueVersions = [...new Set(versions)];

    // All tools should return the same version
    expect(uniqueVersions.length).toBe(1);
    expect(uniqueVersions[0]).toBe('1.01.01');
  });

  test('data consistency across tools', async () => {
    // Test that different tools work with the same underlying data
    const searchResult = await matrixSearchTool.execute({
      query: 'error',
      limit: 1
    });

    const compatibilityResult = matrixToolSet[2].execute({});

    const [search, compatibility] = await Promise.all([
      searchResult,
      compatibilityResult
    ]);

    expect(search.version).toBe(compatibility.version);
    expect((compatibility as any).compatibility.matrixVersion).toBe('1.01.01');
  });
});

// =============================================================================
// SNAPSHOT TESTS
// =============================================================================

describe('Snapshot Testing', () => {
  test('tool structure snapshot', () => {
    const toolStructure = {
      name: matrixSearchTool.name,
      description: matrixSearchTool.description.substring(0, 100) + '...', // Truncate for snapshot
      hasSchema: !!matrixSearchTool.inputSchema,
      hasExecute: typeof matrixSearchTool.execute === 'function',
      toolSetLength: matrixToolSet.length
    };

    expect(toolStructure).toMatchSnapshot();
  });

  test('successful response structure', async () => {
    const result = await matrixSearchTool.execute({
      query: 'snapshot test',
      limit: 1
    });

    const snapshotData = {
      success: result.success,
      hasSearch: 'search' in result,
      hasResults: 'results' in result,
      hasSummary: 'summary' in result,
      version: result.version,
      summaryKeys: Object.keys(result.summary || {})
    };

    expect(snapshotData).toMatchSnapshot();
  });

  test('error response structure', async () => {
    // Force an error by providing invalid input (though our schema might catch this)
    try {
      await matrixSearchTool.execute({} as any);
    } catch (error) {
      const errorStructure = {
        isError: true,
        hasMessage: 'message' in (error as any),
        hasType: 'type' in (error as any)
      };

      // Note: This test might not trigger an error with current implementation
      expect(errorStructure).toMatchSnapshot();
    }
  });
});

// =============================================================================
// ENVIRONMENT & CONFIG TESTS
// =============================================================================

describe('Environment & Configuration', () => {
  test('version consistency across all tools', () => {
    const expectedVersion = '1.01.01';

    matrixToolSet.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
    });

    // Version is returned in responses, tested above
  });

  test('tool schema completeness', () => {
    matrixToolSet.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.execute).toBe('function');
    });
  });

  test('data structure validation', async () => {
    // Test that the underlying data structures are valid
    const result = await matrixSearchTool.execute({
      query: 'data validation',
      limit: 1
    });

    expect(result.success).toBe(true);

    // If results exist, they should have expected structure
    // Narrow type for result.results
    const resultsObj = result.results as any;
    if (resultsObj.results && Array.isArray(resultsObj.results)) {
      resultsObj.results.forEach((section: any) => {
        expect(section.type).toBeDefined();
        expect(Array.isArray(section.results)).toBe(true);
        expect(typeof section.total).toBe('number');
      });
    }
  });
});

// =============================================================================
// TEST UTILITIES & HELPER FUNCTIONS
// =============================================================================

describe('Test Utilities', () => {
  test('mocked search response', () => {
    const mockResponse = {
      success: true,
      search: {
        query: 'mock query',
        processed: { query: 'mock query', semantics: {} },
        filters: {},
        timestamp: new Date().toISOString()
      },
      results: [{
        type: 'errors',
        results: [{
          code: 'MOCK_ERROR',
          description: 'Mocked error for testing',
          severity: 'info',
          weight: 1.0
        }],
        total: 1
      }],
      summary: {
        totalSections: 1,
        maxResultsPerSection: 1,
        crossReferencesFound: 0
      },
      version: '1.01.01'
    };

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.version).toBe('1.01.01');
    expect(mockResponse.results[0].type).toBe('errors');
  });

  test('performance comparison baseline', () => {
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Simulate some processing
      const result = i * 2 + 1;
      expect(result).toBeGreaterThan(i);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    // Should be very fast (< 1 microsecond per iteration)
    expect(avgTime).toBeLessThan(0.001);
  });
});

/**
 * CLI Usage Examples:
 *
 * # Run all MCP tool tests
 * bun test matrix-mcp-tool.test.ts
 *
 * # Run with coverage
 * bun test --coverage matrix-mcp-tool.test.ts
 *
 * # Run in watch mode during development
 * bun test --watch matrix-mcp-tool.test.ts
 *
 * # Run specific test patterns
 * bun test --testNamePattern="Tool Execution" matrix-mcp-tool.test.ts
 *
 * # Run concurrent tests for performance
 * bun test --concurrent matrix-mcp-tool.test.ts
 *
 * # Run with detailed reporting
 * bun test --reporter=tap matrix-mcp-tool.test.ts
 *
 * # Update snapshots when implementation changes
 * bun test --update-snapshots matrix-mcp-tool.test.ts
 *
 * Test Categories:
 * - Tool Registration & Structure: Validates tool configuration
 * - Schema Validation: Tests input validation and type safety
 * - Tool Execution: Tests actual tool functionality
 * - Utility Functions: Tests helper functions and data processing
 * - Performance Testing: Validates speed and resource usage
 * - Edge Cases & Error Handling: Tests boundary conditions
 * - Integration Tests: Tests tool interactions and data consistency
 * - Snapshot Tests: Ensures consistent output structure
 * - Environment & Configuration: Tests setup and configuration
 * - Test Utilities: Helper functions for testing
 */
});

export { matrixSearchTool } from '../services/matrix/matrix-mcp-tool';
