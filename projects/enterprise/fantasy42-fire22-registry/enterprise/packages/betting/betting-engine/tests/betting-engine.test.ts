/**
 * 🧪 Fantasy42 Betting Engine - Comprehensive Tests
 * Tests for core betting functionality, validation, and edge cases
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Fantasy42BettingEngine } from '../src/engine.js';
import { Fantasy42OddsEngine } from '../src/odds/index.js';
import { SportType, BetType, BetOutcome } from '../src/types/index.js';

// Mock engines for testing
class MockSecurityEngine {
  initialize = mock(() => Promise.resolve());
  getHealthStatus = mock(() => Promise.resolve(true));
  detectFraud = mock(() => Promise.resolve({ suspicious: false, confidence: 0 }));
  analyzeBettingPattern = mock(() => Promise.resolve({ suspicious: false }));
}

class MockComplianceEngine {
  initialize = mock(() => Promise.resolve());
  getHealthStatus = mock(() => Promise.resolve(true));
  verifyAge = mock(() => Promise.resolve(true));
  checkLocationCompliance = mock(() => Promise.resolve(true));
  checkSelfExclusion = mock(() => Promise.resolve(false));
  checkBettingLimits = mock(() => Promise.resolve(true));
  checkAccountStatus = mock(() => Promise.resolve(true));
  assessUserRisk = mock(() => Promise.resolve(20));
  logAuditEvent = mock(() => Promise.resolve());
}

class MockAnalyticsEngine {
  initialize = mock(() => Promise.resolve());
  getHealthStatus = mock(() => Promise.resolve(true));
  trackBetPlacement = mock(() => Promise.resolve());
  trackParlayPlacement = mock(() => Promise.resolve());
  trackBetSettlement = mock(() => Promise.resolve());
  trackGameUpdate = mock(() => Promise.resolve());
  trackError = mock(() => Promise.resolve());
}

describe('Fantasy42 Betting Engine', () => {
  let bettingEngine: Fantasy42BettingEngine;
  let securityEngine: MockSecurityEngine;
  let complianceEngine: MockComplianceEngine;
  let analyticsEngine: MockAnalyticsEngine;

  beforeEach(async () => {
    securityEngine = new MockSecurityEngine();
    complianceEngine = new MockComplianceEngine();
    analyticsEngine = new MockAnalyticsEngine();

    bettingEngine = new Fantasy42BettingEngine(securityEngine, complianceEngine, analyticsEngine, {
      minBetAmount: 1,
      maxBetAmount: 1000,
      vigPercentage: 0.05,
      enableRiskManagement: true,
    });

    await bettingEngine.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(securityEngine.initialize).toHaveBeenCalled();
      expect(complianceEngine.initialize).toHaveBeenCalled();
      expect(analyticsEngine.initialize).toHaveBeenCalled();
    });

    it('should validate configuration', () => {
      const config = bettingEngine.getConfig();
      expect(config.minBetAmount).toBe(1);
      expect(config.maxBetAmount).toBe(1000);
      expect(config.vigPercentage).toBe(0.05);
    });
  });

  describe('Game Management', () => {
    const testGame = {
      id: 'test-game-1',
      sport: SportType.NFL,
      homeTeam: {
        id: 'home',
        name: 'Home Team',
        abbreviation: 'HOM',
      },
      awayTeam: {
        id: 'away',
        name: 'Away Team',
        abbreviation: 'AWY',
      },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
    };

    it('should add and retrieve games', () => {
      bettingEngine.addGame(testGame);

      const retrievedGame = bettingEngine.getGame(testGame.id);
      expect(retrievedGame).toEqual(testGame);
    });

    it('should return active games', () => {
      bettingEngine.addGame(testGame);

      const activeGames = bettingEngine.getActiveGames();
      expect(activeGames).toContain(testGame);
    });
  });

  describe('Bet Placement', () => {
    const testGame = {
      id: 'test-game-1',
      sport: SportType.NFL,
      homeTeam: {
        id: 'home',
        name: 'Home Team',
        abbreviation: 'HOM',
      },
      awayTeam: {
        id: 'away',
        name: 'Away Team',
        abbreviation: 'AWY',
      },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
    };

    const testOdds = {
      american: -150,
      decimal: 1.667,
      fractional: '2/3',
      impliedProbability: 0.6,
    };

    beforeEach(() => {
      bettingEngine.addGame(testGame);
    });

    it('should place a valid bet', async () => {
      const bet = await bettingEngine.placeBet(
        'user-123',
        testGame.id,
        BetType.MONEYLINE,
        50,
        testOdds,
        'home'
      );

      expect(bet.id).toBeDefined();
      expect(bet.userId).toBe('user-123');
      expect(bet.gameId).toBe(testGame.id);
      expect(bet.amount).toBe(50);
      expect(bet.odds).toEqual(testOdds);
      expect(bet.selection).toBe('home');
      expect(bet.status).toBe(BetOutcome.PENDING);
      expect(bet.potentialPayout).toBeGreaterThan(50);

      expect(analyticsEngine.trackBetPlacement).toHaveBeenCalled();
    });

    it('should reject bet on non-existent game', async () => {
      await expect(
        bettingEngine.placeBet(
          'user-123',
          'non-existent-game',
          BetType.MONEYLINE,
          50,
          testOdds,
          'home'
        )
      ).rejects.toThrow('Game not found');
    });

    it('should reject bet below minimum amount', async () => {
      await expect(
        bettingEngine.placeBet(
          'user-123',
          testGame.id,
          BetType.MONEYLINE,
          0.5, // Below minimum
          testOdds,
          'home'
        )
      ).rejects.toThrow('Bet validation failed');
    });

    it('should reject bet above maximum amount', async () => {
      await expect(
        bettingEngine.placeBet(
          'user-123',
          testGame.id,
          BetType.MONEYLINE,
          2000, // Above maximum
          testOdds,
          'home'
        )
      ).rejects.toThrow('Bet validation failed');
    });
  });

  describe('Parlay Bets', () => {
    const testGame1 = {
      id: 'test-game-1',
      sport: SportType.NFL,
      homeTeam: { id: 'home1', name: 'Home Team 1', abbreviation: 'H1' },
      awayTeam: { id: 'away1', name: 'Away Team 1', abbreviation: 'A1' },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
    };

    const testGame2 = {
      id: 'test-game-2',
      sport: SportType.NFL,
      homeTeam: { id: 'home2', name: 'Home Team 2', abbreviation: 'H2' },
      awayTeam: { id: 'away2', name: 'Away Team 2', abbreviation: 'A2' },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
    };

    const testOdds = {
      american: -150,
      decimal: 1.667,
      fractional: '2/3',
      impliedProbability: 0.6,
    };

    beforeEach(() => {
      bettingEngine.addGame(testGame1);
      bettingEngine.addGame(testGame2);
    });

    it('should place a valid parlay bet', async () => {
      const parlayBet = await bettingEngine.placeParlayBet(
        'user-123',
        [
          { gameId: testGame1.id, selection: 'home', odds: testOdds },
          { gameId: testGame2.id, selection: 'away', odds: testOdds },
        ],
        50
      );

      expect(parlayBet.type).toBe(BetType.PARLAY);
      expect(parlayBet.amount).toBe(50);
      expect(parlayBet.odds.decimal).toBeGreaterThan(1.667); // Combined odds
      expect(parlayBet.potentialPayout).toBeGreaterThan(50);

      expect(analyticsEngine.trackParlayPlacement).toHaveBeenCalled();
    });

    it('should reject parlay with single leg', async () => {
      await expect(
        bettingEngine.placeParlayBet(
          'user-123',
          [{ gameId: testGame1.id, selection: 'home', odds: testOdds }],
          50
        )
      ).rejects.toThrow('Parlay must have at least 2 legs');
    });
  });

  describe('Bet Settlement', () => {
    const testGame = {
      id: 'test-game-1',
      sport: SportType.NFL,
      homeTeam: { id: 'home', name: 'Home Team', abbreviation: 'HOM' },
      awayTeam: { id: 'away', name: 'Away Team', abbreviation: 'AWY' },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
    };

    const testOdds = {
      american: -150,
      decimal: 1.667,
      fractional: '2/3',
      impliedProbability: 0.6,
    };

    let testBet: any;

    beforeEach(async () => {
      bettingEngine.addGame(testGame);
      testBet = await bettingEngine.placeBet(
        'user-123',
        testGame.id,
        BetType.MONEYLINE,
        50,
        testOdds,
        'home'
      );
    });

    it('should settle bet as win', async () => {
      const settledBet = await bettingEngine.settleBet(testBet.id, 'WIN');

      expect(settledBet.status).toBe(BetOutcome.WIN);
      expect(settledBet.settledAt).toBeInstanceOf(Date);
      expect(settledBet.metadata.settlement.payout).toBe(testBet.potentialPayout);

      expect(analyticsEngine.trackBetSettlement).toHaveBeenCalled();
    });

    it('should settle bet as loss', async () => {
      const settledBet = await bettingEngine.settleBet(testBet.id, 'LOSS');

      expect(settledBet.status).toBe(BetOutcome.LOSS);
      expect(settledBet.metadata.settlement.payout).toBe(0);
    });

    it('should settle bet as push', async () => {
      const settledBet = await bettingEngine.settleBet(testBet.id, 'PUSH');

      expect(settledBet.status).toBe(BetOutcome.PUSH);
      expect(settledBet.metadata.settlement.payout).toBe(0);
    });
  });

  describe('User Statistics', () => {
    it('should return user betting statistics', () => {
      const stats = bettingEngine.getUserStats('user-123');

      expect(stats).toHaveProperty('totalBets');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('totalPayout');
      expect(stats).toHaveProperty('winRate');
      expect(stats).toHaveProperty('profitLoss');
    });
  });

  describe('Health Monitoring', () => {
    it('should return healthy status', async () => {
      const health = await bettingEngine.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.components.security).toBe(true);
      expect(health.components.compliance).toBe(true);
      expect(health.components.analytics).toBe(true);
      expect(health.metrics).toHaveProperty('activeGames');
      expect(health.metrics).toHaveProperty('activeBets');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', async () => {
      await bettingEngine.updateConfig({
        maxBetAmount: 2000,
        vigPercentage: 0.03,
      });

      const config = bettingEngine.getConfig();
      expect(config.maxBetAmount).toBe(2000);
      expect(config.vigPercentage).toBe(0.03);
    });

    it('should reject invalid configuration', async () => {
      await expect(
        bettingEngine.updateConfig({
          minBetAmount: 100,
          maxBetAmount: 50, // Invalid: min > max
        })
      ).rejects.toThrow('Configuration validation failed');
    });
  });

  describe('Emergency Shutdown', () => {
    it('should perform emergency shutdown', async () => {
      // Place a test bet first
      const testGame = {
        id: 'emergency-test',
        sport: SportType.NFL,
        homeTeam: { id: 'home', name: 'Home', abbreviation: 'HOM' },
        awayTeam: { id: 'away', name: 'Away', abbreviation: 'AWY' },
        scheduledTime: new Date(),
        status: 'SCHEDULED' as const,
      };

      bettingEngine.addGame(testGame);

      await bettingEngine.placeBet(
        'user-123',
        testGame.id,
        BetType.MONEYLINE,
        50,
        { american: -150, decimal: 1.667, fractional: '2/3', impliedProbability: 0.6 },
        'home'
      );

      await bettingEngine.emergencyShutdown('Test shutdown');

      expect(complianceEngine.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'emergency_shutdown',
          resource: 'betting_engine',
        })
      );
    });
  });
});

describe('Odds Engine Integration', () => {
  let oddsEngine: Fantasy42OddsEngine;

  beforeEach(() => {
    oddsEngine = new Fantasy42OddsEngine();
  });

  it('should convert odds formats correctly', () => {
    const americanOdds = oddsEngine.convertOdds(-150, 'AMERICAN', 'DECIMAL');
    expect(americanOdds.decimal).toBeCloseTo(1.667, 3);
    expect(americanOdds.american).toBe(-150);
    expect(americanOdds.fractional).toBe('2/3');
  });

  it('should calculate payouts correctly', () => {
    const odds = { american: -150, decimal: 1.667, fractional: '2/3', impliedProbability: 0.6 };
    const payout = oddsEngine.calculatePayout(100, odds);
    expect(payout).toBeCloseTo(66.67, 2);
  });

  it('should validate odds', () => {
    const validOdds = {
      american: -150,
      decimal: 1.667,
      fractional: '2/3',
      impliedProbability: 0.6,
    };
    expect(oddsEngine.validateOdds(validOdds)).toBe(true);

    const invalidOdds = { american: 50, decimal: 1.1, fractional: '1/10', impliedProbability: 0.9 };
    expect(oddsEngine.validateOdds(invalidOdds)).toBe(false);
  });
});
