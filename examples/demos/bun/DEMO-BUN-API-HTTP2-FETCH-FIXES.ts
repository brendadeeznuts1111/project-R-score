#!/usr/bin/env bun
/**
 * Bun APIs, HTTP/2, and Fetch API Fixes Demo
 * 
 * Demonstrates recent fixes:
 * 1. Bun.JSONC.parse & Bun.TOML.parse - stack overflow checks
 * 2. HTTP/2 - DATA frame, window size, protocol errors
 * 3. Fetch API - proxy crashes, mTLS, Request.text(), cache/mode
 * 
 * Run: bun DEMO-BUN-API-HTTP2-FETCH-FIXES.ts
 */

console.info("🔧 Bun APIs, HTTP/2, and Fetch API Fixes Demo");
console.info("═".repeat(70));
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: Bun.JSONC.parse & Bun.TOML.parse - Stack Overflow Checks
// ═══════════════════════════════════════════════════════════════════════════════
console.info("1️⃣  Bun.JSONC.parse & Bun.TOML.parse - Stack Overflow Protection");
console.info("─".repeat(70));

console.info("   Issue: Deeply nested structures could cause stack overflow");
console.info("   Fix: Added stack overflow protection");
console.info();

// Safe JSONC parsing
const jsoncData = `
{
  // This is a comment
  "name": "test",
  "nested": {
    "level1": {
      "level2": "value"
    }
  }
}
`;

try {
  const parsed = Bun.JSONC.parse(jsoncData);
  console.info("   ✅ JSONC parsed successfully:");
  console.info(`      name: ${parsed.name}`);
  console.info(`      nested.level1.level2: ${parsed.nested.level1.level2}`);
} catch (e: any) {
  console.info(`   ❌ JSONC parse error: ${e.message}`);
}

// Safe TOML parsing
const tomlData = `
# TOML config
title = "Test Config"

[owner]
name = "Test User"
dob = 1979-05-27T07:32:00-08:00

[database]
server = "192.168.1.1"
ports = [8001, 8001, 8002]
`;

try {
  const parsed = Bun.TOML.parse(tomlData);
  console.info("   ✅ TOML parsed successfully:");
  console.info(`      title: ${parsed.title}`);
  console.info(`      owner.name: ${parsed.owner.name}`);
  console.info(`      database.ports: [${parsed.database.ports.join(', ')}]`);
} catch (e: any) {
  console.info(`   ❌ TOML parse error: ${e.message}`);
}

console.info("   🔒 Stack overflow protection prevents crashes on deeply nested data");
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 2: HTTP/2 Fixes
// ═══════════════════════════════════════════════════════════════════════════════
console.info("2️⃣  HTTP/2 Fixes - Multiple Improvements");
console.info("─".repeat(70));

console.info("   Fixes Applied:");
console.info("   ✅ Extra empty DATA frame eliminated (fixes AWS ALB rejection)");
console.info("   ✅ Initial stream window size uses DEFAULT_WINDOW_SIZE until SETTINGS_ACK");
console.info("   ✅ NGHTTP2_PROTOCOL_ERROR with Fauna fixed");
console.info("   ✅ gRPC NGHTTP2_FRAME_SIZE_ERROR with non-default maxFrameSize fixed");
console.info("   ✅ Settings validation - no more truncation of large values");
console.info("   ✅ Stream windows adjust when INITIAL_WINDOW_SIZE changes");
console.info("   ✅ maxHeaderListSize checking per RFC 7540 Section 6.5.2");
console.info("   ✅ HPACK entry overhead tracking for cumulative header size");
console.info("   ✅ Custom settings validation (max 10, matching Node.js)");
console.info("   ✅ Setting IDs and values validated per RFC 7540");
console.info();

console.info("   Example: HTTP/2 client with proper window management");
console.info("   ```typescript");
console.info("   import { connect } from 'node:http2';");
console.info("   ");
console.info("   const client = connect('https://api.example.com');");
console.info("   const req = client.request({ ':path': '/data' });");
console.info("   ");
console.info("   req.write(data); // No extra empty DATA frame ✅");
console.info("   req.end();       // Clean termination");
console.info("   ```");
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 3: Fetch API Fixes
// ═══════════════════════════════════════════════════════════════════════════════
console.info("3️⃣  Fetch API Fixes - Stability & Security");
console.info("─".repeat(70));

console.info("   3.1 HTTP Proxy with Redirects Crash Fix");
console.info("   ────────────────────────────────────────");
console.info("   Issue: Crash if socket closes during redirect processing");
console.info("   Fix: Proper error handling during socket closure");
console.info();

console.info("   3.2 mTLS Certificate Per-Request Fix");
console.info("   ────────────────────────────────────────");
console.info("   Issue: First client cert used for all keepalive requests");
console.info("   Fix: Per-request tls options now respected");
console.info("   ```typescript");
console.info("   // Each request uses its own certificate");
console.info("   fetch('https://api1.example.com', {");
console.info("     tls: { cert: cert1, key: key1 }  // Uses cert1 ✅");
console.info("   });");
console.info("   fetch('https://api2.example.com', {");
console.info("     tls: { cert: cert2, key: key2 }  // Uses cert2 ✅");
console.info("   });");
console.info("   ```");
console.info();

console.info("   3.3 Request.prototype.text() Fix");
console.info("   ────────────────────────────────────────");
console.info("   Issue: 'TypeError: undefined is not a function' under load");
console.info("   Fix: Proper method binding in all cases");

// Demo Request.text()
async function demonstrateRequestText() {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: 'Hello, World!'
  });
  
  try {
    const text = await request.text();
    console.info(`   ✅ Request.text() works: "${text}"`);
  } catch (e: any) {
    console.info(`   ❌ Request.text() failed: ${e.message}`);
  }
}

await demonstrateRequestText();
console.info();

console.info("   3.4 Request Constructor cache/mode Options");
console.info("   ────────────────────────────────────────");
console.info("   Issue: cache and mode options were ignored");
console.info("   Fix: Options now properly applied");

const requestWithOptions = new Request('https://example.com', {
  cache: 'no-store',
  mode: 'cors'
});

console.info(`   ✅ Request.cache: ${requestWithOptions.cache}`);
console.info(`   ✅ Request.mode: ${requestWithOptions.mode}`);
console.info();

console.info("   3.5 NO_PROXY Port Number Fix");
console.info("   ────────────────────────────────────────");
console.info("   Issue: NO_PROXY=localhost:8080 bypassed ALL localhost ports");
console.info("   Fix: Port numbers now respected");
console.info();

console.info("   Example:");
console.info("   NO_PROXY='localhost:8080'");
console.info("   ");
console.info("   Before (broken):");
console.info("     localhost:8080 → No proxy ❌ (correct)");
console.info("     localhost:3000 → No proxy ❌ (WRONG - should use proxy)");
console.info("   ");
console.info("   After (fixed):");
console.info("     localhost:8080 → No proxy ✅ (correct)");
console.info("     localhost:3000 → Use proxy ✅ (correct)");
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.info("═".repeat(70));
console.info("📊 Summary: Bun APIs, HTTP/2, and Fetch API Fixes");
console.info("═".repeat(70));

const summary = [
  { Category: "Bun.JSONC.parse", Fix: "Stack overflow protection", Status: "✅" },
  { Category: "Bun.TOML.parse", Fix: "Stack overflow protection", Status: "✅" },
  { Category: "HTTP/2 DATA frame", Fix: "No extra empty frames", Status: "✅" },
  { Category: "HTTP/2 window size", Fix: "DEFAULT_WINDOW_SIZE until SETTINGS_ACK", Status: "✅" },
  { Category: "HTTP/2 Fauna", Fix: "NGHTTP2_PROTOCOL_ERROR fixed", Status: "✅" },
  { Category: "HTTP/2 gRPC", Fix: "maxFrameSize handling", Status: "✅" },
  { Category: "HTTP/2 settings", Fix: "No truncation of large values", Status: "✅" },
  { Category: "HTTP/2 validation", Fix: "RFC 7540 compliance", Status: "✅" },
  { Category: "Fetch proxy", Fix: "No crash on socket close", Status: "✅" },
  { Category: "Fetch mTLS", Fix: "Per-request certificates", Status: "✅" },
  { Category: "Request.text()", Fix: "No undefined function error", Status: "✅" },
  { Category: "Request options", Fix: "cache/mode respected", Status: "✅" },
  { Category: "NO_PROXY", Fix: "Port numbers respected", Status: "✅" },
];

console.info(Bun.inspect.table(summary, { colors: true }));
console.info();

console.info("🎯 Key Takeaways:");
console.info("   • JSONC/TOML parsing now protected against stack overflow");
console.info("   • HTTP/2 compatibility improved with AWS ALB, Fauna, gRPC");
console.info("   • RFC 7540 compliance: window sizes, settings, headers");
console.info("   • Fetch mTLS works correctly with multiple certificates");
console.info("   • Proxy handling more robust (NO_PROXY, redirects, socket closure)");
console.info("   • Request options properly implemented (cache, mode)");
console.info();
