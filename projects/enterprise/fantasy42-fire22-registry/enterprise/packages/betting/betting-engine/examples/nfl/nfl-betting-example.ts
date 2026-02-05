/**
 * 🏈 Fantasy42 NFL Betting Engine Example
 *
 * Comprehensive example showing NFL-specific betting operations including:
 * - NFL game setup with team data
 * - Spread and moneyline betting
 * - Live betting during games
 * - NFL-specific odds calculations
 * - Playoff and regular season handling
 */

import {
  Fantasy42BettingEngine,
  Fantasy42SecurityEngine,
  Fantasy42ComplianceEngine,
  Fantasy42AnalyticsEngine,
  SportType,
  BetType,
} from '@fire22-registry/betting-engine';

interface NFLTeam {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
  city: string;
  stadium: string;
  capacity: number;
}

interface NFLGame {
  id: string;
  week: number;
  season: number;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  scheduledTime: Date;
  gameType: 'regular' | 'playoff' | 'superbowl';
  spread?: number;
  total?: number;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
  };
}

// ============================================================================
// NFL TEAM DATABASE
// ============================================================================

const NFL_TEAMS: Record<string, NFLTeam> = {
  kc: {
    id: 'kc',
    name: 'Kansas City Chiefs',
    abbreviation: 'KC',
    conference: 'AFC',
    division: 'West',
    city: 'Kansas City',
    stadium: 'Arrowhead Stadium',
    capacity: 76416,
  },
  sf: {
    id: 'sf',
    name: 'San Francisco 49ers',
    abbreviation: 'SF',
    conference: 'NFC',
    division: 'West',
    city: 'Santa Clara',
    stadium: 'Levis Stadium',
    capacity: 68500,
  },
  buf: {
    id: 'buf',
    name: 'Buffalo Bills',
    abbreviation: 'BUF',
    conference: 'AFC',
    division: 'East',
    city: 'Orchard Park',
    stadium: 'Highmark Stadium',
    capacity: 71608,
  },
  dal: {
    id: 'dal',
    name: 'Dallas Cowboys',
    abbreviation: 'DAL',
    conference: 'NFC',
    division: 'East',
    city: 'Arlington',
    stadium: 'AT&T Stadium',
    capacity: 80000,
  },
};

// ============================================================================
// NFL BETTING ENGINE EXAMPLE
// ============================================================================

async function nflBettingEngineExample() {
  console.log('🏈 Setting up Fantasy42 NFL Betting Engine...');

  // Initialize engines
  const securityEngine = new Fantasy42SecurityEngine({
    enableFraudDetection: true,
    enablePatternAnalysis: true,
  });

  const complianceEngine = new Fantasy42ComplianceEngine({
    jurisdiction: 'US',
    enableAgeVerification: true,
    enableLocationCompliance: true,
  });

  const analyticsEngine = new Fantasy42AnalyticsEngine({
    enableRealTimeAnalytics: true,
    enableRiskAnalytics: true,
  });

  const bettingEngine = new Fantasy42BettingEngine(
    securityEngine,
    complianceEngine,
    analyticsEngine,
    {
      minBetAmount: 1,
      maxBetAmount: 50000,
      vigPercentage: 0.05,
      supportedSports: [SportType.NFL],
      enableLiveBetting: true,
      timezone: 'America/New_York',
    }
  );

  await bettingEngine.initialize();
  console.log('✅ NFL Betting Engine ready');

  // ============================================================================
  // NFL GAME SETUP
  // ============================================================================

  console.log('\n🏟️ Setting up NFL games...');

  // Create Week 18 matchup
  const week18Game: NFLGame = {
    id: 'nfl-kc-sf-2024-w18',
    week: 18,
    season: 2024,
    homeTeam: NFL_TEAMS['sf'],
    awayTeam: NFL_TEAMS['kc'],
    scheduledTime: new Date('2024-01-07T16:25:00Z'),
    gameType: 'regular',
    spread: 3.5,
    total: 47.5,
    weather: {
      temperature: 65,
      condition: 'Partly Cloudy',
      windSpeed: 8,
    },
  };

  // Create playoff game
  const playoffGame: NFLGame = {
    id: 'nfl-buf-dal-2024-afc-divisional',
    week: 20,
    season: 2024,
    homeTeam: NFL_TEAMS['buf'],
    awayTeam: NFL_TEAMS['dal'],
    scheduledTime: new Date('2024-01-20T15:05:00Z'),
    gameType: 'playoff',
    spread: 6.5,
    total: 52.5,
  };

  // Add games to engine
  const games = [week18Game, playoffGame];

  for (const game of games) {
    bettingEngine.addGame({
      id: game.id,
      sport: SportType.NFL,
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        abbreviation: game.homeTeam.abbreviation,
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        abbreviation: game.awayTeam.abbreviation,
      },
      scheduledTime: game.scheduledTime,
      status: 'SCHEDULED',
      venue: {
        name: game.homeTeam.stadium,
        city: game.homeTeam.city,
        capacity: game.homeTeam.capacity,
      },
      metadata: {
        week: game.week,
        season: game.season,
        gameType: game.gameType,
        conference: game.homeTeam.conference,
        division: game.homeTeam.division,
        weather: game.weather,
        spread: game.spread,
        total: game.total,
      },
    });
  }

  console.log(`✅ Added ${games.length} NFL games`);

  // ============================================================================
  // NFL-SPECIFIC BETTING
  // ============================================================================

  console.log('\n💰 Placing NFL bets...');

  const bets = [];

  try {
    // 1. Moneyline Bet on Chiefs
    const moneylineBet = await bettingEngine.placeBet(
      'fan-123',
      week18Game.id,
      BetType.MONEYLINE,
      1000,
      {
        american: -180,
        decimal: 1.556,
        fractional: '5/9',
        impliedProbability: 0.643,
      },
      'away', // Chiefs
      {
        gameType: 'regular',
        week: week18Game.week,
        season: week18Game.season,
        team: 'Chiefs',
      }
    );

    console.log(`✅ Moneyline bet: Chiefs -180`);
    bets.push(moneylineBet);

    // 2. Spread Bet on 49ers -3.5
    const spreadBet = await bettingEngine.placeBet(
      'fan-456',
      week18Game.id,
      BetType.SPREAD,
      2500,
      {
        american: -110,
        decimal: 1.909,
        fractional: '10/11',
        impliedProbability: 0.524,
      },
      'home', // 49ers -3.5
      {
        points: 3.5,
        gameType: 'regular',
        weather: week18Game.weather,
      }
    );

    console.log(`✅ Spread bet: 49ers -3.5`);
    bets.push(spreadBet);

    // 3. Total (Over/Under) Bet
    const totalBet = await bettingEngine.placeBet(
      'fan-789',
      week18Game.id,
      BetType.TOTAL,
      1500,
      {
        american: -105,
        decimal: 1.952,
        fractional: '20/21',
        impliedProbability: 0.513,
      },
      'over', // Over 47.5
      {
        total: 47.5,
        gameType: 'regular',
      }
    );

    console.log(`✅ Total bet: Over 47.5`);
    bets.push(totalBet);

    // 4. Playoff Moneyline Bet
    const playoffBet = await bettingEngine.placeBet(
      'fan-101',
      playoffGame.id,
      BetType.MONEYLINE,
      5000,
      {
        american: -140,
        decimal: 1.714,
        fractional: '5/7',
        impliedProbability: 0.583,
      },
      'home', // Bills
      {
        gameType: 'playoff',
        round: 'divisional',
        homeAdvantage: true,
      }
    );

    console.log(`✅ Playoff bet: Bills -140`);
    bets.push(playoffBet);

    // ============================================================================
    // LIVE BETTING SIMULATION
    // ============================================================================

    console.log('\n📺 Simulating live betting...');

    // Simulate live game updates
    const liveUpdates = [
      { quarter: 1, homeScore: 7, awayScore: 0, timeRemaining: '12:34' },
      { quarter: 2, homeScore: 14, awayScore: 7, timeRemaining: '8:12' },
      { quarter: 3, homeScore: 21, awayScore: 10, timeRemaining: '4:56' },
      { quarter: 4, homeScore: 28, awayScore: 24, timeRemaining: '0:00' },
    ];

    for (const update of liveUpdates) {
      // Update live odds based on score
      const liveSpread = update.homeScore - update.awayScore;
      const liveOdds = {
        american: liveSpread > 0 ? -120 : +100,
        decimal: liveSpread > 0 ? 1.833 : 2.0,
        fractional: liveSpread > 0 ? '5/6' : '1/1',
        impliedProbability: liveSpread > 0 ? 0.545 : 0.5,
      };

      const liveBet = await bettingEngine.placeBet(
        'fan-202',
        week18Game.id,
        BetType.SPREAD,
        750,
        liveOdds,
        'home',
        {
          live: true,
          quarter: update.quarter,
          timeRemaining: update.timeRemaining,
          liveScore: {
            home: update.homeScore,
            away: update.awayScore,
          },
          liveSpread: liveSpread,
        }
      );

      console.log(`✅ Live bet: Q${update.quarter} ${update.timeRemaining} - ${liveOdds.american}`);
    }

    // ============================================================================
    // PARLAY BETTING
    // ============================================================================

    console.log('\n🎯 Creating NFL parlay...');

    const parlayBet = await bettingEngine.placeParlayBet(
      'fan-303',
      [
        {
          gameId: week18Game.id,
          selection: 'home',
          odds: { american: -150, decimal: 1.667, fractional: '2/3', impliedProbability: 0.6 },
        },
        {
          gameId: playoffGame.id,
          selection: 'away',
          odds: { american: +160, decimal: 2.6, fractional: '8/5', impliedProbability: 0.385 },
        },
      ],
      2000,
      {
        parlayType: 'nfl-mix',
        games: ['regular', 'playoff'],
      }
    );

    console.log(`✅ NFL Parlay created: ${parlayBet.id}`);
    console.log(`📊 Combined odds: ${parlayBet.odds.american}`);
    console.log(`💰 Potential payout: $${parlayBet.potentialPayout}`);

    // ============================================================================
    // BET SETTLEMENT
    // ============================================================================

    console.log('\n🎯 Settling NFL bets...');

    // Settle week 18 game (49ers win)
    const week18Result = {
      finalScore: { home: 28, away: 24 },
      winner: 'home',
      spreadResult: { home: 3.5, actual: 4 },
      totalResult: { total: 47.5, actual: 52 },
      status: 'COMPLETED',
    };

    // Settle individual bets
    const settlements = [];

    for (const bet of bets.filter(b => b.gameId === week18Game.id)) {
      let outcome: 'WIN' | 'LOSS' | 'PUSH' = 'LOSS';

      if (bet.type === BetType.MONEYLINE) {
        outcome = bet.selection === 'home' ? 'WIN' : 'LOSS';
      } else if (bet.type === BetType.SPREAD) {
        outcome = 'WIN'; // 49ers covered the spread
      } else if (bet.type === BetType.TOTAL) {
        outcome = bet.selection === 'over' ? 'WIN' : 'LOSS';
      }

      const settledBet = await bettingEngine.settleBet(bet.id, outcome, week18Result);
      settlements.push(settledBet);
      console.log(
        `✅ Settled ${bet.type} bet: ${outcome} - $${settledBet.metadata.settlement.payout}`
      );
    }

    // ============================================================================
    // ANALYTICS & REPORTING
    // ============================================================================

    console.log('\n📊 NFL Analytics...');

    const analytics = {
      totalBets: bets.length,
      totalAmount: bets.reduce((sum, bet) => sum + bet.amount, 0),
      totalSettled: settlements.length,
      totalPayout: settlements.reduce(
        (sum, bet) => sum + (bet.metadata.settlement?.payout || 0),
        0
      ),
      winRate: settlements.filter(bet => bet.status === 'WIN').length / settlements.length,
    };

    console.log('NFL Betting Session Summary:');
    console.log(`- Total Bets: ${analytics.totalBets}`);
    console.log(`- Total Wagered: $${analytics.totalAmount}`);
    console.log(`- Total Payout: $${analytics.totalPayout}`);
    console.log(`- Win Rate: ${(analytics.winRate * 100).toFixed(1)}%`);
    console.log(`- House Profit: $${analytics.totalAmount - analytics.totalPayout}`);

    // ============================================================================
    // USER STATISTICS
    // ============================================================================

    console.log('\n👤 User Statistics...');

    const users = ['fan-123', 'fan-456', 'fan-789', 'fan-101', 'fan-202', 'fan-303'];
    for (const userId of users) {
      const userStats = bettingEngine.getUserStats(userId);
      if (userStats.totalBets > 0) {
        console.log(`User ${userId}:`);
        console.log(`  - Bets: ${userStats.totalBets}`);
        console.log(`  - Amount: $${userStats.totalAmount}`);
        console.log(`  - Payout: $${userStats.totalPayout}`);
        console.log(`  - Win Rate: ${(userStats.winRate * 100).toFixed(1)}%`);
      }
    }

    // ============================================================================
    // SYSTEM HEALTH
    // ============================================================================

    console.log('\n🏥 System Health Check...');

    const health = await bettingEngine.getHealthStatus();
    console.log(`Status: ${health.status}`);
    console.log(`Active Games: ${health.metrics.activeGames}`);
    console.log(`Active Bets: ${health.metrics.activeBets}`);
    console.log(`NFL Games: ${health.metrics.supportedSports}`);

    console.log('\n🎉 NFL Betting Engine example completed successfully!');
    console.log('🏆 All NFL betting operations demonstrated');
  } catch (error) {
    console.error('❌ Error in NFL betting operations:', error);

    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
    }
  }
}

// ============================================================================
// NFL-SPECIFIC UTILITIES
// ============================================================================

/**
 * Calculate NFL spread based on team ratings
 */
function calculateNFLSpread(homeRating: number, awayRating: number): number {
  const ratingDiff = homeRating - awayRating;
  return ratingDiff * 0.5; // 0.5 points per rating point
}

/**
 * Get NFL team by abbreviation
 */
function getNFLTeam(abbrev: string): NFLTeam | undefined {
  return Object.values(NFL_TEAMS).find(
    team => team.abbreviation.toLowerCase() === abbrev.toLowerCase()
  );
}

/**
 * Validate NFL game data
 */
function validateNFLGame(game: NFLGame): boolean {
  if (!game.homeTeam || !game.awayTeam) {
    console.error('NFL game must have home and away teams');
    return false;
  }

  if (game.homeTeam.conference === game.awayTeam.conference) {
    if (game.homeTeam.division !== game.awayTeam.division) {
      console.error('Intra-conference games must be intra-divisional');
      return false;
    }
  }

  return true;
}

/**
 * Get NFL odds based on team performance
 */
function getNFLOdds(team1: NFLTeam, team2: NFLTeam): any {
  // Simplified odds calculation
  const team1Strength = getTeamStrength(team1);
  const team2Strength = getTeamStrength(team2);

  const strengthDiff = team1Strength - team2Strength;
  const americanOdds = strengthDiff > 0 ? -150 : +130;

  return {
    american: americanOdds,
    decimal: americanOdds > 0 ? americanOdds / 100 + 1 : 100 / Math.abs(americanOdds) + 1,
    fractional: americanOdds > 0 ? `${americanOdds}/100` : `100/${Math.abs(americanOdds)}`,
    impliedProbability:
      americanOdds > 0
        ? 100 / (americanOdds + 100)
        : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100),
  };
}

/**
 * Get team strength rating (simplified)
 */
function getTeamStrength(team: NFLTeam): number {
  // Simplified team strength calculation
  const conferenceStrength = team.conference === 'NFC' ? 1.1 : 1.0;
  const divisionStrength = team.division === 'West' ? 1.05 : 1.0;

  return conferenceStrength * divisionStrength * 100;
}

// ============================================================================
// RUN EXAMPLE
// ============================================================================

if (import.meta.main) {
  nflBettingEngineExample()
    .then(() => {
      console.log('\n🏆 NFL Betting Engine example completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 NFL Betting Engine example failed:', error);
      process.exit(1);
    });
}

export {
  nflBettingEngineExample,
  NFL_TEAMS,
  calculateNFLSpread,
  getNFLTeam,
  validateNFLGame,
  getNFLOdds,
};
