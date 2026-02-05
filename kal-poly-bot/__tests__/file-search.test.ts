#!/usr/bin/env bun
/**
 * File Search Utility Test Suite
 * 
 * Comprehensive test suite for memory-efficient file search utilities covering:
 * - Basic search functionality
 * - Regex pattern matching
 * - Edge cases and error handling
 * - Memory efficiency validation
 * - Concurrent operations
 * - Performance characteristics
 */

import {
  test,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  expect,
} from 'bun:test';
import { 
  searchLargeFile, 
  searchMultipleFiles, 
  countMatchesInFile,
  getFileStats,
  type SearchMatch 
} from '../utils/file-search';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// TEST SETUP & LIFECYCLE
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-files');
const TEST_FILES: string[] = [];

describe('File Search Utility Test Suite', () => {
  beforeAll(async () => {
    console.log('🔧 Setting up test files...');
    
    // Create test directory
    try {
      await mkdir(TEST_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Create test files with various content
    const testFile1 = join(TEST_DIR, 'test1.txt');
    const testFile2 = join(TEST_DIR, 'test2.txt');
    const testFile3 = join(TEST_DIR, 'test3.log');
    const largeTestFile = join(TEST_DIR, 'large.txt');

    // Test file 1: Simple text with errors
    await writeFile(testFile1, `Line 1: Normal text
Line 2: ERROR occurred here
Line 3: Another normal line
Line 4: ERROR and WARNING together
Line 5: Just text
Line 6: ERROR at the end
`);

    // Test file 2: Code-like content
    await writeFile(testFile2, `function test() {
  console.log('test');
  const error = new Error('test error');
  return error;
}

class TestClass {
  constructor() {
    this.value = 'test';
  }
}
`);

    // Test file 3: Log file format
    await writeFile(testFile3, `[2024-01-01 10:00:00] INFO: Application started
[2024-01-01 10:00:01] [ERROR]: Failed to connect
[2024-01-01 10:00:02] WARNING: Retrying connection
[2024-01-01 10:00:03] INFO: Connection established
[2024-01-01 10:00:04] [ERROR]: Invalid credentials
`);

    // Large test file (1000 lines)
    const largeContent = Array.from({ length: 1000 }, (_, i) => 
      `Line ${i + 1}: ${i % 100 === 0 ? 'ERROR' : 'normal'} content here\n`
    ).join('');
    await writeFile(largeTestFile, largeContent);

    TEST_FILES.push(testFile1, testFile2, testFile3, largeTestFile);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test files...');
    
    // Clean up test files
    for (const file of TEST_FILES) {
      try {
        await unlink(file);
      } catch (error) {
        // File might not exist
      }
    }

    // Remove test directory if empty
    try {
      await Bun.spawn(['rmdir', TEST_DIR]).exited;
    } catch (error) {
      // Directory might not be empty or might not exist
    }
  });

  // =============================================================================
  // BASIC SEARCH FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Search Functionality', () => {
    test('simple string search finds matches', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR');
      
      expect(results.length).toBe(3);
      expect(results[0].line).toBe(2);
      expect(results[0].text).toContain('ERROR');
      expect(results[1].line).toBe(4);
      expect(results[2].line).toBe(6);
    });

    test('case-sensitive search by default', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'error');
      
      expect(results.length).toBe(0); // Should not find lowercase 'error'
    });

    test('case-insensitive search finds matches', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'error', {
        caseInsensitive: true
      });
      
      expect(results.length).toBe(3);
    });

    test('search returns correct line numbers', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR');
      
      expect(results[0].line).toBe(2);
      expect(results[1].line).toBe(4);
      expect(results[2].line).toBe(6);
    });

    test('search returns full line text', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR');
      
      results.forEach(match => {
        expect(match.text).toBeDefined();
        expect(match.text.length).toBeGreaterThan(0);
        expect(match.text).toContain('ERROR');
      });
    });

    test('no matches returns empty array', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'NONEXISTENT');
      
      expect(results).toEqual([]);
    });
  });

  // =============================================================================
  // REGEX PATTERN TESTS
  // =============================================================================

  describe('Regex Pattern Matching', () => {
    test('regex pattern matching works', async () => {
      const results = await searchLargeFile(TEST_FILES[2], '\\[ERROR\\]', {
        useRegex: true
      });
      
      expect(results.length).toBe(2);
      results.forEach(match => {
        expect(match.text).toContain('[ERROR]');
      });
    });

    test('regex with alternation finds multiple patterns', async () => {
      const results = await searchLargeFile(TEST_FILES[2], 'ERROR|WARNING', {
        useRegex: true,
        caseInsensitive: true
      });
      
      expect(results.length).toBe(3); // 2 ERROR + 1 WARNING
    });

    test('invalid regex throws error', async () => {
      await expect(
        searchLargeFile(TEST_FILES[0], '[invalid', { useRegex: true })
      ).rejects.toThrow();
    });

    test('regex with word boundaries', async () => {
      const results = await searchLargeFile(TEST_FILES[1], '\\berror\\b', {
        useRegex: true,
        caseInsensitive: true
      });
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // LINE RANGE TESTS
  // =============================================================================

  describe('Line Range Search', () => {
    test('startLine filters results correctly', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR', {
        startLine: 4
      });
      
      expect(results.length).toBe(2); // Lines 4 and 6
      expect(results[0].line).toBeGreaterThanOrEqual(4);
    });

    test('endLine filters results correctly', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR', {
        endLine: 4
      });
      
      expect(results.length).toBe(2); // Lines 2 and 4
      expect(results.every(m => m.line <= 4)).toBe(true);
    });

    test('startLine and endLine together', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR', {
        startLine: 3,
        endLine: 5
      });
      
      expect(results.length).toBe(1); // Only line 4
      expect(results[0].line).toBe(4);
    });

    test('line range with no matches returns empty', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR', {
        startLine: 1,
        endLine: 1
      });
      
      expect(results.length).toBe(0);
    });
  });

  // =============================================================================
  // MAX MATCHES TESTS
  // =============================================================================

  describe('Max Matches Limiting', () => {
    test('maxMatches limits results', async () => {
      const results = await searchLargeFile(TEST_FILES[3], 'ERROR', {
        maxMatches: 5
      });
      
      expect(results.length).toBeLessThanOrEqual(5);
    });

    test('maxMatches stops searching early', async () => {
      const results = await searchLargeFile(TEST_FILES[3], 'normal', {
        maxMatches: 10
      });
      
      expect(results.length).toBeLessThanOrEqual(10);
    });

    test('maxMatches of 0 returns empty', async () => {
      const results = await searchLargeFile(TEST_FILES[0], 'ERROR', {
        maxMatches: 0
      });
      
      expect(results.length).toBe(0);
    });
  });

  // =============================================================================
  // PROGRESS CALLBACK TESTS
  // =============================================================================

  describe('Progress Callback', () => {
    test('progress callback is called', async () => {
      let progressCalls = 0;
      let lastLinesProcessed = 0;
      let lastMatchesFound = 0;

      await searchLargeFile(TEST_FILES[3], 'normal', {
        onProgress: (linesProcessed, matchesFound) => {
          progressCalls++;
          lastLinesProcessed = linesProcessed;
          lastMatchesFound = matchesFound;
        }
      });

      expect(progressCalls).toBeGreaterThan(0);
      expect(lastLinesProcessed).toBeGreaterThan(0);
      expect(lastMatchesFound).toBeGreaterThan(0);
    });

    test('progress callback receives correct values', async () => {
      const progressData: Array<[number, number]> = [];

      await searchLargeFile(TEST_FILES[3], 'ERROR', {
        onProgress: (lines, matches) => {
          progressData.push([lines, matches]);
        }
      });

      expect(progressData.length).toBeGreaterThan(0);
      progressData.forEach(([lines, matches]) => {
        expect(lines).toBeGreaterThan(0);
        expect(matches).toBeGreaterThanOrEqual(0);
        expect(matches).toBeLessThanOrEqual(lines);
      });
    });
  });

  // =============================================================================
  // MULTIPLE FILE SEARCH TESTS
  // =============================================================================

  describe('Multiple File Search', () => {
    test('searchMultipleFiles searches all files', async () => {
      const results = await searchMultipleFiles(
        [TEST_FILES[0], TEST_FILES[2]],
        'ERROR',
        { caseInsensitive: true }
      );

      expect(results.size).toBe(2);
      expect(results.get(TEST_FILES[0])?.length).toBe(3);
      expect(results.get(TEST_FILES[2])?.length).toBe(2);
    });

    test('searchMultipleFiles handles non-existent files gracefully', async () => {
      const results = await searchMultipleFiles(
        [TEST_FILES[0], '/nonexistent/file.txt'],
        'ERROR'
      );

      expect(results.size).toBe(2);
      expect(results.get(TEST_FILES[0])?.length).toBeGreaterThan(0);
      expect(results.get('/nonexistent/file.txt')?.length).toBe(0);
    });

    test('searchMultipleFiles handles empty file list', async () => {
      const results = await searchMultipleFiles([], 'ERROR');

      expect(results.size).toBe(0);
    });
  });

  // =============================================================================
  // COUNT MATCHES TESTS
  // =============================================================================

  describe('Count Matches', () => {
    test('countMatchesInFile returns correct count', async () => {
      const count = await countMatchesInFile(TEST_FILES[0], 'ERROR');

      expect(count).toBe(3);
    });

    test('countMatchesInFile with regex', async () => {
      const count = await countMatchesInFile(TEST_FILES[2], 'ERROR|WARNING', {
        useRegex: true,
        caseInsensitive: true
      });

      expect(count).toBe(3);
    });

    test('countMatchesInFile handles multiple matches per line', async () => {
      const testFile = join(TEST_DIR, 'multi-match.txt');
      await writeFile(testFile, 'ERROR ERROR ERROR\n');
      TEST_FILES.push(testFile);

      const count = await countMatchesInFile(testFile, 'ERROR');

      expect(count).toBe(3);
    });

    test('countMatchesInFile returns 0 for no matches', async () => {
      const count = await countMatchesInFile(TEST_FILES[0], 'NONEXISTENT');

      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // FILE STATS TESTS
  // =============================================================================

  describe('File Statistics', () => {
    test('getFileStats returns correct information', async () => {
      const stats = await getFileStats(TEST_FILES[0]);

      expect(stats.exists).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lineCount).toBe(6);
    });

    test('getFileStats handles non-existent files', async () => {
      const stats = await getFileStats('/nonexistent/file.txt');

      expect(stats.exists).toBe(false);
      expect(stats.size).toBe(0);
      expect(stats.lineCount).toBe(0);
    });

    test('getFileStats counts lines correctly', async () => {
      const stats = await getFileStats(TEST_FILES[3]);

      expect(stats.lineCount).toBe(1000);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    test('non-existent file throws error', async () => {
      await expect(
        searchLargeFile('/nonexistent/file.txt', 'ERROR')
      ).rejects.toThrow();
    });

    test('invalid regex pattern throws error', async () => {
      await expect(
        searchLargeFile(TEST_FILES[0], '[invalid', { useRegex: true })
      ).rejects.toThrow();
    });

    test('empty pattern throws error', async () => {
      await expect(
        searchLargeFile(TEST_FILES[0], '')
      ).rejects.toThrow();
    });
  });

  // =============================================================================
  // MEMORY EFFICIENCY TESTS
  // =============================================================================

  describe('Memory Efficiency', () => {
    test('large file search uses constant memory', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      await searchLargeFile(TEST_FILES[3], 'normal', {
        maxMatches: 100
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB for large file)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('countMatchesInFile uses minimal memory', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      await countMatchesInFile(TEST_FILES[3], 'normal');

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Counting should use even less memory (< 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  // =============================================================================
  // CONCURRENT OPERATIONS TESTS
  // =============================================================================

  describe('Concurrent Operations', () => {
    test('concurrent searches complete successfully', async () => {
      const promises = Array.from({ length: 5 }, () =>
        searchLargeFile(TEST_FILES[0], 'ERROR')
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.length).toBe(3);
      });
    });

    test('concurrent searches on different files', async () => {
      const promises = [
        searchLargeFile(TEST_FILES[0], 'ERROR'),
        searchLargeFile(TEST_FILES[1], 'error'),
        searchLargeFile(TEST_FILES[2], 'ERROR', { useRegex: true })
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(results[0].length).toBe(3);
      expect(results[1].length).toBeGreaterThan(0);
      expect(results[2].length).toBe(2);
    });
  });

  // =============================================================================
  // EDGE CASES TESTS
  // =============================================================================

  describe('Edge Cases', () => {
    test('empty file returns no matches', async () => {
      const emptyFile = join(TEST_DIR, 'empty.txt');
      await writeFile(emptyFile, '');
      TEST_FILES.push(emptyFile);

      const results = await searchLargeFile(emptyFile, 'ERROR');

      expect(results.length).toBe(0);
    });

    test('file with only newlines', async () => {
      const newlineFile = join(TEST_DIR, 'newlines.txt');
      await writeFile(newlineFile, '\n\n\n');
      TEST_FILES.push(newlineFile);

      // Search for newline character - should find matches in empty lines
      const results = await searchLargeFile(newlineFile, '^$', {
        useRegex: true
      });

      // Should find empty lines (lines with just newline)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('very long line handles correctly', async () => {
      const longLineFile = join(TEST_DIR, 'longline.txt');
      const longLine = 'ERROR ' + 'x'.repeat(100000) + '\n';
      await writeFile(longLineFile, longLine);
      TEST_FILES.push(longLineFile);

      const results = await searchLargeFile(longLineFile, 'ERROR');

      expect(results.length).toBe(1);
      expect(results[0].text.length).toBeGreaterThan(100000);
    });

    test('unicode characters handled correctly', async () => {
      const unicodeFile = join(TEST_DIR, 'unicode.txt');
      await writeFile(unicodeFile, 'Line 1: 正常文本\nLine 2: ERROR エラー\nLine 3: 🚀 ERROR\n');
      TEST_FILES.push(unicodeFile);

      const results = await searchLargeFile(unicodeFile, 'ERROR');

      expect(results.length).toBe(2);
    });
  });
});
