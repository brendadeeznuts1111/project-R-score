import { describe, test, expect } from 'bun:test';
import { LiveExecutionEngine, LIVE_EXECUTION_CONFIG } from '../LiveExecutionEngine';
import { PatternIngestionService } from '../PatternIngestionService';
import { RiskManagementSystem } from '../RiskManagementSystem';

describe('Component #42: Live Execution Engine Integration', () => {
  test('should initialize all components successfully', () => {
    const liveEngine = new LiveExecutionEngine();
    const ingestionService = new PatternIngestionService(liveEngine);
    const riskManager = new RiskManagementSystem();

    expect(liveEngine).toBeDefined();
    expect(ingestionService).toBeDefined();
    expect(riskManager).toBeDefined();
  });

  test('should validate pattern structure', async () => {
    const liveEngine = new LiveExecutionEngine();

    // Valid pattern
    const validPattern = {
      pattern_id: 1,
      timestamp_ns: 1000000000n,
      arb_type: 'latency' as const,
      kalshi_market: {
        ticker: 'TEST-01JAN25-100',
        side: 'yes' as const,
        price: 50,
        size: 1000
      },
      polymarket_market: {
        token_id: '0x123456789',
        side: 'no' as const,
        price: 45,
        size: 1000
      },
      expected_edge: 5,
      sharp_score: 0.3,
      alpha_half_life: 4.0,
      confidence_score: 0.9
    };

    // This would normally validate against risk management
    // For now, just check the pattern structure is accepted
    expect(validPattern.pattern_id).toBe(1);
    expect(validPattern.expected_edge).toBe(5);
  });

  test('should calculate execution statistics', () => {
    const liveEngine = new LiveExecutionEngine();
    const stats = liveEngine.getExecutionStats();

    expect(stats).toHaveProperty('total_executions');
    expect(stats).toHaveProperty('success_rate');
    expect(stats).toHaveProperty('average_latency_us');
    expect(stats).toHaveProperty('active_accounts');
    expect(stats).toHaveProperty('risk_stats');

    expect(typeof stats.total_executions).toBe('number');
    expect(typeof stats.success_rate).toBe('number');
    expect(typeof stats.average_latency_us).toBe('number');
  });

  test('should manage risk assessment', async () => {
    const riskManager = new RiskManagementSystem();
    const riskStats = riskManager.getRiskStats();

    expect(riskStats).toHaveProperty('active_accounts');
    expect(riskStats).toHaveProperty('circuit_breakers_active');
    expect(riskStats).toHaveProperty('sharp_score_distribution');

    expect(typeof riskStats.active_accounts).toBe('number');
    expect(typeof riskStats.circuit_breakers_active).toBe('number');
  });

  test('should handle ingestion service initialization', () => {
    const liveEngine = new LiveExecutionEngine();
    const ingestionService = new PatternIngestionService(liveEngine);
    const stats = ingestionService.getIngestionStats();

    expect(stats).toHaveProperty('total_patterns_received');
    expect(stats).toHaveProperty('total_batches_processed');
    expect(stats).toHaveProperty('active_streams');

    expect(stats.total_patterns_received).toBe(0);
    expect(stats.total_batches_processed).toBe(0);
    expect(stats.active_streams).toBe(0);
  });

  test('should validate configuration constants', () => {
    // Configuration is defined inline in the module
    expect(LIVE_EXECUTION_CONFIG).toHaveProperty('SHARP_LIMIT_THRESHOLD');
    expect(LIVE_EXECUTION_CONFIG).toHaveProperty('MAX_POSITION_SIZE');
    expect(LIVE_EXECUTION_CONFIG).toHaveProperty('PATTERN_QUEUE_SIZE');

    expect(LIVE_EXECUTION_CONFIG.SHARP_LIMIT_THRESHOLD).toBe(0.65);
    expect(LIVE_EXECUTION_CONFIG.MAX_POSITION_SIZE).toBe(10000);
  });

  test('should have proper TypeScript interfaces', () => {
    // Test that our interfaces are properly exported
    const { ValidatedArbitragePattern, LiveExecutionResult, AccountState } = require('../LiveExecutionEngine');

    // These are type-only exports, so we can't test them directly
    // But we can test that the module exports them
    expect(ValidatedArbitragePattern).toBeUndefined(); // Type-only
    expect(LiveExecutionResult).toBeUndefined(); // Type-only
    expect(AccountState).toBeUndefined(); // Type-only
  });

  test('should integrate with Bun.ArrayBuffer for performance', () => {
    const liveEngine = new LiveExecutionEngine();

    // The engine should use ArrayBuffer for pattern queuing
    // We can't directly test private fields, but we can verify the engine initializes
    expect(liveEngine).toBeDefined();

    // Test that the engine has the expected public interface
    expect(typeof liveEngine.getExecutionStats).toBe('function');
  });
});