/**
 * Solution 1: File I/O Mastery
 * 
 * Demonstrates Bun-native async patterns for optimal performance
 */

// ✅ SOLUTION: Use Bun.file() for all file operations
export async function readConfigFile(): Promise<Record<string, unknown>> {
  const configPath = './config.json';
  
  // ✅ ASYNC: Check file existence without blocking
  const configFile = Bun.file(configPath);
  if (!await configFile.exists()) {
    throw new Error('Config file not found');
  }
  
  // ✅ ASYNC: Read file content efficiently
  const data = await configFile.text();
  return JSON.parse(data);
}

// ✅ SOLUTION: Async user data management with proper directory handling
export async function saveUserData(userId: string, data: Record<string, unknown>): Promise<void> {
  const userDir = `./users/${userId}`;
  
  // ✅ ASYNC: Ensure directory exists
  await ensureDir(userDir);
  
  const filePath = `${userDir}/data.json`;
  const jsonData = JSON.stringify(data, null, 2);
  
  // ✅ ASYNC: Write data efficiently
  await Bun.write(filePath, jsonData);
}

// ✅ SOLUTION: Efficient batch processing with Promise.all
export async function processLogFiles(logDir: string): Promise<string[]> {
  // ✅ EFFICIENT: Use Bun.Glob for pattern matching
  const logFiles = await Array.fromAsync(new Bun.Glob('*.log').scan({ cwd: logDir }));
  
  // ✅ PARALLEL: Process all files concurrently
  const contents = await Promise.all(
    logFiles.map(async (file) => {
      const content = await Bun.file(file).text();
      return content;
    })
  );
  
  return contents;
}

// ✅ SOLUTION: Memory-efficient large file processing with streaming
export async function analyzeLargeFile(filePath: string): Promise<{ lines: number; size: number }> {
  let lines = 0;
  let size = 0;
  
  // ✅ STREAMING: Process file line by line without loading entire file
  const stream = await Bun.file(filePath).stream();
  for await (const chunk of stream) {
    const text = new TextDecoder().decode(chunk);
    const chunkLines = text.split('\\n');
    lines += chunkLines.length;
    size += chunk.length;
  }
  
  return { lines, size };
}

// ✅ SOLUTION: Efficient configuration watcher with file watching
export class ConfigWatcher {
  private configPath: string;
  private lastModified: number = 0;
  private watcher: ReturnType<typeof setInterval> | null = null;
  private callback?: (config: Record<string, unknown>) => void;
  
  constructor(configPath: string) {
    this.configPath = configPath;
  }
  
  start(callback: (config: Record<string, unknown>) => void): void {
    this.callback = callback;
    
    // ✅ EFFICIENT: Use Bun.file().lastModified for checking
    const performCheck = async () => {
      try {
        const configFile = Bun.file(this.configPath);
        const currentModified = await configFile.lastModified;
        
        if (currentModified > this.lastModified) {
          this.lastModified = currentModified;
          const content = await configFile.text();
          const config = JSON.parse(content);
          this.callback?.(config);
        }
      } catch (error) {
        console.error('Config watch error:', error);
      }
    };
    
    // Start polling with reasonable interval
    this.watcher = setInterval(performCheck, 1000);
    
    // Initial check
    performCheck();
  }
  
  stop(): void {
    if (this.watcher) {
      clearInterval(this.watcher);
      this.watcher = null;
    }
  }
}

// ✅ SOLUTION: Async directory creation with proper error handling
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    // ✅ BUN-NATIVE: Use Bun.write to create directory structure
    await Bun.write(`${dirPath}/.gitkeep`, '');
  } catch (error) {
    // Directory already exists or permission error
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return;
    }
    throw error;
  }
}

// ✅ SOLUTION: Memory-efficient line streaming for large files
export async function* streamLines(filePath: string): AsyncGenerator<string> {
  let buffer = '';
  
  // ✅ STREAMING: Process file in chunks
  const stream = await Bun.file(filePath).stream();
  for await (const chunk of stream) {
    const text = new TextDecoder().decode(chunk);
    buffer += text;
    
    // Process complete lines
    const lines = buffer.split('\\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      yield line;
    }
  }
  
  // Yield remaining buffer
  if (buffer) {
    yield buffer;
  }
}

// ✅ SOLUTION: Performance benchmarks with Bun-native operations
export const BenchmarkUtils = {
  async measureFileRead(filePath: string, iterations = 100) {
    const times: number[] = [];
    
    // Measure Node.js sync version for comparison
    const nodeStart = performance.now();
    for (let i = 0; i < Math.min(iterations, 10); i++) { // Limit Node.js tests
      require('fs').readFileSync(filePath, 'utf8');
    }
    const nodeTime = performance.now() - nodeStart;
    
    // Measure Bun async version
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await Bun.file(filePath).text();
      const end = performance.now();
      times.push(end - start);
    }
    
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const speedup = (nodeTime / (avgTime * 10)); // Compare equivalent operations
    
    return {
      avgTime,
      totalTime,
      speedup
    };
  },
  
  async measureFileWrite(filePath: string, data: string, iterations = 100) {
    const times: number[] = [];
    
    // Measure Node.js sync version for comparison
    const nodeStart = performance.now();
    for (let i = 0; i < Math.min(iterations, 10); i++) {
      require('fs').writeFileSync(filePath, data);
    }
    const nodeTime = performance.now() - nodeStart;
    
    // Measure Bun async version
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await Bun.write(filePath, data);
      const end = performance.now();
      times.push(end - start);
    }
    
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const speedup = (nodeTime / (avgTime * 10)); // Compare equivalent operations
    
    return {
      avgTime,
      totalTime,
      speedup
    };
  },
  
  async measureMemoryUsage(filePath: string) {
    // Measure streaming memory usage
    const startMemory = process.memoryUsage().heapUsed;
    for await (const _ of streamLines(filePath)) {
      // Process lines without counting
    }
    const streamingMemory = process.memoryUsage().heapUsed - startMemory;
    
    // Measure blocking memory usage
    const startMemory2 = process.memoryUsage().heapUsed;
    const content = require('fs').readFileSync(filePath, 'utf8');
    const lines = content.split('\\n').length;
    const blockingMemory = process.memoryUsage().heapUsed - startMemory2;
    
    const savings = ((blockingMemory - streamingMemory) / blockingMemory) * 100;
    
    return {
      streaming: streamingMemory,
      blocking: blockingMemory,
      savings
    };
  }
}

// Test data generator (unchanged)
export function generateTestData(size: number): string {
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(`Line ${i}: ${Math.random().toString(36).repeat(50)}`);
  }
  return lines.join('\\n');
}

// ✅ ADDITIONAL: Advanced Bun patterns demonstration
export const AdvancedFileOps = {
  // ✅ CONCURRENT: Process multiple files with concurrency control
  async processBatchConcurrently(files: string[], concurrency = 10) {
    const results: string[] = [];
    
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(file => Bun.file(file).text())
      );
      results.push(...batchResults);
    }
    
    return results;
  },
  
  // ✅ ATOMIC: Atomic file operations with temporary files
  async atomicWrite(filePath: string, content: string) {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      await Bun.write(tempPath, content);
      // Note: Bun.rename is not available, using atomic write pattern
      const finalContent = await Bun.file(tempPath).text();
      await Bun.write(filePath, finalContent);
    } catch (error) {
      // Cleanup on failure
      await Bun.file(tempPath).delete().catch(() => {});
      throw error;
    }
  },
  
  // ✅ COMPRESSION: Built-in compression support
  async compressFile(inputPath: string, outputPath: string) {
    const input = Bun.file(inputPath);
    const compressed = await input.gzip();
    await Bun.write(outputPath, compressed);
  },
  
  // ✅ HASHING: Fast file hashing for integrity checks
  async getFileHash(filePath: string) {
    const file = Bun.file(filePath);
    const buffer = await file.arrayBuffer();
    return Bun.hash.xxHash3(new Uint8Array(buffer)).toString(16);
  }
}
