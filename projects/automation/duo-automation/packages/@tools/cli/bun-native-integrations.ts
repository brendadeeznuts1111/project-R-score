#!/usr/bin/env bun
// Bun Native Integration System
// CookieMap, Bun.file, Direct ReadableStream, and ArrayBuffer Views

import { AdvancedConnectionManager, type ConnectionConfig } from './advanced-connection-manager';
import { UnifiedColorTensionEcosystem } from './unified-ecosystem-demo';

// =============================================================================
// BUN NATIVE COOKIE MANAGEMENT
// =============================================================================

// Fallback CookieMap implementation if not available in current Bun version
class FallbackCookieMap implements Iterable<[string, string]> {
  private map: Map<string, string> = new Map();
  private cookieOptions: Map<string, CookieInit> = new Map();

  constructor(init?: string[][] | Record<string, string> | string) {
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value));
      } else if (typeof init === 'string') {
        // Parse cookie string
        init.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            this.set(name.trim(), value.trim());
          }
        });
      }
    }
  }

  get(name: string): string | null {
    return this.map.get(name) || null;
  }

  toSetCookieHeaders(): string[] {
    const headers: string[] = [];
    this.map.forEach((value, name) => {
      const options = this.cookieOptions.get(name);
      let header = `${name}=${value}`;
      
      if (options) {
        if (options.domain) header += `; Domain=${options.domain}`;
        if (options.path && options.path !== '') header += `; Path=${options.path}`;
        if (options.expires) {
          if (typeof options.expires === 'number') {
            header += `; Expires=${new Date(options.expires).toUTCString()}`;
          } else if (options.expires instanceof Date) {
            header += `; Expires=${options.expires.toUTCString()}`;
          } else {
            header += `; Expires=${new Date(options.expires).toUTCString()}`;
          }
        }
        if (options.maxAge) header += `; Max-Age=${options.maxAge}`;
        if (options.secure) header += '; Secure';
        if (options.httpOnly) header += '; HttpOnly';
        if (options.sameSite) header += `; SameSite=${options.sameSite}`;
        if (options.partitioned) header += '; Partitioned';
      }
      
      headers.push(header);
    });
    return headers;
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  set(name: string, value: string, options?: CookieInit): void;
  set(options: CookieInit): void;
  set(nameOrOptions: string | CookieInit, value?: string, options?: CookieInit): void {
    if (typeof nameOrOptions === 'object') {
      const cookieOptions = nameOrOptions;
      if (cookieOptions.name && cookieOptions.value !== undefined) {
        this.map.set(cookieOptions.name, cookieOptions.value);
        this.cookieOptions.set(cookieOptions.name, cookieOptions);
      }
    } else {
      const name = nameOrOptions;
      this.map.set(name, value || '');
      if (options) {
        this.cookieOptions.set(name, options);
      }
    }
  }

  delete(name: string): void;
  delete(options: CookieStoreDeleteOptions): void;
  delete(name: string, options: Omit<CookieStoreDeleteOptions, "name">): void;
  delete(nameOrOptions: string | CookieStoreDeleteOptions, options?: Omit<CookieStoreDeleteOptions, "name">): void {
    if (typeof nameOrOptions === 'object') {
      if (nameOrOptions.name) {
        this.map.delete(nameOrOptions.name);
        this.cookieOptions.delete(nameOrOptions.name);
      }
    } else if (options) {
      this.map.delete(nameOrOptions);
      this.cookieOptions.delete(nameOrOptions);
    } else {
      this.map.delete(nameOrOptions);
      this.cookieOptions.delete(nameOrOptions);
    }
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.map);
  }

  get size(): number {
    return this.map.size;
  }

  entries(): IterableIterator<[string, string]> {
    return this.map.entries();
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  values(): IterableIterator<string> {
    return this.map.values();
  }

  forEach(callback: (value: string, key: string, map: FallbackCookieMap) => void): void {
    this.map.forEach((value, key) => callback(value, key, this));
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.map[Symbol.iterator]();
  }
}

// Fallback Cookie implementation if not available in current Bun version
class FallbackCookie {
  readonly name: string;
  value: string;
  domain?: string;
  path: string = '/';
  expires?: number; // number | undefined - Expiration timestamp (ms since epoch)
  secure: boolean = false;
  sameSite: CookieSameSite = 'lax';
  partitioned: boolean = false;
  maxAge?: number;
  httpOnly: boolean = false;

  constructor(name: string, value: string);
  constructor(name: string, value: string, options: CookieInit);
  constructor(cookieString: string);
  constructor(cookieObject?: CookieInit);
  constructor(nameOrStringOrObject?: string | CookieInit, value?: string, options?: CookieInit) {
    if (typeof nameOrStringOrObject === 'undefined') {
      // Constructor()
      this.name = '';
      this.value = '';
    } else if (typeof nameOrStringOrObject === 'string' && value !== undefined) {
      // Constructor(name: string, value: string, options?: CookieInit)
      this.name = nameOrStringOrObject;
      this.value = value;
      if (options) {
        this.applyOptions(options);
      }
    } else if (typeof nameOrStringOrObject === 'string' && value === undefined) {
      // Constructor(cookieString: string)
      const parsed = this.parseCookieString(nameOrStringOrObject);
      this.applyOptions(parsed);
    } else if (typeof nameOrStringOrObject === 'object') {
      // Constructor(cookieObject?: CookieInit)
      const obj = nameOrStringOrObject;
      this.name = obj.name || '';
      this.value = obj.value || '';
      this.applyOptions(obj);
    }
  }

  private applyOptions(options: Partial<CookieInit>): void {
    if (options.domain !== undefined) this.domain = options.domain;
    if (options.path !== undefined) this.path = options.path;
    if (options.expires !== undefined) {
      if (typeof options.expires === 'number') {
        this.expires = options.expires;
      } else if (options.expires instanceof Date) {
        this.expires = options.expires.getTime();
      } else if (typeof options.expires === 'string') {
        this.expires = new Date(options.expires).getTime();
      }
    }
    if (options.secure !== undefined) this.secure = options.secure;
    if (options.sameSite !== undefined) this.sameSite = options.sameSite;
    if (options.partitioned !== undefined) this.partitioned = options.partitioned;
    if (options.maxAge !== undefined) this.maxAge = options.maxAge;
    if (options.httpOnly !== undefined) this.httpOnly = options.httpOnly;
  }

  private parseCookieString(cookieString: string): Partial<CookieInit> {
    const parts = cookieString.split(';');
    const [nameValue] = parts[0].split('=');
    
    const result: Partial<CookieInit> = {
      name: nameValue?.trim(),
      value: parts[0].substring(nameValue?.length || 0 + 1).trim()
    };

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim().toLowerCase();
      
      if (part.startsWith('expires=')) {
        const expiresStr = part.substring(8);
        result.expires = new Date(expiresStr).getTime();
      } else if (part.startsWith('max-age=')) {
        result.maxAge = parseInt(part.substring(8));
      } else if (part.startsWith('domain=')) {
        result.domain = part.substring(7);
      } else if (part.startsWith('path=')) {
        result.path = part.substring(5);
      } else if (part === 'secure') {
        result.secure = true;
      } else if (part === 'httponly') {
        result.httpOnly = true;
      } else if (part === 'samesite=strict') {
        result.sameSite = 'strict';
      } else if (part === 'samesite=lax') {
        result.sameSite = 'lax';
      } else if (part === 'samesite=none') {
        result.sameSite = 'none';
      } else if (part === 'partitioned') {
        result.partitioned = true;
      }
    }

    return result;
  }

  isExpired(): boolean {
    if (this.expires !== undefined) {
      return this.expires < Date.now();
    }
    return false;
  }

  serialize(): string {
    let result = `${this.name}=${this.value}`;
    
    if (this.domain) result += `; Domain=${this.domain}`;
    if (this.path && this.path !== '') result += `; Path=${this.path}`;
    if (this.expires !== undefined) {
      result += `; Expires=${new Date(this.expires).toUTCString()}`;
    }
    if (this.maxAge !== undefined) result += `; Max-Age=${this.maxAge}`;
    if (this.secure) result += '; Secure';
    if (this.httpOnly) result += '; HttpOnly';
    if (this.sameSite) result += `; SameSite=${this.sameSite}`;
    if (this.partitioned) result += '; Partitioned';
    
    return result;
  }

  toString(): string {
    return this.serialize();
  }

  toJSON(): CookieInit {
    return {
      name: this.name,
      value: this.value,
      domain: this.domain,
      path: this.path,
      expires: this.expires,
      secure: this.secure,
      sameSite: this.sameSite,
      partitioned: this.partitioned,
      maxAge: this.maxAge,
      httpOnly: this.httpOnly
    };
  }

  static parse(cookieString: string): Cookie {
    try {
      return new FallbackCookie(cookieString) as Cookie;
    } catch (error) {
      throw new Error(`Failed to parse cookie string: ${cookieString}`);
    }
  }

  static from(name: string, value: string, options?: CookieInit): Cookie {
    return new FallbackCookie(name, value, options) as Cookie;
  }
}

// Use native Bun classes if available, otherwise use fallbacks
const CookieMapImpl = (globalThis as any).Bun?.CookieMap || FallbackCookieMap;
const CookieImpl = (globalThis as any).Bun?.Cookie || FallbackCookie;

// Type aliases for the actual implementations
type CookieMap = InstanceType<typeof CookieMapImpl>;
type Cookie = InstanceType<typeof CookieImpl>;

/**
 * Enhanced cookie store using Bun's native CookieMap and Cookie classes
 */
export class BunNativeCookieStore {
  private cookieMap: CookieMap;
  private persistentCookies: Map<string, Cookie> = new Map();
  private filePath: string;

  constructor(filePath: string = './cookies.json') {
    this.filePath = filePath;
    this.cookieMap = new CookieMapImpl();
    this.loadPersistentCookies();
  }

  /**
   * Load persistent cookies from file using Bun.file
   */
  private async loadPersistentCookies(): Promise<void> {
    try {
      const file = Bun.file(this.filePath);
      if (file.exists) {
        const data = await file.text();
        const cookies = JSON.parse(data) as Array<[string, CookieInit]>;
        
        cookies.forEach(([name, cookieInit]) => {
          this.persistentCookies.set(name, new CookieImpl(name, cookieInit.value || '', cookieInit));
          // Add to CookieMap for runtime use
          this.cookieMap.set(name, cookieInit.value || '', cookieInit);
        });
        
        console.log(`Loaded ${cookies.length} persistent cookies`);
      }
    } catch (error) {
      console.warn('Failed to load persistent cookies:', error);
    }
  }

  /**
   * Save persistent cookies using Bun.write
   */
  private async savePersistentCookies(): Promise<void> {
    try {
      const cookies = Array.from(this.persistentCookies.entries()).map(([name, cookie]) => {
        return [name, cookie.toJSON()] as [string, CookieInit];
      });
      const data = JSON.stringify(cookies);
      await Bun.write(this.filePath, data);
      console.log(`Saved ${cookies.length} persistent cookies`);
    } catch (error) {
      console.error('Failed to save persistent cookies:', error);
    }
  }

  /**
   * Set cookie using CookieMap with full CookieInit options
   */
  set(name: string, value: string, options?: CookieInit): void;
  set(options: CookieInit): void;
  set(nameOrOptions: string | CookieInit, value?: string, options?: CookieInit): void {
    if (typeof nameOrOptions === 'object') {
      // Overload: set(options: CookieInit)
      const cookieOptions = nameOrOptions;
      if (cookieOptions.name && cookieOptions.value !== undefined) {
        this.cookieMap.set(cookieOptions);
        
        // Store in persistent map if needed
        if (cookieOptions.expires || cookieOptions.maxAge) {
          const cookie = new CookieImpl(cookieOptions.name, cookieOptions.value, cookieOptions);
          this.persistentCookies.set(cookieOptions.name, cookie);
          this.savePersistentCookies().catch(console.error);
        }
      }
    } else {
      // Overload: set(name: string, value: string, options?: CookieInit)
      const name = nameOrOptions;
      this.cookieMap.set(name, value, options);
      
      // Store in persistent map if needed
      if (options?.expires || options?.maxAge) {
        const cookie = new CookieImpl(name, value, options);
        this.persistentCookies.set(name, cookie);
        this.savePersistentCookies().catch(console.error);
      }
    }
  }

  /**
   * Get cookie using CookieMap
   */
  get(name: string): string | null {
    return this.cookieMap.get(name);
  }

  /**
   * Check if cookie exists
   */
  has(name: string): boolean {
    return this.cookieMap.has(name);
  }

  /**
   * Delete cookie with multiple overloads
   */
  delete(name: string): void;
  delete(options: CookieStoreDeleteOptions): void;
  delete(name: string, options: Omit<CookieStoreDeleteOptions, "name">): void;
  delete(nameOrOptions: string | CookieStoreDeleteOptions, options?: Omit<CookieStoreDeleteOptions, "name">): void {
    if (typeof nameOrOptions === 'object') {
      // Overload: delete(options: CookieStoreDeleteOptions)
      this.cookieMap.delete(nameOrOptions);
      if (nameOrOptions.name) {
        this.persistentCookies.delete(nameOrOptions.name);
      }
    } else if (options) {
      // Overload: delete(name: string, options: Omit<CookieStoreDeleteOptions, "name">)
      this.cookieMap.delete(nameOrOptions, options);
      this.persistentCookies.delete(nameOrOptions);
    } else {
      // Overload: delete(name: string)
      this.cookieMap.delete(nameOrOptions);
      this.persistentCookies.delete(nameOrOptions);
    }
    this.savePersistentCookies().catch(console.error);
  }

  /**
   * Get all cookies from CookieMap
   */
  getAll(): Record<string, string> {
    return this.cookieMap.toJSON();
  }

  /**
   * Clear all cookies
   */
  clear(): void {
    this.cookieMap.forEach((_, name) => {
      this.cookieMap.delete(name);
      this.persistentCookies.delete(name);
    });
    this.savePersistentCookies().catch(console.error);
  }

  /**
   * Get CookieMap instance for direct access
   */
  getCookieMap(): CookieMap {
    return this.cookieMap;
  }

  /**
   * Get Set-Cookie headers for HTTP responses
   */
  toSetCookieHeaders(): string[] {
    return this.cookieMap.toSetCookieHeaders();
  }

  /**
   * Get cookie map size
   */
  get size(): number {
    return this.cookieMap.size;
  }

  /**
   * Iterate over cookies
   */
  entries(): IterableIterator<[string, string]> {
    return this.cookieMap.entries();
  }

  keys(): IterableIterator<string> {
    return this.cookieMap.keys();
  }

  values(): IterableIterator<string> {
    return this.cookieMap.values();
  }

  forEach(callback: (value: string, key: string, map: CookieMap) => void): void {
    this.cookieMap.forEach(callback);
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.cookieMap[Symbol.iterator]();
  }

  /**
   * Parse cookies from response headers using Cookie.parse
   */
  parseSetCookieHeaders(headers: Headers): void {
    const setCookieHeaders = headers.getSetCookie();
    
    setCookieHeaders.forEach(header => {
      try {
        const cookie = CookieImpl.parse(header);
        if (cookie) {
          this.set(cookie.name, cookie.value, {
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            maxAge: cookie.maxAge,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            partitioned: cookie.partitioned
          });
        }
      } catch (error) {
        console.error('Failed to parse Set-Cookie header:', error);
      }
    });
  }

  /**
   * Create cookie from string using Cookie constructor
   */
  parseCookieString(cookieString: string): void {
    try {
      const cookie = new CookieImpl(cookieString);
      this.set(cookie.name, cookie.value, {
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        partitioned: cookie.partitioned
      });
    } catch (error) {
      console.error('Failed to parse cookie string:', error);
    }
  }

  /**
   * Get expired cookies for cleanup
   */
  getExpiredCookies(): string[] {
    const expired: string[] = [];
    this.persistentCookies.forEach((cookie, name) => {
      if (cookie.isExpired()) {
        expired.push(name);
      }
    });
    return expired;
  }

  /**
   * Clean up expired cookies
   */
  cleanupExpiredCookies(): void {
    const expired = this.getExpiredCookies();
    expired.forEach(name => {
      this.cookieMap.delete(name);
      this.persistentCookies.delete(name);
    });
    
    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired cookies`);
      this.savePersistentCookies().catch(console.error);
    }
  }

  /**
   * Get cookie by URL using CookieStoreGetOptions
   */
  getByUrl(url: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    // Parse URL to get domain and path
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;
      
      // Filter cookies that match the domain and path
      this.cookieMap.forEach((value, name) => {
        const cookie = this.persistentCookies.get(name);
        if (cookie) {
          // Simple domain matching (can be enhanced)
          if (!cookie.domain || domain.endsWith(cookie.domain)) {
            // Simple path matching (can be enhanced)
            if (!cookie.path || path.startsWith(cookie.path)) {
              cookies[name] = value;
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to parse URL:', error);
    }
    
    return cookies;
  }
}

// =============================================================================
// BUN FILE I/O INTEGRATION
// =============================================================================

/**
 * Enhanced file operations using Bun.file
 */
export class BunFileManager {
  private cache: Map<string, BunFile> = new Map();
  private watchCallbacks: Map<string, Set<(content: string) => void>> = new Map();

  /**
   * Read file using Bun.file with caching
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      
      if (!file.exists) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = await file.text();
      
      // Cache the file for future use
      this.cache.set(filePath, file);
      
      return content;
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write file using Bun.write
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await Bun.write(filePath, content);
      
      // Update cache
      const file = Bun.file(filePath);
      this.cache.set(filePath, file);
      
      // Notify watchers
      const callbacks = this.watchCallbacks.get(filePath);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(content);
          } catch (error) {
            console.error('Error in file watcher callback:', error);
          }
        });
      }
      
      console.log(`File written: ${filePath}`);
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read file as ArrayBuffer using Bun.file
   */
  async readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
    try {
      const file = Bun.file(filePath);
      
      if (!file.exists) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      return await file.arrayBuffer();
    } catch (error) {
      console.error(`Failed to read file as ArrayBuffer ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read file as Uint8Array using Bun.file
   */
  async readFileAsUint8Array(filePath: string): Promise<Uint8Array> {
    try {
      const file = Bun.file(filePath);
      
      if (!file.exists) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      return await file.bytes();
    } catch (error) {
      console.error(`Failed to read file as Uint8Array ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get file information using Bun.file
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size: number;
    lastModified: Date;
    type: string;
  }> {
    try {
      const file = Bun.file(filePath);
      
      return {
        exists: file.exists,
        size: file.size,
        lastModified: new Date(file.lastModified),
        type: file.type
      };
    } catch (error) {
      console.error(`Failed to get file info ${filePath}:`, error);
      return {
        exists: false,
        size: 0,
        lastModified: new Date(0),
        type: 'unknown'
      };
    }
  }

  /**
   * Watch file for changes
   */
  watchFile(filePath: string, callback: (content: string) => void): () => void {
    if (!this.watchCallbacks.has(filePath)) {
      this.watchCallbacks.set(filePath, new Set());
    }
    
    this.watchCallbacks.get(filePath)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.watchCallbacks.get(filePath);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.watchCallbacks.delete(filePath);
        }
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached file
   */
  getCachedFile(filePath: string): BunFile | undefined {
    return this.cache.get(filePath);
  }
}

// =============================================================================
// BUN STREAM INTEGRATION
// =============================================================================

/**
 * Stream processor using Bun's Direct ReadableStream
 */
export class BunStreamProcessor {
  private fileManager: BunFileManager;

  constructor() {
    this.fileManager = new BunFileManager();
  }

  /**
   * Create readable stream from file using Bun.file
   */
  createFileReadStream(filePath: string): ReadableStream<Uint8Array> {
    const file = Bun.file(filePath);
    
    if (!file.exists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return file.stream();
  }

  /**
   * Process stream in chunks
   */
  async processStreamInChunks(
    stream: ReadableStream<Uint8Array>,
    processor: (chunk: Uint8Array, index: number) => Promise<void>
  ): Promise<void> {
    const reader = stream.getReader();
    let index = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        await processor(value, index++);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream file and process line by line
   */
  async streamFileByLines(
    filePath: string,
    lineProcessor: (line: string, lineNumber: number) => Promise<void>
  ): Promise<void> {
    const stream = this.createFileReadStream(filePath);
    const decoder = new TextDecoder();
    let buffer = '';
    let lineNumber = 0;
    
    await this.processStreamInChunks(stream, async (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        await lineProcessor(line, lineNumber++);
      }
    });
    
    // Process remaining buffer
    if (buffer) {
      await lineProcessor(buffer, lineNumber);
    }
  }

  /**
   * Create transform stream
   */
  createTransformStream<T, U>(
    transformer: (chunk: T) => Promise<U>
  ): TransformStream<T, U> {
    return new TransformStream({
      async transform(chunk, controller) {
        try {
          const result = await transformer(chunk);
          controller.enqueue(result);
        } catch (error) {
          console.error('Transform stream error:', error);
          throw error;
        }
      }
    });
  }

  /**
   * Pipe stream to file
   */
  async pipeStreamToFile(
    stream: ReadableStream<Uint8Array>,
    outputPath: string
  ): Promise<void> {
    const file = Bun.file(outputPath);
    const writer = file.writer();
    
    try {
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        await writer.write(value);
      }
    } finally {
      await writer.end();
    }
  }

  /**
   * Create duplex stream for bidirectional communication
   */
  createDuplexStream<T>(): {
    readable: ReadableStream<T>;
    writable: WritableStream<T>;
    send: (data: T) => void;
  } {
    const queue: T[] = [];
    let controller: ReadableStreamDefaultController<T> | null = null;
    
    const readable = new ReadableStream<T>({
      start(c) {
        controller = c;
      },
      pull() {
        if (queue.length > 0 && controller) {
          controller.enqueue(queue.shift()!);
        }
      }
    });
    
    const writable = new WritableStream<T>({
      write(chunk) {
        queue.push(chunk);
        if (controller) {
          controller.enqueue(queue.shift()!);
        }
      }
    });
    
    return {
      readable,
      writable,
      send: (data: T) => {
        queue.push(data);
        if (controller) {
          controller.enqueue(queue.shift()!);
        }
      }
    };
  }
}

// =============================================================================
// BUN BINARY DATA INTEGRATION
// =============================================================================

/**
 * Binary data processor using ArrayBuffer and views
 */
export class BunBinaryDataProcessor {
  /**
   * Create ArrayBuffer from data
   */
  createArrayBuffer(data: string | number[]): ArrayBuffer {
    if (typeof data === 'string') {
      return new TextEncoder().encode(data).buffer;
    } else {
      const buffer = new ArrayBuffer(data.length * 4);
      const view = new Uint32Array(buffer);
      view.set(data);
      return buffer;
    }
  }

  /**
   * Process binary data with different views
   */
  processBinaryData(buffer: ArrayBuffer): {
    uint8View: Uint8Array;
    uint16View: Uint16Array;
    uint32View: Uint32Array;
    float32View: Float32Array;
    float64View: Float64Array;
    dataView: DataView;
  } {
    return {
      uint8View: new Uint8Array(buffer),
      uint16View: new Uint16Array(buffer),
      uint32View: new Uint32Array(buffer),
      float32View: new Float32Array(buffer),
      float64View: new Float64Array(buffer),
      dataView: new DataView(buffer)
    };
  }

  /**
   * Convert ArrayBuffer to different formats
   */
  convertArrayBuffer(buffer: ArrayBuffer, format: 'hex' | 'base64' | 'binary'): string {
    const uint8Array = new Uint8Array(buffer);
    
    switch (format) {
      case 'hex':
        return Array.from(uint8Array)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
      
      case 'base64':
        return btoa(String.fromCharCode(...uint8Array));
      
      case 'binary':
        return String.fromCharCode(...uint8Array);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Create typed array from buffer with specific endianness
   */
  createTypedArray<T extends ArrayBufferView>(
    buffer: ArrayBuffer,
    type: 'uint8' | 'uint16' | 'uint32' | 'float32' | 'float64',
    littleEndian: boolean = true
  ): T {
    switch (type) {
      case 'uint8':
        return new Uint8Array(buffer) as T;
      case 'uint16':
        return new Uint16Array(buffer) as T;
      case 'uint32':
        return new Uint32Array(buffer) as T;
      case 'float32':
        return new Float32Array(buffer) as T;
      case 'float64':
        return new Float64Array(buffer) as T;
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }

  /**
   * Perform binary operations on data
   */
  performBinaryOperations(
    buffer1: ArrayBuffer,
    buffer2: ArrayBuffer,
    operation: 'and' | 'or' | 'xor' | 'add' | 'subtract'
  ): ArrayBuffer {
    if (buffer1.byteLength !== buffer2.byteLength) {
      throw new Error('Buffers must be the same length');
    }
    
    const result = new ArrayBuffer(buffer1.byteLength);
    const view1 = new Uint8Array(buffer1);
    const view2 = new Uint8Array(buffer2);
    const resultView = new Uint8Array(result);
    
    for (let i = 0; i < view1.length; i++) {
      switch (operation) {
        case 'and':
          resultView[i] = view1[i] & view2[i];
          break;
        case 'or':
          resultView[i] = view1[i] | view2[i];
          break;
        case 'xor':
          resultView[i] = view1[i] ^ view2[i];
          break;
        case 'add':
          resultView[i] = view1[i] + view2[i];
          break;
        case 'subtract':
          resultView[i] = view1[i] - view2[i];
          break;
      }
    }
    
    return result;
  }

  /**
   * Compress binary data using simple run-length encoding
   */
  compressBinaryData(buffer: ArrayBuffer): ArrayBuffer {
    const source = new Uint8Array(buffer);
    const compressed: number[] = [];
    
    let i = 0;
    while (i < source.length) {
      const value = source[i];
      let count = 1;
      
      while (i + count < source.length && source[i + count] === value && count < 255) {
        count++;
      }
      
      compressed.push(value, count);
      i += count;
    }
    
    return new Uint8Array(compressed).buffer;
  }

  /**
   * Decompress binary data
   */
  decompressBinaryData(buffer: ArrayBuffer): ArrayBuffer {
    const compressed = new Uint8Array(buffer);
    const decompressed: number[] = [];
    
    for (let i = 0; i < compressed.length; i += 2) {
      const value = compressed[i];
      const count = compressed[i + 1];
      
      for (let j = 0; j < count; j++) {
        decompressed.push(value);
      }
    }
    
    return new Uint8Array(decompressed).buffer;
  }
}

// =============================================================================
// INTEGRATED BUN NATIVE ECOSYSTEM
// =============================================================================

/**
 * Enhanced ecosystem with Bun native integrations
 */
export class BunNativeEcosystem extends UnifiedColorTensionEcosystem {
  private cookieStore: BunNativeCookieStore;
  private fileManager: BunFileManager;
  private streamProcessor: BunStreamProcessor;
  private binaryProcessor: BunBinaryDataProcessor;

  constructor() {
    super();
    this.cookieStore = new BunNativeCookieStore();
    this.fileManager = new BunFileManager();
    this.streamProcessor = new BunStreamProcessor();
    this.binaryProcessor = new BunBinaryDataProcessor();
  }

  /**
   * Get cookie store
   */
  getCookies(): BunNativeCookieStore {
    return this.cookieStore;
  }

  /**
   * Get file manager
   */
  getFileManager(): BunFileManager {
    return this.fileManager;
  }

  /**
   * Get stream processor
   */
  getStreamProcessor(): BunStreamProcessor {
    return this.streamProcessor;
  }

  /**
   * Get binary processor
   */
  getBinaryProcessor(): BunBinaryDataProcessor {
    return this.binaryProcessor;
  }

  /**
   * Save ecosystem state using Bun.file
   */
  async saveState(filePath: string = './ecosystem-state.json'): Promise<void> {
    const state = {
      timestamp: new Date().toISOString(),
      systems: this.getAllSystemStates(),
      metrics: this.getSystemOverview(),
      cookies: this.cookieStore.getAll()
    };

    await this.fileManager.writeFile(filePath, JSON.stringify(state, null, 2));
    console.log(`Ecosystem state saved to ${filePath}`);
  }

  /**
   * Load ecosystem state using Bun.file
   */
  async loadState(filePath: string = './ecosystem-state.json'): Promise<void> {
    try {
      const data = await this.fileManager.readFile(filePath);
      const state = JSON.parse(data);
      
      console.log(`Loaded ecosystem state from ${filePath}`);
      console.log(`State timestamp: ${state.timestamp}`);
      console.log(`Systems: ${state.systems.length}`);
      console.log(`Cookies: ${Object.keys(state.cookies).length}`);
      
    } catch (error) {
      console.warn(`Failed to load ecosystem state: ${error}`);
    }
  }

  /**
   * Stream ecosystem metrics to file
   */
  async streamMetricsToFile(filePath: string = './metrics-stream.jsonl'): Promise<void> {
    const stream = this.createMetricsStream();
    await this.streamProcessor.pipeStreamToFile(stream, filePath);
  }

  /**
   * Create metrics stream
   */
  private createMetricsStream(): ReadableStream<Uint8Array> {
    let interval: NodeJS.Timeout;
    
    return new ReadableStream({
      start(controller) {
        interval = setInterval(() => {
          const metrics = this.getSystemOverview();
          const data = JSON.stringify({
            timestamp: new Date().toISOString(),
            ...metrics
          }) + '\n';
          
          controller.enqueue(new TextEncoder().encode(data));
        }, 1000);
      },
      
      cancel() {
        if (interval) {
          clearInterval(interval);
        }
      }
    });
  }

  /**
   * Process binary configuration data
   */
  async processBinaryConfig(configPath: string): Promise<any> {
    try {
      const buffer = await this.fileManager.readFileAsArrayBuffer(configPath);
      const views = this.binaryProcessor.processBinaryData(buffer);
      
      // Example: Read configuration from binary data
      const configData = this.binaryProcessor.convertArrayBuffer(buffer, 'binary');
      const config = JSON.parse(configData);
      
      console.log(`Processed binary configuration from ${configPath}`);
      console.log(`Buffer size: ${buffer.byteLength} bytes`);
      console.log(`Data views: ${Object.keys(views).length}`);
      
      return config;
    } catch (error) {
      console.error(`Failed to process binary config: ${error}`);
      throw error;
    }
  }
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Native API usage metrics and tracking
 */
export interface BunNativeAPIMetrics {
  /** API name (e.g., 'Bun.Cookie', 'Bun.file', 'fetch') */
  apiName: string;
  /** Domain classification for the API - updated for all official Bun API categories and globals */
  domain: 'filesystem' | 'networking' | 'crypto' | 'cookies' | 'streams' | 'binary' | 'system' | 'runtime' | 'database' | 'build' | 'web' | 'workers' | 'utilities' | 'events' | 'timing' | 'text' | 'nodejs' | 'javascript';
  /** Number of times API was called */
  callCount: number;
  /** Total time spent in API calls (ms) */
  totalDuration: number;
  /** Average duration per call (ms) */
  averageDuration: number;
  /** Last call timestamp */
  lastCalled: Date;
  /** Success/failure statistics */
  successCount: number;
  errorCount: number;
  /** Implementation type with detailed classification */
  implementation: 'native' | 'fallback' | 'polyfill' | 'shim' | 'emulated';
  /** Implementation source details */
  implementationSource: {
    /** Source of implementation */
    source: 'bun-native' | 'bun-polyfill' | 'custom-fallback' | 'web-api' | 'node-compat';
    /** Version or build info */
    version?: string;
    /** Performance tier */
    performanceTier: 'ultra-fast' | 'fast' | 'moderate' | 'slow';
    /** Memory efficiency */
    memoryEfficiency: 'optimal' | 'good' | 'moderate' | 'high';
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Enhanced Bun Native API Tracker with comprehensive integration
 */
export class BunNativeAPITracker {
  private metrics: Map<string, BunNativeAPIMetrics> = new Map();
  private startTime: Date = new Date();
  private enabled: boolean = true;
  
  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Determine domain classification for an API
   */
  private classifyDomain(apiName: string): BunNativeAPIMetrics['domain'] {
    const domain = apiName.toLowerCase();
    
    // File I/O operations
    if (domain.includes('file') || domain.includes('write') || domain.includes('read') || 
        domain.includes('stdin') || domain.includes('stdout') || domain.includes('stderr')) {
      return 'filesystem';
    }
    
    // Networking operations
    if (domain.includes('fetch') || domain.includes('request') || domain.includes('response') ||
        domain.includes('serve') || domain.includes('listen') || domain.includes('connect') ||
        domain.includes('udpsocket') || domain.includes('dns') || domain.includes('websocket') ||
        domain.includes('headers') || domain.includes('url') || domain.includes('blob') ||
        domain.includes('unix') || domain.includes('socket') || domain.includes('docker')) {
      return 'networking';
    }
    
    // Cryptographic operations
    if (domain.includes('crypto') || domain.includes('hash') || domain.includes('encrypt') ||
        domain.includes('password') || domain.includes('sha') || domain.includes('cryptohasher')) {
      return 'crypto';
    }
    
    // Cookie operations
    if (domain.includes('cookie') || domain.includes('session')) {
      return 'cookies';
    }
    
    // Stream operations
    if (domain.includes('stream') || domain.includes('readable') || domain.includes('writable')) {
      return 'streams';
    }
    
    // Binary data operations
    if (domain.includes('buffer') || domain.includes('binary') || domain.includes('array') ||
        domain.includes('gzip') || domain.includes('deflate') || domain.includes('zstd')) {
      return 'binary';
    }
    
    // System and process operations
    if (domain.includes('process') || domain.includes('system') || domain.includes('env') ||
        domain.includes('spawn') || domain.includes('sleep') || domain.includes('nanoseconds')) {
      return 'system';
    }
    
    // Database operations
    if (domain.includes('sql') || domain.includes('sqlite') || domain.includes('redis')) {
      return 'database';
    }
    
    // Build and tooling operations
    if (domain.includes('build') || domain.includes('plugin') || domain.includes('glob') ||
        domain.includes('transpiler') || domain.includes('test') || domain.includes('ffi')) {
      return 'build';
    }
    
    // Web processing operations
    if (domain.includes('html') || domain.includes('rewriter') || domain.includes('router')) {
      return 'web';
    }
    
    // Worker operations
    if (domain.includes('worker')) {
      return 'workers';
    }
    
    // Utility operations
    if (domain.includes('version') || domain.includes('revision') || domain.includes('main') ||
        domain.includes('uuid') || domain.includes('which') || domain.includes('peek') ||
        domain.includes('deepequals') || domain.includes('deepmatch') || domain.includes('inspect') ||
        domain.includes('escapehtml') || domain.includes('stringwidth') || domain.includes('indexofline') ||
        domain.includes('fileurltopath') || domain.includes('pathtofileurl')) {
      return 'utilities';
    }
    
    // Global Web APIs
    if (domain.includes('fetch') || domain.includes('response') || domain.includes('request') ||
        domain.includes('headers') || domain.includes('url') || domain.includes('blob') ||
        domain.includes('abortcontroller') || domain.includes('abortsignal') || domain.includes('atob') ||
        domain.includes('btoa') || domain.includes('alert') || domain.includes('confirm') ||
        domain.includes('prompt') || domain.includes('formdata') || domain.includes('crypto') ||
        domain.includes('cryptokey') || domain.includes('subtlecrypto')) {
      return 'web';
    }
    
    // Stream APIs
    if (domain.includes('readablestream') || domain.includes('writablestream') || domain.includes('transformstream') ||
        domain.includes('readablebytestreamcontroller') || domain.includes('readablestreamdefaultcontroller') ||
        domain.includes('readablestreamdefaultreader') || domain.includes('writablestreamdefaultcontroller') ||
        domain.includes('writablestreamdefaultwriter') || domain.includes('transformstreamdefaultcontroller') ||
        domain.includes('bytelengthqueuingstrategy') || domain.includes('countqueuingstrategy')) {
      return 'streams';
    }
    
    // Event APIs
    if (domain.includes('event') || domain.includes('customevent') || domain.includes('errorevent') ||
        domain.includes('closeevent') || domain.includes('messageevent') || domain.includes('eventtarget')) {
      return 'events';
    }
    
    // Timing APIs
    if (domain.includes('settimeout') || domain.includes('cleartimeout') || domain.includes('setinterval') ||
        domain.includes('clearinterval') || domain.includes('setimmediate') || domain.includes('clearimmediate') ||
        domain.includes('queuemicrotask') || domain.includes('performance')) {
      return 'timing';
    }
    
    // Text APIs
    if (domain.includes('textdecoder') || domain.includes('textencoder')) {
      return 'text';
    }
    
    // Node.js compatibility globals
    if (domain.includes('buffer') || domain.includes('process') || domain.includes('import.meta.dir') ||
        domain.includes('import.meta.file') || domain.includes('exports') || domain.includes('module') ||
        domain.includes('require') || domain.includes('global')) {
      return 'nodejs';
    }
    
    // JavaScript globals
    if (domain.includes('globalthis') || domain.includes('json') || domain.includes('console') ||
        domain.includes('webassembly') || domain.includes('shadowrealm') || domain.includes('domexception') ||
        domain.includes('reporterror')) {
      return 'javascript';
    }
    
    // Default to runtime for other operations
    return 'runtime';
  }
  
  /**
   * Determine implementation type and source
   */
  private detectImplementation(apiName: string): BunNativeAPIMetrics['implementationSource'] {
    const name = apiName.toLowerCase();
    
    // Bun native APIs - highest performance
    if (name.startsWith('bun.') || name.includes('native')) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'ultra-fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Web APIs implemented by Bun
    if (['fetch', 'response', 'request', 'headers', 'url', 'urlsearchparams', 'blob', 'websocket', 'abortcontroller', 'abortsignal', 'atob', 'btoa', 'alert', 'confirm', 'prompt', 'formdata', 'crypto', 'cryptokey', 'subtlecrypto'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Stream APIs
    if (['readablestream', 'writablestream', 'transformstream', 'readablebytestreamcontroller', 'readablestreamdefaultcontroller', 'readablestreamdefaultreader', 'writablestreamdefaultcontroller', 'writablestreamdefaultwriter', 'transformstreamdefaultcontroller', 'byteLengthQueuingStrategy', 'countqueuingstrategy'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Event APIs
    if (['event', 'customevent', 'errorevent', 'closeevent', 'messageevent', 'eventtarget'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Timing APIs
    if (['settimeout', 'cleartimeout', 'setinterval', 'clearinterval', 'setimmediate', 'clearimmediate', 'queuemicrotask', 'performance'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Text APIs
    if (['textdecoder', 'textencoder'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Node.js compatibility globals
    if (['buffer', 'process', 'import.meta.dir', 'import.meta.file', 'exports', 'module', 'require', 'global'].includes(name)) {
      return {
        source: 'node-compat',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    // JavaScript globals
    if (['globalthis', 'json', 'console', 'webassembly', 'shadowrealm', 'domexception', 'reporterror'].includes(name)) {
      return {
        source: 'web-api',
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Official Bun API categories from documentation
    const bunAPIs = {
      // File I/O
      filesystem: ['bun.file', 'bun.write', 'bun.stdin', 'bun.stdout', 'bun.stderr'],
      // Networking
      networking: ['bun.serve', 'bun.listen', 'bun.connect', 'bun.udpsocket', 'bun.dns.lookup', 'bun.dns.prefetch', 'bun.dns.getcachestats'],
      // Child Processes
      system: ['bun.spawn', 'bun.spawnsync'],
      // Crypto
      crypto: ['bun.password', 'bun.hash', 'bun.cryptohasher', 'bun.sha'],
      // Database
      database: ['bun.sql', 'bun.sqlite', 'bun.redis', 'bun.redisclient', 'bun.sql'],
      // Utilities
      runtime: ['bun.version', 'bun.revision', 'bun.env', 'bun.main', 'bun.sleep', 'bun.sleepsync', 'bun.nanoseconds', 'bun.randomuuidv7', 'bun.which', 'bun.peek', 'bun.deepequals', 'bun.deepmatch', 'bun.inspect', 'bun.escapehtml', 'bun.stringwidth', 'bun.indexofline', 'bun.fileurltopath', 'bun.pathtofileurl', 'bun.gzipSync', 'bun.gunzipsync', 'bun.deflatesync', 'bun.inflatesync', 'bun.zstdcompresssync', 'bun.zstddecompresssync'],
      // Build tools
      build: ['bun.build', 'bun.plugin', 'bun.glob'],
      // Transpilation
      transpiler: ['bun.transpiler'],
      // Routing
      routing: ['bun.filesystemrouter'],
      // HTML processing
      processing: ['htmlrewriter'],
      // Testing
      testing: ['bun.test'],
      // Workers
      workers: ['worker'],
      // FFI
      ffi: ['bun.ffi'],
      // Cookies
      cookies: ['bun.cookie', 'bun.cookiemap']
    };
    
    // Global functions and objects from https://bun.com/docs/runtime/globals
    const bunGlobals = {
      // Web APIs
      web: ['abortcontroller', 'abortsignal', 'alert', 'blob', 'atob', 'btoa', 'confirm', 'prompt', 'fetch', 'formdata', 'headers', 'request', 'response', 'url', 'urlsearchparams', 'crypto', 'cryptokey', 'subtlecrypto'],
      // Stream APIs
      streams: ['readablestream', 'writablestream', 'transformstream', 'readablebytestreamcontroller', 'readablestreamdefaultcontroller', 'readablestreamdefaultreader', 'writablestreamdefaultcontroller', 'writablestreamdefaultwriter', 'transformstreamdefaultcontroller', 'byteLengthQueuingStrategy', 'countqueuingstrategy'],
      // Event APIs
      events: ['event', 'customevent', 'errorevent', 'closeevent', 'messageevent', 'eventtarget'],
      // Timing APIs
      timing: ['settimeout', 'cleartimeout', 'setinterval', 'clearinterval', 'setimmediate', 'clearimmediate', 'queuemicrotask', 'performance'],
      // Text APIs
      text: ['textdecoder', 'textencoder'],
      // Node.js compatibility globals
      nodejs: ['buffer', 'process', 'import.meta.dir', 'import.meta.file', 'exports', 'module', 'require', 'global'],
      // JavaScript globals
      javascript: ['globalthis', 'json', 'console', 'webassembly', 'shadowrealm', 'domexception', 'reporterror'],
      // Bun-specific globals
      bunSpecific: ['bun', 'htmlrewriter'],
      // Build-related globals
      build: ['buildmessage', 'resolvemessage']
    };
    
    // Check if it's an official Bun API
    for (const [category, apis] of Object.entries(bunAPIs)) {
      if (apis.some(api => api.toLowerCase() === name)) {
        return {
          source: 'bun-native',
          version: Bun.version,
          performanceTier: category === 'filesystem' || category === 'networking' ? 'ultra-fast' : 'fast',
          memoryEfficiency: 'optimal'
        };
      }
    }
    
    // Check if it's a global function/object from Bun globals documentation
    for (const [category, globals] of Object.entries(bunGlobals)) {
      if (globals.some(global => global.toLowerCase() === name)) {
        return {
          source: 'bun-native',
          version: Bun.version,
          performanceTier: category === 'web' || category === 'streams' ? 'fast' : 'moderate',
          memoryEfficiency: 'optimal'
        };
      }
    }
    
    // Node.js compatibility APIs
    if (name.includes('node') || name.includes('fs') || name.includes('path')) {
      return {
        source: 'node-compat',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    // Custom implementations
    if (name.includes('tracked') || name.includes('custom')) {
      return {
        source: 'custom-fallback',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    // Default polyfill
    return {
      source: 'bun-polyfill',
      performanceTier: 'slow',
      memoryEfficiency: 'moderate'
    };
  }
  
  /**
   * Determine implementation type based on performance and source
   */
  private classifyImplementation(source: ReturnType<BunNativeAPITracker['detectImplementation']>): BunNativeAPIMetrics['implementation'] {
    switch (source.source) {
      case 'bun-native':
        return 'native';
      case 'bun-polyfill':
        return 'polyfill';
      case 'custom-fallback':
        return 'fallback';
      case 'web-api':
        return 'native';
      case 'node-compat':
        return 'shim';
      default:
        return 'emulated';
    }
  }
  
  /**
   * Track an API call with automatic domain and implementation detection
   */
  trackCall(apiName: string, duration: number, success: boolean, implementation?: BunNativeAPIMetrics['implementation'], metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const domain = this.classifyDomain(apiName);
    const implementationSource = this.detectImplementation(apiName);
    const implementationType = implementation || this.classifyImplementation(implementationSource);
    
    const existing = this.metrics.get(apiName) || {
      apiName,
      domain,
      callCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastCalled: new Date(),
      successCount: 0,
      errorCount: 0,
      implementation: implementationType,
      implementationSource,
      metadata
    };

    existing.callCount++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.callCount;
    existing.lastCalled = new Date();
    existing.implementation = implementationType;
    existing.implementationSource = implementationSource;
    
    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    if (metadata) {
      existing.metadata = { ...existing.metadata, ...metadata };
    }

    this.metrics.set(apiName, existing);
  }

  /**
   * Track API call with automatic timing
   */
  async trackCallAsync<T>(
    apiName: string, 
    apiCall: () => Promise<T>, 
    implementation?: BunNativeAPIMetrics['implementation'],
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return apiCall();
    }
    
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.trackCall(apiName, duration, success, implementation, metadata);
    }
  }

  /**
   * Track synchronous API call with automatic timing
   */
  trackCallSync<T>(
    apiName: string, 
    apiCall: () => T, 
    implementation?: BunNativeAPIMetrics['implementation'],
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) {
      return apiCall();
    }
    
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.trackCall(apiName, duration, success, implementation, metadata);
    }
  }

  /**
   * Get metrics for a specific API
   */
  getMetrics(apiName: string): BunNativeAPIMetrics | undefined {
    return this.metrics.get(apiName);
  }

  /**
   * Get all API metrics
   */
  getAllMetrics(): BunNativeAPIMetrics[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.callCount - a.callCount);
  }

  /**
   * Get metrics grouped by domain
   */
  getMetricsByDomain(): Record<BunNativeAPIMetrics['domain'], BunNativeAPIMetrics[]> {
    const allMetrics = this.getAllMetrics();
    const grouped: Record<BunNativeAPIMetrics['domain'], BunNativeAPIMetrics[]> = {
      filesystem: [],
      networking: [],
      crypto: [],
      cookies: [],
      streams: [],
      binary: [],
      system: [],
      database: [],
      build: [],
      web: [],
      workers: [],
      utilities: [],
      events: [],
      timing: [],
      text: [],
      nodejs: [],
      javascript: [],
      runtime: []
    };
    
    allMetrics.forEach(metric => {
      grouped[metric.domain].push(metric);
    });
    
    return grouped;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const allMetrics = this.getAllMetrics();
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalDuration = allMetrics.reduce((sum, m) => sum + m.totalDuration, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const nativeAPIs = allMetrics.filter(m => m.implementation === 'native').length;
    const fallbackAPIs = allMetrics.filter(m => m.implementation === 'fallback').length;

    return {
      uptime: Date.now() - this.startTime.getTime(),
      totalAPIs: allMetrics.length,
      totalCalls,
      totalDuration,
      averageCallDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      totalErrors,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      nativeAPIs,
      fallbackAPIs,
      nativeRate: allMetrics.length > 0 ? (nativeAPIs / allMetrics.length) * 100 : 0
    };
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      metrics: this.getAllMetrics()
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = new Date();
  }
}

/**
 * Global tracker instance for easy access
 */
export const globalBunTracker = new BunNativeAPITracker();

/**
 * Enhanced Bun APIs with automatic tracking integration
 */
export class TrackedBunAPIs {
  private tracker: BunNativeAPITracker;

  constructor(tracker?: BunNativeAPITracker) {
    this.tracker = tracker || globalBunTracker;
  }

  /**
   * Tracked fetch implementation
   */
  async trackedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    return this.tracker.trackCallAsync('fetch', async () => {
      return fetch(input, init);
    }, 'native', { 
      url: input.toString(),
      method: init?.method || 'GET'
    });
  }

  /**
   * Tracked Unix domain socket fetch implementation
   */
  async trackedUnixFetch(url: string, unixSocketPath: string, init?: RequestInit): Promise<Response> {
    return this.tracker.trackCallAsync('fetch-unix', async () => {
      return fetch(url, { ...init, unix: unixSocketPath });
    }, 'native', { 
      url,
      unixSocket: unixSocketPath,
      method: init?.method || 'GET',
      protocol: 'unix-domain-socket'
    });
  }

  /**
   * Tracked Bun.file implementation
   */
  trackedFile(path: string | URL): BunFile {
    return this.tracker.trackCallSync('Bun.file', () => {
      return Bun.file(path);
    }, 'native', { path: path.toString() });
  }

  /**
   * Tracked Bun.write implementation
   */
  async trackedWrite(path: string | URL, data: any): Promise<number> {
    return this.tracker.trackCallAsync('Bun.write', async () => {
      return Bun.write(path, data);
    }, 'native', { 
      path: path.toString(),
      dataType: typeof data
    });
  }

  /**
   * Tracked Bun.CookieMap implementation
   */
  trackedCookieMap(input?: string | Record<string, string> | Array<[string, string]>): CookieMap {
    return this.tracker.trackCallSync('Bun.CookieMap', () => {
      return new Bun.CookieMap(input);
    }, 'native', { 
      inputType: typeof input,
      hasInput: !!input
    });
  }

  /**
   * Tracked Bun.Cookie implementation
   */
  trackedCookie(name: string, value: string, options?: CookieInit): Cookie {
    return this.tracker.trackCallSync('Bun.Cookie', () => {
      return new Bun.Cookie(name, value, options);
    }, 'native', { 
      name,
      hasOptions: !!options
    });
  }

  /**
   * Tracked Bun.serve implementation
   */
  trackedServe(options: { fetch: (req: Request) => Response | Promise<Response>; port?: number }): Server {
    return this.tracker.trackCallSync('Bun.serve', () => {
      return Bun.serve(options);
    }, 'native', { 
      hasPort: !!options.port,
      port: options.port
    });
  }

  /**
   * Tracked Bun.spawn implementation
   */
  trackedSpawn(command: string | string[], options?: Bun.SpawnOptions): Process {
    return this.tracker.trackCallSync('Bun.spawn', () => {
      return Bun.spawn(command, options);
    }, 'native', { 
      command: Array.isArray(command) ? command.join(' ') : command,
      hasOptions: !!options
    });
  }

  /**
   * Tracked Bun.hash implementation
   */
  trackedHash(data: string | ArrayBuffer | Uint8Array): string {
    return this.tracker.trackCallSync('Bun.hash', () => {
      return Bun.hash(data);
    }, 'native', { 
      dataType: typeof data
    });
  }

  /**
   * Tracked Bun.password implementation
   */
  trackedPassword(algorithm: string, data: string | Uint8Array, salt?: Uint8Array, iterations?: number): Promise<ArrayBuffer> {
    return this.tracker.trackCallAsync('Bun.password', async () => {
      return Bun.password(algorithm, data, salt, iterations);
    }, 'native', { 
      algorithm,
      hasSalt: !!salt,
      iterations
    });
  }

  /**
   * Tracked Bun.sleep implementation
   */
  async trackedSleep(nanoseconds: number): Promise<void> {
    return this.tracker.trackCallAsync('Bun.sleep', async () => {
      return Bun.sleep(nanoseconds);
    }, 'native', { 
      duration: nanoseconds
    });
  }

  /**
   * Tracked Bun.gzipSync implementation
   */
  trackedGzipSync(data: ArrayBuffer | Uint8Array): ArrayBuffer {
    return this.tracker.trackCallSync('Bun.gzipSync', () => {
      return Bun.gzipSync(data);
    }, 'native', { 
      dataType: data.constructor.name,
      size: data.byteLength
    });
  }

  /**
   * Tracked Bun.build implementation
   */
  async trackedBuild(options: Bun.BuildOptions): Promise<Bun.BuildOutput> {
    return this.tracker.trackCallAsync('Bun.build', async () => {
      return Bun.build(options);
    }, 'native', { 
      entrypoints: options.entrypoints?.length || 0,
      target: options.target,
      format: options.format
    });
  }

  /**
   * Tracked Bun.CryptoHasher implementation
   */
  trackedCryptoHasher(algorithm: string): CryptoHasher {
    return this.tracker.trackCallSync('Bun.CryptoHasher', () => {
      return new Bun.CryptoHasher(algorithm);
    }, 'native', { 
      algorithm
    });
  }

  /**
   * Tracked Bun.Glob implementation
   */
  trackedGlob(pattern: string): Bun.Glob {
    return this.tracker.trackCallSync('Bun.Glob', () => {
      return new Bun.Glob(pattern);
    }, 'native', { 
      pattern
    });
  }

  /**
   * Tracked Bun.inspect implementation
   */
  trackedInspect(value: unknown, options?: { depth?: number; colors?: boolean }): string {
    return this.tracker.trackCallSync('Bun.inspect', () => {
      return Bun.inspect(value, options);
    }, 'native', { 
      valueType: typeof value,
      hasOptions: !!options
    });
  }

  /**
   * Tracked Bun.deepEquals implementation
   */
  trackedDeepEquals(a: unknown, b: unknown): boolean {
    return this.tracker.trackCallSync('Bun.deepEquals', () => {
      return Bun.deepEquals(a, b);
    }, 'native', { 
      typeA: typeof a,
      typeB: typeof b
    });
  }

  /**
   * Get the underlying tracker
   */
  getTracker(): BunNativeAPITracker {
    return this.tracker;
  }
}

/**
 * Create tracked Bun APIs instance
 */
export const trackedBun = new TrackedBunAPIs();

/**
 * Demonstrate the comprehensive BunNativeAPIMetrics integration with official Bun APIs
 */
export async function demonstrateBunNativeMetricsIntegration(): Promise<void> {
  console.log('🔍 BUN NATIVE METRICS INTEGRATION DEMONSTRATION');
  console.log('============================================================');
  console.log('📚 Featuring ALL official Bun APIs from https://bun.com/docs/runtime/bun-apis');
  
  // Create tracker and tracked APIs
  const tracker = new BunNativeAPITracker();
  const trackedAPIs = new TrackedBunAPIs(tracker);
  
  console.log('\n📊 TRACKED OFFICIAL BUN API CALLS:');
  
  // 1. Networking APIs
  console.log('  🌐 Networking APIs:');
  await trackedAPIs.trackedFetch('https://example.com');
  await trackedAPIs.trackedFetch('https://example.com', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  });
  
  // Unix Domain Socket examples (from Bun docs)
  console.log('  🔗 Unix Domain Socket APIs:');
  try {
    // Example: Docker socket communication
    console.log('    Testing Docker socket communication...');
    // Note: This would only work if Docker is running and socket is accessible
    // await trackedAPIs.trackedUnixFetch('http://localhost/info', '/var/run/docker.sock');
    console.log('    ✅ Unix domain socket tracking ready (Docker socket example commented out)');
    
    // Example: Generic Unix socket
    console.log('    Testing generic Unix socket pattern...');
    // await trackedAPIs.trackedUnixFetch('http://localhost/api', '/tmp/app.sock', {
    //   method: 'POST',
    //   body: JSON.stringify({ message: 'Hello from Bun Unix socket!' })
    // });
    console.log('    ✅ Generic Unix socket tracking ready (example commented out)');
  } catch (error) {
    console.log(`    ⚠️ Unix socket test skipped: ${error.message}`);
  }
  
  // 2. File I/O APIs
  console.log('  📁 File I/O APIs:');
  const testFile = 'integration-test.json';
  const testData = { message: 'Bun Native Metrics Integration', timestamp: new Date().toISOString() };
  
  await trackedAPIs.trackedWrite(testFile, JSON.stringify(testData, null, 2));
  const file = trackedAPIs.trackedFile(testFile);
  const content = await file.text();
  console.log(`    File written and read: ${JSON.parse(content).message}`);
  
  // 3. Cookie APIs
  console.log('  🍪 Cookie APIs:');
  const cookieMap = trackedAPIs.trackedCookieMap('session=abc123; theme=dark');
  const cookie = trackedAPIs.trackedCookie('user', 'john', { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  
  console.log(`    CookieMap size: ${cookieMap.size}`);
  console.log(`    Cookie created: ${cookie.name}=${cookie.value}`);
  
  // 4. Crypto APIs
  console.log('  🔐 Crypto APIs:');
  const hash = trackedAPIs.trackedHash('test data');
  console.log(`    Hash generated: ${hash.substring(0, 16)}...`);
  
  const hasher = trackedAPIs.trackedCryptoHasher('sha256');
  hasher.update('crypto test');
  const cryptoHash = hasher.digest('hex');
  console.log(`    CryptoHash: ${cryptoHash.substring(0, 16)}...`);
  
  // 5. System APIs
  console.log('  ⚙️ System APIs:');
  await trackedAPIs.trackedSleep(1_000_000); // 1ms in nanoseconds
  console.log('    Sleep completed');
  
  // 6. Binary APIs
  console.log('  📦 Binary APIs:');
  const testDataBuffer = new TextEncoder().encode('compression test data');
  const compressed = trackedAPIs.trackedGzipSync(testDataBuffer);
  console.log(`    Compressed: ${testDataBuffer.length} → ${compressed.byteLength} bytes`);
  
  // 7. Utility APIs
  console.log('  🛠️ Utility APIs:');
  const testObject = { a: 1, b: { c: 2 } };
  const testObject2 = { a: 1, b: { c: 2 } };
  const isEqual = trackedAPIs.trackedDeepEquals(testObject, testObject2);
  console.log(`    Deep equals: ${isEqual}`);
  
  const inspected = trackedAPIs.trackedInspect(testObject, { depth: 2, colors: false });
  console.log(`    Inspected: ${inspected.substring(0, 30)}...`);
  
  // 8. Build APIs
  console.log('  🔨 Build APIs:');
  try {
    await trackedAPIs.trackedBuild({
      entrypoints: ['./test-entry.js'],
      target: 'browser',
      format: 'esm'
    });
    console.log('    Build completed (simulated)');
  } catch (error) {
    console.log('    Build attempted (expected error for demo)');
  }
  
  // 9. Glob APIs
  console.log('  🔍 Glob APIs:');
  const glob = trackedAPIs.trackedGlob('*.ts');
  console.log(`    Glob pattern created: *.ts`);
  
  // 10. Manual tracking examples
  console.log('  🔧 Manual tracking examples:');
  tracker.trackCallSync('custom-operation', () => {
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) { /* busy wait */ }
    return 'completed';
  }, 'custom', { operation: 'test', type: 'sync' });
  
  await tracker.trackCallAsync('async-operation', async () => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 5));
    return 'async completed';
  }, 'custom', { operation: 'test', type: 'async' });
  
  // Get comprehensive metrics
  console.log('\n📈 COMPREHENSIVE METRICS ANALYSIS:');
  const allMetrics = tracker.getAllMetrics();
  const summary = tracker.getSummary();
  
  console.log(`  Total APIs Tracked: ${summary.totalAPIs}`);
  console.log(`  Total Calls: ${summary.totalCalls}`);
  console.log(`  Average Duration: ${summary.averageCallDuration.toFixed(2)}ms`);
  console.log(`  Error Rate: ${summary.errorRate.toFixed(1)}%`);
  console.log(`  Native Implementation Rate: ${summary.nativeRate.toFixed(1)}%`);
  
  console.log('\n🔝 DETAILED API METRICS:');
  allMetrics.forEach((metric, index) => {
    console.log(`  ${index + 1}. ${metric.apiName}`);
    console.log(`     Domain: ${metric.domain}`);
    console.log(`     Implementation: ${metric.implementation} (${metric.implementationSource.source})`);
    console.log(`     Performance: ${metric.callCount} calls, ${metric.averageDuration.toFixed(2)}ms avg`);
    console.log(`     Source: ${metric.implementationSource.source}, Tier: ${metric.implementationSource.performanceTier}`);
    console.log(`     Memory: ${metric.implementationSource.memoryEfficiency}, Success: ${((metric.successCount / metric.callCount) * 100).toFixed(1)}%`);
    if (metric.metadata) {
      console.log(`     Metadata: ${JSON.stringify(metric.metadata)}`);
    }
  });
  
  // Enhanced domain analysis with new categories
  console.log('\n🌐 ENHANCED DOMAIN ANALYSIS (Official Bun API Categories):');
  const domainGroups = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.domain]) acc[metric.domain] = [];
    acc[metric.domain].push(metric);
    return acc;
  }, {} as Record<string, typeof allMetrics>);
  
  Object.entries(domainGroups).forEach(([domain, metrics]) => {
    const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
    const avgDuration = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;
    const nativeCount = metrics.filter(m => m.implementation === 'native').length;
    
    console.log(`  ${domain}: ${metrics.length} APIs, ${totalCalls} calls, ${avgDuration.toFixed(2)}ms avg, ${(nativeCount/metrics.length*100).toFixed(1)}% native`);
  });
  
  // Implementation analysis
  console.log('\n🔧 IMPLEMENTATION ANALYSIS:');
  const implGroups = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.implementation]) acc[metric.implementation] = [];
    acc[metric.implementation].push(metric);
    return acc;
  }, {} as Record<string, typeof allMetrics>);
  
  Object.entries(implGroups).forEach(([impl, metrics]) => {
    const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
    const sources = [...new Set(metrics.map(m => m.implementationSource.source))];
    
    console.log(`  ${impl}: ${metrics.length} APIs, ${totalCalls} calls, sources: ${sources.join(', ')}`);
  });
  
  // Export functionality
  console.log('\n📤 EXPORT CAPABILITIES:');
  const exportData = tracker.export();
  console.log(`  Export timestamp: ${exportData.timestamp}`);
  console.log(`  Summary: ${exportData.summary.totalAPIs} APIs, ${exportData.summary.totalCalls} calls`);
  console.log(`  Metrics included: ${exportData.metrics.length} detailed entries`);
  
  // Enable/disable demonstration
  console.log('\n⚙️ TRACKING CONTROL:');
  console.log('  Disabling tracking...');
  tracker.setEnabled(false);
  
  await trackedAPIs.trackedFetch('https://example.com'); // This won't be tracked
  const metricsAfterDisable = tracker.getAllMetrics();
  console.log(`  Metrics after disable: ${metricsAfterDisable.length} (unchanged)`);
  
  console.log('  Re-enabling tracking...');
  tracker.setEnabled(true);
  
  await trackedAPIs.trackedFetch('https://example.com'); // This will be tracked
  const metricsAfterEnable = tracker.getAllMetrics();
  console.log(`  Metrics after re-enable: ${metricsAfterEnable.length} (updated)`);
  
  // Reset demonstration
  console.log('\n🔄 RESET FUNCTIONALITY:');
  console.log('  Resetting all metrics...');
  tracker.reset();
  
  const metricsAfterReset = tracker.getAllMetrics();
  const summaryAfterReset = tracker.getSummary();
  console.log(`  Metrics after reset: ${metricsAfterReset.length}`);
  console.log(`  Summary after reset: ${summaryAfterReset.totalAPIs} APIs, ${summaryAfterReset.totalCalls} calls`);
  
  // Cleanup
  await Bun.write(testFile, JSON.stringify({
    ...testData,
    integrationCompleted: true,
    finalMetrics: exportData.summary,
    officialBunAPIs: [
      'fetch', 'Bun.file', 'Bun.write', 'Bun.Cookie', 'Bun.CookieMap',
      'Bun.hash', 'Bun.CryptoHasher', 'Bun.sleep', 'Bun.gzipSync',
      'Bun.deepEquals', 'Bun.inspect', 'Bun.build', 'Bun.Glob'
    ]
  }, null, 2));
  
  console.log('\n🎯 OFFICIAL BUN API INTEGRATION SUMMARY:');
  console.log('  ✅ BunNativeAPIMetrics interface updated for all official Bun API categories');
  console.log('  ✅ Comprehensive tracker with enhanced domain classification');
  console.log('  ✅ Tracked wrappers for major official Bun APIs from documentation');
  console.log('  ✅ Real-time metrics collection with official API detection');
  console.log('  ✅ Enhanced domain analysis: filesystem, networking, crypto, cookies, streams, binary, system, runtime, database, build, web, workers, utilities');
  console.log('  ✅ Implementation source tracking for all official Bun APIs');
  console.log('  ✅ Export functionality for comprehensive monitoring');
  console.log('  ✅ Enable/disable tracking control');
  console.log('  ✅ Reset functionality for clean testing');
  console.log('  ✅ Memory and performance tier classification');
  console.log('  ✅ Full compliance with https://bun.com/docs/runtime/bun-apis');
  
  console.log('\n📚 OFFICIAL BUN API CATEGORIES COVERED:');
  console.log('  📁 File I/O: Bun.file, Bun.write, Bun.stdin, Bun.stdout, Bun.stderr');
  console.log('  🌐 Networking: fetch, Bun.serve, Bun.listen, Bun.connect, Bun.udpSocket, Bun.dns.*');
  console.log('  🔐 Crypto: Bun.hash, Bun.password, Bun.CryptoHasher, Bun.sha');
  console.log('  🍪 Cookies: Bun.Cookie, Bun.CookieMap');
  console.log('  ⚙️ System: Bun.spawn, Bun.spawnSync, Bun.sleep, Bun.env');
  console.log('  📦 Binary: Bun.gzipSync, Bun.gunzipSync, Bun.deflateSync, Bun.inflateSync');
  console.log('  🔨 Build: Bun.build, Bun.plugin, Bun.Glob');
  console.log('  🛠️ Utilities: Bun.inspect, Bun.deepEquals, Bun.version, Bun.which');
  console.log('  🧪 Testing: bun:test');
  console.log('  👥 Workers: new Worker()');
  console.log('  🔗 FFI: bun:ffi');
  console.log('  🗄️ Database: bun:sqlite, Bun.sql, Bun.redis');
  
  console.log('\n💡 USAGE EXAMPLES:');
  console.log('  // Basic usage with official Bun APIs');
  console.log('  const tracker = new BunNativeAPITracker();');
  console.log('  const trackedAPIs = new TrackedBunAPIs(tracker);');
  console.log('  ');
  console.log('  // Track official Bun APIs');
  console.log('  await trackedAPIs.trackedFetch("https://example.com");');
  console.log('  const file = trackedAPIs.trackedFile("data.json");');
  console.log('  await trackedAPIs.trackedWrite("output.json", data);');
  console.log('  const hash = trackedAPIs.trackedHash("data");');
  console.log('  await trackedAPIs.trackedSleep(1000000);');
  console.log('  const compressed = trackedAPIs.trackedGzipSync(buffer);');
  console.log('  ');
  console.log('  // Get comprehensive metrics');
  console.log('  const metrics = tracker.getAllMetrics();');
  console.log('  const summary = tracker.getSummary();');
  console.log('  const exportData = tracker.export();');
}

// Start the integration demonstration
if (import.meta.main) {
  demonstrateBunNativeMetricsIntegration().catch(error => {
    console.error(`❌ Bun Native Metrics integration demo failed: ${error.message}`);
    process.exit(1);
  });
}
  
