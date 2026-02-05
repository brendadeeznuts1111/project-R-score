/**
 * 🔥 Fantasy42 Betting Engine - Basic Setup Example
 *
 * This example demonstrates the basic setup and usage of the Fantasy42 Betting Engine
 * for enterprise sports betting operations.
 */

import {
  Fantasy42BettingEngine,
  Fantasy42SecurityEngine,
  Fantasy42ComplianceEngine,
  Fantasy42AnalyticsEngine,
  SportType,
  BetType,
} from '@fire22-registry/betting-engine';

async function basicBettingEngineSetup() {
  console.log('🚀 Setting up Fantasy42 Betting Engine...');

  // ============================================================================
  // ENGINE INITIALIZATION
  // ============================================================================

  // Initialize security engine with enterprise settings
  const securityEngine = new Fantasy42SecurityEngine({
    enableFraudDetection: true,
    enablePatternAnalysis: true,
    riskThreshold: 0.7,
    encryptionLevel: 'enterprise',
  });

  // Initialize compliance engine for regulatory requirements
  const complianceEngine = new Fantasy42ComplianceEngine({
    jurisdiction: 'US',
    complianceLevel: 'enterprise',
    enableAgeVerification: true,
    enableLocationCompliance: true,
    enableSelfExclusion: true,
    enableResponsibleGambling: true,
  });

  // Initialize analytics engine for business intelligence
  const analyticsEngine = new Fantasy42AnalyticsEngine({
    enableRealTimeAnalytics: true,
    enableRiskAnalytics: true,
    enableUserBehaviorAnalysis: true,
    reportingInterval: '5m',
  });

  // Create the main betting engine
  const bettingEngine = new Fantasy42BettingEngine(
    securityEngine,
    complianceEngine,
    analyticsEngine,
    {
      // Core configuration
      minBetAmount: 1,
      maxBetAmount: 10000,
      vigPercentage: 0.05,
      defaultOddsFormat: 'AMERICAN',

      // Sports configuration
      supportedSports: [SportType.NFL, SportType.NBA, SportType.MLB],
      maxParlayLegs: 8,

      // Security & compliance
      enableRiskManagement: true,
      enableFraudDetection: true,
      complianceLevel: 'enterprise',

      // Performance settings
      timezone: 'America/New_York',
      enableLiveBetting: true,

      // Business rules
      maxDailyBetAmount: 50000,
      maxMonthlyBetAmount: 100000,
    }
  );

  // Initialize the engine
  await bettingEngine.initialize();
  console.log('✅ Fantasy42 Betting Engine initialized successfully');

  // ============================================================================
  // GAME MANAGEMENT
  // ============================================================================

  console.log('\n🏈 Setting up games...');

  // Add NFL game
  const nflGame = {
    id: 'nfl-kc-sf-2024-01-15',
    sport: SportType.NFL,
    homeTeam: {
      id: 'sf',
      name: 'San Francisco 49ers',
      abbreviation: 'SF',
      conference: 'NFC',
      division: 'West',
    },
    awayTeam: {
      id: 'kc',
      name: 'Kansas City Chiefs',
      abbreviation: 'KC',
      conference: 'AFC',
      division: 'West',
    },
    scheduledTime: new Date('2024-01-15T16:25:00Z'),
    status: 'SCHEDULED' as const,
    venue: {
      name: 'Levis Stadium',
      city: 'Santa Clara',
      state: 'CA',
      capacity: 68500,
    },
    metadata: {
      week: 19,
      season: 2023,
      gameType: 'playoff',
    },
  };

  bettingEngine.addGame(nflGame);
  console.log(`✅ Added NFL game: ${nflGame.homeTeam.name} vs ${nflGame.awayTeam.name}`);

  // ============================================================================
  // BET PLACEMENT
  // ============================================================================

  console.log('\n💰 Placing bets...');

  try {
    // Place a moneyline bet
    const moneylineBet = await bettingEngine.placeBet(
      'user-12345',
      nflGame.id,
      BetType.MONEYLINE,
      100, // $1.00 bet
      {
        american: -150,
        decimal: 1.667,
        fractional: '2/3',
        impliedProbability: 0.6,
      },
      'home', // Bet on 49ers
      {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceFingerprint: 'abc123def456',
        location: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
        },
      }
    );

    console.log(`✅ Moneyline bet placed: ${moneylineBet.id}`);
    console.log(`💵 Potential payout: $${moneylineBet.potentialPayout}`);
    console.log(`📊 Odds: ${moneylineBet.odds.american}`);

    // Place a spread bet
    const spreadBet = await bettingEngine.placeBet(
      'user-67890',
      nflGame.id,
      BetType.SPREAD,
      5000, // $50.00 bet
      {
        american: -110,
        decimal: 1.909,
        fractional: '10/11',
        impliedProbability: 0.524,
      },
      'home',
      {
        points: 3.5, // 49ers -3.5
        ipAddress: '192.168.1.101',
        location: { country: 'US', state: 'CA', city: 'Los Angeles' },
      }
    );

    console.log(`✅ Spread bet placed: ${spreadBet.id}`);
    console.log(`📈 Spread: ${spreadBet.metadata.points} points`);

    // ============================================================================
    // BET SETTLEMENT
    // ============================================================================

    console.log('\n🎯 Settling bets...');

    // Simulate game completion
    const gameResult = {
      finalScore: {
        home: 28,
        away: 24,
      },
      winner: 'home',
      spreadResult: {
        home: 3.5,
        actual: 4,
      },
      status: 'COMPLETED',
      completedAt: new Date(),
    };

    // Settle moneyline bet (win)
    const settledMoneylineBet = await bettingEngine.settleBet(moneylineBet.id, 'WIN', gameResult);

    console.log(`✅ Moneyline bet settled: ${settledMoneylineBet.status}`);
    console.log(`💰 Payout: $${settledMoneylineBet.metadata.settlement.payout}`);

    // Settle spread bet (win)
    const settledSpreadBet = await bettingEngine.settleBet(spreadBet.id, 'WIN', gameResult);

    console.log(`✅ Spread bet settled: ${settledSpreadBet.status}`);
    console.log(`💰 Payout: $${settledSpreadBet.metadata.settlement.payout}`);

    // ============================================================================
    // USER STATISTICS
    // ============================================================================

    console.log('\n📊 User statistics...');

    const userStats = bettingEngine.getUserStats('user-12345');
    console.log('User betting statistics:');
    console.log(`- Total bets: ${userStats.totalBets}`);
    console.log(`- Total amount wagered: $${userStats.totalAmount}`);
    console.log(`- Total payout: $${userStats.totalPayout}`);
    console.log(`- Win rate: ${(userStats.winRate * 100).toFixed(1)}%`);
    console.log(`- Profit/Loss: $${userStats.profitLoss}`);

    // ============================================================================
    // HEALTH MONITORING
    // ============================================================================

    console.log('\n🏥 System health...');

    const healthStatus = await bettingEngine.getHealthStatus();
    console.log(`System status: ${healthStatus.status}`);
    console.log(`Active games: ${healthStatus.metrics.activeGames}`);
    console.log(`Active bets: ${healthStatus.metrics.activeBets}`);
    console.log(`Supported sports: ${healthStatus.metrics.supportedSports}`);

    console.log('\n🎉 Fantasy42 Betting Engine demonstration completed successfully!');
  } catch (error) {
    console.error('❌ Error during bet placement:', error);

    // Log error details
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a sample NFL game for testing
 */
function createSampleNFLGame(): any {
  return {
    id: `nfl-${Date.now()}`,
    sport: SportType.NFL,
    homeTeam: {
      id: 'sample-home',
      name: 'Sample Home Team',
      abbreviation: 'HOM',
    },
    awayTeam: {
      id: 'sample-away',
      name: 'Sample Away Team',
      abbreviation: 'AWY',
    },
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'SCHEDULED' as const,
  };
}

/**
 * Validate bet before placement
 */
function validateBetData(betData: any): boolean {
  const required = ['userId', 'gameId', 'type', 'amount', 'odds', 'selection'];

  for (const field of required) {
    if (!betData[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  if (betData.amount < 1) {
    console.error('Bet amount must be at least $1');
    return false;
  }

  return true;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// ============================================================================
// RUN EXAMPLE
// ============================================================================

if (import.meta.main) {
  basicBettingEngineSetup()
    .then(() => {
      console.log('\n🎊 Example completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { basicBettingEngineSetup, createSampleNFLGame, validateBetData };
