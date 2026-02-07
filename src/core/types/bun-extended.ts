// src/core/types/bun-extended.ts
import type { Bun, Server } from 'bun';

declare global {
  namespace Bun {
    interface Server {
      // Now includes protocol property
      protocol: 'http' | 'https' | 'http2' | 'http3';
      
      // Enhanced performance properties
      performance: {
        requestsPerSecond: number;
        avgResponseTime: number;
        activeConnections: number;
        bytesTransferred: {
          total: number;
          compressed: number;
          uncompressed: number;
          compressionRatio: number;
        };
        cacheStats: {
          hits: number;
          misses: number;
          ratio: number;
        };
      };
      
      // Extended methods
      getRequestMetrics(): RequestMetrics[];
      getCompressionStats(): CompressionStats;
      getProtocolMetrics(): ProtocolMetrics;
    }
    
    interface ServeOptions {
      // Enhanced options
      protocol?: 'http' | 'https' | 'http2' | 'http3' | 'auto';
      compression?: {
        enabled?: boolean;
        algorithms?: ('gzip' | 'brotli' | 'deflate' | 'zstd')[];
        minSize?: number;
        level?: number;
      };
      caching?: {
        enabled?: boolean;
        maxAge?: number;
        sMaxAge?: number;
        staleWhileRevalidate?: number;
        public?: boolean;
        immutable?: boolean;
      };
      monitoring?: {
        enabled?: boolean;
        interval?: number;
        metricsEndpoint?: string;
        logSlowRequests?: boolean;
        slowRequestThreshold?: number;
      };
    }
  }
}

export interface RequestMetrics {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  bytesSent: number;
  bytesReceived: number;
  protocol: string;
  userAgent?: string;
  ip: string;
  compression?: {
    algorithm?: string;
    originalSize?: number;
    compressedSize?: number;
    ratio?: number;
  };
}

export interface CompressionStats {
  enabled: boolean;
  algorithms: string[];
  savings: {
    total: number;
    byAlgorithm: Record<string, number>;
    ratio: number;
  };
  eligibleRequests: number;
  skippedRequests: number;
  averageCompressionTime: number;
}

export interface ProtocolMetrics {
  http: number;
  https: number;
  http2: number;
  http3: number;
  alpnNegotiations: number;
  tlsVersions: {
    'TLSv1.2': number;
    'TLSv1.3': number;
  };
  upgradeRequests: number;
  connectionReuse: number;
}

export interface ServerPerformanceSnapshot {
  timestamp: string;
  protocol: string;
  requestsPerSecond: number;
  avgResponseTime: number;
  activeConnections: number;
  bytesTransferred: {
    total: number;
    compressed: number;
    uncompressed: number;
    compressionRatio: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    ratio: number;
  };
  compressionStats: CompressionStats;
  protocolMetrics: ProtocolMetrics;
}
