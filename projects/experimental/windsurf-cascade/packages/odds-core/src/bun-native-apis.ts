import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/bun-native-apis.ts - Advanced Bun native APIs integration
import { BunUtils, OddsProtocolUtils } from './bun-utils';
import { BunGlobalsIntegration } from './bun-globals';
import { $ } from 'bun';

export class BunNativeAPIsIntegration {

  // ===== HTTP Server & WebSockets =====
  
  static createEnhancedServer(options: {
    port?: number;
    routes?: Record<string, (req: Request) => Response | Promise<Response>>;
    websocketHandler?: {
      open?: (ws: any) => void;
      message: (ws: any, message: string | Buffer) => void | Promise<void>;
      close?: (ws: any, code: number, reason: string) => void;
    };
  }) {
    return Bun.serve({
      port: options.port || 3000,
      development: Bun.env.NODE_ENV !== 'production',
      
      fetch(req: Request) {
        const url = new URL(req.url);
        
        // Route handling
        if (options.routes && options.routes[url.pathname]) {
          return options.routes[url.pathname](req);
        }
        
        // Default response
        return new Response('Not Found', { status: 404 });
      },
      
      websocket: options.websocketHandler
    });
  }

  // ===== Shell Integration =====
  
  static async executeShellCommand(command: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  }> {
    const start = performance.now();
    
    try {
      const result = await $`sh -c ${command}`.cwd(options?.cwd || import.meta.dir).env(options?.env || {});
      // Apply timeout manually if needed
      if (options?.timeout) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Command timeout')), options.timeout)
        );
        await Promise.race([result, timeoutPromise]);
      }
      const duration = performance.now() - start;
      
      return {
        stdout: result.stdout?.toString() || '',
        stderr: result.stderr?.toString() || '',
        exitCode: result.exitCode || 0,
        duration
      };
    } catch (error: any) {
      const duration = performance.now() - start;
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message || '',
        exitCode: error.exitCode || 1,
        duration
      };
    }
  }

  // ===== File I/O Operations =====
  
  static async readMarketDataFile(filePath: string): Promise<{
    data: any;
    size: number;
    encoding: string;
    readTime: number;
  }> {
    const start = performance.now();
    const file = Bun.file(filePath);
    
    if (!await file.exists()) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = await file.text();
    const data = JSON.parse(content);
    const readTime = performance.now() - start;
    
    return {
      data,
      size: file.size,
      encoding: 'utf-8',
      readTime
    };
  }

  static async writeMarketDataFile(filePath: string, data: any, options?: {
    createPath?: boolean;
    compression?: 'gzip' | 'deflate' | 'zstd';
  }): Promise<{
    size: number;
    writeTime: number;
    compressed?: boolean;
    compressionRatio?: number;
  }> {
    const start = performance.now();
    const jsonString = JSON.stringify(data, null, 2);
    let content = jsonString;
    let compressed = false;
    let compressionRatio: number | undefined;
    
    if (options?.compression) {
      const buffer = Buffer.from(jsonString);
      const compressedBuffer = BunUtils.compressData(buffer, options.compression);
      content = compressedBuffer;
      compressed = true;
      compressionRatio = compressedBuffer.length / buffer.length;
    }
    
    await Bun.write(filePath, content);
    
    if (options?.createPath) {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dir && dir !== filePath) {
        await $`mkdir -p ${dir}`.quiet();
      }
    }
    
    const writeTime = performance.now() - start;
    
    return {
      size: content.length,
      writeTime,
      compressed,
      compressionRatio
    };
  }

  // ===== Child Processes =====
  
  static spawnMarketDataProcessor(script: string, args: string[] = []): {
    process: any;
    pid: number;
    kill: () => void;
    onExit: (callback: (code: number) => void) => void;
  } {
    const proc = Bun.spawn(['bun', script, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: Bun.env
    });
    
    return {
      process: proc,
      pid: proc.pid,
      kill: () => proc.kill(),
      onExit: (callback) => proc.exited.then(callback)
    };
  }

  // ===== TCP/UDP Networking =====
  
  static createTCPServer(port: number, handler: (socket: any) => void): any {
    return Bun.listen({
      hostname: 'localhost',
      port,
      socket: {
        data: (socket: any, data: any) => {
          handler({ socket, data: data.toString() });
        },
        open: (socket: any) => {
          console.log(`TCP connection opened`);
        },
        close: (socket: any) => {
          console.log(`TCP connection closed`);
        }
      }
    });
  }

  static createUDPSocket(port: number, handler: (data: string, remoteInfo: any) => void): any {
    const socket = Bun.udpSocket({
      hostname: 'localhost',
      port,
      socket: {
        data: (socket: any, data: any) => {
          handler(data.toString(), {
            address: 'localhost',
            port: 0
          });
        }
      }
    });
    
    return socket;
  }

  // ===== Hashing & Security =====
  
  static async hashMarketData(data: any, algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'): Promise<{
    hash: string;
    algorithm: string;
    dataLength: number;
    hashTime: number;
  }> {
    const start = performance.now();
    const jsonString = JSON.stringify(data);
    
    let hash: string;
    switch (algorithm) {
      case 'sha256':
        const sha256Hasher = new Bun.CryptoHasher('sha256');
        sha256Hasher.update(jsonString);
        hash = sha256Hasher.digest('hex');
        break;
      case 'sha512':
        const sha512Hasher = new Bun.CryptoHasher('sha512');
        sha512Hasher.update(jsonString);
        hash = sha512Hasher.digest('hex');
        break;
      case 'md5':
        hash = Bun.hash(jsonString).toString();
        break;
      default:
        throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }
    
    const hashTime = performance.now() - start;
    
    return {
      hash: hash.toString(),
      algorithm,
      dataLength: jsonString.length,
      hashTime
    };
  }

  static createPasswordHash(password: string): {
    hash: string;
    verify: (candidate: string) => Promise<boolean>;
  } {
    const hash = Bun.password.hash(password);
    
    return {
      hash,
      verify: async (candidate: string) => {
        try {
          return await Bun.password.verify(candidate, hash);
        } catch {
          return false;
        }
      }
    };
  }

  // ===== Database Integration =====
  
  static createSQLiteConnection(filePath: string): any {
    const { Database } = require('bun:sqlite');
    return new Database(filePath);
  }

  static async executeSQLQuery(query: string, params: any[] = []): Promise<{
    rows: any[];
    duration: number;
    affectedRows?: number;
  }> {
    const start = performance.now();
    
    try {
      const result = await Bun.sql`SELECT * FROM market_data WHERE symbol = ${params[0]}`;
      const duration = performance.now() - start;
      
      return {
        rows: result,
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
      throw new Error(`SQL Query failed: ${error} (took ${duration.toFixed(2)}ms)`);
    }
  }

  // ===== DNS & Networking =====
  
  static async resolveDNS(hostname: string): Promise<{
    address: string;
    family: number;
    resolveTime: number;
  }> {
    const start = performance.now();
    const results = await Bun.dns.lookup(hostname);
    const resolveTime = performance.now() - start;
    
    // Take the first result if available
    const firstResult = Array.isArray(results) ? results[0] : results;
    
    return {
      address: firstResult?.address || '127.0.0.1',
      family: firstResult?.family || 4,
      resolveTime
    };
  }

  static prefetchDNS(hostname: string): void {
    Bun.dns.prefetch(hostname);
  }

  // ===== Testing Integration =====
  
  static createBunTestSuite(tests: Record<string, () => void | Promise<void>>): void {
    const { test, describe, expect } = require('bun:test');
    
    describe('Odds Protocol Tests', () => {
      Object.entries(tests).forEach(([name, testFn]) => {
        test(name, testFn);
      });
    });
  }

  // ===== Worker Integration =====
  
  static createWorker(scriptPath: string, options?: {
    env?: Record<string, string>;
  }): any {
    return new Worker(scriptPath, {
      env: options?.env || Bun.env as Record<string, string>
    });
  }

  // ===== Module Loading =====
  
  static async loadPlugin(pluginPath: string): Promise<any> {
    return await Bun.plugin({
      name: 'odds-protocol-plugin',
      setup(build) {
        build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
          const source = await Bun.file(args.path).text();
          return {
            contents: source,
            loader: 'ts'
          };
        });
      }
    });
  }

  // ===== Glob & File System =====
  
  static async findMarketDataFiles(pattern: string, baseDir: string = '.'): Promise<{
    files: string[];
    searchTime: number;
  }> {
    const start = performance.now();
    const glob = new Bun.Glob(pattern);
    const files = await Array.fromAsync(glob.scan({ cwd: baseDir }));
    const searchTime = performance.now() - start;
    
    return {
      files,
      searchTime
    };
  }

  // ===== Cookie Management =====
  
  static parseCookies(cookieHeader: string): Record<string, string> {
    const cookieMap = new Bun.CookieMap(cookieHeader);
    const cookies: Record<string, string> = {};
    
    cookieMap.forEach((value, name) => {
      cookies[name] = value;
    });
    
    return cookies;
  }

  static createCookie(name: string, value: string, options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
  }): string {
    const cookie = new Bun.Cookie(name, value);
    
    if (options) {
      Object.assign(cookie, options);
    }
    
    return cookie.toString();
  }

  // ===== Module Resolution =====
  
  static resolveModulePath(moduleName: string, fromPath?: string): string {
    return Bun.resolveSync(moduleName, fromPath || import.meta.dir);
  }

  // ===== Memory Management =====
  
  static getMemorySnapshot(): {
    heapSize: number;
    heapUsed: number;
    externalMemory: number;
    timestamp: number;
  } {
    const { heapStats } = require('bun:jsc');
    const stats = heapStats();
    
    return {
      heapSize: stats.heapSize,
      heapUsed: stats.heapUsed,
      externalMemory: stats.externalMemory,
      timestamp: Date.now()
    };
  }

  static forceGarbageCollection(): void {
    const { gc } = require('bun:jsc');
    gc();
  }

  // ===== Parsing & Formatting =====
  
  static parseSemver(version: string): {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
    valid: boolean;
  } {
    try {
      // Use a simple regex for semver parsing since Bun.semver might not be available
      const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
      const match = version.match(semverRegex);
      
        if (match) {
          return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3], 10),
            prerelease: match[4] || undefined,
            build: match[5] || undefined,
            valid: true
          };
        }
      
      return {
        major: 0,
        minor: 0,
        patch: 0,
        valid: false
      };
    } catch {
      return {
        major: 0,
        minor: 0,
        patch: 0,
        valid: false
      };
    }
  }

  static parseTOML(content: string): any {
    return Bun.TOML.parse(content);
  }

  static formatColor(text: string, color: string): string {
    try {
      const result = Bun.color(text, color as any);
      return Array.isArray(result) ? result.join('') : (result || text);
    } catch {
      return text;
    }
  }

  // ===== Stream Processing =====
  
  static async processReadableStream<T>(stream: ReadableStream, processor: (chunk: any) => T): Promise<{
    results: T[];
    processedCount: number;
    duration: number;
  }> {
    const start = performance.now();
    const results: T[] = [];
    
    const array = await Bun.readableStreamToArray(stream);
    for (const chunk of array) {
      try {
        const result = processor(chunk);
        results.push(result);
      } catch (error) {
        console.error('Stream processing error:', error);
      }
    }
    
    const duration = performance.now() - start;
    
    return {
      results,
      processedCount: results.length,
      duration
    };
  }

  // ===== Low-level Operations =====
  
  static async memoryMapFile(filePath: string): Promise<{
    buffer: Uint8Array;
    size: number;
    mapTime: number;
  }> {
    const start = performance.now();
    const buffer = await Bun.mmap(filePath);
    const mapTime = performance.now() - start;
    
    return {
      buffer: new Uint8Array(buffer),
      size: buffer.byteLength,
      mapTime
    };
  }

  static generateHeapSnapshot(): string {
    try {
      const snapshot = Bun.generateHeapSnapshot();
      return typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    } catch {
      return '{}';
    }
  }
}

// Specialized market data utilities using Bun native APIs
export class MarketDataNativeProcessor {
  private db: any;
  private tcpServer: any;
  private udpSocket: any;
  
  constructor(dbPath: string = './market-data.db') {
    this.db = BunNativeAPIsIntegration.createSQLiteConnection(dbPath);
    this.initializeDatabase();
  }
  
  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        size INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        exchange TEXT NOT NULL,
        side TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_symbol_timestamp 
      ON market_data(symbol, timestamp)
    `);
  }
  
  async storeMarketData(tick: any): Promise<{
    id: number;
    hash: string;
    storeTime: number;
  }> {
    const start = performance.now();
    
    // Generate hash for data integrity
    const { hash } = await BunNativeAPIsIntegration.hashMarketData(tick);
    
    // Store in SQLite
    const result = this.db.run(`
      INSERT INTO market_data (symbol, price, size, timestamp, exchange, side, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [tick.symbol, tick.price, tick.size, tick.timestamp, tick.exchange, tick.side, hash]);
    
    const storeTime = performance.now() - start;
    
    return {
      id: result.lastInsertRowid,
      hash,
      storeTime
    };
  }
  
  async queryMarketData(symbol: string, limit: number = 100): Promise<{
    ticks: any[];
    queryTime: number;
    count: number;
  }> {
    const start = performance.now();
    
    const ticks = this.db.query(`
      SELECT * FROM market_data 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [symbol, limit]);
    
    const queryTime = performance.now() - start;
    
    return {
      ticks,
      queryTime,
      count: ticks.length
    };
  }
  
  startTCPDataFeed(port: number = 8080): void {
    this.tcpServer = BunNativeAPIsIntegration.createTCPServer(port, ({ socket, data }) => {
      try {
        const tick = JSON.parse(data);
        this.storeMarketData(tick).then(result => {
          socket.write(JSON.stringify({
            type: 'stored',
            id: result.id,
            hash: result.hash,
            storeTime: result.storeTime
          }) + '\n');
        });
      } catch (error) {
        socket.write(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON data'
        }) + '\n');
      }
    });
    
    console.log(`📡 TCP Market Data Feed started on port ${port}`);
  }
  
  startUDPDataFeed(port: number = 8081): void {
    this.udpSocket = BunNativeAPIsIntegration.createUDPSocket(port, (data, remoteInfo) => {
      try {
        const tick = JSON.parse(data);
        this.storeMarketData(tick).then(result => {
          console.log(`📊 Stored tick from ${remoteInfo.address}:${remoteInfo.port} - ID: ${result.id}`);
        });
      } catch (error) {
        console.error(`❌ Invalid data from ${remoteInfo.address}:${remoteInfo.port}:`, error);
      }
    });
    
    console.log(`📡 UDP Market Data Feed started on port ${port}`);
  }
  
  async exportToFile(filePath: string, symbol?: string): Promise<{
    filePath: string;
    recordCount: number;
    fileSize: number;
    exportTime: number;
  }> {
    const start = performance.now();
    
    const query = symbol 
      ? `SELECT * FROM market_data WHERE symbol = ? ORDER BY timestamp`
      : `SELECT * FROM market_data ORDER BY timestamp`;
    
    const params = symbol ? [symbol] : [];
    const ticks = this.db.query(query, params);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      symbol: symbol || 'all',
      recordCount: ticks.length,
      data: ticks
    };
    
    const result = await BunNativeAPIsIntegration.writeMarketDataFile(filePath, exportData, {
      createPath: true,
      compression: 'gzip'
    });
    
    const exportTime = performance.now() - start;
    
    return {
      filePath,
      recordCount: ticks.length,
      fileSize: result.size,
      exportTime
    };
  }
  
  close(): void {
    if (this.tcpServer) {
      this.tcpServer.close();
    }
    if (this.udpSocket) {
      this.udpSocket.close();
    }
    if (this.db) {
      this.db.close();
    }
  }
}

export default BunNativeAPIsIntegration;
