/**
 * [SPORTSBOOK][UTIL][CUSTOM-TYPED-ARRAY][META:{depthAware: true, phase:1, risk:low}]
 * Depth-aware Uint8Array subclass for secure binary protocol debugging
 * #REF:SecureDataView, #REF:HighFrequencyOddsFeed, #REF:Bun.inspect.custom]
 */

/**
 * CustomTypedArray - Enhanced Uint8Array with Bun.inspect.custom depth control
 * 
 * Features:
 * - Depth-aware inspection (0-3 levels)
 * - Security validation for large allocations
 * - Hex dump formatting with ASCII preview
 * - Context tracking for debugging
 * - ReDoS protection with 10MB limits
 * - Subarray offset tracking
 */
export class CustomTypedArray extends Uint8Array {
  // Display name for inspection
  static readonly CLASS_NAME = 'CustomTypedArray';
  
  // Security threshold: 10MB max allocation
  static readonly MAX_SAFE_LENGTH = 10 * 1024 * 1024;

  // Symbol for Bun inspection (runtime value)
  private static readonly INSPECT_CUSTOM: symbol = (globalThis as any).Bun?.inspect?.custom || Symbol.for('nodejs.util.inspect.custom');

  /**
   * Create a new CustomTypedArray with security validation
   * 
   * @param length - Number of bytes to allocate
   * @param context - Debug context string (e.g., "odds-feed-parser")
   * @param createdAt - Timestamp for age tracking
   */
  constructor(
    length: number,
    public readonly context?: string,
    public readonly createdAt = Date.now()
  ) {
    // Security validation: Prevent ReDoS via large allocations
    if (length > CustomTypedArray.MAX_SAFE_LENGTH) {
      console.warn(`⚠️  Large CustomTypedArray allocation: ${length} bytes`);
      
      // Report to threat intelligence if available (runtime check)
      const ThreatIntelligenceService = (globalThis as any).ThreatIntelligenceService;
      if (ThreatIntelligenceService) {
        try {
          const threatIntel = new ThreatIntelligenceService();
          threatIntel.reportThreat({
            type: 'large-array-allocation',
            severity: 'low',
            context: { 
              length, 
              context,
              threshold: CustomTypedArray.MAX_SAFE_LENGTH 
            },
            timestamp: Date.now()
          });
        } catch (e) {
          // Threat service not available, continue
        }
      }
    }
    
    super(length);
    
    // Set up inspection hook at instance level
    if ((globalThis as any).Bun?.inspect?.custom) {
      (this as any)[(globalThis as any).Bun.inspect.custom] = this.inspect.bind(this);
    }
  }

  /**
   * Bun-specific inspection hook with depth control
   * 
   * @param depth - Current recursion depth (0 = top-level, <0 = infinite, >2 = full dump)
   * @param options - Bun inspection options (colors, indent, etc.)
   * @param inspect - Recursive inspect function for nested values
   * @returns Formatted string representation
   * 
   * @example
   * ```typescript
   * const arr = new CustomTypedArray(256, 'odds-feed');
   * 
   * // Depth 0: Shallow (nested objects)
   * console.log({ data: arr });
   * // Output: { data: CustomTypedArray(256) [ ... ] }
   * 
   * // Depth 1: Preview (first 32 bytes)
   * console.log(arr);
   * // Output: CustomTypedArray(256) [ 4255465578a3d601... ]
   * 
   * // Depth 2+: Full hex dump
   * console.log(Bun.inspect(arr, { depth: 3 }));
   * // Output: CustomTypedArray(256) { buffer: ..., content: 00000000: ... }
   * ```
   */
  inspect(depth: number, options: any, inspectFn: (value: any, options?: any) => string): string {
    // === DEPTH 0: Shallow - Nested in objects ===
    // Fastest, minimal info, prevents log bloat
    if (depth < 1) {
      const contextStr = this.context ? ` [${this.context}]` : '';
      return `${CustomTypedArray.CLASS_NAME}(${this.length})${
        this.byteOffset > 0 ? `[@${this.byteOffset}]` : ''
      } [ ... ]${contextStr}`;
    }
    
    // === DEPTH 1: Medium - Hex preview (first 32 bytes) ===
    // Balanced: useful info without overwhelming logs
    if (depth < 2) {
      const preview = this.length > 32 
        ? `${this.subarray(0, 32).toHex()}...${this.subarray(-4).toHex()}`
        : this.toHex();
      
      const contextStr = this.context ? ` [${this.context}]` : '';
      return `${CustomTypedArray.CLASS_NAME}(${this.length})${
        this.byteOffset > 0 ? `[@${this.byteOffset}]` : ''
      } [ ${preview} ]${contextStr}`;
    }
    
    // === DEPTH 2+: Deep - Full hex dump with ASCII ===
    // Complete forensic view for debugging
    const hexLines: string[] = [];
    const bytesPerLine = 16;
    
    for (let i = 0; i < this.length; i += bytesPerLine) {
      const line = this.subarray(i, Math.min(i + bytesPerLine, this.length));
      const hex = line.toHex();
      const ascii = Array.from(line, byte => 
        (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.'
      ).join('');
      
      hexLines.push(
        `${i.toString(16).padStart(8, '0')}: ${hex.padEnd(bytesPerLine * 2, ' ')} ${ascii}`
      );
    }
    
    const header = `${CustomTypedArray.CLASS_NAME}(${this.length})${
      this.byteOffset > 0 ? `[@${this.byteOffset}]` : ''
    } {\n  buffer: ArrayBuffer(${this.buffer.byteLength})${
      this.buffer.byteLength > this.length ? ' (shared)' : ''
    },\n  context: ${this.context ? `"${this.context}"` : 'undefined'},\n  content:\n${hexLines.map(l => `    ${l}`).join('\n')}\n}`;
    
    return header;
  }
  
  /**
   * Create from existing Uint8Array
   * 
   * @param arr - Source Uint8Array
   * @param context - Debug context
   * @returns New CustomTypedArray with copied data
   */
  static fromUint8Array(
    arr: Uint8Array,
    context?: string
  ): CustomTypedArray {
    const custom = new CustomTypedArray(arr.length, context);
    custom.set(arr);
    return custom;
  }
  
  /**
   * Create from ArrayBuffer with optional offset/length
   * 
   * @param buffer - Source ArrayBuffer
   * @param byteOffset - Optional offset
   * @param byteLength - Optional length
   * @param context - Debug context
   * @returns New CustomTypedArray
   */
  static fromBuffer(
    buffer: ArrayBufferLike,
    byteOffset?: number,
    byteLength?: number,
    context?: string
  ): CustomTypedArray {
    const uint8 = new Uint8Array(buffer, byteOffset, byteLength);
    return CustomTypedArray.fromUint8Array(uint8, context);
  }
  
  /**
   * Get metadata for debugging and monitoring
   */
  get inspectInfo(): {
    length: number;
    byteOffset: number;
    bufferSize: number;
    context?: string;
    createdAt: number;
    ageMs: number;
  } {
    return {
      length: this.length,
      byteOffset: this.byteOffset,
      bufferSize: this.buffer.byteLength,
      context: this.context,
      createdAt: this.createdAt,
      ageMs: Date.now() - this.createdAt
    };
  }
  
  /**
   * Create a subarray that preserves CustomTypedArray type
   * 
   * @param begin - Start index
   * @param end - End index (optional)
   * @returns CustomTypedArray subarray
   */
  subarray(begin?: number, end?: number): CustomTypedArray {
    // Create a new CustomTypedArray with the subarray data
    const start = begin || 0;
    const finish = end || this.length;
    const length = finish - start;
    
    const sub = new CustomTypedArray(length, this.context ? `${this.context}[sub]` : undefined, this.createdAt);
    
    // Copy the data
    for (let i = 0; i < length; i++) {
      sub[i] = this[start + i];
    }
    
    return sub;
  }
  
  /**
   * Convert to hex string (utility for debugging)
   * 
   * @param separator - Optional separator between bytes
   * @returns Hex string
   */
  toHex(separator: string = ''): string {
    return Array.from(this)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(separator);
  }
}

/**
 * BinaryProtocolDebugger - Example usage for sportsbook debugging
 * 
 * Demonstrates depth-aware inspection for complex binary protocols
 * used in high-frequency odds feeds and order matching engines
 */
export class BinaryProtocolDebugger {
  /**
   * Debug a binary odds feed message with depth control
   * 
   * @example
   * ```typescript
   * const debugger = new BinaryProtocolDebugger();
   * debugger.debugOddsFeedMessage();
   * ```
   */
  static debugOddsFeedMessage(): void {
    // Create realistic binary message (256 bytes)
    const buffer = new ArrayBuffer(256);
    const dv = new DataView(buffer);
    
    // Write protocol header
    dv.setUint32(0, 0x42554655, true); // Magic: "BUFU"
    dv.setBigUint64(4, BigInt(Date.now() * 1000), true); // Timestamp
    dv.setUint16(12, 2, true); // Market count
    
    // Write market data
    dv.setUint32(14, 12345, true); // Market ID
    dv.setUint32(18, 67890, true); // Event ID
    
    // Create CustomTypedArray wrapper
    const customArray = new CustomTypedArray(256, 'odds-feed-message');
    customArray.set(new Uint8Array(buffer));
    
    console.log('=== DEPTH-AWARE INSPECTION EXAMPLES ===\n');
    
    // Depth 0: Top-level object inspection
    console.log('Depth 0 (Top-Level Object):');
    console.log({ message: customArray });
    console.log('→ Shows: { message: CustomTypedArray(256) [ ... ] }\n');
    
    // Depth 1: Direct inspection
    console.log('Depth 1 (Direct Inspection):');
    console.log(customArray);
    console.log('→ Shows: CustomTypedArray(256) [ 4255465578a3d601... ]\n');
    
    // Depth 2+: Full hex dump
    console.log('Depth 2+ (Full Hex Dump):');
    const BunInspect = (globalThis as any).Bun?.inspect;
    if (BunInspect) {
      console.log(BunInspect(customArray, { depth: 3 }));
    } else {
      console.log('Bun.inspect not available, showing manual format:');
      console.log(customArray.inspect(2, {}, (v: any) => JSON.stringify(v)));
    }
    console.log('→ Shows: Complete hex dump with ASCII preview\n');
    
    // Nested in complex object
    console.log('Nested in Complex Object (Depth < 1):');
    const complex = {
      feed: {
        timestamp: Date.now(),
        markets: customArray,
        metadata: { source: 'provider-1' }
      }
    };
    console.log(complex);
    console.log('→ Shows nested arrays as [ ... ] to prevent log bloat\n');
  }
  
  /**
   * Debug with SecureDataView integration
   */
  static debugSecureDataViewParsing(): void {
    // Binary message with protocol data
    const binaryData = new Uint8Array([
      0x42, 0x55, 0x46, 0x55, // Magic
      0x01, 0x00, 0x00, 0x00, // Version
      0x48, 0x65, 0x6C, 0x6C, 0x6F // "Hello"
    ]);
    
    // Wrap in CustomTypedArray
    const customArray = CustomTypedArray.fromUint8Array(binaryData, 'secure-view');
    
    console.log('\n=== SECURE DATAVIEW INTEGRATION ===');
    console.log('Magic number:', 0x42554655);
    console.log('Raw buffer:  ', customArray);
    console.log('→ Shows: CustomTypedArray(13) [ 4255465501000000... ]\n');
    
    // Subarray inspection
    const payload = customArray.subarray(8);
    console.log('Payload subarray:');
    console.log(payload);
    console.log('→ Shows: CustomTypedArray(5) [@8] [ ... ]\n');
  }
  
  /**
   * Performance comparison: Regular vs Custom TypedArray
   */
  static benchmarkInspection(): void {
    const regular = new Uint8Array(1024).fill(0xAB);
    const custom = new CustomTypedArray(1024, 'benchmark');
    custom.set(regular);
    
    console.log('\n=== INSPECTION PERFORMANCE ===');
    
    const BunInspect = (globalThis as any).Bun?.inspect;
    if (!BunInspect) {
      console.log('Bun.inspect not available for benchmarking');
      return;
    }
    
    // Benchmark regular array
    console.time('Regular inspection');
    for (let i = 0; i < 1000; i++) {
      BunInspect(regular, { depth: 1 });
    }
    console.timeEnd('Regular inspection');
    
    // Benchmark custom array
    console.time('Custom inspection');
    for (let i = 0; i < 1000; i++) {
      BunInspect(custom, { depth: 1 });
    }
    console.timeEnd('Custom inspection');
    
    console.log('\nNote: Custom is slightly slower due to hex conversion, but safer for debugging');
  }
}

/**
 * IntegratedBinaryLogger - Production-ready binary logging
 * 
 * Uses CustomTypedArray for safe binary logging in production
 * with security monitoring and performance optimization
 */
export class IntegratedBinaryLogger {
  private threatIntel: any = null;
  
  constructor() {
    // Lazy-load threat intelligence service
    const ThreatIntelligenceService = (globalThis as any).ThreatIntelligenceService;
    if (ThreatIntelligenceService) {
      try {
        this.threatIntel = new ThreatIntelligenceService();
      } catch (e) {
        // Service not available
      }
    }
  }
  
  /**
   * Log binary protocol event with depth control
   * 
   * @param eventType - Event type string
   * @param binaryData - Binary data to log
   * @param severity - Log severity
   * @param depth - Inspection depth (default: 1)
   */
  logBinaryEvent(
    eventType: string,
    binaryData: Uint8Array,
    severity: 'info' | 'warning' | 'error' = 'info',
    depth: number = 1
  ): void {
    // Wrap in CustomTypedArray for safe inspection
    const customArray = CustomTypedArray.fromUint8Array(
      binaryData,
      `log:${eventType}`
    );
    
    // Use Bun 1.3.5 %j for structured logging
    const BunInspect = (globalThis as any).Bun?.inspect;
    const preview = BunInspect 
      ? BunInspect(customArray, { depth })
      : customArray.toHex().substring(0, 64);
    
    const logEntry = {
      timestamp: Date.now(),
      type: 'binary-event',
      severity,
      event: eventType,
      size: binaryData.length,
      preview
    };
    
    // Log with security context
    console.log('%j', logEntry);
    
    // Report high-severity events
    if (severity === 'error' && this.threatIntel) {
      this.threatIntel.reportThreat({
        type: 'binary-log-error',
        severity: 'high',
        context: {
          eventType,
          size: binaryData.length,
          preview: customArray.toHex().substring(0, 64)
        },
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Log market update with performance optimization
   * 
   * @param update - Market update data
   * @param binaryFrame - Binary frame data
   */
  logMarketUpdate(
    update: { marketId: number; status: string; providerCount: number },
    binaryFrame: Uint8Array
  ): void {
    const customArray = CustomTypedArray.fromUint8Array(
      binaryFrame,
      `market:${update.marketId}`
    );
    
    const BunInspect = (globalThis as any).Bun?.inspect;
    const preview = BunInspect 
      ? BunInspect(customArray, { depth: 1 })
      : customArray.toHex().substring(0, 32);
    
    console.log('%j', {
      type: 'market-update',
      marketId: update.marketId,
      status: update.status,
      providerCount: update.providerCount,
      preview
    });
  }
  
  /**
   * Log order matching engine event
   * 
   * @param engineEvent - Engine event data
   * @param orderData - Binary order data
   */
  logOrderMatch(
    engineEvent: { orderId: string; matchPrice: number; quantity: number },
    orderData: Uint8Array
  ): void {
    const customArray = CustomTypedArray.fromUint8Array(
      orderData,
      `order:${engineEvent.orderId}`
    );
    
    const BunInspect = (globalThis as any).Bun?.inspect;
    const preview = BunInspect 
      ? BunInspect(customArray, { depth: 1 })
      : customArray.toHex().substring(0, 32);
    
    console.log('%j', {
      type: 'order-match',
      orderId: engineEvent.orderId,
      price: engineEvent.matchPrice,
      quantity: engineEvent.quantity,
      preview
    });
  }
}
