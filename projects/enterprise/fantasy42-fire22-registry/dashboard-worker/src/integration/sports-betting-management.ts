/**
 * Fire22 Sports Betting Management Integration
 *
 * Integrates the comprehensive wager system with dashboard tooling endpoints
 * Provides real-time data for Bet Ticker, Ticketwriter, Sportsbook Lines, and Scores
 */

import {
  WagerSystem,
  wagerSystem,
  type Wager,
  type WagerRequest,
  type Agent,
  type Customer,
  type Event,
} from '../../packages/wager-system/src/index';

/**
 * Sports Betting Management System for Dashboard Tooling
 */
export class SportsBettingManagementSystem {
  private wagerSystem: WagerSystem;
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor() {
    this.wagerSystem = wagerSystem;
    this.initializeTestData();
  }

  /**
   * Initialize test data for demo purposes
   */
  private async initializeTestData(): Promise<void> {
    // Add test customers
    const testCustomers = [
      {
        id: 'CUST001',
        login: 'customer1',
        name: 'John Doe',
        email: 'john@example.com',
        balance: 5000,
        creditLimit: 10000,
        vipLevel: 'gold' as const,
        status: 'active' as const,
        bettingLimits: { maxBet: 1000, maxDaily: 5000, maxWeekly: 25000, maxMonthly: 100000 },
        preferences: {
          favoriteSports: ['football', 'basketball'],
          favoriteTeams: ['Cowboys', 'Lakers'],
          notificationSettings: {},
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
    ];

    // Add test agents
    const testAgents = [
      {
        id: 'AG001',
        login: 'agent1',
        name: 'Agent Smith',
        email: 'agent1@fire22.com',
        phone: '+1234567890',
        status: 'active' as const,
        level: 'agent' as const,
        commission: { baseRate: 0.02, bonusRate: 0.005, performanceMultiplier: 1.0 },
        limits: { maxCustomerBet: 10000, maxTotalExposure: 100000, maxDailyVolume: 500000 },
        hierarchy: { childAgentIds: [] },
        performance: {
          totalVolume: 150000,
          totalCommission: 3000,
          customerCount: 25,
          averageBet: 250,
        },
      },
    ];

    // Add test events
    const testEvents = [
      {
        id: 'EVT001',
        sportId: 'football',
        leagueId: 'NFL',
        homeTeamId: 'TEAM001',
        awayTeamId: 'TEAM002',
        eventDate: new Date(Date.now() + 3600000).toISOString(),
        status: 'upcoming' as const,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        venue: 'AT&T Stadium',
      },
    ];

    // Store test data (in a real implementation, this would come from a database)
    // @ts-ignore - Accessing private members for test setup
    testCustomers.forEach(customer => this.wagerSystem.customers.set(customer.id, customer as any));
    // @ts-ignore - Accessing private members for test setup
    testAgents.forEach(agent => this.wagerSystem.agents.set(agent.id, agent as any));
    // @ts-ignore - Accessing private members for test setup
    testEvents.forEach(event => this.wagerSystem.events.set(event.id, event as any));
  }

  /**
   * Get live betting activity for Bet Ticker
   */
  async getLiveBettingActivity(): Promise<any[]> {
    const cacheKey = 'betting-activity';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Get recent wagers (last 30 minutes)
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);
    const pendingWagers = await this.wagerSystem.getPendingWagers();
    const activeWagers = await this.wagerSystem.getActiveWagers();
    const allWagers = [...pendingWagers, ...activeWagers];

    const liveBets = allWagers
      .filter(wager => new Date(wager.insertDateTime) > cutoffTime)
      .slice(0, 10) // Last 10 bets
      .map(wager => ({
        betId: `BT${wager.wagerNumber}`,
        customerId: wager.customerId,
        agentId: wager.agentId,
        sport: wager.sportId,
        eventName: `Event ${wager.eventId}`,
        betType: wager.betType,
        amount: wager.amountWagered,
        odds: wager.odds.american,
        potentialWin: wager.toWinAmount,
        timestamp: wager.insertDateTime,
        status: wager.status,
      }));

    // Add some mock live activity if no real data
    if (liveBets.length === 0) {
      liveBets.push(
        {
          betId: 'BT001',
          customerId: 'CUST001',
          agentId: 'AG001',
          sport: 'football',
          eventName: 'Cowboys vs Giants',
          betType: 'moneyline',
          amount: 100.0,
          odds: -110,
          potentialWin: 190.9,
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
        {
          betId: 'BT002',
          customerId: 'CUST002',
          agentId: 'AG002',
          sport: 'basketball',
          eventName: 'Lakers vs Warriors',
          betType: 'spread',
          amount: 250.0,
          odds: -110,
          potentialWin: 477.27,
          timestamp: new Date().toISOString(),
          status: 'pending',
        }
      );
    }

    this.setCache(cacheKey, liveBets, 1000); // 1 second cache
    return liveBets;
  }

  /**
   * Get betting metrics for dashboard KPIs
   */
  async getBettingMetrics(): Promise<any> {
    const cacheKey = 'betting-metrics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const stats = await this.wagerSystem.getSystemStats();
    const today = new Date().toDateString();

    // Calculate today's metrics (mock data if no real data)
    const metrics = {
      totalBetsToday: stats.totalWagers || 1247,
      totalVolumeToday: stats.totalVolume || 156780.0,
      avgBetSize: stats.averageWager || 125.75,
      winRate: 47.3, // This would be calculated from settled wagers
      activeWagers: stats.activeWagers || 89,
      pendingWagers: stats.pendingWagers || 34,
      riskScore: stats.riskScore || 25,
    };

    this.setCache(cacheKey, metrics, 5000); // 5 second cache
    return metrics;
  }

  /**
   * Get market lines for Ticketwriter
   */
  async getMarketLines(sport: string = 'all', date: string): Promise<any[]> {
    const cacheKey = `market-lines-${sport}-${date}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Mock market lines with realistic data
    const lines = [
      {
        eventId: 'EVT001',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Dallas Cowboys',
        awayTeam: 'New York Giants',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        markets: {
          moneyline: { home: -150, away: 130 },
          spread: { home: -3.5, away: 3.5, odds: -110 },
          total: { over: 45.5, under: 45.5, odds: -110 },
        },
        limits: { maxBet: 10000.0, minBet: 10.0 },
      },
      {
        eventId: 'EVT002',
        sport: 'basketball',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Golden State Warriors',
        startTime: new Date(Date.now() + 7200000).toISOString(),
        markets: {
          moneyline: { home: -120, away: 102 },
          spread: { home: -2.5, away: 2.5, odds: -110 },
          total: { over: 215.5, under: 215.5, odds: -110 },
        },
        limits: { maxBet: 5000.0, minBet: 10.0 },
      },
      {
        eventId: 'EVT003',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Buffalo Bills',
        startTime: new Date(Date.now() + 10800000).toISOString(),
        markets: {
          moneyline: { home: -110, away: -110 },
          spread: { home: -1.5, away: 1.5, odds: -110 },
          total: { over: 52.5, under: 52.5, odds: -110 },
        },
        limits: { maxBet: 15000.0, minBet: 10.0 },
      },
    ];

    // Filter by sport if specified
    const filteredLines = sport === 'all' ? lines : lines.filter(line => line.sport === sport);

    this.setCache(cacheKey, filteredLines, 5000); // 5 second cache
    return filteredLines;
  }

  /**
   * Get all events with enhanced data for Sportsbook Lines
   */
  async getAllEvents(): Promise<any[]> {
    const cacheKey = 'all-events-enhanced';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Enhanced event data with line movement and risk analysis
    const events = [
      {
        eventId: 'EVT001',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Dallas Cowboys',
        awayTeam: 'New York Giants',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        status: 'open',
        markets: {
          moneyline: {
            home: {
              current: -150,
              opening: -145,
              high: -155,
              low: -140,
              lastMove: new Date().toISOString(),
            },
            away: {
              current: 130,
              opening: 125,
              high: 135,
              low: 120,
              lastMove: new Date().toISOString(),
            },
          },
          spread: {
            home: {
              current: -3.5,
              opening: -3.0,
              high: -4.0,
              low: -2.5,
              lastMove: new Date().toISOString(),
            },
          },
          total: {
            current: 45.5,
            opening: 46.0,
            high: 46.5,
            low: 44.5,
            lastMove: new Date().toISOString(),
          },
        },
        volume: {
          totalBets: 247,
          totalAmount: 31250.0,
          homePercent: 65.2,
          awayPercent: 34.8,
          spreadPercent: 58.3,
          totalPercent: 41.7,
        },
        risk: {
          exposure: 5680.0,
          level: 'medium',
          alerts: ['high_volume_home', 'line_movement_alert'],
        },
      },
      {
        eventId: 'EVT002',
        sport: 'basketball',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Golden State Warriors',
        startTime: new Date(Date.now() + 7200000).toISOString(),
        status: 'open',
        markets: {
          moneyline: {
            home: {
              current: -120,
              opening: -115,
              high: -125,
              low: -110,
              lastMove: new Date(Date.now() - 300000).toISOString(),
            },
            away: {
              current: 102,
              opening: 98,
              high: 105,
              low: 95,
              lastMove: new Date(Date.now() - 300000).toISOString(),
            },
          },
        },
        volume: {
          totalBets: 189,
          totalAmount: 24750.0,
          homePercent: 52.1,
          awayPercent: 47.9,
        },
        risk: {
          exposure: 3200.0,
          level: 'low',
          alerts: [],
        },
      },
    ];

    this.setCache(cacheKey, events, 5000); // 5 second cache
    return events;
  }

  /**
   * Get live scores for Scores endpoint
   */
  async getLiveScores(): Promise<any[]> {
    const cacheKey = 'live-scores';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const liveScores = [
      {
        gameId: 'GAME001',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Dallas Cowboys',
        awayTeam: 'New York Giants',
        homeScore: 14,
        awayScore: 7,
        quarter: 2,
        timeRemaining: '8:32',
        status: 'in_progress',
        lastUpdate: new Date().toISOString(),
        possessionTeam: 'home',
        down: 2,
        yardLine: 25,
        yardsToGo: 7,
      },
      {
        gameId: 'GAME002',
        sport: 'basketball',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Golden State Warriors',
        homeScore: 89,
        awayScore: 92,
        quarter: 4,
        timeRemaining: '3:45',
        status: 'in_progress',
        lastUpdate: new Date().toISOString(),
      },
    ];

    this.setCache(cacheKey, liveScores, 1000); // 1 second cache for live scores
    return liveScores;
  }

  /**
   * Get recent game results
   */
  async getRecentResults(): Promise<any[]> {
    const cacheKey = 'recent-results';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const results = [
      {
        gameId: 'GAME003',
        homeTeam: 'Green Bay Packers',
        awayTeam: 'Chicago Bears',
        finalScore: { home: 21, away: 17 },
        completedAt: new Date(Date.now() - 3600000).toISOString(),
        betsSettled: 89,
        totalPayout: 12450.0,
      },
      {
        gameId: 'GAME004',
        homeTeam: 'Boston Celtics',
        awayTeam: 'Miami Heat',
        finalScore: { home: 108, away: 102 },
        completedAt: new Date(Date.now() - 7200000).toISOString(),
        betsSettled: 156,
        totalPayout: 23780.0,
      },
    ];

    this.setCache(cacheKey, results, 30000); // 30 second cache
    return results;
  }

  /**
   * Get upcoming games
   */
  async getUpcomingGames(): Promise<any[]> {
    const cacheKey = 'upcoming-games';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const upcoming = [
      {
        gameId: 'GAME005',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Buffalo Bills',
        scheduledStart: new Date(Date.now() + 10800000).toISOString(),
        status: 'scheduled',
        venue: 'Arrowhead Stadium',
        weather: 'Clear, 45°F',
      },
      {
        gameId: 'GAME006',
        homeTeam: 'Phoenix Suns',
        awayTeam: 'Denver Nuggets',
        scheduledStart: new Date(Date.now() + 14400000).toISOString(),
        status: 'scheduled',
        venue: 'Footprint Center',
      },
    ];

    this.setCache(cacheKey, upcoming, 60000); // 1 minute cache
    return upcoming;
  }

  /**
   * Validate bet data for placement
   */
  async validateBet(betData: any): Promise<{ valid: boolean; error?: string }> {
    try {
      // Convert to WagerRequest format
      const wagerRequest: WagerRequest = {
        customerId: betData.customerId,
        agentId: betData.agentId,
        eventId: betData.eventId,
        betTypeId: betData.betType || 'moneyline',
        selections: [
          {
            selectionId: `${betData.eventId}-${betData.selection}`,
            odds: betData.odds,
            line: betData.line,
          },
        ],
        amountWagered: betData.amount,
        betType: betData.betType === 'parlay' ? 'parlay' : 'straight',
        customerNotes: betData.notes,
      };

      const validation = await this.wagerSystem.validateWager(wagerRequest);
      return {
        valid: validation.isValid,
        error: validation.errors.length > 0 ? validation.errors.join(', ') : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Place a bet using the wager system
   */
  async placeBet(betData: any): Promise<any> {
    const wagerRequest: WagerRequest = {
      customerId: betData.customerId,
      agentId: betData.agentId,
      eventId: betData.eventId,
      betTypeId: betData.betType || 'moneyline',
      selections: [
        {
          selectionId: `${betData.eventId}-${betData.selection}`,
          odds: betData.odds,
          line: betData.line,
        },
      ],
      amountWagered: betData.amount,
      betType: betData.betType === 'parlay' ? 'parlay' : 'straight',
    };

    const wager = await this.wagerSystem.createWager(wagerRequest);

    return {
      betId: `BT${wager.wagerNumber}`,
      ticketNumber: `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(wager.wagerNumber).slice(-3)}`,
      amount: wager.amountWagered,
      toWin: wager.toWinAmount,
      commission: wager.commission.totalCommission,
      status: 'confirmed',
    };
  }

  /**
   * Get line movement data for an event
   */
  async getLineMovement(eventId: string): Promise<any> {
    return {
      moneyline: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), home: -145, away: 125 },
        { timestamp: new Date(Date.now() - 1800000).toISOString(), home: -148, away: 128 },
        { timestamp: new Date().toISOString(), home: -150, away: 130 },
      ],
      spread: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), line: -3.0, odds: -110 },
        { timestamp: new Date(Date.now() - 1800000).toISOString(), line: -3.5, odds: -108 },
        { timestamp: new Date().toISOString(), line: -3.5, odds: -110 },
      ],
    };
  }

  /**
   * Get risk analysis for an event
   */
  async getRiskAnalysis(eventId: string): Promise<any> {
    return {
      totalExposure: 15680.0,
      maxLiability: 23450.0,
      riskScore: 35,
      concentrationRisk: 0.15,
      alerts: ['high_volume_home'],
      recommendations: ['Monitor line movement', 'Consider adjusting limits'],
    };
  }

  // Cache utilities
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }
}
