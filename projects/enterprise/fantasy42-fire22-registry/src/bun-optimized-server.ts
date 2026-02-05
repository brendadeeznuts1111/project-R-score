/**
 * 🚀 ULTRA-FAST HTTP SERVER - Bun-Native Implementation
 *
 * Leverages Bun's native HTTP server for maximum performance:
 * - Native HTTP parsing (no Node.js overhead)
 * - Built-in request/response handling
 * - Automatic connection pooling
 * - WebSocket support built-in
 */

import { packageCache, queryCache } from './cache';
import { validatePackageMetadata } from './validation';
import { DatabaseResourceManager } from './resource-manager';
import { APPLICATION_CONSTANTS } from './constants';

interface ServerStats {
  requests: number;
  avgResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
}

export class BunOptimizedServer {
  private dbManager: DatabaseResourceManager;
  private stats: ServerStats = {
    requests: 0,
    avgResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };

  constructor(dbManager: DatabaseResourceManager) {
    this.dbManager = dbManager;
  }

  start(port: number = APPLICATION_CONSTANTS.DEFAULT_PORT): void {
    console.log(`🚀 Starting Bun-Optimized Server on port ${port}`);

    Bun.serve({
      port,
      hostname: '0.0.0.0',

      // Ultra-fast request handling with Bun.serve
      async fetch(request: Request): Promise<Response> {
        const startTime = Bun.nanoseconds();
        const url = new URL(request.url);
        const path = url.pathname;

        try {
          // Route handling with Bun's native URL parsing
          switch (path) {
            case '/health':
              return this.handleHealthCheck(request);

            case '/packages':
              return this.handlePackageSearch(request, url);

            case '/package':
              return this.handlePackageLookup(request, url);

            case '/stats':
              return this.handleStats(request);

            default:
              return new Response('Not Found', { status: 404 });
          }
        } catch (error) {
          this.stats.errors++;
          console.error('Request error:', error);
          return new Response('Internal Server Error', { status: 500 });
        } finally {
          const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to milliseconds
          this.updateStats(responseTime);
        }
      },

      // Bun-native WebSocket support
      websocket: {
        message(ws, message) {
          // Handle real-time package updates
          console.log('WebSocket message:', message);
        },

        open(ws) {
          console.log('WebSocket connection opened');
        },

        close(ws, code, reason) {
          console.log('WebSocket connection closed:', code, reason);
        },
      },

      // Error handling
      error(error: Error) {
        console.error('Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      },
    });

    console.log(`✅ Bun-Optimized Server running at http://localhost:${port}`);
    console.log(`🎯 Leveraging Bun's native HTTP implementation for maximum performance`);
  }

  private async handleHealthCheck(request: Request): Promise<Response> {
    const isHealthy = await this.dbManager.isHealthy();

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: Bun.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return Response.json(healthData, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  private async handlePackageSearch(request: Request, url: URL): Promise<Response> {
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!query) {
      return new Response('Missing search query', { status: 400 });
    }

    // Use Bun's native URL parsing for fast parameter extraction
    const cacheKey = `search:${query}:${limit}`;
    const cached = packageCache.get(cacheKey);

    if (cached) {
      this.stats.cacheHits++;
      return Response.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'max-age=300',
        },
      });
    }

    this.stats.cacheMisses++;

    // Perform search with Bun's optimized database operations
    const results = await this.dbManager.queryCached(
      'SELECT name, version, description FROM packages WHERE name LIKE ? LIMIT ?',
      [`%${query}%`, limit],
      300000 // 5 minute cache
    );

    packageCache.set(cacheKey, results, 300000);

    return Response.json(results, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'max-age=300',
      },
    });
  }

  private async handlePackageLookup(request: Request, url: URL): Promise<Response> {
    const name = url.searchParams.get('name');
    const version = url.searchParams.get('version');

    if (!name) {
      return new Response('Missing package name', { status: 400 });
    }

    const cacheKey = `package:${name}:${version || 'latest'}`;
    const cached = packageCache.get(cacheKey);

    if (cached) {
      this.stats.cacheHits++;
      return Response.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'max-age=600',
        },
      });
    }

    this.stats.cacheMisses++;

    // Use Bun's optimized query execution
    let packageData;

    if (version) {
      packageData = await this.dbManager.queryCached(
        'SELECT * FROM packages WHERE name = ? AND version = ?',
        [name, version]
      );
    } else {
      packageData = await this.dbManager.queryCached(
        'SELECT * FROM packages WHERE name = ? ORDER BY version DESC LIMIT 1',
        [name]
      );
    }

    if (!packageData || packageData.length === 0) {
      return new Response('Package not found', { status: 404 });
    }

    packageCache.set(cacheKey, packageData, 600000); // 10 minute cache

    return Response.json(packageData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'max-age=600',
      },
    });
  }

  private handleStats(request: Request): Response {
    const stats = {
      server: {
        version: Bun.version,
        platform: Bun.platform,
        uptime: process.uptime(),
      },
      performance: this.stats,
      cache: {
        packages: packageCache.getStats(),
        queries: queryCache.getStats(),
      },
      memory: process.memoryUsage(),
    };

    return Response.json(stats);
  }

  private updateStats(responseTime: number): void {
    this.stats.requests++;

    // Calculate rolling average response time
    const alpha = 0.1; // Smoothing factor
    this.stats.avgResponseTime = this.stats.avgResponseTime * (1 - alpha) + responseTime * alpha;
  }

  getStats(): ServerStats {
    return { ...this.stats };
  }
}

// ============================================================================
// ULTRA-FAST FILE OPERATIONS - Bun-Native
// ============================================================================

export class BunOptimizedFileOps {
  // High-performance file reading with Bun.file
  static async readPackageFile(path: string): Promise<any> {
    try {
      const file = Bun.file(path);
      const exists = await file.exists();

      if (!exists) {
        return null;
      }

      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read package file ${path}:`, error);
      return null;
    }
  }

  // Ultra-fast file writing with Bun.write
  static async writePackageFile(path: string, data: any): Promise<boolean> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await Bun.write(path, jsonData);
      return true;
    } catch (error) {
      console.error(`Failed to write package file ${path}:`, error);
      return false;
    }
  }

  // Bun-native file globbing for fast package discovery
  static async discoverPackages(
    globPattern: string = 'packages/*/package.json'
  ): Promise<string[]> {
    const glob = new Bun.Glob(globPattern);
    const files: string[] = [];

    for await (const path of glob.scan('.')) {
      files.push(path);
    }

    return files;
  }

  // High-performance package validation with Bun's JSON parsing
  static async validatePackageFiles(
    packagePaths: string[]
  ): Promise<Array<{ path: string; valid: boolean; errors?: string[] }>> {
    const results = await Promise.all(
      packagePaths.map(async path => {
        try {
          const data = await this.readPackageFile(path);
          if (!data) {
            return { path, valid: false, errors: ['File not found or unreadable'] };
          }

          // Use our existing validation with Bun's fast JSON processing
          validatePackageMetadata({
            name: data.name,
            version: data.version,
            description: data.description,
            repository: data.repository?.url,
            homepage: data.homepage,
          });

          return { path, valid: true };
        } catch (error) {
          return {
            path,
            valid: false,
            errors: [error instanceof Error ? error.message : 'Unknown validation error'],
          };
        }
      })
    );

    return results;
  }
}

// ============================================================================
// HIGH-PERFORMANCE HASHING - Bun-Native
// ============================================================================

export class BunOptimizedHashing {
  // Ultra-fast integrity hash generation
  static generateIntegrity(data: string): string {
    // Use Bun's native hash function
    const hash = Bun.hash(new TextEncoder().encode(data), 'sha256');
    return `sha256-${Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  // Fast password hashing with Bun.password
  static async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  // Fast password verification
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  // Generate secure tokens with high performance
  static generateSecureToken(length: number = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Bun-native UUID generation (potentially faster than crypto.randomUUID)
  static generateUUID(): string {
    return Bun.randomUUIDv7();
  }
}

// ============================================================================
// ULTRA-FAST COMPRESSION - Bun-Native
// ============================================================================

export class BunOptimizedCompression {
  // High-performance GZIP compression
  static compressData(data: string | Uint8Array): Uint8Array {
    const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return Bun.gzipSync(input);
  }

  // High-performance GZIP decompression
  static decompressData(data: Uint8Array): Uint8Array {
    return Bun.gunzipSync(data);
  }

  // Zstandard compression (even faster than GZIP)
  static async compressWithZstd(data: string): Promise<Uint8Array> {
    const input = new TextEncoder().encode(data);
    return await Bun.zstdCompress(input);
  }

  // Zstandard decompression
  static async decompressWithZstd(data: Uint8Array): Promise<Uint8Array> {
    return await Bun.zstdDecompress(data);
  }

  // Compress package metadata for storage
  static compressPackageData(packageData: any): Uint8Array {
    const jsonString = JSON.stringify(packageData);
    return this.compressData(jsonString);
  }

  // Decompress package metadata
  static decompressPackageData(compressedData: Uint8Array): any {
    const decompressed = this.decompressData(compressedData);
    const jsonString = new TextDecoder().decode(decompressed);
    return JSON.parse(jsonString);
  }
}

// ============================================================================
// HIGH-PERFORMANCE SHELL OPERATIONS - Bun-Native
// ============================================================================

export class BunOptimizedShell {
  // Ultra-fast shell command execution with Bun's $ template
  static async executeCommand(
    command: string,
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    try {
      const startTime = Bun.nanoseconds();

      const proc = Bun.spawn([command], {
        cwd: options.cwd || process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: options.timeout || 30000, // 30 second timeout
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      const executionTime = (Bun.nanoseconds() - startTime) / 1_000_000; // milliseconds
      console.log(`⚡ Command executed in ${executionTime.toFixed(2)}ms: ${command}`);

      return {
        success: exitCode === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      };
    } catch (error) {
      console.error(`❌ Command execution failed: ${command}`, error);
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
      };
    }
  }

  // Parallel command execution for build operations
  static async executeCommandsParallel(
    commands: string[]
  ): Promise<
    Array<{
      command: string;
      result: { success: boolean; stdout: string; stderr: string; exitCode: number };
    }>
  > {
    const promises = commands.map(async command => {
      const result = await this.executeCommand(command);
      return { command, result };
    });

    return await Promise.all(promises);
  }

  // Fast file system operations
  static async readDirectory(path: string): Promise<string[]> {
    try {
      return await Bun.readdir(path);
    } catch (error) {
      console.error(`Failed to read directory ${path}:`, error);
      return [];
    }
  }

  // Ultra-fast file existence check
  static async fileExists(path: string): Promise<boolean> {
    try {
      await Bun.file(path).arrayBuffer();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// PERFORMANCE MONITORING - Bun-Native
// ============================================================================

export class BunOptimizedMonitor {
  private static startTime = Bun.nanoseconds();

  // High-precision timing with Bun.nanoseconds
  static getElapsedTime(): number {
    return (Bun.nanoseconds() - this.startTime) / 1_000_000; // Convert to milliseconds
  }

  // Memory usage monitoring
  static getMemoryUsage(): { rss: number; heapUsed: number; heapTotal: number; external: number } {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss / 1024 / 1024, // MB
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
    };
  }

  // Bun-native sleep for precise timing
  static async sleep(ms: number): Promise<void> {
    await Bun.sleep(ms);
  }

  // High-precision performance measurement
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    label: string = 'operation'
  ): Promise<{ result: T; duration: number }> {
    const startTime = Bun.nanoseconds();

    try {
      const result = await operation();
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000; // milliseconds

      console.log(`⚡ ${label} completed in ${duration.toFixed(3)}ms`);

      return { result, duration };
    } catch (error) {
      const duration = (Bun.nanoseconds() - startTime) / 1_000_000; // milliseconds
      console.error(`❌ ${label} failed after ${duration.toFixed(3)}ms:`, error);
      throw error;
    }
  }

  // System information with Bun APIs
  static getSystemInfo(): {
    version: string;
    platform: string;
    arch: string;
    uptime: number;
    memory: any;
    performance: any;
  } {
    return {
      version: Bun.version,
      platform: Bun.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      performance: {
        elapsedTime: this.getElapsedTime(),
      },
    };
  }
}

// ============================================================================
// ULTRA-PERFORMANCE DEMONSTRATION
// ============================================================================

export async function demonstrateBunOptimization(): Promise<void> {
  console.log('🚀 Demonstrating Bun-Native Performance Optimizations\n');

  // 1. High-performance file operations
  console.log('📁 Testing Bun-native file operations...');
  const { result: files, duration: fileTime } = await BunOptimizedMonitor.measurePerformance(
    () => BunOptimizedFileOps.discoverPackages(),
    'File discovery'
  );
  console.log(`   Found ${files.length} package files in ${fileTime.toFixed(2)}ms\n`);

  // 2. Ultra-fast hashing
  console.log('🔐 Testing Bun-native hashing...');
  const testData = 'This is test data for Bun-native hashing performance';
  const { result: hash, duration: hashTime } = await BunOptimizedMonitor.measurePerformance(
    () => Promise.resolve(BunOptimizedHashing.generateIntegrity(testData)),
    'Hash generation'
  );
  console.log(`   Generated hash: ${hash.substring(0, 20)}... in ${hashTime.toFixed(3)}ms\n`);

  // 3. High-performance compression
  console.log('🗜️ Testing Bun-native compression...');
  const largeData = JSON.stringify({ data: 'x'.repeat(10000) });
  const { result: compressed, duration: compressTime } =
    await BunOptimizedMonitor.measurePerformance(
      () => Promise.resolve(BunOptimizedCompression.compressData(largeData)),
      'Data compression'
    );
  console.log(
    `   Compressed ${largeData.length} bytes to ${compressed.length} bytes in ${compressTime.toFixed(2)}ms\n`
  );

  // 4. System information with Bun APIs
  console.log('📊 System Information (Bun-native):');
  const sysInfo = BunOptimizedMonitor.getSystemInfo();
  console.log(`   Bun Version: ${sysInfo.version}`);
  console.log(`   Platform: ${sysInfo.platform}`);
  console.log(`   Memory Usage: ${sysInfo.memory.heapUsed.toFixed(1)}MB heap`);
  console.log(`   Uptime: ${sysInfo.uptime.toFixed(1)}s\n`);

  console.log('✅ Bun-native optimizations demonstrated!');
  console.log(
    '🎯 These optimizations provide significant performance gains over traditional Node.js implementations'
  );
}
