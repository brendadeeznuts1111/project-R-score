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
  createTelemetryCookie,
  parseTelemetryCookie,
} from '../src/utils';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║         🍪 COOKIE & HEADER COMPRESSION DEMO                               ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 1: Cookie Manager with Compression
// ═════════════════════════════════════════════════════════════════════════════

console.log(`${ANSI.bold}${ANSI.blue}1️⃣  Cookie Manager Demo${ANSI.reset}\n`);

const cookieManager = new CookieManager(100); // Compress cookies > 100 bytes

// Set a regular cookie
cookieManager.set('session_id', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
console.log('✅ Set regular cookie: session_id');

// Set a large cookie (will be compressed automatically)
const largeData = JSON.stringify({
  user: { id: 123, name: 'John Doe', email: 'john@example.com' },
  preferences: { theme: 'dark', language: 'en', notifications: true },
  permissions: ['read', 'write', 'admin'],
  metadata: { created: Date.now(), lastLogin: Date.now(), sessions: 42 },
});

cookieManager.set('user_data', largeData);
console.log(`✅ Set large cookie: user_data (${largeData.length} bytes)`);

// Get cookie stats
const stats = cookieManager.getStats();
console.log(`\n📊 Cookie Stats:`);
console.log(`   Total cookies: ${stats.totalCookies}`);
console.log(`   Total size: ${stats.totalSize} bytes`);
console.log(`   Compressed cookies: ${stats.compressedCookies}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 2: Telemetry Cookie
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}2️⃣  Telemetry Cookie Demo${ANSI.reset}\n`);

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
console.log('✅ Set telemetry cookie with 3 events');

const retrievedTelemetry = cookieManager.getTelemetry();
console.log(`   Retrieved ${retrievedTelemetry?.events.length} events`);
console.log(`   Session ID: ${retrievedTelemetry?.sessionId.slice(0, 8)}...`);

// Append event
cookieManager.appendTelemetryEvent({
  type: 'user_action',
  timestamp: Date.now(),
  data: { action: 'save_settings' },
});
console.log('✅ Appended new telemetry event');

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 3: CSRF Protection
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}3️⃣  CSRF Protection Demo${ANSI.reset}\n`);

const csrfToken = crypto.randomUUID();
cookieManager.setCsrfToken(csrfToken);
console.log('✅ Set CSRF token');

const isValid = cookieManager.validateCsrfToken(csrfToken);
console.log(`   Token validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

const isInvalid = cookieManager.validateCsrfToken('wrong-token');
console.log(`   Wrong token validation: ${isInvalid ? '✅ Valid' : '❌ Invalid'}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 4: Header Compression
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}4️⃣  Header Compression Demo${ANSI.reset}\n`);

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

console.log('Original headers:');
Object.entries(headers).forEach(([k, v]) => {
  console.log(`   ${k}: ${v.slice(0, 50)}${v.length > 50 ? '...' : ''}`);
});

const compressed = headerCompressor.compress(headers);
console.log(`\n📦 Compression Result:`);
console.log(`   Algorithm: ${compressed.algorithm}`);
console.log(`   Original size: ${compressed.originalSize} bytes`);
console.log(`   Compressed size: ${compressed.compressedSize} bytes`);
console.log(
  `   Ratio: ${((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1)}% reduction`
);

if (compressed.metadata) {
  console.log(`   Static table hits: ${compressed.metadata.staticTableHits}`);
}

// Decompress
const decompressed = headerCompressor.decompress(compressed);
console.log(`\n✅ Decompressed ${Object.keys(decompressed).length} headers`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 5: Telemetry Headers
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}5️⃣  Telemetry Headers Demo${ANSI.reset}\n`);

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

console.log('Telemetry headers created:');
Object.entries(telemetryHeaders).forEach(([k, v]) => {
  const display = v.length > 50 ? `${v.slice(0, 50)}...` : v;
  console.log(`   ${k}: ${display}`);
});

// Parse them back
const parsed = headerCompressor.parseTelemetryHeaders(telemetryHeaders);
console.log(`\n✅ Parsed ${parsed.parsedEvents?.length || 0} events`);
console.log(`   Metrics: ${Object.keys(parsed.parsedMetrics || {}).join(', ')}`);

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 6: Conformance Headers
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}6️⃣  Conformance Headers Demo${ANSI.reset}\n`);

const conformanceHeaders = headerCompressor.createConformanceHeaders({
  version: '2.1.0',
  securityLevel: 'high',
  integrityHash: 'sha256-abc123def456',
  auditLog: 'User authenticated, permissions checked, request processed successfully',
});

console.log('Conformance headers:');
Object.entries(conformanceHeaders).forEach(([k, v]) => {
  console.log(`   ${k}: ${v.slice(0, 60)}${v.length > 60 ? '...' : ''}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// DEMO 7: Request/Response Header Compression
// ═════════════════════════════════════════════════════════════════════════════

console.log(`\n${ANSI.bold}${ANSI.blue}7️⃣  Request/Response Helper Functions${ANSI.reset}\n`);

const requestHeaders = {
  accept: 'application/json',
  authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-request-id': crypto.randomUUID(),
  'x-fw-session': 'session-abc123',
};

const compressedRequest = compressRequestHeaders(requestHeaders);
console.log('✅ Compressed request headers');
console.log(`   Compression marker: ${compressedRequest['x-fw-header-compression'] || 'none'}`);

const decompressedResponse = decompressResponseHeaders(compressedRequest);
console.log('✅ Decompressed response headers');
console.log(`   Headers restored: ${Object.keys(decompressedResponse).length}`);

// ═════════════════════════════════════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════════════════════════════════════

console.log(
  `\n${ANSI.bold}════════════════════════════════════════════════════════════════════════════${ANSI.reset}`
);
console.log(`${ANSI.bold}📊 Summary${ANSI.reset}\n`);
console.log(`✅ Cookie Manager: Compression, telemetry, CSRF protection`);
console.log(`✅ Header Compression: Dictionary + zstd algorithms`);
console.log(`✅ Telemetry: Cookie and header support with compression`);
console.log(`✅ Conformance: Security headers with integrity checks`);
console.log(`\n${ANSI.green}✨ All demos completed!${ANSI.reset}\n`);

// Export for use
export { cookieManager, headerCompressor };
