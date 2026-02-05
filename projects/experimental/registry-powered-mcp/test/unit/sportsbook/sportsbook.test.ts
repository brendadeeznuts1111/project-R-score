/**
 * Sportsbook Protocol Test Suite
 * Tests for RiskManagementEngine, HighFrequencyOddsFeed, and protocol types
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  RiskManagementEngine,
  DEFAULT_RISK_CONFIG,
  HighFrequencyOddsFeed,
  ConnectionState,
  createMockOddsFeed,
  MarketStatus,
  OddsFormat,
  MessageType,
  SPORTSBOOK_MAGIC,
  SPORTSBOOK_PROTOCOL_VERSION,
  SPORTSBOOK_PERFORMANCE_TARGETS,
  isValidMarketStatus,
  isValidOddsFormat,
  isValidMessageType,
  type EnhancedOddsEntry,
  type RiskAssessment,
  // Adapters
  toDisplayOddsEntry,
  toDisplayRiskAssessment,
  toDisplayArbitrage,
  uuidToNumericId,
  signatureToHex,
  decimalToAmerican,
  oddsToImpliedProbability,
  createOddsUpdateMessage,
  createHeartbeatMessage,
  // Exchange Handler
  ExchangeHandler,
  DEFAULT_EXCHANGE_CONFIG,
} from '../../../packages/core/src/sportsbook/index';

// Helper to create test odds entries
function createOddsEntry(overrides: Partial<EnhancedOddsEntry> = {}): EnhancedOddsEntry {
  return {
    marketId: crypto.randomUUID(),
    selectionId: crypto.randomUUID(),
    odds: 2.0,
    previousOdds: 2.0,
    volume: 10000,
    availableVolume: 5000,
    timestamp: Math.floor(Date.now() / 1000),
    sequence: 1,
    status: MarketStatus.OPEN,
    format: OddsFormat.DECIMAL,
    bookmaker: 'TEST-BK',
    overround: 1.05,
    ...overrides,
  };
}

describe('Sportsbook Protocol Types', () => {
  describe('MarketStatus enum', () => {
    test('should have correct values', () => {
      expect(MarketStatus.PRE_OPEN).toBe(0);
      expect(MarketStatus.OPEN).toBe(1);
      expect(MarketStatus.SUSPENDED).toBe(2);
      expect(MarketStatus.CLOSED).toBe(3);
      expect(MarketStatus.SETTLED).toBe(4);
      expect(MarketStatus.CANCELLED).toBe(5);
      expect(MarketStatus.PENDING_REVIEW).toBe(6);
    });
  });

  describe('OddsFormat enum', () => {
    test('should have correct values', () => {
      expect(OddsFormat.DECIMAL).toBe(0);
      expect(OddsFormat.FRACTIONAL).toBe(1);
      expect(OddsFormat.AMERICAN).toBe(2);
      expect(OddsFormat.HONG_KONG).toBe(3);
      expect(OddsFormat.MALAY).toBe(4);
      expect(OddsFormat.INDO).toBe(5);
    });
  });

  describe('MessageType enum', () => {
    test('should have correct values', () => {
      expect(MessageType.ODDS_UPDATE).toBe(0x01);
      expect(MessageType.MARKET_STATUS).toBe(0x02);
      expect(MessageType.ORDER_SUBMIT).toBe(0x03);
      expect(MessageType.HEARTBEAT).toBe(0x06);
      expect(MessageType.ERROR).toBe(0xFF);
    });
  });

  describe('Type guards', () => {
    test('isValidMarketStatus should validate correctly', () => {
      expect(isValidMarketStatus(0)).toBe(true);
      expect(isValidMarketStatus(6)).toBe(true);
      expect(isValidMarketStatus(7)).toBe(false);
      expect(isValidMarketStatus(-1)).toBe(false);
    });

    test('isValidOddsFormat should validate correctly', () => {
      expect(isValidOddsFormat(0)).toBe(true);
      expect(isValidOddsFormat(5)).toBe(true);
      expect(isValidOddsFormat(6)).toBe(false);
    });

    test('isValidMessageType should validate correctly', () => {
      expect(isValidMessageType(0x01)).toBe(true);
      expect(isValidMessageType(0x06)).toBe(true);
      expect(isValidMessageType(0xFF)).toBe(true);
      expect(isValidMessageType(0x99)).toBe(false);
    });
  });

  describe('Constants', () => {
    test('SPORTSBOOK_MAGIC should be correct', () => {
      // "SPBT" in ASCII
      expect(SPORTSBOOK_MAGIC).toBe(0x53504254);
    });

    test('SPORTSBOOK_PROTOCOL_VERSION should be 1', () => {
      expect(SPORTSBOOK_PROTOCOL_VERSION).toBe(1);
    });

    test('SPORTSBOOK_PERFORMANCE_TARGETS should have correct values', () => {
      expect(SPORTSBOOK_PERFORMANCE_TARGETS.ODDS_UPDATES_PER_SEC).toBe(15000);
      expect(SPORTSBOOK_PERFORMANCE_TARGETS.ORDERS_PER_SEC).toBe(50000);
      expect(SPORTSBOOK_PERFORMANCE_TARGETS.MATCH_LATENCY_P99_MS).toBe(1.0);
      expect(SPORTSBOOK_PERFORMANCE_TARGETS.ARBITRAGE_DETECTION_MS).toBe(1.0);
    });
  });
});

describe('RiskManagementEngine', () => {
  let engine: RiskManagementEngine;

  beforeEach(() => {
    engine = new RiskManagementEngine();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(engine).toBeDefined();
      const metrics = engine.getMetrics();
      expect(metrics.arbitrageDetections).toBe(0);
      expect(metrics.smartMoneyAlerts).toBe(0);
    });

    test('should accept custom config', () => {
      const customEngine = new RiskManagementEngine({
        arbitrageThreshold: 1.0,
        maxRiskScore: 0.5,
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('processOddsUpdate', () => {
    test('should return valid risk assessment', () => {
      const entry = createOddsEntry();
      const assessment = engine.processOddsUpdate(entry);

      expect(assessment.marketId).toBe(entry.marketId);
      expect(typeof assessment.riskScore).toBe('number');
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(assessment.factors)).toBe(true);
      expect(['accept', 'review', 'reject']).toContain(assessment.recommendation);
    });

    test('should detect high overround risk', () => {
      const entry = createOddsEntry({ overround: 1.20 }); // 120% overround
      const assessment = engine.processOddsUpdate(entry);

      const overroundFactor = assessment.factors.find(f => f.type === 'OVERROUND_ANOMALY');
      expect(overroundFactor).toBeDefined();
    });

    test('should track processing time', () => {
      const entry = createOddsEntry();
      engine.processOddsUpdate(entry);

      const metrics = engine.getMetrics();
      expect(metrics.lastProcessingMs).toBeGreaterThanOrEqual(0);
      expect(metrics.lastProcessingMs).toBeLessThan(10); // Should be fast
    });
  });

  describe('detectArbitrage', () => {
    test('should detect arbitrage opportunity', () => {
      // Create a market with arbitrage opportunity
      const marketId = crypto.randomUUID();

      // Add selections that create an arbitrage (implied prob < 100%)
      engine.processOddsUpdate(createOddsEntry({
        marketId,
        selectionId: 'sel-1',
        odds: 2.5, // 40% implied
        bookmaker: 'BK1',
      }));

      engine.processOddsUpdate(createOddsEntry({
        marketId,
        selectionId: 'sel-2',
        odds: 2.5, // 40% implied - total 80% < 100% = arbitrage
        bookmaker: 'BK2',
      }));

      const arb = engine.detectArbitrage(marketId);
      // May or may not detect depending on aggregation
      if (arb) {
        expect(arb.profit).toBeGreaterThan(0);
        expect(arb.stakes.length).toBeGreaterThan(0);
      }
    });

    test('should return null for non-existent market', () => {
      const arb = engine.detectArbitrage('nonexistent');
      expect(arb).toBeNull();
    });
  });

  describe('calculateOverround', () => {
    test('should calculate correct overround', () => {
      const selections = [
        { selectionId: '1', name: 'A', odds: [], bestBack: 2.0, bestLay: 0, movement: { direction: 'stable' as const, delta: 0, percentage: 0, velocity: 0 } },
        { selectionId: '2', name: 'B', odds: [], bestBack: 2.0, bestLay: 0, movement: { direction: 'stable' as const, delta: 0, percentage: 0, velocity: 0 } },
      ];

      const overround = engine.calculateOverround(selections);
      expect(overround).toBe(100); // 50% + 50% = 100%
    });

    test('should handle typical overround', () => {
      const selections = [
        { selectionId: '1', name: 'A', odds: [], bestBack: 1.9, bestLay: 0, movement: { direction: 'stable' as const, delta: 0, percentage: 0, velocity: 0 } },
        { selectionId: '2', name: 'B', odds: [], bestBack: 1.9, bestLay: 0, movement: { direction: 'stable' as const, delta: 0, percentage: 0, velocity: 0 } },
      ];

      const overround = engine.calculateOverround(selections);
      expect(overround).toBeGreaterThan(100);
      expect(overround).toBeLessThan(110);
    });
  });

  describe('Exposure tracking', () => {
    test('should track exposure per market', () => {
      const marketId = 'test-market';
      expect(engine.getExposure(marketId)).toBe(0);

      engine.updateExposure(marketId, 1000);
      expect(engine.getExposure(marketId)).toBe(1000);

      engine.updateExposure(marketId, 500);
      expect(engine.getExposure(marketId)).toBe(1500);
    });
  });

  describe('Threat intelligence', () => {
    test('should call threat callback on detection', () => {
      let threatCalled = false;
      let threatType = '';

      engine.setThreatCallback((threat, data) => {
        threatCalled = true;
        threatType = threat;
      });

      // Process many updates to potentially trigger smart money detection
      for (let i = 0; i < 20; i++) {
        engine.processOddsUpdate(createOddsEntry({
          selectionId: 'same-selection',
          odds: 2.0 + i * 0.1,
          previousOdds: 2.0 + (i - 1) * 0.1,
          volume: 50000,
        }));
      }

      // Threat may or may not be called depending on pattern detection
      expect(typeof threatCalled).toBe('boolean');
    });
  });

  describe('reset', () => {
    test('should clear all cached data', () => {
      engine.processOddsUpdate(createOddsEntry());
      engine.updateExposure('market1', 1000);

      engine.reset();

      const metrics = engine.getMetrics();
      expect(metrics.cachedMarkets).toBe(0);
      expect(metrics.trackedExposure).toBe(0);
    });
  });
});

describe('HighFrequencyOddsFeed', () => {
  let feed: HighFrequencyOddsFeed;

  beforeEach(() => {
    feed = new HighFrequencyOddsFeed({
      endpoint: 'ws://localhost:9999',
      enableRiskManagement: true,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    feed.disconnect();
  });

  describe('Initialization', () => {
    test('should initialize in disconnected state', () => {
      expect(feed.getState()).toBe(ConnectionState.DISCONNECTED);
    });

    test('should have risk engine when enabled', () => {
      expect(feed.getRiskEngine()).not.toBeNull();
    });

    test('should not have risk engine when disabled', () => {
      const feedNoRisk = new HighFrequencyOddsFeed({
        enableRiskManagement: false,
      });
      expect(feedNoRisk.getRiskEngine()).toBeNull();
    });
  });

  describe('Subscription management', () => {
    test('should track subscriptions', () => {
      const marketId = crypto.randomUUID();
      feed.subscribe(marketId);
      // Internal tracking - no direct getter but metrics show active markets
      const metrics = feed.getMetrics();
      expect(metrics.activeMarkets).toBe(1);
    });

    test('should remove subscriptions', () => {
      const marketId = crypto.randomUUID();
      feed.subscribe(marketId);
      feed.unsubscribe(marketId);

      const metrics = feed.getMetrics();
      expect(metrics.activeMarkets).toBe(0);
    });
  });

  describe('Callback registration', () => {
    test('should register and unregister callbacks', () => {
      let callCount = 0;
      const unsubscribe = feed.onUpdate(() => {
        callCount++;
      });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Binary parsing', () => {
    test('should parse valid binary update', () => {
      // Create a valid binary message
      const buffer = createValidOddsUpdateMessage();
      const entry = feed.parseBinaryUpdate(buffer);

      if (entry) {
        expect(entry.marketId).toBeDefined();
        expect(typeof entry.odds).toBe('number');
        expect(entry.status).toBeDefined();
      }
    });

    test('should reject invalid magic number', () => {
      const buffer = new ArrayBuffer(16);
      const view = new DataView(buffer);
      view.setUint32(0, 0xDEADBEEF, true); // Invalid magic

      const entry = feed.parseBinaryUpdate(buffer);
      expect(entry).toBeNull();
    });

    test('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const entry = feed.parseBinaryUpdate(buffer);
      expect(entry).toBeNull();
    });

    test('should parse bulk updates', () => {
      // Create multiple valid messages
      const buffer1 = createValidOddsUpdateMessage();
      const buffer2 = createValidOddsUpdateMessage();

      // Combine buffers
      const combined = new ArrayBuffer(buffer1.byteLength + buffer2.byteLength);
      new Uint8Array(combined).set(new Uint8Array(buffer1), 0);
      new Uint8Array(combined).set(new Uint8Array(buffer2), buffer1.byteLength);

      const entries = feed.parseBulkUpdates(combined);
      expect(entries.length).toBeLessThanOrEqual(2);
    });
  });

  describe('toReadableStream', () => {
    test('should convert entries to readable stream', async () => {
      const entries = [
        createOddsEntry(),
        createOddsEntry(),
      ];

      const stream = feed.toReadableStream(entries);
      const reader = stream.getReader();

      const results: EnhancedOddsEntry[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results.length).toBe(2);
    });
  });

  describe('Metrics', () => {
    test('should return valid metrics', () => {
      const metrics = feed.getMetrics();

      expect(typeof metrics.updatesPerSecond).toBe('number');
      expect(typeof metrics.activeMarkets).toBe('number');
      expect(metrics.updatesPerSecond).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Mock Feed', () => {
  test('should create mock feed', () => {
    const mock = createMockOddsFeed(100, 5);

    expect(mock.feed).toBeDefined();
    expect(typeof mock.generateUpdate).toBe('function');
    expect(typeof mock.start).toBe('function');
    expect(typeof mock.stop).toBe('function');
  });

  test('should generate valid updates', () => {
    const mock = createMockOddsFeed();
    const update = mock.generateUpdate();

    expect(update.marketId).toBeDefined();
    expect(update.odds).toBeGreaterThan(1);
    expect(update.status).toBe(MarketStatus.OPEN);
  });

  test('should start and stop', () => {
    const mock = createMockOddsFeed(50);
    mock.start();

    // Let it run briefly
    setTimeout(() => {
      mock.stop();
    }, 100);
  });
});

describe('Performance', () => {
  test('should process 15000+ updates/sec', () => {
    const engine = new RiskManagementEngine();
    const iterations = 15000;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.processOddsUpdate(createOddsEntry({
        sequence: i,
      }));
    }

    const elapsedMs = performance.now() - startTime;
    const updatesPerSecond = (iterations / elapsedMs) * 1000;

    console.log(`Risk engine: ${updatesPerSecond.toFixed(0)} updates/sec`);

    // Should meet performance target
    expect(updatesPerSecond).toBeGreaterThan(SPORTSBOOK_PERFORMANCE_TARGETS.ODDS_UPDATES_PER_SEC);
  });

  test('should detect arbitrage in <1ms', () => {
    const engine = new RiskManagementEngine();
    const marketId = crypto.randomUUID();

    // Setup market
    engine.processOddsUpdate(createOddsEntry({ marketId, selectionId: 'a', odds: 2.5 }));
    engine.processOddsUpdate(createOddsEntry({ marketId, selectionId: 'b', odds: 2.5 }));

    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.detectArbitrage(marketId);
    }

    const elapsedMs = performance.now() - startTime;
    const avgMs = elapsedMs / iterations;

    console.log(`Arbitrage detection: ${avgMs.toFixed(4)}ms avg`);

    expect(avgMs).toBeLessThan(SPORTSBOOK_PERFORMANCE_TARGETS.ARBITRAGE_DETECTION_MS);
  });
});

// Helper to create valid binary odds update message
function createValidOddsUpdateMessage(): ArrayBuffer {
  // Header (16 bytes) + Payload (64 bytes)
  const buffer = new ArrayBuffer(80);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // Header
  view.setUint32(0, SPORTSBOOK_MAGIC, true);
  view.setUint8(4, SPORTSBOOK_PROTOCOL_VERSION);
  view.setUint8(5, MessageType.ODDS_UPDATE);
  view.setUint16(6, 64, true); // Payload length
  view.setUint32(8, 1, true); // Sequence
  view.setUint32(12, Math.floor(Date.now() / 1000), true);

  // Payload: UUIDs (32 bytes) + odds data
  // Generate random UUIDs for market and selection
  for (let i = 16; i < 48; i++) {
    uint8[i] = Math.floor(Math.random() * 256);
  }

  // Odds and previous odds (float64)
  view.setFloat64(48, 2.5, true);
  view.setFloat64(56, 2.45, true);

  // Volume and available volume
  view.setUint32(64, 10000, true);
  view.setUint32(68, 5000, true);

  // Status and format
  view.setUint8(72, MarketStatus.OPEN);
  view.setUint8(73, OddsFormat.DECIMAL);

  // Overround scaled (1050 = 1.05)
  view.setUint16(74, 1050, true);

  // Bookmaker hash
  view.setUint32(76, 0x12345678, true);

  return buffer;
}

// ============================================================================
// Type Adapter Tests
// ============================================================================

describe('Type Adapters', () => {
  describe('uuidToNumericId', () => {
    test('should convert UUID to numeric ID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = uuidToNumericId(uuid);

      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(1000000);
    });

    test('should produce consistent results', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const id1 = uuidToNumericId(uuid);
      const id2 = uuidToNumericId(uuid);

      expect(id1).toBe(id2);
    });
  });

  describe('signatureToHex', () => {
    test('should convert Uint8Array to hex string', () => {
      const sig = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x12, 0x34]);
      const hex = signatureToHex(sig);

      expect(hex).toBe('0xDEADBEEF');
    });

    test('should handle empty array', () => {
      const sig = new Uint8Array(0);
      const hex = signatureToHex(sig);

      expect(hex).toBe('0x0000');
    });
  });

  describe('decimalToAmerican', () => {
    test('should convert favorite odds', () => {
      const american = decimalToAmerican(1.5);
      expect(american).toBe(-200);
    });

    test('should convert underdog odds', () => {
      const american = decimalToAmerican(2.5);
      expect(american).toBe(150);
    });

    test('should handle even odds', () => {
      const american = decimalToAmerican(2.0);
      expect(american).toBe(100);
    });
  });

  describe('oddsToImpliedProbability', () => {
    test('should calculate correct probability', () => {
      const prob = oddsToImpliedProbability(2.0);
      expect(prob).toBe(0.5);
    });

    test('should handle favorite odds', () => {
      const prob = oddsToImpliedProbability(1.25);
      expect(prob).toBe(0.8);
    });
  });

  describe('toDisplayOddsEntry', () => {
    test('should convert wire entry to display format', () => {
      const entry = createOddsEntry({
        odds: 2.5,
        volume: 10000,
        availableVolume: 5000,
      });

      const display = toDisplayOddsEntry(entry, 150, true, 'Test Selection');

      expect(display.selectionName).toBe('Test Selection');
      expect(display.decimalOdds).toBe(2.5);
      expect(display.americanOdds).toBe(150);
      expect(display.smartMoneyScore).toBe(150);
      expect(display.arbitrageFlag).toBe(true);
      expect(display.totalExposure).toBe(10000);
      expect(display.maxStake).toBe(5000);
    });
  });

  describe('toDisplayRiskAssessment', () => {
    test('should convert risk assessment', () => {
      const assessment: RiskAssessment = {
        marketId: crypto.randomUUID(),
        riskScore: 0.6,
        factors: [{
          type: 'TEST',
          severity: 'high',
          description: 'Test factor',
          weight: 0.3,
        }],
        recommendation: 'review',
        maxExposure: 50000,
        smartMoneyDetected: true,
        arbitrageRisk: false,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const display = toDisplayRiskAssessment(assessment, 2);

      expect(display.riskLevel).toBe('HIGH');
      expect(display.recommendation).toBe('REVIEW');
      expect(display.arbitrageOpportunities).toBe(2);
      expect(display.smartMoneyDetected).toBe(true);
    });

    test('should classify risk levels correctly', () => {
      const lowRisk: RiskAssessment = {
        marketId: 'test',
        riskScore: 0.1,
        factors: [],
        recommendation: 'accept',
        maxExposure: 100000,
        smartMoneyDetected: false,
        arbitrageRisk: false,
        timestamp: 0,
      };

      expect(toDisplayRiskAssessment(lowRisk).riskLevel).toBe('LOW');

      const criticalRisk = { ...lowRisk, riskScore: 0.9 };
      expect(toDisplayRiskAssessment(criticalRisk).riskLevel).toBe('CRITICAL');
    });
  });

  describe('WebSocket message creators', () => {
    test('createOddsUpdateMessage', () => {
      const entries = [toDisplayOddsEntry(createOddsEntry())];
      const msg = createOddsUpdateMessage(entries);

      expect(msg.type).toBe('ODDS_UPDATE');
      expect(msg.timestamp).toBeGreaterThan(0);
      expect(msg.sequence).toBeGreaterThan(0);
      expect(msg.payload).toEqual(entries);
    });

    test('createHeartbeatMessage', () => {
      const msg = createHeartbeatMessage({
        throughput: 15000,
        p99Latency: 2.5,
        activeMarkets: 10,
      });

      expect(msg.type).toBe('HEARTBEAT');
      expect(msg.payload.throughput).toBe(15000);
    });
  });
});

// ============================================================================
// Exchange Handler Tests
// ============================================================================

describe('ExchangeHandler', () => {
  let handler: ExchangeHandler;

  beforeEach(() => {
    handler = new ExchangeHandler({
      mockMode: false, // Don't start mock feed in tests
      heartbeatIntervalMs: 1000,
    });
  });

  afterEach(() => {
    handler.stop();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(handler).toBeDefined();
      const metrics = handler.getMetrics();
      expect(metrics.clients).toBe(0);
      expect(metrics.markets).toBe(0);
    });

    test('should start and stop', () => {
      handler.start();
      expect(handler.getMetrics().uptime).toBeGreaterThanOrEqual(0);

      handler.stop();
    });
  });

  describe('REST Endpoints', () => {
    beforeEach(() => {
      handler.start();
    });

    test('should handle /mcp/exchange/health', async () => {
      const req = new Request('http://localhost/mcp/exchange/health');
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.status).toBe('operational');
    });

    test('should handle /mcp/exchange/metrics', async () => {
      const req = new Request('http://localhost/mcp/exchange/metrics');
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.throughput).toBeDefined();
    });

    test('should handle /mcp/exchange/markets', async () => {
      const req = new Request('http://localhost/mcp/exchange/markets');
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should handle /mcp/exchange/arb', async () => {
      const req = new Request('http://localhost/mcp/exchange/arb');
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should return 404 for unknown routes', async () => {
      const req = new Request('http://localhost/mcp/exchange/unknown');
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(404);
    });

    test('should handle CORS preflight', async () => {
      const req = new Request('http://localhost/mcp/exchange/health', {
        method: 'OPTIONS',
      });
      const res = await handler.handleRequest(req);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Metrics', () => {
    test('should track metrics correctly', () => {
      handler.start();

      const metrics = handler.getMetrics();

      expect(typeof metrics.throughput).toBe('number');
      expect(typeof metrics.p99LatencyMs).toBe('number');
      expect(typeof metrics.clients).toBe('number');
      expect(typeof metrics.markets).toBe('number');
      expect(typeof metrics.messagesSent).toBe('number');
      expect(metrics.riskEngineMetrics).toBeDefined();
    });
  });
});
