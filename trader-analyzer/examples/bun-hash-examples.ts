/**
 * @fileoverview Bun 1.3 Hash Utilities Examples
 * @description Practical examples of using Bun.hash for various use cases
 * @module examples/bun-hash-examples
 */

import { hash } from "bun";

/**
 * Example 1: Cache Key Generation
 * Using rapidhash for fast, consistent cache keys
 */
export function cacheKeyExamples() {
  console.log("=== Cache Key Generation ===\n");

  // Generate cache keys for API responses
  const apiRequests = [
    { endpoint: "/api/users", params: { page: 1, limit: 10 } },
    { endpoint: "/api/trades", params: { symbol: "BTC", since: "2024-01-01" } },
    { endpoint: "/api/markets", params: { exchange: "binance", type: "spot" } },
  ];

  console.log("API Cache Keys:");
  for (const req of apiRequests) {
    const keyData = JSON.stringify({ endpoint: req.endpoint, params: req.params });
    const cacheKey = hash.rapidhash(keyData).toString(36); // Base36 for shorter keys
    console.log(`${req.endpoint}: ${cacheKey}`);
  }

  // Database query result caching
  const queries = [
    "SELECT * FROM trades WHERE symbol = 'BTC' AND timestamp > '2024-01-01'",
    "SELECT COUNT(*) FROM users WHERE status = 'active'",
    "SELECT AVG(price) FROM market_data WHERE exchange = 'binance'",
  ];

  console.log("\nDatabase Query Cache Keys:");
  for (const query of queries) {
    const queryKey = hash.rapidhash(query).toString(16).slice(0, 16); // 16-char hex
    console.log(`Query: ${queryKey} -> ${query.slice(0, 50)}...`);
  }

  console.log("✅ Consistent, fast cache key generation\n");
}

/**
 * Example 2: Data Integrity Checking
 * Using hash for checksums and data validation
 */
export function dataIntegrityExamples() {
  console.log("=== Data Integrity & Checksums ===\n");

  // File content integrity
  const fileContents = [
    "configuration.json",
    "user_data.csv",
    "market_prices.json",
  ];

  console.log("File Integrity Checksums:");
  for (const filename of fileContents) {
    // Simulate file content
    const content = `Content of ${filename} at ${new Date().toISOString()}`;
    const checksum = hash.rapidhash(content);
    console.log(`${filename}: ${checksum.toString(16).slice(0, 16)}`);
  }

  // API response integrity
  const apiResponses = [
    { data: { users: 1500, active: 1200 }, timestamp: Date.now() },
    { data: { trades: 50000, volume: 2500000 }, timestamp: Date.now() },
    { data: { markets: 25, exchanges: 8 }, timestamp: Date.now() },
  ];

  console.log("\nAPI Response Integrity:");
  for (const response of apiResponses) {
    const responseStr = JSON.stringify(response);
    const integrityHash = hash.crc32(responseStr); // 32-bit for smaller footprint
    console.log(`Response: ${integrityHash.toString(16)} (CRC32)`);
  }

  console.log("✅ Data integrity verification\n");
}

/**
 * Example 3: ID Generation and Deduplication
 * Using hash for generating unique identifiers
 */
export function idGenerationExamples() {
  console.log("=== ID Generation & Deduplication ===\n");

  // Generate short IDs from complex data
  const entities = [
    { type: "user", email: "user@example.com", created: "2024-01-01" },
    { type: "trade", symbol: "BTC/USDT", exchange: "binance", id: "12345" },
    { type: "market", pair: "ETH/BTC", venue: "coinbase" },
  ];

  console.log("Entity Short IDs:");
  for (const entity of entities) {
    const entityStr = JSON.stringify(entity);
    const shortId = hash.rapidhash(entityStr).toString(36).slice(0, 8); // 8-char base36
    console.log(`${entity.type}: ${shortId} (${JSON.stringify(entity).slice(0, 40)}...)`);
  }

  // Deduplication using hash
  const events = [
    "User login: user123",
    "User login: user123", // Duplicate
    "Trade executed: BTC 0.5",
    "Price update: BTC 45000",
    "User login: user123", // Another duplicate
    "Trade executed: ETH 2.0",
  ];

  console.log("\nEvent Deduplication:");
  const seenHashes = new Set<bigint>();
  let duplicates = 0;

  for (const event of events) {
    const eventHash = hash.wyhash(event);
    if (seenHashes.has(eventHash)) {
      duplicates++;
      console.log(`DUPLICATE: ${event} (hash: ${eventHash.toString(16).slice(0, 8)})`);
    } else {
      seenHashes.add(eventHash);
      console.log(`NEW: ${event} (hash: ${eventHash.toString(16).slice(0, 8)})`);
    }
  }

  console.log(`\nFound ${duplicates} duplicate events`);
  console.log("✅ Efficient ID generation and deduplication\n");
}

/**
 * Example 4: Performance Comparison
 * Comparing hash algorithms for different use cases
 */
export function performanceComparison() {
  console.log("=== Hash Algorithm Performance Comparison ===\n");

  const testData = "Performance test data for Bun hash algorithms comparison";
  const iterations = 100000;

  const algorithms = [
    { name: "rapidhash", fn: hash.rapidhash },
    { name: "wyhash", fn: hash.wyhash },
    { name: "crc32", fn: hash.crc32 },
  ];

  console.log(`Testing ${iterations.toLocaleString()} iterations with "${testData}"\n`);

  for (const algo of algorithms) {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      algo.fn(testData + i); // Vary input slightly
    }

    const end = performance.now();
    const totalTime = end - start;
    const rate = iterations / (totalTime / 1000);

    console.log(`${algo.name}:`);
    console.log(`  Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Rate: ${rate.toLocaleString()}/sec`);
    console.log(`  Per op: ${(totalTime / iterations * 1000).toFixed(3)}μs\n`);
  }

  console.log("💡 Choose algorithm based on your needs:");
  console.log("   • rapidhash: General purpose, fastest for most cases");
  console.log("   • wyhash: Alternative high-performance option");
  console.log("   • crc32: Smaller output (32-bit), good for checksums");
  console.log("✅ Performance-optimized hashing\n");
}

/**
 * Example 5: Real-world Application - URL Shortener
 * Using hash for generating short URLs
 */
export function urlShortenerExample() {
  console.log("=== Real-World: URL Shortener ===\n");

  // Simulate URL shortening service
  const urls = [
    "https://github.com/oven-sh/bun",
    "https://bun.sh/docs",
    "https://example.com/very/long/path/to/some/resource",
    "https://api.github.com/repos/oven-sh/bun/issues",
  ];

  console.log("URL Shortener using Bun.hash:");
  const shortCodes = new Map<string, string>();

  for (const url of urls) {
    // Create short code from URL hash
    const urlHash = hash.rapidhash(url);
    const shortCode = urlHash.toString(36).slice(0, 6); // 6-char base36

    shortCodes.set(shortCode, url);
    console.log(`${shortCode} -> ${url}`);
  }

  // Simulate lookups
  console.log("\nReverse lookups:");
  const testCodes = ["abc123", "def456", shortCodes.keys().next().value];
  for (const code of testCodes) {
    const originalUrl = shortCodes.get(code);
    console.log(`${code} -> ${originalUrl || "NOT FOUND"}`);
  }

  console.log("✅ Efficient URL shortening with hash-based codes\n");
}

// Run all examples
export function runAllHashExamples() {
  console.log("🚀 Bun 1.3 Hash Utilities - Practical Examples\n");

  cacheKeyExamples();
  dataIntegrityExamples();
  idGenerationExamples();
  performanceComparison();
  urlShortenerExample();

  console.log("🎯 Bun.hash provides enterprise-grade hashing performance!");
  console.log("   • Ultra-fast algorithms (millions of ops/sec)");
  console.log("   • Multiple hash functions for different needs");
  console.log("   • Perfect for caching, integrity, and ID generation");
  console.log("   • Zero external dependencies");
}

// Allow running as standalone script
if (import.meta.main) {
  runAllHashExamples();
}