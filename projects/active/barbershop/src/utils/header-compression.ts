/**
 * Header Compression for HTTP Requests/Responses
 *
 * Features:
 * - Header field compression (HPACK-like)
 * - Telemetry header optimization
 * - Conformance header management
 * - Bun-native compression integration
 */

import { compressData, decompressData } from './bun-enhanced';

// Static table of common headers (HPACK-inspired)
const STATIC_HEADER_TABLE: Record<string, number> = {
  ':authority': 1,
  ':method': 2,
  ':path': 3,
  ':scheme': 4,
  ':status': 5,
  accept: 6,
  'accept-encoding': 7,
  'accept-language': 8,
  'content-length': 9,
  'content-type': 10,
  cookie: 11,
  date: 12,
  etag: 13,
  host: 14,
  'if-modified-since': 15,
  'if-none-match': 16,
  'last-modified': 17,
  location: 18,
  referer: 19,
  server: 20,
  'set-cookie': 21,
  'user-agent': 22,
  vary: 23,
  via: 24,
  // FactoryWager specific
  'x-fw-session': 25,
  'x-fw-telemetry': 26,
  'x-fw-conformance': 27,
  'x-fw-csrf-token': 28,
  'x-fw-compression': 29,
};

// Inverse mapping for decompression
const STATIC_HEADER_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(STATIC_HEADER_TABLE).map(([k, v]) => [v, k])
);

export interface CompressedHeaders {
  headers: Record<string, string>;
  compressed: boolean;
  algorithm: 'zstd' | 'gzip' | 'dictionary' | 'none';
  originalSize: number;
  compressedSize: number;
  metadata?: {
    staticTableHits: number;
    dynamicTableSize: number;
  };
}

export interface TelemetryHeaders {
  'x-fw-session-id': string;
  'x-fw-timestamp': string;
  'x-fw-events'?: string;
  'x-fw-metrics'?: string;
  'x-fw-trace-id'?: string;
  [key: string]: string | undefined;
}

export interface ConformanceHeaders {
  'x-fw-conformance-version': string;
  'x-fw-security-level': string;
  'x-fw-integrity-hash'?: string;
  'x-fw-audit-log'?: string;
  [key: string]: string | undefined;
}

/**
 * Header Compressor class
 */
export class HeaderCompressor {
  private dynamicTable: Map<string, string>;
  private maxDynamicTableSize: number;

  constructor(maxDynamicTableSize = 4096) {
    this.dynamicTable = new Map();
    this.maxDynamicTableSize = maxDynamicTableSize;
  }

  /**
   * Compress headers using multiple strategies
   */
  compress(headers: Record<string, string>): CompressedHeaders {
    const originalSize = JSON.stringify(headers).length;

    // Strategy 1: Dictionary compression for common headers
    const dictionaryCompressed = this.compressWithDictionary(headers);

    // Strategy 2: Full compression for large payloads
    if (originalSize > 1024) {
      const serialized = JSON.stringify(dictionaryCompressed);
      const compressed = compressData(serialized, 'zstd');
      const base64 = Buffer.from(compressed).toString('base64');

      return {
        headers: { 'x-fw-compressed': base64 },
        compressed: true,
        algorithm: 'zstd',
        originalSize,
        compressedSize: base64.length,
        metadata: {
          staticTableHits: this.countStaticTableHits(headers),
          dynamicTableSize: this.dynamicTable.size,
        },
      };
    }

    // Strategy 3: Just dictionary compression for smaller payloads
    return {
      headers: dictionaryCompressed,
      compressed: true,
      algorithm: 'dictionary',
      originalSize,
      compressedSize: JSON.stringify(dictionaryCompressed).length,
      metadata: {
        staticTableHits: this.countStaticTableHits(headers),
        dynamicTableSize: this.dynamicTable.size,
      },
    };
  }

  /**
   * Decompress headers
   */
  decompress(compressed: CompressedHeaders): Record<string, string> {
    if (!compressed.compressed) {
      return compressed.headers;
    }

    switch (compressed.algorithm) {
      case 'zstd':
      case 'gzip': {
        const compressedData = compressed.headers['x-fw-compressed'];
        if (!compressedData) return compressed.headers;

        const buffer = Buffer.from(compressedData, 'base64');
        const decompressed = decompressData(buffer, compressed.algorithm);
        const json = new TextDecoder().decode(decompressed);
        const parsed = JSON.parse(json);
        return this.decompressWithDictionary(parsed);
      }

      case 'dictionary':
        return this.decompressWithDictionary(compressed.headers);

      default:
        return compressed.headers;
    }
  }

  /**
   * Compress using static/dynamic dictionary
   */
  private compressWithDictionary(headers: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // Check static table
      const staticIndex = STATIC_HEADER_TABLE[key.toLowerCase()];
      if (staticIndex) {
        result[`:${staticIndex}`] = value;
        continue;
      }

      // Check dynamic table
      const dynamicKey = this.findInDynamicTable(key, value);
      if (dynamicKey) {
        result[dynamicKey] = '';
        continue;
      }

      // Add to dynamic table
      this.addToDynamicTable(key, value);
      result[key] = value;
    }

    return result;
  }

  /**
   * Decompress using static/dynamic dictionary
   */
  private decompressWithDictionary(headers: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // Check if it's a static table reference
      if (key.startsWith(':')) {
        const index = parseInt(key.slice(1), 10);
        const originalKey = STATIC_HEADER_REVERSE[index];
        if (originalKey) {
          result[originalKey] = value;
          continue;
        }
      }

      // Check dynamic table
      const dynamicValue = this.dynamicTable.get(key);
      if (dynamicValue && value === '') {
        result[key] = dynamicValue;
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Find header in dynamic table
   */
  private findInDynamicTable(key: string, value: string): string | null {
    const stored = this.dynamicTable.get(key);
    if (stored === value) {
      return key;
    }
    return null;
  }

  /**
   * Add entry to dynamic table
   */
  private addToDynamicTable(key: string, value: string): void {
    // Evict oldest entries if table is full
    while (this.dynamicTable.size >= this.maxDynamicTableSize / 100) {
      const firstKey = this.dynamicTable.keys().next().value;
      this.dynamicTable.delete(firstKey);
    }

    this.dynamicTable.set(key, value);
  }

  /**
   * Count static table hits
   */
  private countStaticTableHits(headers: Record<string, string>): number {
    let hits = 0;
    for (const key of Object.keys(headers)) {
      if (STATIC_HEADER_TABLE[key.toLowerCase()]) {
        hits++;
      }
    }
    return hits;
  }

  /**
   * Create telemetry headers
   */
  createTelemetryHeaders(data: {
    sessionId: string;
    events?: unknown[];
    metrics?: Record<string, number>;
    traceId?: string;
  }): TelemetryHeaders {
    const headers: TelemetryHeaders = {
      'x-fw-session-id': data.sessionId,
      'x-fw-timestamp': Date.now().toString(),
    };

    if (data.events && data.events.length > 0) {
      const serialized = JSON.stringify(data.events);
      if (serialized.length > 100) {
        // Compress large event payloads
        const compressed = compressData(serialized, 'zstd');
        headers['x-fw-events'] = Buffer.from(compressed).toString('base64');
      } else {
        headers['x-fw-events'] = serialized;
      }
    }

    if (data.metrics && Object.keys(data.metrics).length > 0) {
      headers['x-fw-metrics'] = JSON.stringify(data.metrics);
    }

    if (data.traceId) {
      headers['x-fw-trace-id'] = data.traceId;
    }

    return headers;
  }

  /**
   * Create conformance headers
   */
  createConformanceHeaders(data: {
    version: string;
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
    integrityHash?: string;
    auditLog?: string;
  }): ConformanceHeaders {
    const headers: ConformanceHeaders = {
      'x-fw-conformance-version': data.version,
      'x-fw-security-level': data.securityLevel,
    };

    if (data.integrityHash) {
      headers['x-fw-integrity-hash'] = data.integrityHash;
    }

    if (data.auditLog) {
      // Compress large audit logs
      if (data.auditLog.length > 500) {
        const compressed = compressData(data.auditLog, 'zstd');
        headers['x-fw-audit-log'] = Buffer.from(compressed).toString('base64');
      } else {
        headers['x-fw-audit-log'] = data.auditLog;
      }
    }

    return headers;
  }

  /**
   * Parse telemetry headers
   */
  parseTelemetryHeaders(headers: Record<string, string>): Partial<TelemetryHeaders> & {
    parsedEvents?: unknown[];
    parsedMetrics?: Record<string, number>;
  } {
    const result: Record<string, unknown> = {};

    const sessionId = headers['x-fw-session-id'];
    if (sessionId) result['x-fw-session-id'] = sessionId;

    const timestamp = headers['x-fw-timestamp'];
    if (timestamp) result['x-fw-timestamp'] = timestamp;

    const traceId = headers['x-fw-trace-id'];
    if (traceId) result['x-fw-trace-id'] = traceId;

    const events = headers['x-fw-events'];
    if (events) {
      try {
        // Try to parse as JSON first
        result['parsedEvents'] = JSON.parse(events);
      } catch (err) {
        // Try to decompress
        try {
          const buffer = Buffer.from(events, 'base64');
          const decompressed = decompressData(buffer, 'zstd');
          result['parsedEvents'] = JSON.parse(new TextDecoder().decode(decompressed));
        } catch (err) {
          result['x-fw-events'] = events;
        }
      }
    }

    const metrics = headers['x-fw-metrics'];
    if (metrics) {
      try {
        result['parsedMetrics'] = JSON.parse(metrics);
      } catch (err) {
        result['x-fw-metrics'] = metrics;
      }
    }

    return result as ReturnType<typeof this.parseTelemetryHeaders>;
  }

  /**
   * Clear dynamic table
   */
  clearDynamicTable(): void {
    this.dynamicTable.clear();
  }

  /**
   * Get compression stats
   */
  getStats(): {
    staticTableSize: number;
    dynamicTableSize: number;
    maxDynamicTableSize: number;
  } {
    return {
      staticTableSize: Object.keys(STATIC_HEADER_TABLE).length,
      dynamicTableSize: this.dynamicTable.size,
      maxDynamicTableSize: this.maxDynamicTableSize,
    };
  }
}

/**
 * Compress request headers for Bun.fetch()
 */
export function compressRequestHeaders(headers: Record<string, string>): Record<string, string> {
  const compressor = new HeaderCompressor();
  const compressed = compressor.compress(headers);

  if (compressed.compressed && compressed.algorithm !== 'none') {
    return {
      ...compressed.headers,
      'x-fw-header-compression': compressed.algorithm,
    };
  }

  return headers;
}

/**
 * Decompress response headers
 */
export function decompressResponseHeaders(headers: Record<string, string>): Record<string, string> {
  const compression = headers['x-fw-header-compression'];
  if (!compression) return headers;

  const compressor = new HeaderCompressor();
  return compressor.decompress({
    headers,
    compressed: true,
    algorithm: compression as 'zstd' | 'gzip' | 'dictionary',
    originalSize: 0,
    compressedSize: 0,
  });
}

// Export singleton
export const headerCompressor = new HeaderCompressor();
