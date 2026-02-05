#!/usr/bin/env bun

/**
 * Bun Headers toJSON() Method - Comprehensive Examples
 *
 * Demonstrates the performance advantages and behavioral nuances of
 * Bun's optimized toJSON() method compared to standard approaches.
 */

import { performance } from 'perf_hooks';

// Example 1: Performance Comparison
console.log('⚡ Performance Comparison: toJSON() vs Object.fromEntries()');

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

  console.log(`🔄 Testing with ${iterations} iterations...`);

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

  console.log(`📊 Results:`);
  console.log(`   toJSON(): ${toJSONTime.toFixed(2)}ms`);
  console.log(`   Object.fromEntries(): ${fromEntriesTime.toFixed(2)}ms`);
  console.log(`   Speedup: ${speedup.toFixed(1)}x faster`);

  return { toJSONTime, fromEntriesTime, speedup };
}

// Example 2: Behavioral Analysis - Case Handling
console.log('\n🔍 Behavioral Analysis: Case Handling');

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

  console.log('📋 toJSON() result:');
  console.log(JSON.stringify(toJSONResult, null, 2));

  console.log('\n📋 Object.fromEntries() result:');
  console.log(JSON.stringify(fromEntriesResult, null, 2));

  console.log('\n🔍 Key Differences:');
  console.log('   Well-known headers (Content-Type, Authorization, User-Agent):');
  console.log(`     toJSON(): "${toJSONResult['content-type']}" (lowercased)`);
  console.log(`     fromEntries(): "${fromEntriesResult['Content-Type']}" (preserved)`);

  console.log('\n   Custom headers (X-Custom-Header, x-another-custom):');
  console.log(`     toJSON(): "${toJSONResult['X-Custom-Header']}" (preserved)`);
  console.log(`     fromEntries(): "${fromEntriesResult['X-Custom-Header']}" (preserved)`);
}

// Example 3: Set-Cookie Special Handling
console.log('\n🍪 Set-Cookie Special Handling');

function setCookieHandlingDemo() {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Set-Cookie', 'sessionId=abc123; Path=/; HttpOnly');
  headers.append('Set-Cookie', 'theme=dark; Path=/; Max-Age=3600');
  headers.append('Set-Cookie', 'lang=en; Path=/; Secure');
  headers.append('X-Request-ID', 'req-789');

  const toJSONResult = headers.toJSON();
  const fromEntriesResult = Object.fromEntries((headers as any).entries());

  console.log('📋 toJSON() Set-Cookie handling:');
  console.log(`   Type: ${Array.isArray(toJSONResult['set-cookie']) ? 'array' : typeof toJSONResult['set-cookie']}`);
  console.log(`   Values: ${JSON.stringify(toJSONResult['set-cookie'])}`);

  console.log('\n📋 Object.fromEntries() Set-Cookie handling:');
  console.log(`   Type: ${typeof fromEntriesResult['Set-Cookie']}`);
  console.log(`   Values: ${JSON.stringify(fromEntriesResult['Set-Cookie'])}`);

  console.log('\n⚠️  Important Note:');
  console.log('   toJSON() always returns set-cookie as an array');
  console.log('   Object.fromEntries() only returns the last Set-Cookie value');
}

// Example 4: Insertion Order Behavior
console.log('\n📦 Insertion Order Behavior');

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

  console.log('📋 Headers added in order: Z → A → M → Content-Type → X-Custom');

  console.log('\n📋 toJSON() order (not preserved):');
  console.log(`   Keys: ${Object.keys(toJSONResult).join(' → ')}`);

  console.log('\n📋 Object.fromEntries() order (preserved):');
  console.log(`   Keys: ${Object.keys(fromEntriesResult).join(' → ')}`);

  console.log('\n💡 Insight:');
  console.log('   toJSON() reorders headers (well-known headers first, then alphabetical)');
  console.log('   Object.fromEntries() preserves insertion order');
}

// Example 5: JSON.stringify() Integration
console.log('\n🔄 JSON.stringify() Integration');

function jsonStringifyIntegration() {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', 'Bearer secret');
  headers.append('Set-Cookie', 'session=xyz');
  headers.append('Set-Cookie', 'theme=light');

  console.log('📋 Direct JSON.stringify() usage:');

  // toJSON() is called automatically by JSON.stringify()
  const jsonString = JSON.stringify(headers, null, 2);
  console.log(jsonString);

  console.log('\n📋 Manual toJSON() then JSON.stringify():');
  const manualResult = JSON.stringify(headers.toJSON(), null, 2);
  console.log(manualResult);

  console.log('\n✅ Both approaches produce identical results');
  console.log('💡 Use JSON.stringify(headers) directly - toJSON() is called automatically');
}

// Example 6: Real-World Usage Scenarios
console.log('\n🌐 Real-World Usage Scenarios');

function realWorldScenarios() {
  // Scenario 1: API Response Logging
  console.log('📝 Scenario 1: API Response Logging');

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

  console.log('📊 Log entry with serialized headers:');
  console.log(JSON.stringify(logEntry, null, 2));

  // Scenario 2: Client Response Headers
  console.log('\n🌐 Scenario 2: Client Response Headers');

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

  console.log('📤 Client response with optimized headers:');
  console.log(JSON.stringify(clientResponse, null, 2));

  // Scenario 3: Header Analysis
  console.log('\n🔍 Scenario 3: Header Analysis');

  const analysisHeaders = new Headers();
  analysisHeaders.append('Content-Type', 'application/json');
  analysisHeaders.append('Content-Length', '1024');
  analysisHeaders.append('Authorization', 'Bearer token');
  analysisHeaders.append('X-Rate-Limit-Remaining', '99');

  const headersObj = analysisHeaders.toJSON();

  console.log('📊 Header Analysis:');
  console.log(`   Content-Type: ${headersObj['content-type']}`);
  console.log(`   Content-Length: ${headersObj['content-length']}`);
  console.log(`   Authorization: ${headersObj.authorization ? 'Present' : 'Missing'}`);
  console.log(`   Rate Limit: ${headersObj['x-rate-limit-remaining']} requests remaining`);
}

// Example 7: Best Practices and When to Use
console.log('\n💡 Best Practices and Usage Guidelines');

function bestPracticesDemo() {
  console.log('✅ Use toJSON() when:');
  console.log('   • Performance is critical (high-volume servers)');
  console.log('   • You need a plain object representation');
  console.log('   • You\'re serializing for JSON responses');
  console.log('   • Header case normalization is acceptable');

  console.log('\n❌ Avoid toJSON() when:');
  console.log('   • You need to preserve exact header casing');
  console.log('   • Insertion order is important');
  console.log('   • You need to iterate over headers in order');
  console.log('   • You need individual Set-Cookie values (not arrays)');

  // Demonstration of when to use each approach
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('X-Custom', 'value');
  headers.append('Set-Cookie', 'session=abc');

  console.log('\n📊 Fast serialization (use toJSON()):');
  const fastResult = headers.toJSON();
  console.log(JSON.stringify(fastResult));

  console.log('\n📊 Ordered iteration (use entries()):');
  const orderedResult = Array.from((headers as any).entries());
  console.log(JSON.stringify(orderedResult));
}

// Main execution function
async function runAllExamples() {
  console.log('🚀 Bun Headers toJSON() - Comprehensive Examples');
  console.log('===============================================\n');

  try {
    await performanceComparison();
    caseHandlingDemo();
    setCookieHandlingDemo();
    insertionOrderDemo();
    jsonStringifyIntegration();
    realWorldScenarios();
    bestPracticesDemo();

    console.log('\n🎉 All toJSON() examples completed!');
    console.log('💡 Key takeaway: Use toJSON() for performance-critical serialization');

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
