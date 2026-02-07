/**
 * File Reader Utilities
 * Uses Bun-optimized APIs including filehandle.readLines() from node:fs/promises
 */

import { open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

/**
 * Read a file line by line using the new filehandle.readLines() API
 * Efficient for large files - doesn't load entire file into memory
 */
export async function* readLines(
  filePath: string,
  options?: { encoding?: BufferEncoding; start?: number; end?: number }
): AsyncGenerator<string, void, unknown> {
  const fileHandle = await open(filePath, 'r');

  try {
    // @ts-ignore - readLines is available in Bun v1.3.1+
    const lines = fileHandle.readLines(options);

    for await (const line of lines) {
      yield line as string;
    }
  } finally {
    await fileHandle.close();
  }
}

/**
 * Process a log file line by line with a callback
 * Memory-efficient for large log files
 */
export async function processLogFile(
  filePath: string,
  processor: (line: string, lineNumber: number) => void | Promise<void>
): Promise<{ linesProcessed: number; errors: Error[] }> {
  const errors: Error[] = [];
  let lineNumber = 0;

  try {
    for await (const line of readLines(filePath)) {
      lineNumber++;
      try {
        await processor(line, lineNumber);
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
  }

  return { linesProcessed: lineNumber, errors };
}

/**
 * Search for patterns in a large file without loading it entirely
 */
export async function* grepFile(
  filePath: string,
  pattern: RegExp | string
): AsyncGenerator<
  { line: string; lineNumber: number; matches: RegExpMatchArray | null },
  void,
  unknown
> {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');
  let lineNumber = 0;

  for await (const line of readLines(filePath)) {
    lineNumber++;
    const matches = line.match(regex);
    if (matches) {
      yield { line, lineNumber, matches };
    }
  }
}

/**
 * Count lines in a file efficiently
 */
export async function countLines(filePath: string): Promise<number> {
  let count = 0;

  for await (const _ of readLines(filePath)) {
    count++;
  }

  return count;
}

/**
 * Stream file content with backpressure handling
 * Uses Bun's optimized stream APIs
 */
export async function* streamFileChunks(
  filePath: string,
  chunkSize: number = 64 * 1024 // 64KB chunks
): AsyncGenerator<Buffer, void, unknown> {
  const stream = createReadStream(filePath, {
    highWaterMark: chunkSize,
  });

  for await (const chunk of stream) {
    yield chunk as Buffer;
  }
}

/**
 * Parse CSV file line by line
 * Memory-efficient for large CSV files
 */
export async function* parseCSV<T extends Record<string, string>>(
  filePath: string,
  options?: { delimiter?: string; skipHeader?: boolean }
): AsyncGenerator<T, void, unknown> {
  const delimiter = options?.delimiter ?? ',';
  let isFirstLine = true;
  let headers: string[] = [];

  for await (const line of readLines(filePath)) {
    if (isFirstLine) {
      isFirstLine = false;
      if (options?.skipHeader !== false) {
        headers = line.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        continue;
      }
    }

    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));

    if (headers.length > 0) {
      const row = {} as T;
      headers.forEach((header, index) => {
        row[header as keyof T] = values[index] as T[keyof T];
      });
      yield row;
    } else {
      // No headers, yield as indexed object
      yield values as unknown as T;
    }
  }
}

/**
 * Tail a file (read last N lines)
 * Efficient for log file tailing
 */
export async function tailFile(filePath: string, lineCount: number = 10): Promise<string[]> {
  const lines: string[] = [];

  for await (const line of readLines(filePath)) {
    lines.push(line);
    if (lines.length > lineCount) {
      lines.shift(); // Remove oldest line
    }
  }

  return lines;
}

/**
 * Watch a file and process new lines as they're added
 * Uses polling for compatibility
 */
export async function* followFile(
  filePath: string,
  options?: { pollInterval?: number; startAtEnd?: boolean }
): AsyncGenerator<string, void, unknown> {
  const { pollInterval = 1000, startAtEnd = true } = options ?? {};

  let position = startAtEnd ? await Bun.file(filePath).size() : 0;

  while (true) {
    const currentSize = await Bun.file(filePath).size();

    if (currentSize > position) {
      const fileHandle = await open(filePath, 'r');

      try {
        // Read from last position
        const buffer = Buffer.alloc(currentSize - position);
        await fileHandle.read(buffer, 0, buffer.length, position);

        const content = buffer.toString('utf-8');
        const lines = content.split('\n').filter(l => l.length > 0);

        for (const line of lines) {
          yield line;
        }

        position = currentSize;
      } finally {
        await fileHandle.close();
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

// Example usage and demo
if (import.meta.main) {
  console.log('📁 File Reader Utilities Demo\n');

  // Create a test file
  const testFile = '/tmp/test-file-reader.txt';
  const lines = [
    'INFO: Server started on port 3000',
    'DEBUG: Connected to database',
    'INFO: User login: admin',
    'ERROR: Failed to process payment',
    'WARN: High memory usage detected',
    'INFO: Request completed in 45ms',
  ];

  await Bun.write(testFile, lines.join('\n'));

  console.log('1. Reading file line by line:');
  for await (const line of readLines(testFile)) {
    console.log(`   ${line}`);
  }

  console.log('\n2. Searching for ERROR lines:');
  for await (const result of grepFile(testFile, /ERROR/)) {
    console.log(`   Line ${result.lineNumber}: ${result.line}`);
  }

  console.log('\n3. Counting total lines:');
  const count = await countLines(testFile);
  console.log(`   Total: ${count} lines`);

  console.log('\n4. Getting last 3 lines:');
  const lastLines = await tailFile(testFile, 3);
  lastLines.forEach(line => console.log(`   ${line}`));

  // Cleanup
  await Bun.file(testFile).delete();

  console.log('\n✅ Demo complete!');
}
