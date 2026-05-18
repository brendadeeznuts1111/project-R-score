/**
 * Cookie & Header Compression Demo
 *
 * Demonstrates:
 * - Bun.cookieMap() API
 * - Cookie compression with zstd
 * - Telemetry cookie management
 * - Header compression (HPACK-like)
 * - CSRF protection
 * - Conformance headers
 */

import {
  CookieManager,
  HeaderCompressor,
  compressRequestHeaders,
  decompressResponseHeaders,
  // createTelemetryCookie, parseTelemetryCookie - available in CookieManager
} from '../src/utils';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.info('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.info('║         🍪 COOKIE & HEADER COMPRESSION DEMO                               ║');
console.info('╚════════════════════════════════════════════════════════════════════════════╝\n');

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 1: Cookie Manager with Compression
// ═════════════════════════════════════════════════════════════════════════════

console.info(`${ANSI.bold}${ANSI.blue}1️⃣  Cookie Manager Demo${ANSI.reset}\n`);

const cookieManager = new CookieManager(100); // Compress cookies > 100 bytes

// Set a regular cookie
cookieManager.set('session_id', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
console.info('✅ Set regular cookie: session_id');

// Set a large cookie (will be compressed automatically)
const largeData = JSON.stringify({
  user: { id: 123, name: 'John Doe', email: 'john@example.com' },
  preferences: { theme: 'dark', language: 'en', notifications: true },
  permissions: ['read', 'write', 'admin'],
  metadata: { created: Date.now(), lastLogin: Date.now(), sessions: 42 },
});

cookieManager.set('user_data', largeData);
console.info(`✅ Set large cookie: user_data (${largeData.length} bytes)`);

// Get cookie stats
const stats = cookieManager.getStats();
console.info(`\n📊 Cookie Stats:`);
console.info(`   Total cookies: ${stats.totalCookies}`);
console.info(`   Total size: ${stats.totalSize} bytes`);
console.info(`   Compressed cookies: ${stats.compressedCookies}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 2: Telemetry Cookie
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}2️⃣  Telemetry Cookie Demo${ANSI.reset}\n`);

const telemetryData = {
  sessionId: crypto.randomUUID(),
  timestamp: Date.now(),
  events: [
    { type: 'page_view', timestamp: Date.now(), data: { path: '/dashboard' } },
    { type: 'click', timestamp: Date.now(), data: { element: 'button' } },
    { type: 'api_call', timestamp: Date.now(), data: { endpoint: '/api/users' } },
  ],
  metrics: {
    loadTime: 120,
    ttfb: 45,
    fcp: 180,
  },
};

cookieManager.setTelemetry(telemetryData);
console.info('✅ Set telemetry cookie with 3 events');

const retrievedTelemetry = cookieManager.getTelemetry();
console.info(`   Retrieved ${retrievedTelemetry?.events.length} events`);
console.info(`   Session ID: ${retrievedTelemetry?.sessionId.slice(0, 8)}...`);

// Append event
cookieManager.appendTelemetryEvent({
  type: 'user_action',
  timestamp: Date.now(),
  data: { action: 'save_settings' },
});
console.info('✅ Appended new telemetry event');

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 3: CSRF Protection
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}3️⃣  CSRF Protection Demo${ANSI.reset}\n`);

const csrfToken = crypto.randomUUID();
cookieManager.setCsrfToken(csrfToken);
console.info('✅ Set CSRF token');

const isValid = cookieManager.validateCsrfToken(csrfToken);
console.info(`   Token validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

const isInvalid = cookieManager.validateCsrfToken('wrong-token');
console.info(`   Wrong token validation: ${isInvalid ? '✅ Valid' : '❌ Invalid'}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 4: Header Compression
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}4️⃣  Header Compression Demo${ANSI.reset}\n`);

const headerCompressor = new HeaderCompressor();

// Common headers
const headers = {
  accept: 'application/json',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'user-agent': 'FactoryWager/1.0.0',
  'x-fw-session': 'abc123',
  'x-fw-telemetry': 'enabled',
  authorization: 'Bearer token123',
};

console.info('Original headers:');
Object.entries(headers).forEach(([k, v]) => {
  console.info(`   ${k}: ${v.slice(0, 50)}${v.length > 50 ? '...' : ''}`);
});

const compressed = headerCompressor.compress(headers);
console.info(`\n📦 Compression Result:`);
console.info(`   Algorithm: ${compressed.algorithm}`);
console.info(`   Original size: ${compressed.originalSize} bytes`);
console.info(`   Compressed size: ${compressed.compressedSize} bytes`);
console.info(
  `   Ratio: ${((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1)}% reduction`
);

if (compressed.metadata) {
  console.info(`   Static table hits: ${compressed.metadata.staticTableHits}`);
}

// Decompress
const decompressed = headerCompressor.decompress(compressed);
console.info(`\n✅ Decompressed ${Object.keys(decompressed).length} headers`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 5: Telemetry Headers
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}5️⃣  Telemetry Headers Demo${ANSI.reset}\n`);

const telemetryHeaders = headerCompressor.createTelemetryHeaders({
  sessionId: crypto.randomUUID(),
  events: [
    { type: 'api_request', timestamp: Date.now(), data: { endpoint: '/api/data' } },
    { type: 'cache_hit', timestamp: Date.now(), data: { key: 'user:123' } },
  ],
  metrics: {
    requests: 42,
    errors: 0,
    latency: 45,
  },
  traceId: 'trace-abc123',
});

console.info('Telemetry headers created:');
Object.entries(telemetryHeaders).forEach(([k, v]) => {
  const display = v.length > 50 ? `${v.slice(0, 50)}...` : v;
  console.info(`   ${k}: ${display}`);
});

// Parse them back
const parsed = headerCompressor.parseTelemetryHeaders(telemetryHeaders);
console.info(`\n✅ Parsed ${parsed.parsedEvents?.length || 0} events`);
console.info(`   Metrics: ${Object.keys(parsed.parsedMetrics || {}).join(', ')}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 6: Conformance Headers
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}6️⃣  Conformance Headers Demo${ANSI.reset}\n`);

const conformanceHeaders = headerCompressor.createConformanceHeaders({
  version: '2.1.0',
  securityLevel: 'high',
  integrityHash: 'sha256-abc123def456',
  auditLog: 'User authenticated, permissions checked, request processed successfully',
});

console.info('Conformance headers:');
Object.entries(conformanceHeaders).forEach(([k, v]) => {
  console.info(`   ${k}: ${v.slice(0, 60)}${v.length > 60 ? '...' : ''}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 7: Request/Response Header Compression
// ═════════════════════════════════════════════════════════════════════════════

console.info(`\n${ANSI.bold}${ANSI.blue}7️⃣  Request/Response Helper Functions${ANSI.reset}\n`);

const requestHeaders = {
  accept: 'application/json',
  authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-request-id': crypto.randomUUID(),
  'x-fw-session': 'session-abc123',
};

const compressedRequest = compressRequestHeaders(requestHeaders);
console.info('✅ Compressed request headers');
console.info(`   Compression marker: ${compressedRequest['x-fw-header-compression'] || 'none'}`);

const decompressedResponse = decompressResponseHeaders(compressedRequest);
console.info('✅ Decompressed response headers');
console.info(`   Headers restored: ${Object.keys(decompressedResponse).length}`);

// ═════════════════════════════════════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════════════════════════════════════

console.info(
  `\n${ANSI.bold}════════════════════════════════════════════════════════════════════════════${ANSI.reset}`
);
console.info(`${ANSI.bold}📊 Summary${ANSI.reset}\n`);
console.info(`✅ Cookie Manager: Compression, telemetry, CSRF protection`);
console.info(`✅ Header Compression: Dictionary + zstd algorithms`);
console.info(`✅ Telemetry: Cookie and header support with compression`);
console.info(`✅ Conformance: Security headers with integrity checks`);
console.info(`\n${ANSI.green}✨ All demos completed!${ANSI.reset}\n`);

// Export for use
export { cookieManager, headerCompressor };
