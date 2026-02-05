/**
 * Enhanced Lottery Management Interface
 * Comprehensive lottery system integrated with player management, cashier, and P2P features
 */

import {
  Fantasy402AgentClient,
  LotteryGame,
  LotteryBet,
  LotteryDraw,
  LotterySettings,
} from '../../src/api/fantasy402-agent-client';
import { EnhancedPlayerInterface } from '../player-management/enhanced-player-interface';
import { EnhancedCashierSystem } from '../cashier/enhanced-cashier-system';
import { PeerGroupManager } from '../peer-network/peer-group-manager';
import { P2PPaymentMatching } from '../payments/p2p-payment-matching';
import { CustomerPaymentValidation } from '../payments/customer-payment-validation';

export interface LotterySession {
  sessionId: string;
  customerId: string;
  agentId: string;
  startTime: string;
  endTime?: string;
  lotteryBets: LotteryBet[];
  totalWagered: number;
  totalWins: number;
  netResult: number;
  status: 'active' | 'completed' | 'suspended';
}

export interface LotteryDashboard {
  session: LotterySession;
  customerInfo: {
    customerId: string;
    currentBalance: number;
    lotterySettings: LotterySettings;
    recentBets: LotteryBet[];
    winHistory: LotteryBet[];
  };
  availableGames: LotteryGame[];
  upcomingDraws: LotteryDraw[];
  statistics: {
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    winRate: number;
    favoriteGame: string;
    lastWin: {
      amount: number;
      game: string;
      date: string;
    };
  };
  recommendations: {
    suggestedGames: LotteryGame[];
    optimalBetAmounts: number[];
    luckyNumbers: string[];
    hotNumbers: string[];
  };
}

export class EnhancedLotteryInterface {
  private fantasyClient: Fantasy402AgentClient;
  private playerInterface: EnhancedPlayerInterface;
  private cashierSystem: EnhancedCashierSystem;
  private peerGroupManager: PeerGroupManager;
  private p2pMatching: P2PPaymentMatching;
  private paymentValidation: CustomerPaymentValidation;

  private activeLotterySessions: Map<string, LotterySession> = new Map();

  constructor(
    fantasyClient: Fantasy402AgentClient,
    playerInterface: EnhancedPlayerInterface,
    cashierSystem: EnhancedCashierSystem,
    peerGroupManager: PeerGroupManager,
    p2pMatching: P2PPaymentMatching,
    paymentValidation: CustomerPaymentValidation
  ) {
    this.fantasyClient = fantasyClient;
    this.playerInterface = playerInterface;
    this.cashierSystem = cashierSystem;
    this.peerGroupManager = peerGroupManager;
    this.p2pMatching = p2pMatching;
    this.paymentValidation = paymentValidation;
  }

  /**
   * Start a lottery session for a customer
   */
  async startLotterySession(customerId: string, agentId: string): Promise<LotterySession> {
    const sessionId = this.generateLotterySessionId();

    // Start player management session first
    const playerSession = await this.playerInterface.startPlayerSession(
      agentId,
      customerId,
      'lottery_session'
    );

    // Get customer's lottery settings
    const settings = await this.fantasyClient.getLotterySettings(customerId);

    if (!settings.success || !settings.settings?.allowLotto) {
      throw new Error('Customer does not have lottery betting enabled');
    }

    if (settings.settings.suspendLottery) {
      throw new Error('Customer lottery betting is currently suspended');
    }

    const session: LotterySession = {
      sessionId,
      customerId,
      agentId,
      startTime: new Date().toISOString(),
      lotteryBets: [],
      totalWagered: 0,
      totalWins: 0,
      netResult: 0,
      status: 'active',
    };

    this.activeLotterySessions.set(sessionId, session);
    return session;
  }

  /**
   * Get comprehensive lottery dashboard
   */
  async getLotteryDashboard(sessionId: string): Promise<LotteryDashboard> {
    const session = this.activeLotterySessions.get(sessionId);
    if (!session) {
      throw new Error('Lottery session not found');
    }

    // Get customer info
    const playerDashboard = await this.playerInterface.getPlayerDashboard(session.sessionId);
    const customer = playerDashboard.customer;

    // Get lottery settings
    const settings = await this.fantasyClient.getLotterySettings(session.customerId);
    if (!settings.success) {
      throw new Error('Failed to load lottery settings');
    }

    // Get available games
    const games = await this.fantasyClient.getLotteryGames();

    // Get recent bets
    const recentBets = await this.fantasyClient.getLotteryBets(session.customerId, {
      limit: 10,
      status: 'pending',
    });

    // Get win history
    const winHistory = await this.fantasyClient.getLotteryBets(session.customerId, {
      limit: 10,
      status: 'won',
    });

    // Get upcoming draws
    const upcomingDraws = await this.fantasyClient.getLotteryDraws({
      limit: 5,
    });

    // Calculate statistics
    const statistics = await this.calculateLotteryStatistics(session.customerId);

    // Generate recommendations
    const recommendations = await this.generateLotteryRecommendations(
      session.customerId,
      games.games
    );

    return {
      session,
      customerInfo: {
        customerId: session.customerId,
        currentBalance: customer.financialProfile.currentBalance,
        lotterySettings: settings.settings!,
        recentBets: recentBets.success ? recentBets.bets : [],
        winHistory: winHistory.success ? winHistory.bets : [],
      },
      availableGames: games.success ? games.games : [],
      upcomingDraws: upcomingDraws.success ? upcomingDraws.draws : [],
      statistics,
      recommendations,
    };
  }

  /**
   * Place a lottery bet with enhanced validation and P2P integration
   */
  async placeLotteryBet(
    sessionId: string,
    betData: {
      gameId: string;
      betAmount: number;
      numbers: string[];
      specialNumbers?: string[];
      multiplier?: number;
      usePeerFunding?: boolean;
    }
  ): Promise<{
    success: boolean;
    bet: LotteryBet | null;
    paymentMethod: string;
    error?: string;
  }> {
    const session = this.activeLotterySessions.get(sessionId);
    if (!session) {
      throw new Error('Lottery session not found');
    }

    // Validate lottery settings
    const settings = await this.fantasyClient.getLotterySettings(session.customerId);
    if (!settings.success || !settings.settings?.allowLotto) {
      return {
        success: false,
        bet: null,
        paymentMethod: 'none',
        error: 'Lottery betting not enabled for this customer',
      };
    }

    // Check betting limits
    if (betData.betAmount > settings.settings.lottoMaxWager) {
      return {
        success: false,
        bet: null,
        paymentMethod: 'none',
        error: `Bet amount exceeds maximum wager limit of $${settings.settings.lottoMaxWager}`,
      };
    }

    if (betData.betAmount < settings.settings.lottoMinWager) {
      return {
        success: false,
        bet: null,
        paymentMethod: 'none',
        error: `Bet amount is below minimum wager limit of $${settings.settings.lottoMinWager}`,
      };
    }

    // Check daily limits
    const todayBets = await this.fantasyClient.getLotteryBets(session.customerId, {
      dateFrom: new Date().toISOString().split('T')[0],
      status: 'pending',
    });

    const todayWagered = todayBets.success
      ? todayBets.bets.reduce((sum, bet) => sum + bet.betAmount, 0)
      : 0;

    if (todayWagered + betData.betAmount > settings.settings.lottoDailyLimit) {
      return {
        success: false,
        bet: null,
        paymentMethod: 'none',
        error: `Daily limit exceeded. Current: $${todayWagered}, Limit: $${settings.settings.lottoDailyLimit}`,
      };
    }

    // Determine payment method
    let paymentMethod = 'account_balance';

    if (betData.usePeerFunding) {
      // Try P2P funding
      const p2pTransaction = await this.attemptPeerFunding(session.customerId, betData.betAmount);
      if (p2pTransaction) {
        paymentMethod = 'peer_funding';
      }
    }

    // Validate customer balance if not using peer funding
    if (paymentMethod === 'account_balance') {
      const playerDashboard = await this.playerInterface.getPlayerDashboard(session.sessionId);
      if (playerDashboard.customer.financialProfile.currentBalance < betData.betAmount) {
        return {
          success: false,
          bet: null,
          paymentMethod: 'none',
          error: `Insufficient balance. Available: $${playerDashboard.customer.financialProfile.currentBalance}`,
        };
      }
    }

    // Place the lottery bet
    const betResult = await this.fantasyClient.placeLotteryBet(session.customerId, {
      gameId: betData.gameId,
      betAmount: betData.betAmount,
      numbers: betData.numbers,
      specialNumbers: betData.specialNumbers,
      multiplier: betData.multiplier,
    });

    if (betResult.success && betResult.bet) {
      // Update session
      session.lotteryBets.push(betResult.bet);
      session.totalWagered += betData.betAmount;

      // Process payment if using account balance
      if (paymentMethod === 'account_balance') {
        await this.cashierSystem.processDeposit(
          session.sessionId,
          betData.betAmount,
          'lottery_bet',
          {
            betId: betResult.bet.betId,
            gameId: betData.gameId,
            numbers: betData.numbers.join(','),
          }
        );
      }

      return {
        success: true,
        bet: betResult.bet,
        paymentMethod,
      };
    } else {
      return {
        success: false,
        bet: null,
        paymentMethod,
        error: betResult.error || 'Failed to place lottery bet',
      };
    }
  }

  /**
   * Update lottery settings for a customer
   */
  async updateLotterySettings(
    sessionId: string,
    settings: Partial<LotterySettings>
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    const session = this.activeLotterySessions.get(sessionId);
    if (!session) {
      throw new Error('Lottery session not found');
    }

    return await this.fantasyClient.updateLotterySettings(session.customerId, settings);
  }

  /**
   * Get lottery statistics and recommendations
   */
  private async calculateLotteryStatistics(
    customerId: string
  ): Promise<LotteryDashboard['statistics']> {
    const bets = await this.fantasyClient.getLotteryBets(customerId, {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    if (!bets.success) {
      return {
        totalBets: 0,
        totalWagered: 0,
        totalWins: 0,
        winRate: 0,
        favoriteGame: '',
        lastWin: { amount: 0, game: '', date: '' },
      };
    }

    const totalBets = bets.bets.length;
    const totalWagered = bets.bets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const totalWins = bets.bets.filter(bet => bet.status === 'won').length;
    const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

    // Find favorite game
    const gameCounts: Record<string, number> = {};
    bets.bets.forEach(bet => {
      gameCounts[bet.gameName] = (gameCounts[bet.gameName] || 0) + 1;
    });
    const favoriteGame = Object.entries(gameCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    // Find last win
    const lastWin = bets.bets
      .filter(bet => bet.status === 'won' && bet.winAmount && bet.winAmount > 0)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())[0];

    return {
      totalBets,
      totalWagered,
      totalWins,
      winRate: Math.round(winRate * 100) / 100,
      favoriteGame,
      lastWin: lastWin
        ? {
            amount: lastWin.winAmount || 0,
            game: lastWin.gameName,
            date: lastWin.placedAt,
          }
        : { amount: 0, game: '', date: '' },
    };
  }

  /**
   * Generate lottery recommendations
   */
  private async generateLotteryRecommendations(
    customerId: string,
    availableGames: LotteryGame[]
  ): Promise<LotteryDashboard['recommendations']> {
    // Get customer's betting history
    const bets = await this.fantasyClient.getLotteryBets(customerId, { limit: 20 });

    // Get settings for bet amount recommendations
    const settings = await this.fantasyClient.getLotterySettings(customerId);

    const suggestedGames: LotteryGame[] = [];
    const optimalBetAmounts: number[] = [];
    const luckyNumbers: string[] = [];
    const hotNumbers: string[] = [];

    if (bets.success && bets.bets.length > 0) {
      // Analyze winning patterns
      const winningBets = bets.bets.filter(bet => bet.status === 'won');

      // Suggest games with recent wins
      const gameWins: Record<string, number> = {};
      winningBets.forEach(bet => {
        gameWins[bet.gameName] = (gameWins[bet.gameName] || 0) + 1;
      });

      const topGames = Object.entries(gameWins)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([gameName]) => gameName);

      suggestedGames.push(...availableGames.filter(game => topGames.includes(game.gameName)));

      // Calculate optimal bet amounts (based on successful bets)
      const successfulAmounts = winningBets.map(bet => bet.betAmount);
      if (successfulAmounts.length > 0) {
        const avgSuccessful =
          successfulAmounts.reduce((a, b) => a + b, 0) / successfulAmounts.length;
        optimalBetAmounts.push(
          Math.round(avgSuccessful * 0.8), // Slightly lower
          Math.round(avgSuccessful), // Same amount
          Math.round(avgSuccessful * 1.2) // Slightly higher
        );
      }

      // Extract lucky numbers (numbers that appeared in winning bets)
      const numberFrequency: Record<string, number> = {};
      winningBets.forEach(bet => {
        bet.numbers.forEach(num => {
          numberFrequency[num] = (numberFrequency[num] || 0) + 1;
        });
      });

      luckyNumbers.push(
        ...Object.entries(numberFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([num]) => num)
      );
    }

    // Add popular games if no history
    if (suggestedGames.length === 0) {
      suggestedGames.push(
        ...availableGames
          .filter(
            game => game.status === 'active' && game.jackpotAmount && game.jackpotAmount > 1000
          )
          .slice(0, 3)
      );
    }

    // Add default bet amounts based on settings
    if (optimalBetAmounts.length === 0 && settings.success && settings.settings) {
      const minBet = settings.settings.lottoMinWager;
      const maxBet = settings.settings.lottoMaxWager;
      optimalBetAmounts.push(
        minBet,
        Math.round((minBet + maxBet) / 2),
        Math.min(maxBet, minBet * 3)
      );
    }

    // Generate hot numbers from recent draws
    const recentDraws = await this.fantasyClient.getLotteryDraws({ limit: 10 });
    if (recentDraws.success) {
      const drawNumberFrequency: Record<string, number> = {};
      recentDraws.draws.forEach(draw => {
        draw.winningNumbers.forEach(num => {
          drawNumberFrequency[num] = (drawNumberFrequency[num] || 0) + 1;
        });
      });

      hotNumbers.push(
        ...Object.entries(drawNumberFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([num]) => num)
      );
    }

    return {
      suggestedGames: suggestedGames.slice(0, 5),
      optimalBetAmounts: [...new Set(optimalBetAmounts)].slice(0, 3),
      luckyNumbers: luckyNumbers.slice(0, 6),
      hotNumbers: hotNumbers.slice(0, 6),
    };
  }

  /**
   * Attempt peer funding for lottery bet
   */
  private async attemptPeerFunding(customerId: string, amount: number): Promise<any> {
    try {
      // Find peer matches for small lottery funding
      const peerMatches = await this.peerGroupManager.findPeerMatches(
        customerId,
        'deposit',
        amount,
        'lottery_funding',
        3
      );

      if (peerMatches.recommendedPeers.length > 0) {
        const bestMatch = peerMatches.recommendedPeers[0];

        // Create P2P transaction for lottery funding
        const p2pTransaction = await this.peerGroupManager.processPeerTransaction(
          customerId,
          bestMatch.peerId,
          amount,
          'lottery_funding',
          {
            purpose: 'lottery_bet_funding',
            betAmount: amount,
            description: `Lottery bet funding - $${amount}`,
          }
        );

        return p2pTransaction;
      }

      return null;
    } catch (error) {
      console.log('Peer funding attempt failed:', error);
      return null;
    }
  }

  /**
   * End lottery session
   */
  async endLotterySession(sessionId: string): Promise<LotterySession> {
    const session = this.activeLotterySessions.get(sessionId);
    if (!session) {
      throw new Error('Lottery session not found');
    }

    session.endTime = new Date().toISOString();
    session.status = 'completed';

    // End player management session
    await this.playerInterface.endPlayerSession(session.sessionId);

    this.activeLotterySessions.delete(sessionId);
    return session;
  }

  /**
   * Get lottery game details
   */
  async getLotteryGameDetails(gameId: string): Promise<{
    success: boolean;
    game: LotteryGame | null;
    recentDraws: LotteryDraw[];
    statistics: {
      totalDraws: number;
      averageJackpot: number;
      totalWinners: number;
      odds: string;
    };
    error?: string;
  }> {
    try {
      // Get available games
      const games = await this.fantasyClient.getLotteryGames();
      if (!games.success) {
        return {
          success: false,
          game: null,
          recentDraws: [],
          statistics: { totalDraws: 0, averageJackpot: 0, totalWinners: 0, odds: '' },
          error: 'Failed to load games',
        };
      }

      const game = games.games.find(g => g.gameId === gameId);
      if (!game) {
        return {
          success: false,
          game: null,
          recentDraws: [],
          statistics: { totalDraws: 0, averageJackpot: 0, totalWinners: 0, odds: '' },
          error: 'Game not found',
        };
      }

      // Get recent draws for this game
      const draws = await this.fantasyClient.getLotteryDraws({
        gameId,
        limit: 10,
      });

      // Calculate statistics
      const recentDraws = draws.success ? draws.draws : [];
      const totalDraws = recentDraws.length;
      const averageJackpot =
        totalDraws > 0
          ? recentDraws.reduce((sum, draw) => sum + draw.jackpotAmount, 0) / totalDraws
          : 0;
      const totalWinners = recentDraws.reduce((sum, draw) => sum + draw.totalWinners, 0);

      // Calculate odds (simplified)
      const odds = this.calculateLotteryOdds(game, totalDraws, totalWinners);

      return {
        success: true,
        game,
        recentDraws,
        statistics: {
          totalDraws,
          averageJackpot: Math.round(averageJackpot),
          totalWinners,
          odds,
        },
      };
    } catch (error) {
      console.error('Failed to get lottery game details:', error);
      return {
        success: false,
        game: null,
        recentDraws: [],
        statistics: { totalDraws: 0, averageJackpot: 0, totalWinners: 0, odds: '' },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate lottery odds
   */
  private calculateLotteryOdds(
    game: LotteryGame,
    totalDraws: number,
    totalWinners: number
  ): string {
    if (totalDraws === 0) return 'N/A';

    const winRate = totalWinners / totalDraws;
    if (winRate === 0) return 'Very Low';

    const odds = Math.round(1 / winRate);
    return `1 in ${odds.toLocaleString()}`;
  }

  /**
   * Generate lottery session ID
   */
  private generateLotterySessionId(): string {
    return `lottery_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get system-wide lottery analytics
   */
  async getLotteryAnalytics(): Promise<{
    totalSessions: number;
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    popularGames: Array<{
      gameId: string;
      gameName: string;
      bets: number;
      wagered: number;
    }>;
    performance: {
      averageSessionTime: number;
      averageBetAmount: number;
      winRate: number;
    };
    peerFunding: {
      totalPeerTransactions: number;
      successRate: number;
      averageAmount: number;
    };
  }> {
    const sessions = Array.from(this.activeLotterySessions.values());
    const totalSessions = sessions.length;

    const totalBets = sessions.reduce((sum, session) => sum + session.lotteryBets.length, 0);
    const totalWagered = sessions.reduce((sum, session) => sum + session.totalWagered, 0);
    const totalWins = sessions.reduce((sum, session) => sum + session.totalWins, 0);

    // Get popular games from Fantasy402
    const stats = await this.fantasyClient.getLotteryStatistics();
    const popularGames = stats.success ? stats.statistics.popularGames.slice(0, 5) : [];

    // Calculate performance metrics
    const sessionTimes = sessions
      .filter(s => s.endTime)
      .map(s => new Date(s.endTime!).getTime() - new Date(s.startTime).getTime());

    const averageSessionTime =
      sessionTimes.length > 0
        ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length / 1000 / 60 // minutes
        : 0;

    const averageBetAmount = totalBets > 0 ? totalWagered / totalBets : 0;
    const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

    return {
      totalSessions,
      totalBets,
      totalWagered,
      totalWins,
      popularGames,
      performance: {
        averageSessionTime: Math.round(averageSessionTime * 100) / 100,
        averageBetAmount: Math.round(averageBetAmount * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
      },
      peerFunding: {
        totalPeerTransactions: 0, // Would need to track this separately
        successRate: 95, // Mock data
        averageAmount: 25, // Mock data
      },
    };
  }
}
