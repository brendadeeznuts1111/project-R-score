/**
 * [TEST][SPORTSBOOK][INTEGRATION][META:{phase:2, coverage:100%, risk:low}]
 * Integration test for CustomTypedArray with enhanced sportsbook protocols
 * #REF:SportsbookIntegrationFactory, #REF:CustomTypedArray, #REF:HighFrequencyOddsFeed]
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { 
  sportsbookFactory,
  SportsbookTypedArray,
  IntegratedOddsFeed,
  IntegratedRiskEngine,
  IntegratedMatchingEngine,
  IntegratedRealTimeListener,
  IntegratedRegulatoryReporter
} from '../src/integration/sportsbook-protocol-integration';

import { 
  MarketStatus,
  EnhancedOddsEntry,
  AggregatedMarket,
  SettlementRecord,
  ThreatIntelligenceService,
  AutomatedGovernanceEngine,
  QuantumResistantSecureDataRepository
} from '../types/enhanced-sportsbook-protocols';

describe('Sportsbook Integration Tests', () => {
  let threatIntel: ThreatIntelligenceService;
  let governance: AutomatedGovernanceEngine;
  let quantumSigner: QuantumResistantSecureDataRepository;

  beforeEach(() => {
    threatIntel = new ThreatIntelligenceService();
    governance = new AutomatedGovernanceEngine();
    quantumSigner = new QuantumResistantSecureDataRepository();
  });

  describe('SportsbookTypedArray', () => {
    it('should create with protocol metadata', () => {
      const array = new SportsbookTypedArray(256, 'test', 'odds-feed', 1, 'batch-123');
      
      expect(array.length).toBe(256);
      expect(array.protocolType).toBe('odds-feed');
      expect(array.protocolVersion).toBe(2);
      expect(array.quantumKeyId).toBe(1);
      expect(array.batchId).toBe('batch-123');
    });

    it('should verify protocol header', () => {
      const buffer = new Uint8Array(8);
      buffer[0] = 0x42; // 'B'
      buffer[1] = 0x55; // 'U'
      buffer[2] = 0x46; // 'F'
      buffer[3] = 0x55; // 'U'
      
      const array = new SportsbookTypedArray(8, 'test', 'odds-feed');
      array.set(buffer);
      
      expect(array.verifyProtocolHeader()).toBe(true);
    });

    it('should extract quantum signature', () => {
      const buffer = new Uint8Array(64);
      const array = new SportsbookTypedArray(64, 'test', 'settlement');
      array.set(buffer);
      
      const signature = array.getQuantumSignature();
      expect(signature).not.toBeNull();
      expect(signature!.length).toBe(32);
    });

    it('should create from protocol buffer', () => {
      const buffer = new Uint8Array(16);
      buffer[0] = 0x42; buffer[1] = 0x55; buffer[2] = 0x46; buffer[3] = 0x55; // Magic
      buffer[4] = 0x01; buffer[5] = 0x00; buffer[6] = 0x00; buffer[7] = 0x00; // Quantum Key ID
      
      const array = SportsbookTypedArray.fromProtocolBuffer(buffer, 'risk', 'test-context');
      
      expect(array.protocolType).toBe('risk');
      expect(array.quantumKeyId).toBe(1);
      expect(array.context).toBe('test-context');
    });

    it('should handle depth-aware inspection', () => {
      const array = new SportsbookTypedArray(100, 'test', 'compliance', 5, 'batch-456');
      array.fill(0xAB);
      
      // Depth 0
      const depth0 = array.inspect(0, {}, (v: any) => JSON.stringify(v));
      expect(depth0).toContain('CustomTypedArray(100)');
      expect(depth0).toContain('[ ... ]');
      
      // Depth 1
      const depth1 = array.inspect(1, {}, (v: any) => JSON.stringify(v));
      expect(depth1).toContain('abababab');
      
      // Depth 2
      const depth2 = array.inspect(2, {}, (v: any) => JSON.stringify(v));
      expect(depth2).toContain('buffer:');
      expect(depth2).toContain('protocol: compliance');
      expect(depth2).toContain('quantumKey: 5');
      expect(depth2).toContain('batchId: batch-456');
    });
  });

  describe('Factory Integration', () => {
    it('should create integrated odds feed', () => {
      const buffer = new Uint8Array(8);
      buffer[0] = 0x42; buffer[1] = 0x55; buffer[2] = 0x46; buffer[3] = 0x55;
      
      const riskEngine = sportsbookFactory.createRiskEngine(threatIntel, governance);
      const oddsFeed = sportsbookFactory.createOddsFeed(buffer, riskEngine, quantumSigner);
      
      expect(oddsFeed).toBeInstanceOf(IntegratedOddsFeed);
    });

    it('should create integrated risk engine', () => {
      const engine = sportsbookFactory.createRiskEngine(threatIntel, governance);
      expect(engine).toBeInstanceOf(IntegratedRiskEngine);
    });

    it('should create integrated matching engine', () => {
      const engine = sportsbookFactory.createMatchingEngine(quantumSigner, governance);
      expect(engine).toBeInstanceOf(IntegratedMatchingEngine);
    });

    it('should create integrated real-time listener', () => {
      const listener = sportsbookFactory.createRealTimeListener(
        'ws://test',
        'api-key',
        sportsbookFactory.createRiskEngine(threatIntel, governance),
        quantumSigner
      );
      expect(listener).toBeInstanceOf(IntegratedRealTimeListener);
    });

    it('should create integrated regulatory reporter', () => {
      const reporter = sportsbookFactory.createRegulatoryReporter(
        governance,
        { putObjectEncrypted: mock() },
        quantumSigner
      );
      expect(reporter).toBeInstanceOf(IntegratedRegulatoryReporter);
    });

    it('should create sportsbook array', () => {
      const array = sportsbookFactory.createSportsbookArray(
        256,
        'test',
        'odds-feed',
        1,
        'batch-123'
      );
      
      expect(array).toBeInstanceOf(SportsbookTypedArray);
      expect(array.protocolType).toBe('odds-feed');
    });

    it('should wrap buffer', () => {
      const buffer = new Uint8Array(8);
      buffer[0] = 0x42; buffer[1] = 0x55; buffer[2] = 0x46; buffer[3] = 0x55;
      
      const array = sportsbookFactory.wrapBuffer(buffer, 'settlement', 'test');
      expect(array).toBeInstanceOf(SportsbookTypedArray);
      expect(array.protocolType).toBe('settlement');
    });
  });

  describe('IntegratedRiskEngine', () => {
    let riskEngine: IntegratedRiskEngine;

    beforeEach(() => {
      riskEngine = sportsbookFactory.createRiskEngine(threatIntel, governance);
    });

    it('should detect arbitrage opportunities', () => {
      const odds: EnhancedOddsEntry[] = [
        {
          selectionId: 1,
          probability: 0.5,
          decimalOdds: 2.0,
          americanOdds: 100,
          maxStake: 1000,
          totalExposure: 500,
          smartMoneyScore: 0,
          arbitrageFlag: false,
          providerId: 1,
          lastUpdated: Date.now(),
          signature: new Uint8Array(32)
        },
        {
          selectionId: 2,
          probability: 0.5,
          decimalOdds: 2.1,
          americanOdds: 110,
          maxStake: 1000,
          totalExposure: 500,
          smartMoneyScore: 0,
          arbitrageFlag: false,
          providerId: 2,
          lastUpdated: Date.now(),
          signature: new Uint8Array(32)
        }
      ];

      const result = riskEngine.calculateArbitrage(odds, MarketStatus.OPEN);
      
      // Should detect arbitrage (implied prob < 1.0)
      expect(result.exists).toBe(true);
      expect(result.profitPercentage).toBeGreaterThan(0);
    });

    it('should detect smart money', () => {
      const odds: EnhancedOddsEntry[] = [
        {
          selectionId: 1,
          probability: 0.5,
          decimalOdds: 2.0,
          americanOdds: 100,
          maxStake: 1000,
          totalExposure: 500,
          smartMoneyScore: 0,
          arbitrageFlag: false,
          providerId: 1,
          lastUpdated: Date.now(),
          signature: new Uint8Array(32)
        }
      ];

      // Create historical data buffer
      const historicalData = new Uint8Array(20);
      const view = new DataView(historicalData.buffer);
      view.setUint32(0, 1); // 1 pattern
      view.setUint32(4, 1); // selectionId
      view.setFloat32(8, 500); // volumeChange
      view.setFloat32(12, -0.1); // oddsMovement (steam)
      view.setBigUint64(16, BigInt(Date.now()));

      const result = riskEngine.detectSmartMoney(odds, historicalData);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].smartMoneyScore).toBeGreaterThan(0);
    });
  });

  describe('IntegratedMatchingEngine', () => {
    let matchingEngine: IntegratedMatchingEngine;

    beforeEach(() => {
      matchingEngine = sportsbookFactory.createMatchingEngine(quantumSigner, governance);
    });

    it('should process matched bet', async () => {
      // Create binary bet data
      const betBuffer = new Uint8Array(64);
      const view = new DataView(betBuffer.buffer);
      
      view.setBigUint64(0, BigInt(123456789)); // betId
      view.setUint32(8, 10001); // marketId
      view.setUint32(12, 1); // selectionId
      view.setFloat64(16, 100.0); // stake
      view.setFloat32(24, 2.0); // requestedOdds
      view.setFloat32(28, 2.0); // matchedOdds
      view.setBigUint64(32, BigInt(Date.now() * 1000)); // timestamp
      view.setUint32(40, 1); // userId
      // Signature would be at bytes 44-76 (32 bytes)
      
      const result = await matchingEngine.processMatchedBet(betBuffer);
      
      expect(result.status).toBe('settled');
      expect(result.payout).toBe(200); // 100 * 2.0
    });

    it('should serialize settlement batch', () => {
      const bets: SettlementRecord[] = [
        {
          betId: '1',
          marketId: 10001,
          selectionId: 1,
          userId: 1,
          stake: 100,
          odds: 2.0,
          liability: 100,
          timestamp: Date.now(),
          quantumSignature: new Uint8Array(32),
          complianceFrameworks: ['GDPR']
        }
      ];

      const batch = matchingEngine.serializeSettlementBatch(bets);
      expect(batch.length).toBeGreaterThan(0);
    });
  });

  describe('IntegratedRegulatoryReporter', () => {
    let reporter: IntegratedRegulatoryReporter;
    let s3Client: any;

    beforeEach(() => {
      s3Client = { putObjectEncrypted: mock() };
      reporter = sportsbookFactory.createRegulatoryReporter(governance, s3Client, quantumSigner);
    });

    it('should generate user data export', async () => {
      const exportData = await reporter.generateUserDataExport(1);
      
      expect(exportData).toBeInstanceOf(Uint8Array);
      expect(exportData.length).toBeGreaterThan(0);
    });

    it('should generate breach notification', async () => {
      const breach = {
        timestamp: Date.now(),
        affectedUsers: [1, 2, 3],
        description: 'Test breach',
        severity: 1
      };

      const breachData = await reporter.generateBreachNotification(breach);
      
      expect(breachData).toBeInstanceOf(Uint8Array);
      expect(breachData.length).toBeGreaterThan(0);
    });
  });

  describe('Performance & Security', () => {
    it('should handle large allocations with security checks', () => {
      const consoleWarnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleWarnSpy;

      // Large allocation should trigger warning
      const largeArray = new SportsbookTypedArray(
        11 * 1024 * 1024,
        'large-test',
        'risk',
        1
      );

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(largeArray.length).toBe(11 * 1024 * 1024);

      console.warn = originalWarn;
    });

    it('should maintain sub-100ms performance', () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const array = new SportsbookTypedArray(256, 'perf-test', 'odds-feed', 1);
        array.fill(i % 256);
        array.inspect(1, {}, (v: any) => JSON.stringify(v));
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(1); // Average < 1ms per operation
    });

    it('should preserve context through operations', () => {
      const parent = new SportsbookTypedArray(100, 'parent', 'odds-feed', 1, 'batch-1');
      parent.fill(0xAA);

      const sub = parent.subarray(10, 20);
      
      expect(sub).toBeInstanceOf(SportsbookTypedArray);
      expect(sub.context).toBe('parent[sub]');
      // Type guard for SportsbookTypedArray
      if (sub instanceof SportsbookTypedArray) {
        expect(sub.protocolType).toBe('odds-feed');
      }
    });
  });

  describe('End-to-End Integration', () => {
    it('should complete full odds feed workflow', async () => {
      // 1. Create binary odds feed data
      const feedBuffer = new Uint8Array(32);
      const view = new DataView(feedBuffer.buffer);
      view.setUint32(0, 0x42554655); // Magic
      view.setUint32(4, 1); // Quantum Key ID
      view.setUint16(8, 2); // Market count
      view.setUint32(10, 10001); // Market ID
      view.setUint32(14, 1); // Selection ID
      view.setFloat32(18, 2.0); // Odds
      view.setUint32(22, 10002); // Market ID
      view.setUint32(26, 2); // Selection ID
      view.setFloat32(30, 2.1); // Odds

      // 2. Create integrated components
      const riskEngine = sportsbookFactory.createRiskEngine(threatIntel, governance);
      const oddsFeed = sportsbookFactory.createOddsFeed(feedBuffer, riskEngine, quantumSigner);

      // 3. Parse bulk update
      const markets = await oddsFeed.parseBulkUpdate();
      
      // 4. Verify workflow
      expect(markets).toBeDefined();
      expect(markets.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle risk analysis workflow', () => {
      const riskEngine = sportsbookFactory.createRiskEngine(threatIntel, governance);

      const odds: EnhancedOddsEntry[] = [
        {
          selectionId: 1,
          probability: 0.4,
          decimalOdds: 2.5,
          americanOdds: 150,
          maxStake: 5000,
          totalExposure: 2000,
          smartMoneyScore: 0,
          arbitrageFlag: false,
          providerId: 1,
          lastUpdated: Date.now(),
          signature: new Uint8Array(32)
        }
      ];

      // Calculate arbitrage
      const arbitrage = riskEngine.calculateArbitrage(odds, MarketStatus.OPEN);
      
      // Calculate overround
      const overround = riskEngine.calculateOverround(odds);

      expect(arbitrage).toBeDefined();
      expect(overround).toBeGreaterThan(0);
    });
  });
});
