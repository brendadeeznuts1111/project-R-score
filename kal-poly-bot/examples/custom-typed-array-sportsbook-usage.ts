/**
 * [EXAMPLE][SPORTSBOOK][CUSTOM-TYPED-ARRAY][META:{useCase: production-integration, visibility: development}]
 * Production-ready usage examples for CustomTypedArray in sportsbook infrastructure
 * #REF:CustomTypedArray, #REF:HighFrequencyOddsFeed, #REF:LimitOrderMatchingEngine]
 */

import { 
  CustomTypedArray, 
  BinaryProtocolDebugger, 
  IntegratedBinaryLogger 
} from '../src/types/custom-typed-array';

/**
 * SPORTSBOOK USE CASE 1: High-Frequency Odds Feed Processing
 * 
 * Demonstrates how to handle binary odds feed messages with depth-aware debugging
 */
export class OddsFeedProcessor {
  private logger: IntegratedBinaryLogger;
  
  constructor() {
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Process incoming binary odds feed message
   * 
   * @param binaryData - Raw binary data from feed provider
   * @param providerId - Provider identifier (e.g., "provider-1")
   */
  processOddsFeed(binaryData: Uint8Array, providerId: string): void {
    // Wrap in CustomTypedArray for safe inspection
    const feedArray = CustomTypedArray.fromUint8Array(
      binaryData,
      `odds-feed:${providerId}`
    );
    
    // Log with context for debugging
    this.logger.logBinaryEvent(
      'odds-feed-received',
      binaryData,
      'info',
      1 // Medium depth for preview
    );
    
    // Parse binary protocol (example structure)
    const view = new DataView(feedArray.buffer, feedArray.byteOffset, feedArray.byteLength);
    
    // Read header
    const magic = view.getUint32(0, true);
    const timestamp = view.getBigUint64(4, true);
    const marketCount = view.getUint16(12, true);
    
    console.log(`[OddsFeed] Provider: ${providerId}, Markets: ${marketCount}, Magic: ${magic.toString(16)}`);
    
    // Process each market
    for (let i = 0; i < marketCount; i++) {
      const offset = 14 + i * 16;
      const marketId = view.getUint32(offset, true);
      const eventId = view.getUint32(offset + 4, true);
      const odds = view.getFloat64(offset + 8, true);
      
      // Create subarray for this market's data
      const marketData = feedArray.subarray(offset, offset + 16);
      
      // Log market update
      this.logger.logMarketUpdate(
        {
          marketId,
          status: 'active',
          providerCount: 1
        },
        marketData
      );
      
      // Debug with full dump if needed
      if (odds > 1000) {
        console.log('⚠️  High odds detected, full dump:');
        console.log(marketData.inspect(2, {}, (v: any) => JSON.stringify(v)));
      }
    }
  }
  
  /**
   * Handle feed errors with security monitoring
   */
  handleFeedError(errorData: Uint8Array, providerId: string): void {
    this.logger.logBinaryEvent(
      `feed-error:${providerId}`,
      errorData,
      'error',
      2 // Full depth for forensic analysis
    );
  }
}

/**
 * SPORTSBOOK USE CASE 2: Limit Order Matching Engine
 * 
 * Demonstrates order book binary protocol debugging
 */
export class OrderMatchingEngine {
  private logger: IntegratedBinaryLogger;
  
  constructor() {
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Process incoming order binary message
   * 
   * @param orderBinary - Binary order data
   * @param marketId - Target market
   */
  processOrder(orderBinary: Uint8Array, marketId: number): void {
    const orderArray = CustomTypedArray.fromUint8Array(
      orderBinary,
      `order:${marketId}`
    );
    
    // Parse order structure
    const view = new DataView(orderArray.buffer, orderArray.byteOffset, orderArray.byteLength);
    
    const orderId = view.getBigUint64(0, true);
    const side = view.getUint8(8); // 0 = buy, 1 = sell
    const price = view.getFloat64(9, true);
    const quantity = view.getUint32(17, true);
    
    console.log(`[Order] ID: ${orderId}, Side: ${side === 0 ? 'BUY' : 'SELL'}, Price: $${price}, Qty: ${quantity}`);
    
    // Log order match event
    this.logger.logOrderMatch(
      {
        orderId: orderId.toString(),
        matchPrice: price,
        quantity
      },
      orderArray
    );
    
    // Validate order size (security check)
    if (quantity > 1000000) {
      console.warn('⚠️  Suspicious large order detected');
      console.log(orderArray.inspect(2, {}, (v: any) => JSON.stringify(v)));
    }
  }
  
  /**
   * Process order book snapshot
   */
  processOrderBookSnapshot(snapshotData: Uint8Array, marketId: number): void {
    const snapshot = CustomTypedArray.fromUint8Array(
      snapshotData,
      `orderbook:${marketId}`
    );
    
    console.log(`[OrderBook] Snapshot received for market ${marketId}, size: ${snapshot.length} bytes`);
    
    // Show preview only (depth 1) to avoid log bloat
    console.log(snapshot.inspect(1, {}, (v: any) => JSON.stringify(v)));
  }
}

/**
 * SPORTSBOOK USE CASE 3: Real-Time Market Data Aggregation
 * 
 * Demonstrates handling aggregated market data from multiple providers
 */
export class MarketDataAggregator {
  private providerBuffers: Map<string, CustomTypedArray>;
  private logger: IntegratedBinaryLogger;
  
  constructor() {
    this.providerBuffers = new Map();
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Aggregate data from multiple providers
   */
  aggregateProviders(
    providerId: string,
    data: Uint8Array,
    timestamp: bigint
  ): void {
    // Store provider data with context
    const buffer = CustomTypedArray.fromUint8Array(
      data,
      `provider:${providerId}`
    );
    
    this.providerBuffers.set(providerId, buffer);
    
    // Log aggregation event
    this.logger.logBinaryEvent(
      'provider-aggregation',
      data,
      'info',
      0 // Shallow depth for performance
    );
    
    // Check for data staleness
    const ageMs = Date.now() - buffer.createdAt;
    if (ageMs > 5000) {
      console.warn(`⚠️  Stale data from ${providerId}: ${ageMs}ms`);
    }
  }
  
  /**
   * Get aggregated view with quality metrics
   */
  getAggregatedView(marketId: number): {
    providers: number;
    totalBytes: number;
    quality: string;
  } {
    let totalBytes = 0;
    
    for (const [providerId, buffer] of this.providerBuffers) {
      totalBytes += buffer.length;
      
      // Inspect each provider's data at shallow depth
      console.log(`[${providerId}] `, buffer.inspect(0, {}, (v: any) => JSON.stringify(v)));
    }
    
    return {
      providers: this.providerBuffers.size,
      totalBytes,
      quality: this.providerBuffers.size >= 2 ? 'HIGH' : 'LOW'
    };
  }
  
  /**
   * Clear old buffers (memory management)
   */
  cleanup(maxAgeMs: number = 10000): void {
    const now = Date.now();
    for (const [providerId, buffer] of this.providerBuffers) {
      if (now - buffer.createdAt > maxAgeMs) {
        console.log(`Cleaning up stale buffer: ${providerId}`);
        this.providerBuffers.delete(providerId);
      }
    }
  }
}

/**
 * SPORTSBOOK USE CASE 4: Binary Protocol Validation & Debugging
 * 
 * Demonstrates protocol validation with security monitoring
 */
export class BinaryProtocolValidator {
  /**
   * Validate and debug binary protocol messages
   */
  static validateMessage(
    data: Uint8Array,
    expectedMagic: number,
    protocolVersion: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const array = CustomTypedArray.fromUint8Array(data, 'validation');
    
    // Check length
    if (data.length < 16) {
      errors.push('Message too short');
      return { valid: false, errors };
    }
    
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    
    // Validate magic number
    const magic = view.getUint32(0, true);
    if (magic !== expectedMagic) {
      errors.push(`Invalid magic: ${magic.toString(16)} (expected ${expectedMagic.toString(16)})`);
    }
    
    // Validate version
    const version = view.getUint8(4);
    if (version !== protocolVersion) {
      errors.push(`Unsupported version: ${version} (expected ${protocolVersion})`);
    }
    
    // Check for suspicious patterns (security)
    const suspiciousPatterns = [
      { pattern: [0xFF, 0xFF, 0xFF, 0xFF], name: 'All 0xFF' },
      { pattern: [0x00, 0x00, 0x00, 0x00], name: 'All 0x00' }
    ];
    
    for (const { pattern, name } of suspiciousPatterns) {
      let match = true;
      for (let i = 0; i < pattern.length && i < data.length; i++) {
        if (data[i] !== pattern[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        errors.push(`Suspicious pattern detected: ${name}`);
      }
    }
    
    // Log validation result
    if (errors.length > 0) {
      console.log('❌ Protocol validation failed:');
      console.log(array.inspect(2, {}, (v: any) => JSON.stringify(v)));
      errors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('✅ Protocol validation passed');
      console.log(array.inspect(1, {}, (v: any) => JSON.stringify(v)));
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Benchmark protocol parsing performance
   */
  static benchmarkParsing(iterations: number = 1000): void {
    const testData = new Uint8Array(64);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = i % 256;
    }
    
    const customArray = new CustomTypedArray(64, 'benchmark');
    customArray.set(testData);
    
    console.log(`\n=== Benchmarking ${iterations} iterations ===`);
    
    // Regular parsing
    console.time('Regular parsing');
    for (let i = 0; i < iterations; i++) {
      const view = new DataView(testData.buffer);
      view.getUint32(0, true);
      view.getBigUint64(4, true);
    }
    console.timeEnd('Regular parsing');
    
    // Parsing with validation
    console.time('Parsing with validation');
    for (let i = 0; i < iterations; i++) {
      const view = new DataView(customArray.buffer, customArray.byteOffset, customArray.byteLength);
      view.getUint32(0, true);
      view.getBigUint64(4, true);
      // Simulate validation
      customArray.toHex();
    }
    console.timeEnd('Parsing with validation');
  }
}

/**
 * SPORTSBOOK USE CASE 5: Production Debugging & Forensics
 * 
 * Real-world debugging scenarios
 */
export class ProductionDebugger {
  private logger: IntegratedBinaryLogger;
  
  constructor() {
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Debug scenario: Market data discrepancy
   */
  debugMarketDiscrepancy(
    providerA: Uint8Array,
    providerB: Uint8Array,
    marketId: number
  ): void {
    console.log(`\n🔍 Investigating market ${marketId} discrepancy...`);
    
    const arrayA = CustomTypedArray.fromUint8Array(providerA, `provider-A:${marketId}`);
    const arrayB = CustomTypedArray.fromUint8Array(providerB, `provider-B:${marketId}`);
    
    // Show both with full context
    console.log('\nProvider A:');
    console.log(arrayA.inspect(2, {}, (v: any) => JSON.stringify(v)));
    
    console.log('\nProvider B:');
    console.log(arrayB.inspect(2, {}, (v: any) => JSON.stringify(v)));
    
    // Compare byte-by-byte
    const minLength = Math.min(providerA.length, providerB.length);
    let differences = 0;
    
    for (let i = 0; i < minLength; i++) {
      if (providerA[i] !== providerB[i]) {
        differences++;
        if (differences <= 5) { // Show first 5 differences
          console.log(`Byte ${i}: A=${providerA[i].toString(16).padStart(2, '0')} B=${providerB[i].toString(16).padStart(2, '0')}`);
        }
      }
    }
    
    if (differences > 5) {
      console.log(`... and ${differences - 5} more differences`);
    }
    
    console.log(`Total differences: ${differences}`);
  }
  
  /**
   * Debug scenario: Memory leak detection
   */
  debugMemoryLeak(): void {
    console.log('\n🔍 Memory usage analysis...');
    
    const allocations: CustomTypedArray[] = [];
    
    // Simulate multiple allocations
    for (let i = 0; i < 5; i++) {
      const arr = new CustomTypedArray(1024, `allocation-${i}`);
      arr.fill(i);
      allocations.push(arr);
    }
    
    // Show all allocations with age
    allocations.forEach((arr, i) => {
      const info = arr.inspectInfo;
      console.log(`Allocation ${i}: ${info.length} bytes, age: ${info.ageMs}ms, context: ${info.context}`);
    });
    
    // Show shallow inspection to prevent log bloat
    console.log('\nShallow inspection of all allocations:');
    allocations.forEach((arr, i) => {
      console.log(`${i}: `, arr.inspect(0, {}, (v: any) => JSON.stringify(v)));
    });
  }
  
  /**
   * Debug scenario: Protocol violation
   */
  debugProtocolViolation(data: Uint8Array, violationType: string): void {
    console.log(`\n🚨 Protocol Violation: ${violationType}`);
    
    const array = CustomTypedArray.fromUint8Array(data, `violation:${violationType}`);
    
    // Always show full dump for violations
    console.log(array.inspect(2, {}, (v: any) => JSON.stringify(v)));
    
    // Report to threat intelligence
    this.logger.logBinaryEvent(
      `protocol-violation:${violationType}`,
      data,
      'error',
      2
    );
  }
}

/**
 * USAGE EXAMPLES
 */

// Example 1: Odds Feed Processing
console.log('=== EXAMPLE 1: Odds Feed Processing ===');
const oddsProcessor = new OddsFeedProcessor();

// Simulate binary odds feed message (256 bytes)
const feedData = new Uint8Array(256);
const feedView = new DataView(feedData.buffer);
feedView.setUint32(0, 0x42554655, true); // Magic
feedView.setBigUint64(4, BigInt(Date.now() * 1000), true); // Timestamp
feedView.setUint16(12, 2, true); // 2 markets
feedView.setUint32(14, 12345, true); // Market 1 ID
feedView.setUint32(18, 67890, true); // Market 1 Event
feedView.setFloat64(22, 1.85, true); // Odds
feedView.setUint32(30, 54321, true); // Market 2 ID
feedView.setUint32(34, 78901, true); // Market 2 Event
feedView.setFloat64(38, 2.10, true); // Odds

oddsProcessor.processOddsFeed(feedData, 'provider-1');

// Example 2: Order Matching
console.log('\n=== EXAMPLE 2: Order Matching ===');
const orderEngine = new OrderMatchingEngine();

const orderData = new Uint8Array(25);
const orderView = new DataView(orderData.buffer);
orderView.setBigUint64(0, BigInt(123456789), true); // Order ID
orderView.setUint8(8, 0); // BUY
orderView.setFloat64(9, 100.50, true); // Price
orderView.setUint32(17, 1000, true); // Quantity

orderEngine.processOrder(orderData, 12345);

// Example 3: Protocol Validation
console.log('\n=== EXAMPLE 3: Protocol Validation ===');
const validMessage = new Uint8Array(32);
const validView = new DataView(validMessage.buffer);
validView.setUint32(0, 0x42554655, true); // Correct magic
validView.setUint8(4, 1); // Version 1
validView.setBigUint64(5, BigInt(Date.now()), true);

const result = BinaryProtocolValidator.validateMessage(validMessage, 0x42554655, 1);
console.log('Validation result:', result);

// Example 4: Production Debugging
console.log('\n=== EXAMPLE 4: Production Debugging ===');
const prodDebugger = new ProductionDebugger();

// Simulate discrepancy
const providerA = new Uint8Array([0x42, 0x55, 0x46, 0x55, 0x01, 0x02, 0x03, 0x04]);
const providerB = new Uint8Array([0x42, 0x55, 0x46, 0x55, 0x01, 0x02, 0x03, 0x05]); // Last byte differs

prodDebugger.debugMarketDiscrepancy(providerA, providerB, 12345);

// Example 5: Benchmarking
console.log('\n=== EXAMPLE 5: Performance Benchmark ===');
BinaryProtocolValidator.benchmarkParsing(100);

console.log('\n✅ All examples completed successfully!');
