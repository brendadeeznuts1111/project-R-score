#!/usr/bin/env bun

/**
 * 🔥 Fire22 Live Casino Management System
 * Comprehensive live casino rate management, game tracking, and revenue optimization
 */

export interface LiveCasinoGame {
  id: string;
  name: string;
  category: 'table' | 'card' | 'wheel' | 'dice' | 'baccarat' | 'roulette' | 'blackjack' | 'poker';
  provider: string;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  defaultRate: number;
  currentRate: number;
  popularity: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface LiveCasinoRate {
  id: string;
  agentId: string;
  gameId: string;
  baseRate: number;
  adjustedRate: number;
  adjustmentFactor: number;
  reason: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface LiveCasinoSession {
  id: string;
  sessionId: string;
  playerId: string;
  agentId: string;
  gameId: string;
  startTime: Date;
  endTime?: Date;
  totalBets: number;
  totalWins: number;
  netResult: number;
  commissionEarned: number;
  rateUsed: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface LiveCasinoRevenue {
  id: string;
  agentId: string;
  gameId: string;
  period: string; // YYYY-MM format
  totalBets: number;
  totalWins: number;
  netRevenue: number;
  commissionPaid: number;
  averageRate: number;
  playerCount: number;
  sessionCount: number;
  calculatedAt: Date;
}

export interface LiveCasinoPerformance {
  gameId: string;
  gameName: string;
  totalSessions: number;
  totalBets: number;
  totalWins: number;
  netRevenue: number;
  commissionPaid: number;
  averageRate: number;
  playerCount: number;
  winRate: number;
  houseEdge: number;
  popularity: number;
}

export class LiveCasinoManagementSystem {
  private games: Map<string, LiveCasinoGame> = new Map();
  private rates: Map<string, LiveCasinoRate> = new Map();
  private sessions: Map<string, LiveCasinoSession> = new Map();
  private revenues: Map<string, LiveCasinoRevenue> = new Map();

  constructor() {
    this.initializeDefaultGames();
    this.initializeDefaultRates();
  }

  /**
   * Initialize default live casino games
   */
  private initializeDefaultGames() {
    const defaultGames: LiveCasinoGame[] = [
      // Table Games
      {
        id: 'baccarat-live',
        name: 'Live Baccarat',
        category: 'baccarat',
        provider: 'Evolution Gaming',
        minBet: 1,
        maxBet: 10000,
        houseEdge: 0.0144,
        defaultRate: 0.03,
        currentRate: 0.03,
        popularity: 95,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'roulette-live',
        name: 'Live Roulette',
        category: 'roulette',
        provider: 'Evolution Gaming',
        minBet: 0.5,
        maxBet: 5000,
        houseEdge: 0.027,
        defaultRate: 0.025,
        currentRate: 0.025,
        popularity: 90,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'blackjack-live',
        name: 'Live Blackjack',
        category: 'blackjack',
        provider: 'Evolution Gaming',
        minBet: 1,
        maxBet: 5000,
        houseEdge: 0.005,
        defaultRate: 0.02,
        currentRate: 0.02,
        popularity: 88,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'poker-live',
        name: 'Live Poker',
        category: 'poker',
        provider: 'Pragmatic Play Live',
        minBet: 5,
        maxBet: 2000,
        houseEdge: 0.02,
        defaultRate: 0.035,
        currentRate: 0.035,
        popularity: 85,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'dice-live',
        name: 'Live Dice',
        category: 'dice',
        provider: 'Evolution Gaming',
        minBet: 0.1,
        maxBet: 1000,
        houseEdge: 0.01,
        defaultRate: 0.04,
        currentRate: 0.04,
        popularity: 75,
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'wheel-live',
        name: 'Live Game Shows',
        category: 'wheel',
        provider: 'Evolution Gaming',
        minBet: 0.5,
        maxBet: 5000,
        houseEdge: 0.03,
        defaultRate: 0.045,
        currentRate: 0.045,
        popularity: 92,
        isActive: true,
        lastUpdated: new Date(),
      },
    ];

    defaultGames.forEach(game => this.games.set(game.id, game));
  }

  /**
   * Initialize default rates for agents
   */
  private initializeDefaultRates() {
    const defaultAgents = ['agent1', 'agent2', 'agent3', 'agent4', 'agent5'];

    defaultAgents.forEach(agentId => {
      this.games.forEach(game => {
        const rate: LiveCasinoRate = {
          id: `${agentId}-${game.id}`,
          agentId,
          gameId: game.id,
          baseRate: game.defaultRate,
          adjustedRate: game.defaultRate,
          adjustmentFactor: 1.0,
          reason: 'Default rate',
          effectiveFrom: new Date(),
          isActive: true,
          createdBy: 'system',
          createdAt: new Date(),
        };

        this.rates.set(rate.id, rate);
      });
    });
  }

  /**
   * Game Management Methods
   */

  /**
   * Get all live casino games
   */
  getAllGames(): LiveCasinoGame[] {
    return Array.from(this.games.values()).sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): LiveCasinoGame | null {
    return this.games.get(gameId) || null;
  }

  /**
   * Get games by category
   */
  getGamesByCategory(category: LiveCasinoGame['category']): LiveCasinoGame[] {
    return Array.from(this.games.values())
      .filter(game => game.category === category)
      .sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Update game popularity
   */
  updateGamePopularity(gameId: string, newPopularity: number): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.popularity = Math.max(0, Math.min(100, newPopularity));
    game.lastUpdated = new Date();
    return true;
  }

  /**
   * Add new game
   */
  addGame(game: Omit<LiveCasinoGame, 'id' | 'lastUpdated'>): LiveCasinoGame {
    const newGame: LiveCasinoGame = {
      ...game,
      id: `game_${Date.now()}`,
      lastUpdated: new Date(),
    };

    this.games.set(newGame.id, newGame);
    return newGame;
  }

  /**
   * Rate Management Methods
   */

  /**
   * Get rate for agent and game
   */
  getRate(agentId: string, gameId: string): LiveCasinoRate | null {
    const rateId = `${agentId}-${gameId}`;
    return this.rates.get(rateId) || null;
  }

  /**
   * Get all rates for an agent
   */
  getAgentRates(agentId: string): LiveCasinoRate[] {
    return Array.from(this.rates.values())
      .filter(rate => rate.agentId === agentId)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  }

  /**
   * Get all rates for a game
   */
  getGameRates(gameId: string): LiveCasinoRate[] {
    return Array.from(this.rates.values())
      .filter(rate => rate.gameId === gameId)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  }

  /**
   * Update agent rate for a game
   */
  updateAgentRate(
    agentId: string,
    gameId: string,
    newRate: number,
    reason: string,
    createdBy: string
  ): LiveCasinoRate | null {
    const existingRate = this.getRate(agentId, gameId);
    if (!existingRate) return null;

    // Deactivate current rate
    existingRate.isActive = false;
    existingRate.effectiveTo = new Date();

    // Create new rate
    const newRateRecord: LiveCasinoRate = {
      id: `${agentId}-${gameId}-${Date.now()}`,
      agentId,
      gameId,
      baseRate: existingRate.baseRate,
      adjustedRate: newRate,
      adjustmentFactor: newRate / existingRate.baseRate,
      reason,
      effectiveFrom: new Date(),
      isActive: true,
      createdBy,
      createdAt: new Date(),
    };

    this.rates.set(newRateRecord.id, newRateRecord);
    return newRateRecord;
  }

  /**
   * Calculate commission for a session
   */
  calculateCommission(
    agentId: string,
    gameId: string,
    totalBets: number,
    sessionDate: Date = new Date()
  ): number {
    const rate = this.getRate(agentId, gameId);
    if (!rate || !rate.isActive) return 0;

    // Check if rate is effective for the session date
    if (sessionDate < rate.effectiveFrom || (rate.effectiveTo && sessionDate > rate.effectiveTo)) {
      return 0;
    }

    return totalBets * rate.adjustedRate;
  }

  /**
   * Session Management Methods
   */

  /**
   * Start a new live casino session
   */
  startSession(
    sessionId: string,
    playerId: string,
    agentId: string,
    gameId: string
  ): LiveCasinoSession {
    const session: LiveCasinoSession = {
      id: `session_${Date.now()}`,
      sessionId,
      playerId,
      agentId,
      gameId,
      startTime: new Date(),
      totalBets: 0,
      totalWins: 0,
      netResult: 0,
      commissionEarned: 0,
      rateUsed: this.getRate(agentId, gameId)?.adjustedRate || 0,
      status: 'active',
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * End a live casino session
   */
  endSession(sessionId: string, totalBets: number, totalWins: number): LiveCasinoSession | null {
    const session = Array.from(this.sessions.values()).find(
      s => s.sessionId === sessionId && s.status === 'active'
    );

    if (!session) return null;

    session.endTime = new Date();
    session.totalBets = totalBets;
    session.totalWins = totalWins;
    session.netResult = totalWins - totalBets;
    session.commissionEarned = this.calculateCommission(
      session.agentId,
      session.gameId,
      totalBets,
      session.startTime
    );
    session.status = 'completed';

    return session;
  }

  /**
   * Get active sessions for an agent
   */
  getActiveSessions(agentId: string): LiveCasinoSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.agentId === agentId && session.status === 'active'
    );
  }

  /**
   * Get completed sessions for an agent
   */
  getCompletedSessions(agentId: string, period: string): LiveCasinoSession[] {
    return Array.from(this.sessions.values()).filter(
      session =>
        session.agentId === agentId &&
        session.status === 'completed' &&
        session.endTime &&
        session.endTime.toISOString().slice(0, 7) === period
    );
  }

  /**
   * Revenue Management Methods
   */

  /**
   * Calculate monthly revenue for an agent
   */
  calculateMonthlyRevenue(agentId: string, period: string): LiveCasinoRevenue {
    const sessions = this.getCompletedSessions(agentId, period);

    const totalBets = sessions.reduce((sum, session) => sum + session.totalBets, 0);
    const totalWins = sessions.reduce((sum, session) => sum + session.totalWins, 0);
    const netRevenue = totalWins - totalBets;
    const commissionPaid = sessions.reduce((sum, session) => sum + session.commissionEarned, 0);

    const uniquePlayers = new Set(sessions.map(s => s.playerId)).size;
    const averageRate =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + session.rateUsed, 0) / sessions.length
        : 0;

    const revenue: LiveCasinoRevenue = {
      id: `${agentId}-${period}`,
      agentId,
      gameId: 'all',
      period,
      totalBets,
      totalWins,
      netRevenue,
      commissionPaid,
      averageRate,
      playerCount: uniquePlayers,
      sessionCount: sessions.length,
      calculatedAt: new Date(),
    };

    this.revenues.set(revenue.id, revenue);
    return revenue;
  }

  /**
   * Get revenue history for an agent
   */
  getAgentRevenueHistory(agentId: string): LiveCasinoRevenue[] {
    return Array.from(this.revenues.values())
      .filter(revenue => revenue.agentId === agentId)
      .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
  }

  /**
   * Performance Analysis Methods
   */

  /**
   * Get game performance analysis
   */
  getGamePerformance(period: string): LiveCasinoPerformance[] {
    const gameStats = new Map<string, LiveCasinoPerformance>();

    // Get all completed sessions for the period
    const periodSessions = Array.from(this.sessions.values()).filter(
      session =>
        session.status === 'completed' &&
        session.endTime &&
        session.endTime.toISOString().slice(0, 7) === period
    );

    // Group by game and calculate statistics
    periodSessions.forEach(session => {
      const game = this.games.get(session.gameId);
      if (!game) return;

      if (!gameStats.has(session.gameId)) {
        gameStats.set(session.gameId, {
          gameId: session.gameId,
          gameName: game.name,
          totalSessions: 0,
          totalBets: 0,
          totalWins: 0,
          netRevenue: 0,
          commissionPaid: 0,
          averageRate: 0,
          playerCount: 0,
          winRate: 0,
          houseEdge: game.houseEdge,
          popularity: game.popularity,
        });
      }

      const stats = gameStats.get(session.gameId)!;
      stats.totalSessions++;
      stats.totalBets += session.totalBets;
      stats.totalWins += session.totalWins;
      stats.netRevenue += session.netResult;
      stats.commissionPaid += session.commissionEarned;
    });

    // Calculate averages and finalize stats
    gameStats.forEach(stats => {
      const gameSessions = periodSessions.filter(s => s.gameId === stats.gameId);
      const uniquePlayers = new Set(gameSessions.map(s => s.playerId)).size;

      stats.playerCount = uniquePlayers;
      stats.averageRate =
        gameSessions.length > 0
          ? gameSessions.reduce((sum, s) => sum + s.rateUsed, 0) / gameSessions.length
          : 0;
      stats.winRate = stats.totalBets > 0 ? (stats.totalWins / stats.totalBets) * 100 : 0;
    });

    return Array.from(gameStats.values()).sort((a, b) => b.totalBets - a.totalBets);
  }

  /**
   * Get agent performance ranking
   */
  getAgentPerformanceRanking(period: string): Array<{
    agentId: string;
    totalRevenue: number;
    totalCommission: number;
    sessionCount: number;
    playerCount: number;
    averageRate: number;
  }> {
    const agentStats = new Map<
      string,
      {
        agentId: string;
        totalRevenue: number;
        totalCommission: number;
        sessionCount: number;
        playerCount: number;
        totalRate: number;
        rateCount: number;
      }
    >();

    // Get all completed sessions for the period
    const periodSessions = Array.from(this.sessions.values()).filter(
      session =>
        session.status === 'completed' &&
        session.endTime &&
        session.endTime.toISOString().slice(0, 7) === period
    );

    // Calculate agent statistics
    periodSessions.forEach(session => {
      if (!agentStats.has(session.agentId)) {
        agentStats.set(session.agentId, {
          agentId: session.agentId,
          totalRevenue: 0,
          totalCommission: 0,
          sessionCount: 0,
          playerCount: 0,
          totalRate: 0,
          rateCount: 0,
        });
      }

      const stats = agentStats.get(session.agentId)!;
      stats.totalRevenue += session.netResult;
      stats.totalCommission += session.commissionEarned;
      stats.sessionCount++;
      stats.totalRate += session.rateUsed;
      stats.rateCount++;
    });

    // Calculate unique players per agent
    agentStats.forEach(stats => {
      const agentSessions = periodSessions.filter(s => s.agentId === stats.agentId);
      const uniquePlayers = new Set(agentSessions.map(s => s.playerId)).size;
      stats.playerCount = uniquePlayers;
    });

    // Convert to ranking format
    return Array.from(agentStats.values())
      .map(stats => ({
        agentId: stats.agentId,
        totalRevenue: stats.totalRevenue,
        totalCommission: stats.totalCommission,
        sessionCount: stats.sessionCount,
        playerCount: stats.playerCount,
        averageRate: stats.rateCount > 0 ? stats.totalRate / stats.rateCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * System Statistics
   */
  getSystemStats() {
    const totalGames = this.games.size;
    const activeGames = Array.from(this.games.values()).filter(g => g.isActive).length;
    const totalRates = this.rates.size;
    const activeRates = Array.from(this.rates.values()).filter(r => r.isActive).length;
    const totalSessions = this.sessions.size;
    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.status === 'active'
    ).length;
    const totalRevenue = Array.from(this.revenues.values()).reduce(
      (sum, r) => sum + r.netRevenue,
      0
    );
    const totalCommission = Array.from(this.revenues.values()).reduce(
      (sum, r) => sum + r.commissionPaid,
      0
    );

    return {
      totalGames,
      activeGames,
      totalRates,
      activeRates,
      totalSessions,
      activeSessions,
      totalRevenue,
      totalCommission,
    };
  }
}

/**
 * Create live casino management system instance
 */
export function createLiveCasinoManagementSystem(): LiveCasinoManagementSystem {
  return new LiveCasinoManagementSystem();
}
