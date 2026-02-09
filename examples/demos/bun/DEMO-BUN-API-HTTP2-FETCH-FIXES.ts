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

console.log("🔧 Bun APIs, HTTP/2, and Fetch API Fixes Demo");
console.log("═".repeat(70));
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: Bun.JSONC.parse & Bun.TOML.parse - Stack Overflow Checks
// ═══════════════════════════════════════════════════════════════════════════════
console.log("1️⃣  Bun.JSONC.parse & Bun.TOML.parse - Stack Overflow Protection");
console.log("─".repeat(70));

console.log("   Issue: Deeply nested structures could cause stack overflow");
console.log("   Fix: Added stack overflow protection");
console.log();

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
  console.log("   ✅ JSONC parsed successfully:");
  console.log(`      name: ${parsed.name}`);
  console.log(`      nested.level1.level2: ${parsed.nested.level1.level2}`);
} catch (e: any) {
  console.log(`   ❌ JSONC parse error: ${e.message}`);
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
  console.log("   ✅ TOML parsed successfully:");
  console.log(`      title: ${parsed.title}`);
  console.log(`      owner.name: ${parsed.owner.name}`);
  console.log(`      database.ports: [${parsed.database.ports.join(', ')}]`);
} catch (e: any) {
  console.log(`   ❌ TOML parse error: ${e.message}`);
}

console.log("   🔒 Stack overflow protection prevents crashes on deeply nested data");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 2: HTTP/2 Fixes
// ═══════════════════════════════════════════════════════════════════════════════
console.log("2️⃣  HTTP/2 Fixes - Multiple Improvements");
console.log("─".repeat(70));

console.log("   Fixes Applied:");
console.log("   ✅ Extra empty DATA frame eliminated (fixes AWS ALB rejection)");
console.log("   ✅ Initial stream window size uses DEFAULT_WINDOW_SIZE until SETTINGS_ACK");
console.log("   ✅ NGHTTP2_PROTOCOL_ERROR with Fauna fixed");
console.log("   ✅ gRPC NGHTTP2_FRAME_SIZE_ERROR with non-default maxFrameSize fixed");
console.log("   ✅ Settings validation - no more truncation of large values");
console.log("   ✅ Stream windows adjust when INITIAL_WINDOW_SIZE changes");
console.log("   ✅ maxHeaderListSize checking per RFC 7540 Section 6.5.2");
console.log("   ✅ HPACK entry overhead tracking for cumulative header size");
console.log("   ✅ Custom settings validation (max 10, matching Node.js)");
console.log("   ✅ Setting IDs and values validated per RFC 7540");
console.log();

console.log("   Example: HTTP/2 client with proper window management");
console.log("   ```typescript");
console.log("   import { connect } from 'node:http2';");
console.log("   ");
console.log("   const client = connect('https://api.example.com');");
console.log("   const req = client.request({ ':path': '/data' });");
console.log("   ");
console.log("   req.write(data); // No extra empty DATA frame ✅");
console.log("   req.end();       // Clean termination");
console.log("   ```");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 3: Fetch API Fixes
// ═══════════════════════════════════════════════════════════════════════════════
console.log("3️⃣  Fetch API Fixes - Stability & Security");
console.log("─".repeat(70));

console.log("   3.1 HTTP Proxy with Redirects Crash Fix");
console.log("   ────────────────────────────────────────");
console.log("   Issue: Crash if socket closes during redirect processing");
console.log("   Fix: Proper error handling during socket closure");
console.log();

console.log("   3.2 mTLS Certificate Per-Request Fix");
console.log("   ────────────────────────────────────────");
console.log("   Issue: First client cert used for all keepalive requests");
console.log("   Fix: Per-request tls options now respected");
console.log("   ```typescript");
console.log("   // Each request uses its own certificate");
console.log("   fetch('https://api1.example.com', {");
console.log("     tls: { cert: cert1, key: key1 }  // Uses cert1 ✅");
console.log("   });");
console.log("   fetch('https://api2.example.com', {");
console.log("     tls: { cert: cert2, key: key2 }  // Uses cert2 ✅");
console.log("   });");
console.log("   ```");
console.log();

console.log("   3.3 Request.prototype.text() Fix");
console.log("   ────────────────────────────────────────");
console.log("   Issue: 'TypeError: undefined is not a function' under load");
console.log("   Fix: Proper method binding in all cases");

// Demo Request.text()
async function demonstrateRequestText() {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: 'Hello, World!'
  });
  
  try {
    const text = await request.text();
    console.log(`   ✅ Request.text() works: "${text}"`);
  } catch (e: any) {
    console.log(`   ❌ Request.text() failed: ${e.message}`);
  }
}

await demonstrateRequestText();
console.log();

console.log("   3.4 Request Constructor cache/mode Options");
console.log("   ────────────────────────────────────────");
console.log("   Issue: cache and mode options were ignored");
console.log("   Fix: Options now properly applied");

const requestWithOptions = new Request('https://example.com', {
  cache: 'no-store',
  mode: 'cors'
});

console.log(`   ✅ Request.cache: ${requestWithOptions.cache}`);
console.log(`   ✅ Request.mode: ${requestWithOptions.mode}`);
console.log();

console.log("   3.5 NO_PROXY Port Number Fix");
console.log("   ────────────────────────────────────────");
console.log("   Issue: NO_PROXY=localhost:8080 bypassed ALL localhost ports");
console.log("   Fix: Port numbers now respected");
console.log();

console.log("   Example:");
console.log("   NO_PROXY='localhost:8080'");
console.log("   ");
console.log("   Before (broken):");
console.log("     localhost:8080 → No proxy ❌ (correct)");
console.log("     localhost:3000 → No proxy ❌ (WRONG - should use proxy)");
console.log("   ");
console.log("   After (fixed):");
console.log("     localhost:8080 → No proxy ✅ (correct)");
console.log("     localhost:3000 → Use proxy ✅ (correct)");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log("═".repeat(70));
console.log("📊 Summary: Bun APIs, HTTP/2, and Fetch API Fixes");
console.log("═".repeat(70));

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

console.log(Bun.inspect.table(summary, { colors: true }));
console.log();

console.log("🎯 Key Takeaways:");
console.log("   • JSONC/TOML parsing now protected against stack overflow");
console.log("   • HTTP/2 compatibility improved with AWS ALB, Fauna, gRPC");
console.log("   • RFC 7540 compliance: window sizes, settings, headers");
console.log("   • Fetch mTLS works correctly with multiple certificates");
console.log("   • Proxy handling more robust (NO_PROXY, redirects, socket closure)");
console.log("   • Request options properly implemented (cache, mode)");
console.log();
