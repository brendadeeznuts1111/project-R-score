# File Search Utilities

Memory-efficient file searching utilities using Bun's native streaming APIs.

## Features

- ✅ **Memory-efficient**: Streams files line-by-line without loading entire file
- ✅ **Regex support**: Full regex pattern matching
- ✅ **Case-insensitive**: Optional case-insensitive search
- ✅ **Progress tracking**: Optional progress callbacks
- ✅ **Line range search**: Search specific line ranges
- ✅ **Concurrent search**: Search multiple files in parallel
- ✅ **Match counting**: Count matches without storing them (ultra memory-efficient)

## Quick Start

```typescript
import { searchLargeFile } from './utils/file-search';

// Simple search
const results = await searchLargeFile('./huge-log.txt', 'ERROR');

// Advanced search with options
const results = await searchLargeFile('./logs.txt', 'error|warning', {
  caseInsensitive: true,
  useRegex: true,
  maxMatches: 100,
  onProgress: (linesProcessed, matchesFound) => {
    console.log(`Processed ${linesProcessed} lines, found ${matchesFound} matches`);
  }
});
```

## API Reference

### `searchLargeFile(filePath, pattern, options?)`

Search a file for a pattern and return matches.

**Parameters:**
- `filePath` (string): Path to file
- `pattern` (string): Search pattern
- `options` (SearchOptions): Optional configuration
  - `caseInsensitive` (boolean): Case-insensitive search (default: false)
  - `useRegex` (boolean): Use regex pattern (default: false)
  - `maxMatches` (number): Maximum matches to return (default: Infinity)
  - `startLine` (number): Start searching from this line (1-indexed)
  - `endLine` (number): Stop searching at this line (inclusive)
  - `onProgress` (function): Progress callback `(linesProcessed, matchesFound) => void`

**Returns:** `Promise<SearchMatch[]>`

**Example:**
```typescript
const matches = await searchLargeFile('./app.log', '\\[ERROR\\]', {
  useRegex: true,
  maxMatches: 50
});

matches.forEach(match => {
  console.log(`Line ${match.line}: ${match.text}`);
});
```

### `searchMultipleFiles(filePaths, pattern, options?)`

Search multiple files concurrently.

**Parameters:**
- `filePaths` (string[]): Array of file paths
- `pattern` (string): Search pattern
- `options` (SearchOptions): Same as `searchLargeFile`

**Returns:** `Promise<Map<string, SearchMatch[]>>`

**Example:**
```typescript
const results = await searchMultipleFiles(
  ['./file1.ts', './file2.ts'],
  'console\\.log',
  { useRegex: true }
);

results.forEach((matches, filePath) => {
  console.log(`${filePath}: ${matches.length} matches`);
});
```

### `countMatchesInFile(filePath, pattern, options?)`

Count matches without storing them (memory-efficient for large result sets).

**Parameters:**
- `filePath` (string): Path to file
- `pattern` (string): Search pattern
- `options` (SearchOptions): Same as `searchLargeFile`

**Returns:** `Promise<number>`

**Example:**
```typescript
const count = await countMatchesInFile('./huge-log.txt', 'ERROR');
console.log(`Found ${count} occurrences`);
```

### `getFileStats(filePath)`

Get file statistics (line count, size).

**Parameters:**
- `filePath` (string): Path to file

**Returns:** `Promise<{ lineCount: number; size: number; exists: boolean }>`

**Example:**
```typescript
const stats = await getFileStats('./large-file.txt');
console.log(`Lines: ${stats.lineCount}, Size: ${stats.size} bytes`);
```

## Performance

- **Memory usage**: O(1) - constant memory regardless of file size
- **Speed**: O(n) - linear time complexity
- **Best for**: Files > 100MB, log files, large codebases

## Use Cases

1. **Log file analysis**: Search through large application logs
2. **Codebase search**: Find patterns across large codebases
3. **Data processing**: Extract specific lines from large datasets
4. **Error tracking**: Count and locate errors in log files
5. **Code auditing**: Find deprecated patterns or security issues

## Integration with MCP Tools

The file search utilities are integrated into the MCP toolset:

```typescript
// Via MCP tool
{
  name: 'search-file',
  execute: async (input) => {
    const matches = await searchLargeFile(input.filePath, input.pattern, {
      caseInsensitive: input.caseInsensitive,
      useRegex: input.useRegex,
      maxMatches: input.maxMatches
    });
    return { success: true, matches };
  }
}
```

## Examples

See `file-search.example.ts` for comprehensive usage examples.

## Notes

- Uses Bun's native `Bun.file()` API for optimal performance
- Handles UTF-8 encoding automatically
- Properly handles incomplete lines at chunk boundaries
- Thread-safe and can be used concurrently
