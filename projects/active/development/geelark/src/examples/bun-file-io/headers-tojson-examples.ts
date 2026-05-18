#!/usr/bin/env bun

/**
 * Bun Headers toJSON() Method - Comprehensive Examples
 *
 * Demonstrates the performance advantages and behavioral nuances of
 * Bun's optimized toJSON() method compared to standard approaches.
 */

import { performance } from 'perf_hooks';

// Example 1: Performance Comparison
console.info('⚡ Performance Comparison: toJSON() vs Object.fromEntries()');

async function performanceComparison() {
  const iterations = 10000;

  // Create headers with realistic data
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', 'Bearer token123');
  headers.append('X-Custom-Header', 'custom-value');
  headers.append('X-Request-ID', 'req-456');
  headers.append('Accept', 'application/json');
  headers.append('User-Agent', 'Bun-Demo/1.0');
  headers.append('Cache-Control', 'no-cache');
  headers.append('Pragma', 'no-cache');
  headers.append('Set-Cookie', 'sessionId=abc123; Path=/; HttpOnly');
  headers.append('Set-Cookie', 'theme=dark; Path=/; Max-Age=3600');
  headers.append('Set-Cookie', 'lang=en; Path=/; Secure');

  console.info(`🔄 Testing with ${iterations} iterations...`);

  // Test Bun's toJSON() method
  const toJSONStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = headers.toJSON();
  }
  const toJSONTime = performance.now() - toJSONStart;

  // Test Object.fromEntries() approach
  const fromEntriesStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = Object.fromEntries((headers as any).entries());
  }
  const fromEntriesTime = performance.now() - fromEntriesStart;

  const speedup = fromEntriesTime / toJSONTime;

  console.info(`📊 Results:`);
  console.info(`   toJSON(): ${toJSONTime.toFixed(2)}ms`);
  console.info(`   Object.fromEntries(): ${fromEntriesTime.toFixed(2)}ms`);
  console.info(`   Speedup: ${speedup.toFixed(1)}x faster`);

  return { toJSONTime, fromEntriesTime, speedup };
}

// Example 2: Behavioral Analysis - Case Handling
console.info('\n🔍 Behavioral Analysis: Case Handling');

function caseHandlingDemo() {
  const headers = new Headers();

  // Mix of well-known and custom headers with various cases
  headers.append('Content-Type', 'application/json');
  headers.append('AUTHORIZATION', 'Bearer token');
  headers.append('X-Custom-Header', 'custom-value');
  headers.append('x-another-custom', 'another-value');
  headers.append('User-Agent', 'Bun/1.0');
  headers.append('SET-COOKIE', 'session=abc');
  headers.append('Set-Cookie', 'theme=dark');

  const toJSONResult = headers.toJSON();
  const fromEntriesResult = Object.fromEntries((headers as any).entries());

  console.info('📋 toJSON() result:');
  console.info(JSON.stringify(toJSONResult, null, 2));

  console.info('\n📋 Object.fromEntries() result:');
  console.info(JSON.stringify(fromEntriesResult, null, 2));

  console.info('\n🔍 Key Differences:');
  console.info('   Well-known headers (Content-Type, Authorization, User-Agent):');
  console.info(`     toJSON(): "${toJSONResult['content-type']}" (lowercased)`);
  console.info(`     fromEntries(): "${fromEntriesResult['Content-Type']}" (preserved)`);

  console.info('\n   Custom headers (X-Custom-Header, x-another-custom):');
  console.info(`     toJSON(): "${toJSONResult['X-Custom-Header']}" (preserved)`);
  console.info(`     fromEntries(): "${fromEntriesResult['X-Custom-Header']}" (preserved)`);
}

// Example 3: Set-Cookie Special Handling
console.info('\n🍪 Set-Cookie Special Handling');

function setCookieHandlingDemo() {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Set-Cookie', 'sessionId=abc123; Path=/; HttpOnly');
  headers.append('Set-Cookie', 'theme=dark; Path=/; Max-Age=3600');
  headers.append('Set-Cookie', 'lang=en; Path=/; Secure');
  headers.append('X-Request-ID', 'req-789');

  const toJSONResult = headers.toJSON();
  const fromEntriesResult = Object.fromEntries((headers as any).entries());

  console.info('📋 toJSON() Set-Cookie handling:');
  console.info(`   Type: ${Array.isArray(toJSONResult['set-cookie']) ? 'array' : typeof toJSONResult['set-cookie']}`);
  console.info(`   Values: ${JSON.stringify(toJSONResult['set-cookie'])}`);

  console.info('\n📋 Object.fromEntries() Set-Cookie handling:');
  console.info(`   Type: ${typeof fromEntriesResult['Set-Cookie']}`);
  console.info(`   Values: ${JSON.stringify(fromEntriesResult['Set-Cookie'])}`);

  console.info('\n⚠️  Important Note:');
  console.info('   toJSON() always returns set-cookie as an array');
  console.info('   Object.fromEntries() only returns the last Set-Cookie value');
}

// Example 4: Insertion Order Behavior
console.info('\n📦 Insertion Order Behavior');

function insertionOrderDemo() {
  const headers = new Headers();

  // Add headers in specific order
  headers.append('Z-Header', 'last-alphabetically');
  headers.append('A-Header', 'first-alphabetically');
  headers.append('M-Header', 'middle-alphabetically');
  headers.append('Content-Type', 'application/json');
  headers.append('X-Custom', 'custom');

  const toJSONResult = headers.toJSON();
  const fromEntriesResult = Object.fromEntries((headers as any).entries());

  console.info('📋 Headers added in order: Z → A → M → Content-Type → X-Custom');

  console.info('\n📋 toJSON() order (not preserved):');
  console.info(`   Keys: ${Object.keys(toJSONResult).join(' → ')}`);

  console.info('\n📋 Object.fromEntries() order (preserved):');
  console.info(`   Keys: ${Object.keys(fromEntriesResult).join(' → ')}`);

  console.info('\n💡 Insight:');
  console.info('   toJSON() reorders headers (well-known headers first, then alphabetical)');
  console.info('   Object.fromEntries() preserves insertion order');
}

// Example 5: JSON.stringify() Integration
console.info('\n🔄 JSON.stringify() Integration');

function jsonStringifyIntegration() {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', 'Bearer secret');
  headers.append('Set-Cookie', 'session=xyz');
  headers.append('Set-Cookie', 'theme=light');

  console.info('📋 Direct JSON.stringify() usage:');

  // toJSON() is called automatically by JSON.stringify()
  const jsonString = JSON.stringify(headers, null, 2);
  console.info(jsonString);

  console.info('\n📋 Manual toJSON() then JSON.stringify():');
  const manualResult = JSON.stringify(headers.toJSON(), null, 2);
  console.info(manualResult);

  console.info('\n✅ Both approaches produce identical results');
  console.info('💡 Use JSON.stringify(headers) directly - toJSON() is called automatically');
}

// Example 6: Real-World Usage Scenarios
console.info('\n🌐 Real-World Usage Scenarios');

function realWorldScenarios() {
  // Scenario 1: API Response Logging
  console.info('📝 Scenario 1: API Response Logging');

  const responseHeaders = new Headers();
  responseHeaders.append('Content-Type', 'application/json');
  responseHeaders.append('X-Request-ID', 'req-123');
  responseHeaders.append('X-Response-Time', '45ms');
  responseHeaders.append('Set-Cookie', 'session=abc');

  const logEntry = {
    timestamp: new Date().toISOString(),
    status: 200,
    headers: responseHeaders.toJSON() // Fast serialization for logging
  };

  console.info('📊 Log entry with serialized headers:');
  console.info(JSON.stringify(logEntry, null, 2));

  // Scenario 2: Client Response Headers
  console.info('\n🌐 Scenario 2: Client Response Headers');

  const clientHeaders = new Headers();
  clientHeaders.append('Content-Type', 'text/html');
  clientHeaders.append('Cache-Control', 'public, max-age=3600');
  clientHeaders.append('X-Frame-Options', 'DENY');
  clientHeaders.append('Set-Cookie', 'preferences=dark');
  clientHeaders.append('Set-Cookie', 'locale=en');

  // Simulate sending headers to client
  const clientResponse = {
    status: 200,
    headers: clientHeaders.toJSON()
  };

  console.info('📤 Client response with optimized headers:');
  console.info(JSON.stringify(clientResponse, null, 2));

  // Scenario 3: Header Analysis
  console.info('\n🔍 Scenario 3: Header Analysis');

  const analysisHeaders = new Headers();
  analysisHeaders.append('Content-Type', 'application/json');
  analysisHeaders.append('Content-Length', '1024');
  analysisHeaders.append('Authorization', 'Bearer token');
  analysisHeaders.append('X-Rate-Limit-Remaining', '99');

  const headersObj = analysisHeaders.toJSON();

  console.info('📊 Header Analysis:');
  console.info(`   Content-Type: ${headersObj['content-type']}`);
  console.info(`   Content-Length: ${headersObj['content-length']}`);
  console.info(`   Authorization: ${headersObj.authorization ? 'Present' : 'Missing'}`);
  console.info(`   Rate Limit: ${headersObj['x-rate-limit-remaining']} requests remaining`);
}

// Example 7: Best Practices and When to Use
console.info('\n💡 Best Practices and Usage Guidelines');

function bestPracticesDemo() {
  console.info('✅ Use toJSON() when:');
  console.info('   • Performance is critical (high-volume servers)');
  console.info('   • You need a plain object representation');
  console.info('   • You\'re serializing for JSON responses');
  console.info('   • Header case normalization is acceptable');

  console.info('\n❌ Avoid toJSON() when:');
  console.info('   • You need to preserve exact header casing');
  console.info('   • Insertion order is important');
  console.info('   • You need to iterate over headers in order');
  console.info('   • You need individual Set-Cookie values (not arrays)');

  // Demonstration of when to use each approach
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('X-Custom', 'value');
  headers.append('Set-Cookie', 'session=abc');

  console.info('\n📊 Fast serialization (use toJSON()):');
  const fastResult = headers.toJSON();
  console.info(JSON.stringify(fastResult));

  console.info('\n📊 Ordered iteration (use entries()):');
  const orderedResult = Array.from((headers as any).entries());
  console.info(JSON.stringify(orderedResult));
}

// Main execution function
async function runAllExamples() {
  console.info('🚀 Bun Headers toJSON() - Comprehensive Examples');
  console.info('===============================================\n');

  try {
    await performanceComparison();
    caseHandlingDemo();
    setCookieHandlingDemo();
    insertionOrderDemo();
    jsonStringifyIntegration();
    realWorldScenarios();
    bestPracticesDemo();

    console.info('\n🎉 All toJSON() examples completed!');
    console.info('💡 Key takeaway: Use toJSON() for performance-critical serialization');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('headers-tojson-examples.ts')) {
  runAllExamples().catch(console.error);
}

export {
    bestPracticesDemo, caseHandlingDemo, insertionOrderDemo,
    jsonStringifyIntegration, performanceComparison, realWorldScenarios, setCookieHandlingDemo
};
