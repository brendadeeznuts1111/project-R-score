/**
 * BunFile Stream Management Utility
 *
 * Provides utilities for working with Bun's File I/O API, including:
 * - Bun.stdin, Bun.stdout, Bun.stderr as BunFile instances
 * - Stream inspection and validation
 * - FileSink for incremental writing
 * - Real-time stream monitoring
 *
 * Reference: https://bun.sh/docs/api/file-io
 */

export interface StreamInfo {
  type: 'stdin' | 'stdout' | 'stderr' | 'file';
  path?: string;
  size?: number;
  readable?: boolean;
  writable?: boolean;
  seekable?: boolean;
}

export interface StreamStats {
  bytesRead: number;
  bytesWritten: number;
  readOps: number;
  writeOps: number;
  lastActivity: Date;
}

/**
 * Inspect BunFile stream properties
 */
export class BunFileStreamManager {
  private stats: Map<string, StreamStats> = new Map();

  /**
   * Get information about Bun.stdin, Bun.stdout, Bun.stderr
   */
  inspectStandardStreams(): {
    stdin: StreamInfo;
    stdout: StreamInfo;
    stderr: StreamInfo;
  } {
    return {
      stdin: this.inspectStream(Bun.stdin, 'stdin'),
      stdout: this.inspectStream(Bun.stdout, 'stdout'),
      stderr: this.inspectStream(Bun.stderr, 'stderr'),
    };
  }

  /**
   * Inspect a BunFile stream
   */
  inspectStream(file: BunFile, type: 'stdin' | 'stdout' | 'stderr' | 'file' = 'file'): StreamInfo {
    const info: StreamInfo = {
      type,
      size: file.size ?? undefined,
      readable: 'stream' in file || 'text' in file,
      writable: 'writer' in file || type === 'stdout' || type === 'stderr',
      seekable: 'slice' in file,
    };

    // Try to get path if available (file:// URLs or file paths)
    if ('name' in file && typeof file.name === 'string') {
      info.path = file.name;
    }

    return info;
  }

  /**
   * Read from stdin with size validation
   * Useful for validating input length before processing
   */
  async readStdin(maxSize?: number): Promise<string> {
    const stdin = Bun.stdin;
    const size = stdin.size;

    if (maxSize && size && size > maxSize) {
      throw new Error(`Input size (${size} bytes) exceeds maximum (${maxSize} bytes)`);
    }

    const text = await stdin.text();
    this.recordRead('stdin', text.length);
    return text;
  }

  /**
   * Read file as Uint8Array using bytes()
   * More efficient than arrayBuffer() for binary operations
   */
  async readFileBytes(path: string): Promise<Uint8Array> {
    const file = Bun.file(path);
    const bytes = await file.bytes();
    this.recordRead(path, bytes.length);
    return bytes;
  }

  /**
   * Read file bytes with validation
   */
  async readFileBytesWithValidation(
    path: string,
    options?: { maxSize?: number; minSize?: number }
  ): Promise<Uint8Array> {
    const file = Bun.file(path);
    const size = file.size;

    if (options?.maxSize && size && size > options.maxSize) {
      throw new Error(`File size (${size} bytes) exceeds maximum (${options.maxSize} bytes)`);
    }

    if (options?.minSize && size && size < options.minSize) {
      throw new Error(`File size (${size} bytes) is less than minimum (${options.minSize} bytes)`);
    }

    const bytes = await file.bytes();
    this.recordRead(path, bytes.length);
    return bytes;
  }

  /**
   * Check if a file exists
   * Reference: https://bun.sh/docs/api/file-io
   */
  async fileExists(path: string): Promise<boolean> {
    const file = Bun.file(path);
    return await file.exists();
  }

  /**
   * Safe file reading - returns null if file doesn't exist
   */
  async safeReadText(path: string): Promise<string | null> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      return null;
    }
    const text = await file.text();
    this.recordRead(path, text.length);
    return text;
  }

  /**
   * Safe file reading as JSON - returns null if file doesn't exist
   */
  async safeReadJson<T = any>(path: string): Promise<T | null> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      return null;
    }
    const json = await file.json();
    const text = JSON.stringify(json);
    this.recordRead(path, text.length);
    return json as T;
  }

  /**
   * Check if multiple files exist (parallel)
   */
  async checkMultipleFiles(paths: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const checks = await Promise.all(
      paths.map(async (path) => {
        const exists = await this.fileExists(path);
        return { path, exists };
      })
    );

    for (const { path, exists } of checks) {
      results[path] = exists;
    }

    return results;
  }

  /**
   * Read from stdin as JSON with validation
   */
  async readStdinJson(maxSize?: number): Promise<any> {
    const text = await this.readStdin(maxSize);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write to stdout with tracking
   */
  async writeStdout(data: string | Uint8Array): Promise<void> {
    await Bun.write(Bun.stdout, data);
    const size = typeof data === 'string' ? new TextEncoder().encode(data).length : data.length;
    this.recordWrite('stdout', size);
  }

  /**
   * Write to stderr with tracking
   */
  async writeStderr(data: string | Uint8Array): Promise<void> {
    await Bun.write(Bun.stderr, data);
    const size = typeof data === 'string' ? new TextEncoder().encode(data).length : data.length;
    this.recordWrite('stderr', size);
  }

  /**
   * Create a FileSink for incremental writing
   * Useful for large files or real-time data streams
   */
  createFileSink(path: string): FileSink {
    return Bun.file(path).writer();
  }

  /**
   * Incremental write using FileSink
   * Returns a writer with flush/end/unref methods
   */
  async writeIncremental(
    path: string,
    data: string | Uint8Array,
    options?: { flush?: boolean; end?: boolean }
  ): Promise<FileSink> {
    const sink = this.createFileSink(path);
    await sink.write(data);

    if (options?.flush) {
      await sink.flush();
    }

    if (options?.end) {
      await sink.end();
    }

    return sink;
  }

  /**
   * Monitor stream activity in real-time
   */
  async monitorStream(
    stream: BunFile,
    label: string,
    callback: (chunk: Uint8Array | string) => void
  ): Promise<void> {
    if (!stream.stream) {
      throw new Error(`Stream ${label} is not readable`);
    }

    const reader = stream.stream().getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode if it's a text stream
        const text = decoder.decode(value, { stream: true });
        callback(text);
        this.recordRead(label, value.length);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get file stream as ReadableStream
   * Reference: https://bun.sh/docs/api/file-io
   */
  getFileStream(path: string): ReadableStream<Uint8Array> {
    const file = Bun.file(path);
    return file.stream();
  }

  /**
   * Read file stream incrementally using for await pattern
   * Memory-efficient for large files
   */
  async readFileStream(
    path: string,
    callback?: (chunk: Uint8Array, totalBytes: number) => void
  ): Promise<{ totalBytes: number; chunkCount: number }> {
    const file = Bun.file(path);
    const stream = file.stream();

    let totalBytes = 0;
    let chunkCount = 0;

    for await (const chunk of stream) {
      totalBytes += chunk.length;
      chunkCount++;

      if (callback) {
        callback(chunk, totalBytes);
      }

      this.recordRead(path, chunk.length);
    }

    return { totalBytes, chunkCount };
  }

  /**
   * Read file stream as text (memory-efficient)
   */
  async readFileStreamAsText(path: string): Promise<string> {
    const file = Bun.file(path);
    const stream = file.stream();
    const decoder = new TextDecoder();

    let text = '';

    for await (const chunk of stream) {
      text += decoder.decode(chunk, { stream: true });
    }

    // Final decode for any remaining bytes
    text += decoder.decode();

    this.recordRead(path, text.length);
    return text;
  }

  /**
   * Validate HTTP header size using stdin size
   * Useful for enforcing --max-http-header-size limits
   */
  validateHeaderSize(maxSize: number = 16384): void {
    const stdin = Bun.stdin;
    if (stdin.size && stdin.size > maxSize) {
      throw new Error(
        `HTTP header size (${stdin.size} bytes) exceeds maximum (${maxSize} bytes). ` +
        `Consider using --max-http-header-size flag.`
      );
    }
  }

  /**
   * Get stream statistics
   */
  getStats(streamId: string): StreamStats | undefined {
    return this.stats.get(streamId);
  }

  /**
   * Get all stream statistics
   */
  getAllStats(): Map<string, StreamStats> {
    return new Map(this.stats);
  }

  /**
   * Reset statistics for a stream
   */
  resetStats(streamId?: string): void {
    if (streamId) {
      this.stats.delete(streamId);
    } else {
      this.stats.clear();
    }
  }

  /**
   * Record a read operation
   */
  private recordRead(streamId: string, bytes: number): void {
    const stats = this.stats.get(streamId) || {
      bytesRead: 0,
      bytesWritten: 0,
      readOps: 0,
      writeOps: 0,
      lastActivity: new Date(),
    };

    stats.bytesRead += bytes;
    stats.readOps += 1;
    stats.lastActivity = new Date();
    this.stats.set(streamId, stats);
  }

  /**
   * Record a write operation
   */
  private recordWrite(streamId: string, bytes: number): void {
    const stats = this.stats.get(streamId) || {
      bytesRead: 0,
      bytesWritten: 0,
      readOps: 0,
      writeOps: 0,
      lastActivity: new Date(),
    };

    stats.bytesWritten += bytes;
    stats.writeOps += 1;
    stats.lastActivity = new Date();
    this.stats.set(streamId, stats);
  }

  /**
   * Get MIME type of a file
   * Reference: https://bun.sh/docs/api/file-io
   */
  getMimeType(path: string): string | null {
    const file = Bun.file(path);
    return file.type || null;
  }

  /**
   * Get MIME type without charset parameter
   */
  getMimeTypeBase(path: string): string | null {
    const mimeType = this.getMimeType(path);
    if (!mimeType) return null;
    // Remove charset and other parameters
    return mimeType.split(';')[0].trim();
  }

  /**
   * Check if file matches allowed MIME types
   */
  isAllowedMimeType(path: string, allowedTypes: string[]): boolean {
    const mimeType = this.getMimeType(path);
    if (!mimeType) return false;
    const baseType = mimeType.split(';')[0].trim();
    return allowedTypes.some(allowed => baseType.includes(allowed));
  }

  /**
   * Categorize file by MIME type
   */
  categorizeByMimeType(path: string): string {
    const mimeType = this.getMimeType(path) || 'application/octet-stream';
    const baseType = mimeType.split(';')[0].trim();

    if (baseType.startsWith('text/')) return 'text';
    if (baseType.startsWith('image/')) return 'image';
    if (baseType.startsWith('video/')) return 'video';
    if (baseType.startsWith('audio/')) return 'audio';
    if (baseType === 'application/json') return 'data';
    if (baseType.includes('javascript') || baseType.includes('typescript')) return 'code';
    if (baseType.startsWith('application/')) return 'application';
    return 'other';
  }

  /**
   * Create a simple cat-like utility using Bun.stdin
   * Demonstrates 3-line implementation as per Bun docs
   */
  static async cat(): Promise<void> {
    const file = Bun.stdin;
    const text = await file.text();
    await Bun.write(Bun.stdout, text);
  }

  /**
   * Stream file content efficiently
   */
  static async streamFile(source: string, destination: string): Promise<void> {
    const sourceFile = Bun.file(source);
    await Bun.write(destination, sourceFile);
  }

  /**
   * Copy file with optimized syscalls (copy_file_range, sendfile, clonefile)
   */
  static async copyFile(source: string, destination: string): Promise<void> {
    const sourceFile = Bun.file(source);
    await Bun.write(destination, sourceFile);
    // Bun.write automatically uses optimized syscalls on supported platforms
  }

  /**
   * Create HTTP Response from file stream
   * Useful for serving files efficiently
   */
  createFileResponse(path: string, options?: {
    contentType?: string;
    headers?: Record<string, string>;
  }): Response {
    const file = Bun.file(path);
    const stream = file.stream();

    const headers = new Headers(options?.headers);
    headers.set('Content-Type', options?.contentType || file.type || 'application/octet-stream');
    headers.set('Content-Length', String(file.size || 0));

    return new Response(stream, { headers });
  }
}

/**
 * Convenience function to inspect standard streams
 */
export function inspectStandardStreams() {
  const manager = new BunFileStreamManager();
  return manager.inspectStandardStreams();
}

/**
 * Convenience function to validate stdin size
 */
export async function validateStdinSize(maxSize: number): Promise<string> {
  const manager = new BunFileStreamManager();
  return await manager.readStdin(maxSize);
}

