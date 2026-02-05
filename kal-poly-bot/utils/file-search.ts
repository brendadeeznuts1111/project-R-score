/**
 * Memory-Efficient Large File Search Utilities
 * 
 * Provides streaming file search capabilities for large files without loading
 * the entire file into memory. Uses Bun's native streaming APIs for optimal performance.
 * 
 * Features:
 * - Line-by-line streaming (memory efficient)
 * - Regex pattern support
 * - Case-insensitive search
 * - Configurable result limits
 * - Progress tracking
 */

export interface SearchMatch {
  line: number;
  text: string;
  column?: number;
}

export interface SearchOptions {
  /** Case-insensitive search */
  caseInsensitive?: boolean;
  /** Use regex pattern matching */
  useRegex?: boolean;
  /** Maximum number of matches to return */
  maxMatches?: number;
  /** Callback for progress updates */
  onProgress?: (linesProcessed: number, matchesFound: number) => void;
  /** Line number to start searching from (1-indexed) */
  startLine?: number;
  /** Line number to stop searching at (inclusive) */
  endLine?: number;
}

/**
 * Memory-efficient large file searching using Bun's streaming API
 * 
 * @param filePath - Path to the file to search
 * @param pattern - Search pattern (string or regex)
 * @param options - Search configuration options
 * @returns Array of matches with line numbers and text
 * 
 * @example
 * ```ts
 * // Simple string search
 * const results = await searchLargeFile('./huge-log.txt', 'ERROR');
 * 
 * // Case-insensitive regex search
 * const results = await searchLargeFile('./logs.txt', 'error|warning', {
 *   caseInsensitive: true,
 *   useRegex: true,
 *   maxMatches: 100
 * });
 * ```
 */
export async function searchLargeFile(
  filePath: string,
  pattern: string,
  options: SearchOptions = {}
): Promise<SearchMatch[]> {
  const {
    caseInsensitive = false,
    useRegex = false,
    maxMatches = Infinity,
    onProgress,
    startLine = 1,
    endLine = Infinity
  } = options;

  // Validate pattern
  if (!pattern || pattern.length === 0) {
    throw new Error('Search pattern cannot be empty');
  }

  const matches: SearchMatch[] = [];
  let lineNumber = 1;
  let linesProcessed = 0;
  let matchesFound = 0;

  try {
    const file = Bun.file(filePath);
    
    // Check if file exists
    if (!(await file.exists())) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Compile regex pattern if needed
    let regex: RegExp | null = null;
    if (useRegex) {
      const flags = caseInsensitive ? 'gi' : 'g';
      try {
        regex = new RegExp(pattern, flags);
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    } else {
      // Create simple string pattern regex
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseInsensitive ? 'gi' : 'g';
      regex = new RegExp(escapedPattern, flags);
    }

    // Stream the file line by line (memory efficient)
    const stream = file.stream();
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');

      // Keep last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Skip lines before startLine
        if (lineNumber < startLine) {
          lineNumber++;
          continue;
        }

        // Stop if we've reached endLine
        if (lineNumber > endLine) {
          break;
        }

        // Stop if we've reached max matches
        if (matchesFound >= maxMatches) {
          break;
        }

        linesProcessed++;

        // Search for pattern
        if (regex) {
          const match = regex.exec(line);
          if (match) {
            matches.push({
              line: lineNumber,
              text: line,
              column: match.index
            });
            matchesFound++;
            
            // Reset regex lastIndex for next search
            regex.lastIndex = 0;
          }
        }

        // Progress callback
        if (onProgress && linesProcessed % 1000 === 0) {
          onProgress(linesProcessed, matchesFound);
        }

        lineNumber++;
      }

      // Early exit if we've reached limits
      if (matchesFound >= maxMatches || lineNumber > endLine) {
        break;
      }
    }

    // Process remaining buffer
    if (buffer && lineNumber <= endLine && matchesFound < maxMatches) {
      if (regex) {
        const match = regex.exec(buffer);
        if (match) {
          matches.push({
            line: lineNumber,
            text: buffer,
            column: match.index
          });
        }
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress(linesProcessed, matchesFound);
    }

    return matches;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`File search failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Search multiple files concurrently
 * 
 * @param filePaths - Array of file paths to search
 * @param pattern - Search pattern
 * @param options - Search configuration options
 * @returns Map of file path to search results
 */
export async function searchMultipleFiles(
  filePaths: string[],
  pattern: string,
  options: SearchOptions = {}
): Promise<Map<string, SearchMatch[]>> {
  const results = new Map<string, SearchMatch[]>();

  // Search files concurrently
  const searchPromises = filePaths.map(async (filePath) => {
    try {
      const matches = await searchLargeFile(filePath, pattern, options);
      return { filePath, matches };
    } catch (error) {
      console.error(`Error searching ${filePath}:`, error);
      return { filePath, matches: [] };
    }
  });

  const searchResults = await Promise.all(searchPromises);
  
  searchResults.forEach(({ filePath, matches }) => {
    results.set(filePath, matches);
  });

  return results;
}

/**
 * Count occurrences of pattern in file without storing matches
 * Useful for getting statistics without memory overhead
 * 
 * @param filePath - Path to the file
 * @param pattern - Search pattern
 * @param options - Search configuration options
 * @returns Total count of matches
 */
export async function countMatchesInFile(
  filePath: string,
  pattern: string,
  options: SearchOptions = {}
): Promise<number> {
  let count = 0;
  let lineNumber = 1;

  const {
    caseInsensitive = false,
    useRegex = false,
    startLine = 1,
    endLine = Infinity
  } = options;

  try {
    const file = Bun.file(filePath);
    
    if (!(await file.exists())) {
      throw new Error(`File not found: ${filePath}`);
    }

    let regex: RegExp | null = null;
    if (useRegex) {
      const flags = caseInsensitive ? 'gi' : 'g';
      regex = new RegExp(pattern, flags);
    } else {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseInsensitive ? 'gi' : 'g';
      regex = new RegExp(escapedPattern, flags);
    }

    const stream = file.stream();
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (lineNumber < startLine) {
          lineNumber++;
          continue;
        }
        if (lineNumber > endLine) {
          break;
        }

        if (regex) {
          const matches = line.match(regex);
          if (matches) {
            count += matches.length;
          }
          regex.lastIndex = 0;
        }

        lineNumber++;
      }

      if (lineNumber > endLine) {
        break;
      }
    }

    // Process remaining buffer
    if (buffer && lineNumber <= endLine && regex) {
      const matches = buffer.match(regex);
      if (matches) {
        count += matches.length;
      }
    }

    return count;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`File count failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get file statistics (line count, size, etc.)
 * 
 * @param filePath - Path to the file
 * @returns File statistics
 */
export async function getFileStats(filePath: string): Promise<{
  lineCount: number;
  size: number;
  exists: boolean;
}> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    
    if (!exists) {
      return { lineCount: 0, size: 0, exists: false };
    }

    const size = file.size;
    let lineCount = 0;

    // Count lines efficiently
    const stream = file.stream();
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      lineCount += lines.length - 1; // -1 because split creates one extra element
      buffer = lines.pop() || '';
    }

    // Count last line if buffer is not empty
    if (buffer) {
      lineCount++;
    }

    return { lineCount, size, exists: true };

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
    throw error;
  }
}
