/**
 * File Search Utilities - Usage Examples
 * 
 * Demonstrates how to use the memory-efficient file search utilities
 * for searching large files without loading them entirely into memory.
 */

import { 
  searchLargeFile, 
  searchMultipleFiles, 
  countMatchesInFile,
  getFileStats,
  type SearchMatch 
} from './file-search';

// Example 1: Simple string search
async function example1() {
  console.info('Example 1: Simple string search');
  
  const results = await searchLargeFile('./huge-log.txt', 'ERROR');
  
  console.info(`Found ${results.length} matches:`);
  results.forEach(match => {
    console.info(`  Line ${match.line}: ${match.text.substring(0, 80)}...`);
  });
}

// Example 2: Case-insensitive regex search with limits
async function example2() {
  console.info('\nExample 2: Case-insensitive regex search');
  
  const results = await searchLargeFile('./logs.txt', 'error|warning|critical', {
    caseInsensitive: true,
    useRegex: true,
    maxMatches: 100,
    onProgress: (linesProcessed, matchesFound) => {
      console.info(`  Progress: ${linesProcessed} lines, ${matchesFound} matches`);
    }
  });
  
  console.info(`Found ${results.length} matches`);
}

// Example 3: Search specific line range
async function example3() {
  console.info('\nExample 3: Search line range');
  
  const results = await searchLargeFile('./large-file.txt', 'TODO', {
    startLine: 1000,
    endLine: 5000
  });
  
  console.info(`Found ${results.length} matches between lines 1000-5000`);
}

// Example 4: Search multiple files concurrently
async function example4() {
  console.info('\nExample 4: Search multiple files');
  
  const filePaths = [
    './src/file1.ts',
    './src/file2.ts',
    './src/file3.ts'
  ];
  
  const results = await searchMultipleFiles(filePaths, 'console\\.log', {
    useRegex: true,
    caseInsensitive: true
  });
  
  results.forEach((matches, filePath) => {
    console.info(`  ${filePath}: ${matches.length} matches`);
  });
}

// Example 5: Count matches without storing them (memory-efficient)
async function example5() {
  console.info('\nExample 5: Count matches');
  
  const count = await countMatchesInFile('./huge-log.txt', 'ERROR', {
    caseInsensitive: true
  });
  
  console.info(`Found ${count} occurrences of "ERROR"`);
}

// Example 6: Get file statistics
async function example6() {
  console.info('\nExample 6: File statistics');
  
  const stats = await getFileStats('./large-file.txt');
  
  console.info(`File stats:`);
  console.info(`  Exists: ${stats.exists}`);
  console.info(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.info(`  Lines: ${stats.lineCount.toLocaleString()}`);
}

// Example 7: Search with column information
async function example7() {
  console.info('\nExample 7: Search with column positions');
  
  const results = await searchLargeFile('./code.ts', 'function', {
    useRegex: true
  });
  
  results.forEach(match => {
    console.info(`  Line ${match.line}, Column ${match.column}: ${match.text.trim()}`);
  });
}

// Example 8: Real-world log file search
async function example8() {
  console.info('\nExample 8: Real-world log search');
  
  // Search for errors in a log file
  const errorResults = await searchLargeFile('./app.log', '\\[ERROR\\]', {
    useRegex: true,
    maxMatches: 50,
    onProgress: (lines, matches) => {
      if (lines % 10000 === 0) {
        console.info(`  Processed ${lines.toLocaleString()} lines, found ${matches} errors`);
      }
    }
  });
  
  console.info(`Found ${errorResults.length} error entries`);
  
  // Group by error type
  const errorTypes = new Map<string, number>();
  errorResults.forEach(match => {
    const matchResult = match.text.match(/\[ERROR\]\s+(\w+)/);
    if (matchResult) {
      const errorType = matchResult[1];
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    }
  });
  
  console.info('\nError breakdown:');
  Array.from(errorTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.info(`  ${type}: ${count}`);
    });
}

// Run examples (commented out to prevent execution)
// Uncomment to run:
/*
async function runExamples() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    await example6();
    await example7();
    await example8();
  } catch (error) {
    console.error('Example failed:', error);
  }
}

runExamples();
*/

export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
  example8
};
