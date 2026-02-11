// src/utils/har-enhancer.ts
/// <reference types="bun" />
import type { HARProtocolDetection, HAREntry } from '../../lib/har-analyzer/bun-serve-types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal Server interface for HAR enhancement */
interface BunServer {
  protocol?: 'http' | 'https' | null;
  url?: URL;
  performance?: {
    requestsPerSecond: number;
    avgResponseTime: number;
    activeConnections: number;
    cacheStats?: Record<string, unknown>;
    bytesTransferred?: { compressionRatio?: number };
  };
  getCompressionStats?(): Record<string, unknown>;
}

interface ServerPerformance {
  requestsPerSecond: number;
  avgResponseTime: number;
  activeConnections: number;
  compressionStats?: Record<string, unknown>;
  cacheStats?: Record<string, unknown>;
  bytesTransferred?: { compressionRatio?: number };
}

interface HarHeader {
  name: string;
  value: string;
}

interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarHeader[] | Record<string, string>;
  cookies: HarCookie[];
  content: {
    size: number;
    mimeType: string;
    compression?: number;
    text?: string;
    encoding?: string;
  };
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  _transferSize?: number;
}

interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarHeader[] | Record<string, string>;
  cookies: HarCookie[];
  queryString: { name: string; value: string }[];
  postData?: {
    mimeType: string;
    text?: string;
    params?: { name: string; value: string }[];
  };
  headersSize: number;
  bodySize: number;
}

interface HarTimings {
  blocked: number;
  dns: number;
  ssl: number;
  connect: number;
  send: number;
  wait: number;
  receive: number;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: {
    beforeRequest?: { lastAccess: string; eTag: string; hitCount: number };
    afterRequest?: { lastAccess: string; eTag: string; hitCount: number };
  };
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  _resourceType?: string;
  _protocol?: string;
  _serverTiming?: Record<string, unknown>;
  [key: string]: unknown;
}

interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: {
    onContentLoad: number;
    onLoad: number;
  };
}

interface HarCreator {
  name: string;
  version: string;
  comment?: string;
}

interface HarLog {
  version: string;
  creator: HarCreator;
  browser?: HarCreator;
  pages?: HarPage[];
  entries: HarEntry[];
  comment?: string;
  [key: string]: unknown;
}

export interface Har {
  log: HarLog;
}

interface HarStats {
  totalRequests: number;
  totalSize: number;
  totalTransferSize: number;
  avgResponseTime: number;
  avgTtfb: number;
  compressionRatio: number;
  secureRequests: number;
  http2Requests: number;
  http3Requests: number;
  cachedRequests: number;
  errorRequests: number;
  domains: Set<string>;
  mimeTypes: Map<string, number>;
  statusCodes: Map<number, number>;
}

interface SecurityInfo {
  secure: boolean;
  protocol: string;
  tlsVersion?: string;
  cipherSuite?: string;
  certificate?: {
    issuer?: string;
    subject?: string;
    validFrom?: string;
    validTo?: string;
  };
  hsts: boolean;
  csp: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely gets header value from either array or object format
 */
function getHeaderValue(
  headers: HarHeader[] | Record<string, string>,
  name: string
): string | undefined {
  const lowerName = name.toLowerCase();
  if (Array.isArray(headers)) {
    const header = headers.find(h => h.name.toLowerCase() === lowerName);
    return header?.value;
  }
  return headers[name] || headers[lowerName];
}

/**
 * Gets the compression value from entry response headers
 */
export function getCompressionFromHeaders(headers: HarHeader[] | Record<string, string>): string {
  return getHeaderValue(headers, 'content-encoding') || 'identity';
}

/**
 * Detects cache status from response headers
 */
function detectCacheStatus(entry: HarEntry): 'hit' | 'miss' | 'conditional' | 'none' {
  const cfCache = getHeaderValue(entry.response.headers, 'cf-cache-status');
  if (cfCache) return cfCache.toLowerCase() === 'hit' ? 'hit' : 'miss';

  const xCache = getHeaderValue(entry.response.headers, 'x-cache');
  if (xCache) {
    if (xCache.toLowerCase().includes('hit')) return 'hit';
    if (xCache.toLowerCase().includes('miss')) return 'miss';
  }

  const age = getHeaderValue(entry.response.headers, 'age');
  if (age && Number(age) > 0) return 'hit';

  const etag = getHeaderValue(entry.response.headers, 'etag');
  const lastModified = getHeaderValue(entry.response.headers, 'last-modified');
  if (etag || lastModified) return 'conditional';

  if (entry.response.status === 304) return 'conditional';

  return 'none';
}

/**
 * Calculates Time To First Byte from timing breakdown
 */
function calculateTtfb(timings: HarTimings): number {
  return Math.max(0, timings.blocked) +
    Math.max(0, timings.dns) +
    Math.max(0, timings.connect) +
    Math.max(0, timings.ssl) +
    Math.max(0, timings.send) +
    Math.max(0, timings.wait);
}

/**
 * Determines resource type from MIME type or URL extension
 */
export function detectResourceType(entry: HarEntry): string {
  if (entry._resourceType) return entry._resourceType;
  
  const mime = entry.response.content.mimeType.toLowerCase();
  const url = entry.request.url.toLowerCase();
  
  // Check for JSON/XML first (before javascript check since "json" contains "script")
  if (mime.includes('json') || mime.includes('xml')) return 'xhr';
  
  if (mime.includes('html') || url.endsWith('.html') || url.endsWith('.htm')) return 'document';
  if (mime.includes('javascript') || url.endsWith('.js')) return 'script';
  if (mime.includes('css') || url.endsWith('.css')) return 'stylesheet';
  if (mime.includes('image') || mime.includes('svg') || /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(url)) return 'image';
  if (mime.includes('font') || /\.(woff2?|ttf|otf|eot)$/.test(url)) return 'font';
  if (mime.includes('video') || mime.includes('audio')) return 'media';
  if (mime.includes('wasm')) return 'wasm';
  
  return 'other';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENHANCEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Updates HAR parser to include protocol information
 * Follows HAR spec by using _ prefix for custom fields
 */
export function enhanceHarWithProtocol(har: Har, server: BunServer): Har {
  if (!har?.log || !server) return har;

  const protocol = server.protocol ?? 'unknown';
  const perf = server.performance as ServerPerformance | undefined;

  return {
    ...har,
    log: {
      ...har.log,
      _protocol: protocol,
      _serverPerformance: perf
        ? {
            requestsPerSecond: perf.requestsPerSecond,
            avgResponseTime: perf.avgResponseTime,
            activeConnections: perf.activeConnections,
            compressionStats: server.getCompressionStats?.() ?? null,
            cacheStats: perf.cacheStats ?? null,
          }
        : null,
      entries: har.log.entries.map((entry) => ({
        ...entry,
        _protocol: protocol,
        _resourceType: detectResourceType(entry),
        _serverTiming: {
          requestStart: entry.startedDateTime,
          protocol,
          compression: getCompressionFromHeaders(entry.response.headers),
          ttfb: calculateTtfb(entry.timings),
          cacheStatus: detectCacheStatus(entry),
        },
      })),
    },
  };
}

/**
 * Adds security analysis metadata to HAR entries
 */
export function enhanceHarWithSecurity(har: Har): Har {
  if (!har?.log) return har;

  return {
    ...har,
    log: {
      ...har.log,
      entries: har.log.entries.map((entry) => {
        const headers = entry.response.headers;
        const isSecure = entry.request.url.startsWith('https:');
        
        const securityInfo: SecurityInfo = {
          secure: isSecure,
          protocol: isSecure ? 'HTTPS' : 'HTTP',
          tlsVersion: getHeaderValue(headers, 'tls-version'),
          cipherSuite: getHeaderValue(headers, 'cipher-suite'),
          hsts: !!getHeaderValue(headers, 'strict-transport-security'),
          csp: !!getHeaderValue(headers, 'content-security-policy'),
          xFrameOptions: !!getHeaderValue(headers, 'x-frame-options'),
          xContentTypeOptions: !!getHeaderValue(headers, 'x-content-type-options'),
        };

        return {
          ...entry,
          _security: securityInfo,
        };
      }),
    },
  };
}

/**
 * Adds performance metrics and grades to HAR entries
 */
export function enhanceHarWithPerformanceMetrics(har: Har): Har {
  if (!har?.log) return har;

  // Calculate global stats for comparison
  const ttbfs = har.log.entries.map(e => calculateTtfb(e.timings));
  const avgTtfb = ttbfs.reduce((a, b) => a + b, 0) / ttbfs.length;

  return {
    ...har,
    log: {
      ...har.log,
      entries: har.log.entries.map((entry) => {
        const ttfb = calculateTtfb(entry.timings);
        const size = entry.response.content.size;
        
        // Grade TTFB
        let ttfbGrade: 'good' | 'needs-improvement' | 'poor' = 'good';
        if (ttfb > 800) ttfbGrade = 'poor';
        else if (ttfb > 400) ttfbGrade = 'needs-improvement';

        // Grade size
        let sizeGrade: 'small' | 'medium' | 'large' | 'huge' = 'small';
        if (size > 10 * 1024 * 1024) sizeGrade = 'huge';
        else if (size > 1024 * 1024) sizeGrade = 'large';
        else if (size > 100 * 1024) sizeGrade = 'medium';

        return {
          ...entry,
          _performance: {
            ttfb,
            ttfbGrade,
            sizeGrade,
            relativeTtfb: avgTtfb > 0 ? (ttfb / avgTtfb) : 1,
            compressionRatio: entry.response._transferSize && size > 0
              ? 1 - (entry.response._transferSize / size)
              : 0,
          },
        };
      }),
    },
  };
}

/**
 * Comprehensive HAR enhancer that applies all enhancements
 */
export function enhanceHar(
  har: Har,
  server?: BunServer,
  options?: {
    protocol?: boolean;
    security?: boolean;
    performance?: boolean;
  }
): Har {
  const opts = { protocol: true, security: true, performance: true, ...options };
  
  let enhanced = har;
  
  if (opts.protocol && server) {
    enhanced = enhanceHarWithProtocol(enhanced, server);
  }
  
  if (opts.security) {
    enhanced = enhanceHarWithSecurity(enhanced);
  }
  
  if (opts.performance) {
    enhanced = enhanceHarWithPerformanceMetrics(enhanced);
  }
  
  return enhanced;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS & ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates comprehensive statistics from HAR data
 */
export function calculateHarStats(har: Har): HarStats {
  if (!har?.log?.entries) {
    return {
      totalRequests: 0,
      totalSize: 0,
      totalTransferSize: 0,
      avgResponseTime: 0,
      avgTtfb: 0,
      compressionRatio: 0,
      secureRequests: 0,
      http2Requests: 0,
      http3Requests: 0,
      cachedRequests: 0,
      errorRequests: 0,
      domains: new Set(),
      mimeTypes: new Map(),
      statusCodes: new Map(),
    };
  }

  const entries = har.log.entries;
  const domains = new Set<string>();
  const mimeTypes = new Map<string, number>();
  const statusCodes = new Map<number, number>();
  
  let totalSize = 0;
  let totalTransferSize = 0;
  let totalTime = 0;
  let totalTtfb = 0;
  let secureRequests = 0;
  let http2Requests = 0;
  let http3Requests = 0;
  let cachedRequests = 0;
  let errorRequests = 0;

  for (const entry of entries) {
    // Domain
    try {
      domains.add(new URL(entry.request.url).hostname);
    } catch {
      domains.add('unknown');
    }

    // Size
    const size = entry.response.content.size;
    const transferSize = entry.response._transferSize ?? size;
    totalSize += size;
    totalTransferSize += transferSize;

    // Time
    totalTime += entry.time;
    totalTtfb += calculateTtfb(entry.timings);

    // Protocol
    if (entry.request.url.startsWith('https:')) secureRequests++;
    const httpVer = entry.response.httpVersion || entry.request.httpVersion;
    if (httpVer?.includes('2')) http2Requests++;
    if (httpVer?.includes('3')) http3Requests++;

    // Cache
    if (detectCacheStatus(entry) === 'hit') cachedRequests++;

    // Status
    const status = entry.response.status;
    statusCodes.set(status, (statusCodes.get(status) ?? 0) + 1);
    if (status >= 400) errorRequests++;

    // MIME type
    const mime = entry.response.content.mimeType;
    mimeTypes.set(mime, (mimeTypes.get(mime) ?? 0) + 1);
  }

  const count = entries.length;
  
  return {
    totalRequests: count,
    totalSize,
    totalTransferSize,
    avgResponseTime: count > 0 ? totalTime / count : 0,
    avgTtfb: count > 0 ? totalTtfb / count : 0,
    compressionRatio: totalSize > 0 ? 1 - (totalTransferSize / totalSize) : 0,
    secureRequests,
    http2Requests,
    http3Requests,
    cachedRequests,
    errorRequests,
    domains,
    mimeTypes,
    statusCodes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates HAR structure against spec
 */
export function validateHar(har: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!har || typeof har !== 'object') {
    return { valid: false, errors: ['HAR must be an object'] };
  }

  const harObj = har as Record<string, unknown>;

  if (!harObj.log || typeof harObj.log !== 'object') {
    errors.push('Missing or invalid "log" property');
    return { valid: false, errors };
  }

  const log = harObj.log as Record<string, unknown>;

  // Required: version
  if (typeof log.version !== 'string') {
    errors.push('Missing or invalid "log.version"');
  }

  // Required: creator
  if (!log.creator || typeof log.creator !== 'object') {
    errors.push('Missing or invalid "log.creator"');
  } else {
    const creator = log.creator as Record<string, unknown>;
    if (typeof creator.name !== 'string') errors.push('Missing "log.creator.name"');
    if (typeof creator.version !== 'string') errors.push('Missing "log.creator.version"');
  }

  // Required: entries array
  if (!Array.isArray(log.entries)) {
    errors.push('Missing or invalid "log.entries"');
  } else {
    for (let i = 0; i < log.entries.length; i++) {
      const entry = log.entries[i] as Record<string, unknown>;
      
      if (typeof entry.startedDateTime !== 'string') {
        errors.push(`Entry ${i}: missing "startedDateTime"`);
      }
      if (typeof entry.time !== 'number') {
        errors.push(`Entry ${i}: missing "time"`);
      }
      if (!entry.request || typeof entry.request !== 'object') {
        errors.push(`Entry ${i}: missing "request"`);
      }
      if (!entry.response || typeof entry.response !== 'object') {
        errors.push(`Entry ${i}: missing "response"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER & SAMPLE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HAR Builder for programmatic HAR creation
 */
export class HarBuilder {
  private log: HarLog;

  constructor(creator: HarCreator) {
    this.log = {
      version: '1.2',
      creator,
      entries: [],
    };
  }

  addPage(page: HarPage): this {
    if (!this.log.pages) this.log.pages = [];
    this.log.pages.push(page);
    return this;
  }

  addEntry(entry: HarEntry): this {
    this.log.entries.push(entry);
    return this;
  }

  setBrowser(browser: HarCreator): this {
    this.log.browser = browser;
    return this;
  }

  setComment(comment: string): this {
    this.log.comment = comment;
    return this;
  }

  build(): Har {
    return { log: this.log };
  }
}

/**
 * Generate sample HAR with enhanced protocol data
 */
export function generateSampleEnhancedHar(server: BunServer): Har {
  const protocol = server.protocol ?? 'unknown';
  const perf = server.performance as ServerPerformance | undefined;
  const now = new Date();

  const builder = new HarBuilder({
    name: 'Bun Enhanced Server',
    version: '1.0.0',
    comment: 'Generated with protocol enhancements',
  });

  builder
    .setBrowser({
      name: 'Bun',
      version: process.version || '1.0.0',
    })
    .addPage({
      startedDateTime: now.toISOString(),
      id: 'page_1',
      title: server.url?.toString() ?? 'Unknown',
      pageTimings: {
        onContentLoad: 100,
        onLoad: 200,
      },
    })
    .addEntry({
      startedDateTime: now.toISOString(),
      time: 45.123,
      request: {
        method: 'GET',
        url: server.url?.toString() ?? 'http://localhost/',
        httpVersion: protocol === 'https' ? 'HTTP/2' : 'HTTP/1.1',
        headers: [
          { name: 'user-agent', value: 'Bun/1.3.8' },
          { name: 'accept', value: 'application/json' },
          { name: 'accept-encoding', value: 'gzip, br' },
        ],
        cookies: [],
        queryString: [],
        headersSize: 150,
        bodySize: 0,
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: protocol === 'https' ? 'HTTP/2' : 'HTTP/1.1',
        headers: [
          { name: 'content-type', value: 'application/json' },
          { name: 'content-encoding', value: 'gzip' },
          { name: 'x-protocol', value: protocol },
          { name: 'cache-control', value: 'max-age=3600' },
          { name: 'x-frame-options', value: 'DENY' },
        ],
        cookies: [],
        content: {
          size: 1024,
          mimeType: 'application/json',
          compression: 512,
        },
        redirectURL: '',
        headersSize: 200,
        bodySize: 512,
        _transferSize: 600,
      },
      cache: {},
      timings: {
        blocked: 0,
        dns: 5,
        ssl: protocol === 'https' ? 15 : 0,
        connect: 10,
        send: 2,
        wait: 20,
        receive: 8,
      },
      _protocol: protocol,
      _resourceType: 'xhr',
      _serverTiming: {
        requestStart: now.toISOString(),
        protocol,
        compression: 'gzip',
        ttfb: 37,
        cacheStatus: 'miss',
      },
    });

  // Add _protocol and _serverPerformance to log level
  const har = builder.build();
  har.log._protocol = protocol;
  har.log._serverPerformance = perf
    ? {
        requestsPerSecond: perf.requestsPerSecond,
        avgResponseTime: perf.avgResponseTime,
        activeConnections: perf.activeConnections,
        compressionStats: server.getCompressionStats?.() ?? null,
        cacheStats: perf.cacheStats ?? null,
      }
    : null;

  return har;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING & TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filters HAR entries based on various criteria
 */
export function filterHarEntries(
  har: Har,
  criteria: {
    minTime?: number;
    maxTime?: number;
    statusCodes?: number[];
    domains?: string[];
    mimeTypes?: string[];
    resourceTypes?: string[];
    secureOnly?: boolean;
    cachedOnly?: boolean;
  }
): HarEntry[] {
  if (!har?.log?.entries) return [];

  return har.log.entries.filter((entry) => {
    if (criteria.minTime !== undefined && entry.time < criteria.minTime) return false;
    if (criteria.maxTime !== undefined && entry.time > criteria.maxTime) return false;
    if (criteria.statusCodes && !criteria.statusCodes.includes(entry.response.status)) return false;
    if (criteria.domains) {
      const domain = new URL(entry.request.url).hostname;
      if (!criteria.domains.some(d => domain.includes(d))) return false;
    }
    if (criteria.mimeTypes) {
      const mime = entry.response.content.mimeType;
      if (!criteria.mimeTypes.some(m => mime.includes(m))) return false;
    }
    if (criteria.resourceTypes) {
      const type = detectResourceType(entry);
      if (!criteria.resourceTypes.includes(type)) return false;
    }
    if (criteria.secureOnly && !entry.request.url.startsWith('https:')) return false;
    if (criteria.cachedOnly && detectCacheStatus(entry) !== 'hit') return false;
    return true;
  });
}

/**
 * Sorts HAR entries by various fields
 */
export type SortField = 'time' | 'size' | 'ttfb' | 'status' | 'url' | 'started';
export type SortDirection = 'asc' | 'desc';

export function sortHarEntries(
  entries: HarEntry[],
  field: SortField,
  direction: SortDirection = 'desc'
): HarEntry[] {
  const sorted = [...entries];
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'time':
        comparison = a.time - b.time;
        break;
      case 'size':
        comparison = a.response.content.size - b.response.content.size;
        break;
      case 'ttfb':
        comparison = calculateTtfb(a.timings) - calculateTtfb(b.timings);
        break;
      case 'status':
        comparison = a.response.status - b.response.status;
        break;
      case 'url':
        comparison = a.request.url.localeCompare(b.request.url);
        break;
      case 'started':
        comparison = new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime();
        break;
    }
    return comparison * multiplier;
  });

  return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export enhanced HAR to file
 */
export async function exportEnhancedHar(
  server: BunServer,
  filename: string = 'enhanced-server.har',
  options?: {
    includeSecurity?: boolean;
    includePerformance?: boolean;
  }
): Promise<void> {
  const harData = generateSampleEnhancedHar(server);
  
  let enhanced = harData;
  if (options?.includeSecurity) {
    enhanced = enhanceHarWithSecurity(enhanced);
  }
  if (options?.includePerformance) {
    enhanced = enhanceHarWithPerformanceMetrics(enhanced);
  }

  await (globalThis as any).Bun.write(filename, JSON.stringify(enhanced, null, 2));
  
  const protocol = server.protocol ?? 'unknown';
  const perf = server.performance as ServerPerformance | undefined;
  
  console.log(`📄 Enhanced HAR exported to: ${filename}`);
  console.log(`   Protocol: ${protocol}`);
  console.log(`   Requests/sec: ${perf?.requestsPerSecond?.toFixed(2) ?? 'N/A'}`);
  console.log(`   Compression ratio: ${((perf?.bytesTransferred?.compressionRatio || 0) * 100).toFixed(1)}%`);
}

/**
 * Export HAR statistics as JSON
 */
export async function exportHarStats(
  har: Har,
  filename: string = 'har-stats.json'
): Promise<void> {
  const stats = calculateHarStats(har);
  
  const exportable = {
    ...stats,
    domains: Array.from(stats.domains),
    mimeTypes: Object.fromEntries(stats.mimeTypes),
    statusCodes: Object.fromEntries(stats.statusCodes),
  };

  await (globalThis as any).Bun.write(filename, JSON.stringify(exportable, null, 2));
  console.log(`📊 HAR statistics exported to: ${filename}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAR DIFF & COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export interface HarDiffResult {
  added: HarEntry[];
  removed: HarEntry[];
  modified: {
    entry: HarEntry;
    changes: {
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }[];
  }[];
  unchanged: HarEntry[];
  summary: {
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    totalUnchanged: number;
  };
}

/**
 * Compares two HAR files and returns differences
 */
export function diffHar(baseline: Har, current: Har): HarDiffResult {
  if (!baseline?.log?.entries || !current?.log?.entries) {
    return {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
      summary: { totalAdded: 0, totalRemoved: 0, totalModified: 0, totalUnchanged: 0 },
    };
  }

  const baselineMap = new Map(
    baseline.log.entries.map(e => [`${e.request.method}:${e.request.url}`, e])
  );
  const currentMap = new Map(
    current.log.entries.map(e => [`${e.request.method}:${e.request.url}`, e])
  );

  const added: HarEntry[] = [];
  const removed: HarEntry[] = [];
  const modified: HarDiffResult['modified'] = [];
  const unchanged: HarEntry[] = [];

  // Find added and modified
  for (const [key, entry] of currentMap) {
    if (!baselineMap.has(key)) {
      added.push(entry);
    } else {
      const baselineEntry = baselineMap.get(key)!;
      const changes: HarDiffResult['modified'][0]['changes'] = [];

      // Compare key fields
      if (baselineEntry.response.status !== entry.response.status) {
        changes.push({
          field: 'response.status',
          oldValue: baselineEntry.response.status,
          newValue: entry.response.status,
        });
      }
      if (baselineEntry.time !== entry.time) {
        changes.push({
          field: 'time',
          oldValue: baselineEntry.time,
          newValue: entry.time,
        });
      }
      if (baselineEntry.response.content.size !== entry.response.content.size) {
        changes.push({
          field: 'response.content.size',
          oldValue: baselineEntry.response.content.size,
          newValue: entry.response.content.size,
        });
      }

      if (changes.length > 0) {
        modified.push({ entry, changes });
      } else {
        unchanged.push(entry);
      }
    }
  }

  // Find removed
  for (const [key, entry] of baselineMap) {
    if (!currentMap.has(key)) {
      removed.push(entry);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    summary: {
      totalAdded: added.length,
      totalRemoved: removed.length,
      totalModified: modified.length,
      totalUnchanged: unchanged.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE REGRESSION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RegressionResult {
  hasRegression: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  issues: {
    type: 'latency' | 'size' | 'error-rate' | 'ttfb';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    baseline: number;
    current: number;
    delta: number;
    deltaPercent: number;
  }[];
  recommendations: string[];
}

/**
 * Detects performance regressions between two HAR captures
 */
export function detectRegressions(
  baseline: Har,
  current: Har,
  thresholds?: {
    latencyPercent?: number;
    sizePercent?: number;
    errorRatePercent?: number;
    ttfbPercent?: number;
  }
): RegressionResult {
  const opts = {
    latencyPercent: 20,
    sizePercent: 30,
    errorRatePercent: 50,
    ttfbPercent: 25,
    ...thresholds,
  };

  const baselineStats = calculateHarStats(baseline);
  const currentStats = calculateHarStats(current);
  const issues: RegressionResult['issues'] = [];

  // Check latency regression
  if (baselineStats.avgResponseTime > 0) {
    const latencyDelta = currentStats.avgResponseTime - baselineStats.avgResponseTime;
    const latencyDeltaPercent = (latencyDelta / baselineStats.avgResponseTime) * 100;
    if (latencyDeltaPercent > opts.latencyPercent) {
      issues.push({
        type: 'latency',
        severity: latencyDeltaPercent > 50 ? 'high' : 'medium',
        message: `Average response time increased by ${latencyDeltaPercent.toFixed(1)}%`,
        baseline: baselineStats.avgResponseTime,
        current: currentStats.avgResponseTime,
        delta: latencyDelta,
        deltaPercent: latencyDeltaPercent,
      });
    }
  }

  // Check TTFB regression
  if (baselineStats.avgTtfb > 0) {
    const ttfbDelta = currentStats.avgTtfb - baselineStats.avgTtfb;
    const ttfbDeltaPercent = (ttfbDelta / baselineStats.avgTtfb) * 100;
    if (ttfbDeltaPercent > opts.ttfbPercent) {
      issues.push({
        type: 'ttfb',
        severity: ttfbDeltaPercent > 50 ? 'high' : 'medium',
        message: `Time to First Byte increased by ${ttfbDeltaPercent.toFixed(1)}%`,
        baseline: baselineStats.avgTtfb,
        current: currentStats.avgTtfb,
        delta: ttfbDelta,
        deltaPercent: ttfbDeltaPercent,
      });
    }
  }

  // Check size regression
  if (baselineStats.totalSize > 0) {
    const sizeDelta = currentStats.totalSize - baselineStats.totalSize;
    const sizeDeltaPercent = (sizeDelta / baselineStats.totalSize) * 100;
    if (sizeDeltaPercent > opts.sizePercent) {
      issues.push({
        type: 'size',
        severity: sizeDeltaPercent > 100 ? 'high' : 'medium',
        message: `Total transfer size increased by ${sizeDeltaPercent.toFixed(1)}%`,
        baseline: baselineStats.totalSize,
        current: currentStats.totalSize,
        delta: sizeDelta,
        deltaPercent: sizeDeltaPercent,
      });
    }
  }

  // Check error rate regression
  const baselineErrorRate = baselineStats.totalRequests > 0
    ? baselineStats.errorRequests / baselineStats.totalRequests
    : 0;
  const currentErrorRate = currentStats.totalRequests > 0
    ? currentStats.errorRequests / currentStats.totalRequests
    : 0;
  if (baselineErrorRate > 0) {
    const errorDeltaPercent = ((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100;
    if (errorDeltaPercent > opts.errorRatePercent) {
      issues.push({
        type: 'error-rate',
        severity: 'critical',
        message: `Error rate increased by ${errorDeltaPercent.toFixed(1)}%`,
        baseline: baselineErrorRate,
        current: currentErrorRate,
        delta: currentErrorRate - baselineErrorRate,
        deltaPercent: errorDeltaPercent,
      });
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (issues.some(i => i.type === 'latency')) {
    recommendations.push('Consider implementing caching for slow endpoints');
    recommendations.push('Review database queries for N+1 issues');
  }
  if (issues.some(i => i.type === 'size')) {
    recommendations.push('Enable compression for large responses');
    recommendations.push('Consider code splitting for large assets');
  }
  if (issues.some(i => i.type === 'ttfb')) {
    recommendations.push('Optimize server-side rendering');
    recommendations.push('Consider using a CDN for static assets');
  }

  // Determine overall severity
  let severity: RegressionResult['severity'] = 'none';
  if (issues.some(i => i.severity === 'critical')) severity = 'critical';
  else if (issues.some(i => i.severity === 'high')) severity = 'high';
  else if (issues.some(i => i.severity === 'medium')) severity = 'medium';
  else if (issues.length > 0) severity = 'low';

  return {
    hasRegression: issues.length > 0,
    severity,
    issues,
    recommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COOKIE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CookieAnalysis {
  totalCookies: number;
  secureCookies: number;
  httpOnlyCookies: number;
  sameSiteCookies: number;
  sessionCookies: number;
  persistentCookies: number;
  thirdPartyCookies: number;
  cookiesByDomain: Map<string, HarCookie[]>;
  warnings: string[];
}

/**
 * Analyzes cookies in HAR file for security and privacy issues
 */
export function analyzeCookies(har: Har): CookieAnalysis {
  if (!har?.log?.entries) {
    return {
      totalCookies: 0,
      secureCookies: 0,
      httpOnlyCookies: 0,
      sameSiteCookies: 0,
      sessionCookies: 0,
      persistentCookies: 0,
      thirdPartyCookies: 0,
      cookiesByDomain: new Map(),
      warnings: [],
    };
  }

  const cookiesByDomain = new Map<string, HarCookie[]>();
  let secureCount = 0;
  let httpOnlyCount = 0;
  let sameSiteCount = 0;
  let sessionCount = 0;
  let persistentCount = 0;
  let thirdPartyCount = 0;
  const warnings: string[] = [];

  for (const entry of har.log.entries) {
    const domain = new URL(entry.request.url).hostname;
    
    // Response cookies
    for (const cookie of entry.response.cookies || []) {
      const domainCookies = cookiesByDomain.get(domain) || [];
      domainCookies.push(cookie);
      cookiesByDomain.set(domain, domainCookies);

      if (cookie.secure) secureCount++;
      if (cookie.httpOnly) httpOnlyCount++;
      if (cookie.sameSite) sameSiteCount++;
      if (!cookie.expires) sessionCount++;
      else persistentCount++;

      // Check for issues
      if (!cookie.secure && entry.request.url.startsWith('https:')) {
        warnings.push(`Cookie "${cookie.name}" sent over HTTPS without Secure flag`);
      }
      if (!cookie.sameSite) {
        warnings.push(`Cookie "${cookie.name}" missing SameSite attribute`);
      }
    }
  }

  // Count third-party cookies
  const mainDomain = har.log.entries[0]?.request.url
    ? new URL(har.log.entries[0].request.url).hostname
    : '';
  for (const [domain, cookies] of cookiesByDomain) {
    if (domain !== mainDomain) {
      thirdPartyCount += cookies.length;
    }
  }

  return {
    totalCookies: Array.from(cookiesByDomain.values()).flat().length,
    secureCookies: secureCount,
    httpOnlyCookies: httpOnlyCount,
    sameSiteCookies: sameSiteCount,
    sessionCookies: sessionCount,
    persistentCookies: persistentCount,
    thirdPartyCookies: thirdPartyCount,
    cookiesByDomain,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WATERFALL CHART GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface WaterfallOptions {
  width?: number;
  showPhases?: boolean;
  colorize?: boolean;
}

/**
 * Generates ASCII waterfall chart from HAR entries
 */
export function generateWaterfall(
  entries: HarEntry[],
  options: WaterfallOptions = {}
): string {
  const opts = { width: 60, showPhases: true, colorize: true, ...options };
  
  if (entries.length === 0) return '';

  const starts = entries.map(e => new Date(e.startedDateTime).getTime());
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...entries.map((e, i) => starts[i] + e.time));
  const span = maxEnd - minStart || 1;

  const lines: string[] = [];
  lines.push(`\n${' '.repeat(4)}${'─'.repeat(opts.width)} [${fmtMs(span)} total]`);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const offset = ((starts[i] - minStart) / span) * opts.width;
    const barLen = Math.max(1, Math.round((e.time / span) * opts.width));
    const pad = Math.round(offset);

    let bar = '';
    if (opts.showPhases) {
      const t = e.timings;
      const segments = [
        { ms: Math.max(0, t.blocked), color: '\x1b[90m' },
        { ms: Math.max(0, t.dns) + Math.max(0, t.connect) + Math.max(0, t.ssl), color: '\x1b[36m' },
        { ms: Math.max(0, t.send), color: '\x1b[34m' },
        { ms: Math.max(0, t.wait), color: '\x1b[33m' },
        { ms: Math.max(0, t.receive), color: '\x1b[32m' },
      ];
      const totalMs = segments.reduce((s, x) => s + x.ms, 0) || 1;

      let remaining = barLen;
      for (const seg of segments) {
        const chars = Math.max(0, Math.round((seg.ms / totalMs) * barLen));
        const take = Math.min(chars, remaining);
        if (take > 0) {
          bar += opts.colorize ? seg.color + '█'.repeat(take) : '█'.repeat(take);
          remaining -= take;
        }
      }
      if (remaining > 0) bar += '█'.repeat(remaining);
      if (opts.colorize) bar += '\x1b[0m';
    } else {
      bar = '█'.repeat(barLen);
    }

    const label = `${e.request.method} ${shortenUrl(e.request.url, 40)}`;
    const statusColor = e.response.status < 300 ? '\x1b[32m' : 
                       e.response.status < 400 ? '\x1b[33m' : '\x1b[31m';
    const reset = opts.colorize ? '\x1b[0m' : '';
    const statusStr = opts.colorize ? `${statusColor}${e.response.status}${reset}` : String(e.response.status);

    lines.push(`${' '.repeat(2)}${' '.repeat(pad)}${bar} ${statusStr} ${fmtMs(e.time)} ${label}`);
  }

  if (opts.showPhases && opts.colorize) {
    lines.push(`\n${' '.repeat(2)}\x1b[90m█\x1b[0m blocked  \x1b[36m█\x1b[0m dns/connect/ssl  \x1b[34m█\x1b[0m send  \x1b[33m█\x1b[0m wait  \x1b[32m█\x1b[0m receive`);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST DEPENDENCY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DependencyGraph {
  nodes: Map<string, { entry: HarEntry; level: number }>;
  edges: { from: string; to: string; type: 'document' | 'script' | 'stylesheet' | 'xhr' | 'other' }[];
}

/**
 * Builds a dependency graph from HAR entries
 */
export function buildDependencyGraph(har: Har): DependencyGraph {
  if (!har?.log?.entries) {
    return { nodes: new Map(), edges: [] };
  }

  const nodes = new Map<string, { entry: HarEntry; level: number }>();
  const edges: DependencyGraph['edges'] = [];

  // Sort by start time to infer dependencies
  const sorted = [...har.log.entries].sort(
    (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
  );

  // First entry is typically the document
  let documentUrl = '';
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const key = `${entry.request.method}:${entry.request.url}`;
    const type = detectResourceType(entry);

    if (i === 0 && type === 'document') {
      documentUrl = entry.request.url;
      nodes.set(key, { entry, level: 0 });
    } else {
      // Infer level based on resource type and timing
      let level = 1;
      if (type === 'script' || type === 'stylesheet') level = 1;
      else if (type === 'xhr') level = 2;
      else if (type === 'image') level = 1;

      nodes.set(key, { entry, level });

      // Create edge from document or parent
      if (documentUrl) {
        edges.push({
          from: documentUrl,
          to: entry.request.url,
          type: type as DependencyGraph['edges'][0]['type'],
        });
      }
    }
  }

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAR LINTING
// ═══════════════════════════════════════════════════════════════════════════════

export interface LintRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (entry: HarEntry) => boolean;
  message: (entry: HarEntry) => string;
}

export interface LintResult {
  passed: boolean;
  issues: {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    entry: { method: string; url: string };
  }[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    total: number;
  };
}

const defaultLintRules: LintRule[] = [
  {
    id: 'no-http',
    name: 'Insecure HTTP',
    severity: 'warning',
    check: (e) => e.request.url.startsWith('http:'),
    message: (e) => `Request uses insecure HTTP: ${new URL(e.request.url).hostname}`,
  },
  {
    id: 'slow-response',
    name: 'Slow Response',
    severity: 'warning',
    check: (e) => e.time > 1000,
    message: (e) => `Response time ${e.time.toFixed(0)}ms exceeds 1 second`,
  },
  {
    id: 'large-payload',
    name: 'Large Payload',
    severity: 'info',
    check: (e) => e.response.content.size > 1024 * 1024,
    message: (e) => `Response size ${(e.response.content.size / 1024 / 1024).toFixed(1)}MB exceeds 1MB`,
  },
  {
    id: 'no-compression',
    name: 'Missing Compression',
    severity: 'warning',
    check: (e) => {
      const mime = e.response.content.mimeType;
      const hasTextContent = mime.includes('text') || mime.includes('json') || mime.includes('javascript');
      const encoding = getCompressionFromHeaders(e.response.headers);
      return hasTextContent && encoding === 'identity' && e.response.content.size > 1024;
    },
    message: () => 'Text response not compressed (enable gzip/brotli)',
  },
  {
    id: 'no-cache',
    name: 'Missing Cache Headers',
    severity: 'info',
    check: (e) => {
      const cacheControl = getHeaderValue(e.response.headers, 'cache-control');
      const expires = getHeaderValue(e.response.headers, 'expires');
      return !cacheControl && !expires && e.response.status === 200;
    },
    message: () => 'Static resource lacks caching headers',
  },
  {
    id: 'error-status',
    name: 'Error Response',
    severity: 'error',
    check: (e) => e.response.status >= 400,
    message: (e) => `HTTP ${e.response.status} ${e.response.statusText}`,
  },
];

/**
 * Lints HAR file against best practices
 */
export function lintHar(har: Har, rules: LintRule[] = defaultLintRules): LintResult {
  if (!har?.log?.entries) {
    return {
      passed: false,
      issues: [],
      summary: { errors: 0, warnings: 0, info: 0, total: 0 },
    };
  }

  const issues: LintResult['issues'] = [];

  for (const entry of har.log.entries) {
    for (const rule of rules) {
      if (rule.check(entry)) {
        issues.push({
          rule: rule.id,
          severity: rule.severity,
          message: rule.message(entry),
          entry: {
            method: entry.request.method,
            url: entry.request.url,
          },
        });
      }
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;

  return {
    passed: errors === 0 && warnings === 0,
    issues,
    summary: {
      errors,
      warnings,
      info,
      total: issues.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmtMs(ms: number): string {
  if (ms < 0) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function shortenUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    let path = u.pathname + u.search;
    if (path.length > max) path = path.slice(0, max - 1) + '…';
    return path;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + '…' : url;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  enhanceHarWithProtocol,
  enhanceHarWithSecurity,
  enhanceHarWithPerformanceMetrics,
  enhanceHar,
  calculateHarStats,
  validateHar,
  generateSampleEnhancedHar,
  exportEnhancedHar,
  exportHarStats,
  filterHarEntries,
  sortHarEntries,
  HarBuilder,
  // New exports
  diffHar,
  detectRegressions,
  analyzeCookies,
  generateWaterfall,
  buildDependencyGraph,
  lintHar,
};
