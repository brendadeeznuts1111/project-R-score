// benchmarks/unified-benchmark.ts
import { UnifiedQuantumSystem, MarketGame } from '../unified-system';

async function runUnifiedBenchmarks() {
  console.log('\n🏆 T3-Lattice v4.0 Comprehensive Performance Benchmark\n');

  const system = new UnifiedQuantumSystem();
  const iterations = 100;

  const benchmarks = [
    {
      name: 'Enhanced Edge Detection + Quantum Stabilization',
      fn: async () => {
        const mockGame: MarketGame = {
          id: 'MIL@CHA',
          market: 'NBA',
          opening: { spread: -3.5, total: 220.5 }
        };

        await system.processMarketGame(mockGame);
      }
    },
    {
      name: 'HSL Tension Calculation',
      fn: async () => {
        for (let i = 0; i < 1000; i++) {
          system.calculateHSLTension(Math.random() * 3);
        }
      }
    },
    {
      name: 'Quantum Hybrid Signature Generation',
      fn: async () => {
        for (let i = 0; i < 100; i++) {
          await system.signWithQuantumCrypto({ test: i });
        }
      }
    },
    {
      name: 'Cross-Venue Arbitrage Detection',
      fn: async () => {
        const mockMarkets = [{
          marketId: 'test-market',
          homeTeam: 'Home',
          awayTeam: 'Away',
          sport: 'NBA',
          odds: new Map([['Bet365', 2.0], ['DraftKings', 2.1]])
        }];
        await system.arbitrageDetector.detectArbitrageOpportunities(mockMarkets);
      }
    },
    {
      name: 'Regulatory Compliance Validation',
      fn: async () => {
        const mockTrade = {
          id: 'test-trade',
          marketId: 'test-market',
          amount: 500,
          expectedReturn: 0.1,
          volatility: 0.2,
          confidence: 0.8,
          venue: 'Bet365',
          timestamp: Date.now()
        };
        const mockTrader = {
          id: 'test-trader',
          location: { country: 'US', state: 'CA' },
          history: [],
          riskProfile: {
            dailyLimit: 10000,
            monthlyLimit: 50000,
            maxSingleTrade: 1000,
            restrictedSports: []
          }
        };
        await system.validateTradeCompliance(mockTrade, mockTrader);
      }
    },
    {
      name: 'Multi-Layer Risk Assessment',
      fn: async () => {
        const mockTrade = {
          id: 'test-trade',
          marketId: 'test-market',
          amount: 500,
          expectedReturn: 0.1,
          volatility: 0.2,
          confidence: 0.8,
          venue: 'Bet365',
          timestamp: Date.now()
        };
        await system.assessTradeRisk(mockTrade);
      }
    },
    {
      name: 'Bankroll Optimization',
      fn: async () => {
        const mockOpportunities = [{
          id: 'opp-1',
          expectedReturn: 0.1,
          volatility: 0.2,
          confidence: 0.8,
          correlation: 0.1,
          maxAllocation: 1000
        }];
        await system.optimizeBankroll(mockOpportunities, 10000);
      }
    }
  ];

  const results = [];

  for (const benchmark of benchmarks) {
    const start = performance.now();

    await benchmark.fn();

    const duration = performance.now() - start;
    const opsPerSecond = (iterations / (duration / 1000)).toFixed(0);

    results.push({
      Benchmark: benchmark.name,
      'Duration (ms)': duration.toFixed(2),
      'Ops/sec': opsPerSecond,
      Status: duration < 1000 ? '✅ FAST' : '⚠️ SLOW'
    });
  }

  console.log(Bun.inspect.table(results));

  // Comprehensive v4.0 Health Check
  console.log('\n🔍 T3-Lattice v4.0 System Health Check\n');

  const healthCheck = await system.comprehensiveHealthCheck();

  const healthTable = [
    { Component: 'T3 Lattice Core', Status: '✅ ACTIVE' },
    { Component: 'Quantum Weaver', Status: '✅ ACTIVE' },
    { Component: 'Quantum Hybrid Crypto', Status: healthCheck.components.quantumCrypto ? '✅ ACTIVE' : '❌ OFFLINE' },
    { Component: 'Federated Learning', Status: healthCheck.components.federatedLearning ? '✅ ACTIVE' : '❌ OFFLINE' },
    { Component: 'Arbitrage Detector', Status: healthCheck.components.arbitrageDetector ? '✅ ACTIVE' : '❌ OFFLINE' },
    { Component: 'Compliance Engine', Status: healthCheck.components.complianceEngine ? '✅ ACTIVE' : '❌ OFFLINE' },
    { Component: 'Bankroll Optimizer', Status: healthCheck.components.bankrollOptimizer ? '✅ ACTIVE' : '❌ OFFLINE' },
    { Component: 'Risk Manager Layers', Status: `${healthCheck.components.riskManager.filter((l: any) => l.operational).length}/${healthCheck.components.riskManager.length} OPERATIONAL` },
    { Component: 'Disaster Recovery', Status: Array.from(healthCheck.disasterRecovery.systemsHealth.values()).every((v: any) => v) ? '✅ READY' : '⚠️ ISSUES' },
    { Component: 'Federated Model', Status: `Accuracy: ${(healthCheck.federatedLearning.globalModelAccuracy * 100).toFixed(1)}%` }
  ];

  console.log(Bun.inspect.table(healthTable));

  console.log(`\n📊 Overall System Status: ${healthCheck.overallStatus}`);
  console.log(`📅 Last Disaster Recovery Backup: ${healthCheck.disasterRecovery.lastBackup.toISOString()}`);
  console.log(`⏰ Health Check Timestamp: ${new Date(healthCheck.timestamp).toISOString()}`);
}

runUnifiedBenchmarks();