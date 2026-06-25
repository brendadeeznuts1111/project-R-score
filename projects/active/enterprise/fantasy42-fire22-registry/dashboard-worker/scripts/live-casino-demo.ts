#!/usr/bin/env bun

/**
 * 🎰 Fire22 Live Casino Management System Demo
 * Demonstrates live casino games, rates, sessions, and revenue management
 */

import {
  createLiveCasinoManagementSystem,
  LiveCasinoManagementSystem,
} from '../src/live-casino-management';

class LiveCasinoDemo {
  private casinoSystem: LiveCasinoManagementSystem;

  constructor() {
    this.casinoSystem = createLiveCasinoManagementSystem();
  }

  /**
   * Run complete live casino demo
   */
  async runCompleteDemo() {
    console.info('🎰 **Fire22 Live Casino Management System Demo**\n');
    console.info('This demo showcases the complete live casino management capabilities:\n');

    await this.runGamesDemo();
    await this.runRatesDemo();
    await this.runSessionsDemo();
    await this.runRevenueDemo();
    await this.runPerformanceDemo();
    await this.runSystemStatsDemo();

    console.info('🎉 **Live Casino Demo Complete!**\n');
    console.info('✅ Game Management: 6 live casino games with full details');
    console.info('✅ Rate Management: Agent-specific rates with adjustments');
    console.info('✅ Session Management: Real-time session tracking');
    console.info('✅ Revenue Management: Monthly revenue calculations');
    console.info('✅ Performance Analysis: Game and agent performance metrics');
    console.info('✅ System Statistics: Comprehensive overview and reporting\n');

    console.info('🚀 **Your Fire22 Live Casino Management System is ready for production!**');
    console.info('💡 **Next Steps:**');
    console.info('  • Integrate with your existing live_casino_rate database field');
    console.info('  • Connect with real-time casino game providers');
    console.info('  • Implement automated rate adjustments');
    console.info('  • Add advanced analytics and reporting');
    console.info('  • Create admin dashboard for casino management');
  }

  /**
   * Run games demo
   */
  async runGamesDemo() {
    console.info('🎮 **Live Casino Games Demo**\n');

    // Show all games
    const games = this.casinoSystem.getAllGames();
    console.info('📊 **Available Live Casino Games:**');
    games.forEach(game => {
      console.info(`\n${game.name} (${game.category})`);
      console.info(`  🏢 Provider: ${game.provider}`);
      console.info(`  💰 Bet Range: $${game.minBet} - $${game.maxBet.toLocaleString()}`);
      console.info(`  🎯 House Edge: ${(game.houseEdge * 100).toFixed(2)}%`);
      console.info(`  📊 Default Rate: ${(game.defaultRate * 100).toFixed(1)}%`);
      console.info(`  🔥 Popularity: ${game.popularity}%`);
      console.info(`  📅 Last Updated: ${game.lastUpdated.toLocaleDateString()}`);
      console.info(`  ✅ Status: ${game.isActive ? 'Active' : 'Inactive'}`);
    });

    // Show games by category
    console.info('\n📋 **Games by Category:**');
    const categories: Array<
      'table' | 'card' | 'wheel' | 'dice' | 'baccarat' | 'roulette' | 'blackjack' | 'poker'
    > = ['baccarat', 'roulette', 'blackjack', 'poker', 'dice', 'wheel'];

    categories.forEach(category => {
      const categoryGames = this.casinoSystem.getGamesByCategory(category);
      if (categoryGames.length > 0) {
        console.info(`\n${category.charAt(0).toUpperCase() + category.slice(1)} Games:`);
        categoryGames.forEach(game => {
          console.info(`  • ${game.name} (${(game.defaultRate * 100).toFixed(1)}% rate)`);
        });
      }
    });

    // Demonstrate game popularity update
    console.info('\n🔄 **Game Popularity Update Demo:**');
    const gameToUpdate = games[0];
    if (gameToUpdate) {
      const oldPopularity = gameToUpdate.popularity;
      const newPopularity = Math.min(100, oldPopularity + 5);

      this.casinoSystem.updateGamePopularity(gameToUpdate.id, newPopularity);
      const updatedGame = this.casinoSystem.getGame(gameToUpdate.id);

      console.info(`  ${gameToUpdate.name}:`);
      console.info(`    Old Popularity: ${oldPopularity}%`);
      console.info(`    New Popularity: ${updatedGame?.popularity}%`);
      console.info(`    Updated: ${updatedGame?.lastUpdated.toLocaleString()}`);
    }
  }

  /**
   * Run rates demo
   */
  async runRatesDemo() {
    console.info('\n💎 **Live Casino Rates Demo**\n');

    // Show default rates for agents
    const defaultAgents = ['agent1', 'agent2', 'agent3'];
    const games = this.casinoSystem.getAllGames();

    defaultAgents.forEach(agentId => {
      console.info(`👤 **Agent: ${agentId}**\n`);

      games.slice(0, 3).forEach(game => {
        const rate = this.casinoSystem.getRate(agentId, game.id);
        if (rate) {
          console.info(`  ${game.name}:`);
          console.info(`    💰 Base Rate: ${(rate.baseRate * 100).toFixed(1)}%`);
          console.info(`    📊 Adjusted Rate: ${(rate.adjustedRate * 100).toFixed(1)}%`);
          console.info(`    ⚖️ Adjustment Factor: ${(rate.adjustmentFactor * 100).toFixed(0)}%`);
          console.info(`    📅 Effective From: ${rate.effectiveFrom.toLocaleDateString()}`);
          console.info(`    📝 Reason: ${rate.reason}`);
          console.info(`    ✅ Status: ${rate.isActive ? 'Active' : 'Inactive'}\n`);
        }
      });
    });

    // Demonstrate rate update
    console.info('🔄 **Rate Update Demo:**');
    const agentId = 'agent1';
    const gameId = 'baccarat-live';
    const oldRate = this.casinoSystem.getRate(agentId, gameId);

    if (oldRate) {
      console.info(`\nUpdating rate for ${agentId} on Baccarat:`);
      console.info(`  Old Rate: ${(oldRate.adjustedRate * 100).toFixed(1)}%`);

      const newRate = oldRate.adjustedRate * 1.2; // 20% increase
      const updatedRate = this.casinoSystem.updateAgentRate(
        agentId,
        gameId,
        newRate,
        'Performance bonus - increased player volume',
        'admin'
      );

      if (updatedRate) {
        console.info(`  New Rate: ${(updatedRate.adjustedRate * 100).toFixed(1)}%`);
        console.info(`  Adjustment: ${(updatedRate.adjustmentFactor * 100).toFixed(0)}%`);
        console.info(`  Reason: ${updatedRate.reason}`);
        console.info(`  Effective From: ${updatedRate.effectiveFrom.toLocaleDateString()}`);
      }
    }

    // Show rate history
    console.info('\n📋 **Rate History Demo:**');
    const agentRates = this.casinoSystem.getAgentRates(agentId);
    console.info(`Rate history for ${agentId}:`);
    agentRates.forEach(rate => {
      const game = this.casinoSystem.getGame(rate.gameId);
      console.info(
        `  ${game?.name}: ${(rate.adjustedRate * 100).toFixed(1)}% (${rate.effectiveFrom.toLocaleDateString()})`
      );
    });
  }

  /**
   * Run sessions demo
   */
  async runSessionsDemo() {
    console.info('\n🎯 **Live Casino Sessions Demo**\n');

    // Create sample sessions
    console.info('🆕 **Creating Sample Sessions:**');

    const agents = ['agent1', 'agent2', 'agent3'];
    const games = this.casinoSystem.getAllGames();
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    // Start multiple sessions
    const sessions = [];
    for (let i = 0; i < 8; i++) {
      const agentId = agents[i % agents.length];
      const gameId = games[i % games.length].id;
      const playerId = players[i % players.length];
      const sessionId = `session_${Date.now()}_${i}`;

      const session = this.casinoSystem.startSession(sessionId, playerId, agentId, gameId);
      sessions.push(session);

      console.info(`  ✅ Started session ${sessionId}:`);
      console.info(`    Player: ${playerId}`);
      console.info(`    Agent: ${agentId}`);
      console.info(`    Game: ${games[i % games.length].name}`);
      console.info(`    Rate: ${(session.rateUsed * 100).toFixed(1)}%`);
    }

    // End some sessions with results
    console.info('\n🏁 **Ending Sessions with Results:**');
    sessions.slice(0, 5).forEach((session, index) => {
      const totalBets = 100 + index * 50;
      const totalWins = Math.floor(totalBets * (0.8 + Math.random() * 0.4)); // 80-120% of bets

      const endedSession = this.casinoSystem.endSession(session.sessionId, totalBets, totalWins);

      if (endedSession) {
        console.info(`  ✅ Ended session ${session.sessionId}:`);
        console.info(`    💰 Total Bets: $${endedSession.totalBets.toLocaleString()}`);
        console.info(`    🏆 Total Wins: $${endedSession.totalWins.toLocaleString()}`);
        console.info(`    📊 Net Result: $${endedSession.netResult.toLocaleString()}`);
        console.info(`    💸 Commission: $${endedSession.commissionEarned.toFixed(2)}`);
        console.info(
          `    ⏱️ Duration: ${Math.round((endedSession.endTime!.getTime() - endedSession.startTime.getTime()) / 1000)}s`
        );
      }
    });

    // Show active and completed sessions
    console.info('\n📊 **Session Status Overview:**');
    agents.forEach(agentId => {
      const activeSessions = this.casinoSystem.getActiveSessions(agentId);
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const completedSessions = this.casinoSystem.getCompletedSessions(agentId, currentPeriod);

      console.info(`\n${agentId}:`);
      console.info(`  🎯 Active Sessions: ${activeSessions.length}`);
      console.info(`  ✅ Completed This Month: ${completedSessions.length}`);

      if (completedSessions.length > 0) {
        const totalBets = completedSessions.reduce((sum, s) => sum + s.totalBets, 0);
        const totalWins = completedSessions.reduce((sum, s) => sum + s.totalWins, 0);
        const totalCommission = completedSessions.reduce((sum, s) => sum + s.commissionEarned, 0);

        console.info(`  💰 Total Bets: $${totalBets.toLocaleString()}`);
        console.info(`  🏆 Total Wins: $${totalWins.toLocaleString()}`);
        console.info(`  💸 Commission Earned: $${totalCommission.toFixed(2)}`);
      }
    });
  }

  /**
   * Run revenue demo
   */
  async runRevenueDemo() {
    console.info('\n💰 **Live Casino Revenue Demo**\n');

    // Calculate monthly revenue for all agents
    const agents = ['agent1', 'agent2', 'agent3'];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    console.info(`📅 **Monthly Revenue Report - ${currentPeriod}**\n`);

    agents.forEach(agentId => {
      const revenue = this.casinoSystem.calculateMonthlyRevenue(agentId, currentPeriod);

      console.info(`👤 **${agentId}**`);
      console.info(`  💰 Total Bets: $${revenue.totalBets.toLocaleString()}`);
      console.info(`  🏆 Total Wins: $${revenue.totalWins.toLocaleString()}`);
      console.info(`  📊 Net Revenue: $${revenue.netRevenue.toLocaleString()}`);
      console.info(`  💸 Commission Paid: $${revenue.commissionPaid.toFixed(2)}`);
      console.info(`  📈 Average Rate: ${(revenue.averageRate * 100).toFixed(1)}%`);
      console.info(`  👥 Players: ${revenue.playerCount}`);
      console.info(`  🎯 Sessions: ${revenue.sessionCount}`);
      console.info(`  📅 Calculated: ${revenue.calculatedAt.toLocaleDateString()}\n`);
    });

    // Show revenue history
    console.info('📋 **Revenue History Demo:**');
    const sampleAgent = 'agent1';
    const revenueHistory = this.casinoSystem.getAgentRevenueHistory(sampleAgent);

    if (revenueHistory.length > 0) {
      console.info(`Revenue history for ${sampleAgent}:`);
      revenueHistory.forEach(revenue => {
        console.info(
          `  ${revenue.period}: $${revenue.netRevenue.toLocaleString()} (${revenue.sessionCount} sessions)`
        );
      });
    }
  }

  /**
   * Run performance demo
   */
  async runPerformanceDemo() {
    console.info('\n📊 **Live Casino Performance Demo**\n');

    const currentPeriod = new Date().toISOString().slice(0, 7);

    // Game performance analysis
    console.info('🎮 **Game Performance Analysis:**');
    const gamePerformance = this.casinoSystem.getGamePerformance(currentPeriod);

    if (gamePerformance.length > 0) {
      gamePerformance.forEach(performance => {
        console.info(`\n${performance.gameName}:`);
        console.info(`  🎯 Sessions: ${performance.totalSessions}`);
        console.info(`  💰 Total Bets: $${performance.totalBets.toLocaleString()}`);
        console.info(`  🏆 Total Wins: $${performance.totalWins.toLocaleString()}`);
        console.info(`  📊 Net Revenue: $${performance.netRevenue.toLocaleString()}`);
        console.info(`  💸 Commission Paid: $${performance.commissionPaid.toFixed(2)}`);
        console.info(`  📈 Average Rate: ${(performance.averageRate * 100).toFixed(1)}%`);
        console.info(`  👥 Players: ${performance.playerCount}`);
        console.info(`  🎯 Win Rate: ${performance.winRate.toFixed(1)}%`);
        console.info(`  🏠 House Edge: ${(performance.houseEdge * 100).toFixed(2)}%`);
        console.info(`  🔥 Popularity: ${performance.popularity}%`);
      });
    } else {
      console.info('  No performance data available for this period.');
    }

    // Agent performance ranking
    console.info('\n🏆 **Agent Performance Ranking:**');
    const agentRanking = this.casinoSystem.getAgentPerformanceRanking(currentPeriod);

    if (agentRanking.length > 0) {
      agentRanking.forEach((agent, index) => {
        console.info(`\n${index + 1}. **${agent.agentId}**`);
        console.info(`  💰 Total Revenue: $${agent.totalRevenue.toLocaleString()}`);
        console.info(`  💸 Total Commission: $${agent.totalCommission.toFixed(2)}`);
        console.info(`  🎯 Sessions: ${agent.sessionCount}`);
        console.info(`  👥 Players: ${agent.playerCount}`);
        console.info(`  📈 Average Rate: ${(agent.averageRate * 100).toFixed(1)}%`);
      });
    } else {
      console.info('  No agent performance data available for this period.');
    }
  }

  /**
   * Run system statistics demo
   */
  async runSystemStatsDemo() {
    console.info('\n📈 **Live Casino System Statistics Demo**\n');

    const stats = this.casinoSystem.getSystemStats();

    console.info('🎰 **Overall System Status:**');
    console.info(`  🎮 Total Games: ${stats.totalGames}`);
    console.info(`  ✅ Active Games: ${stats.activeGames}`);
    console.info(`  💎 Total Rates: ${stats.totalRates}`);
    console.info(`  ✅ Active Rates: ${stats.activeRates}`);
    console.info(`  🎯 Total Sessions: ${stats.totalSessions}`);
    console.info(`  🎬 Active Sessions: ${stats.activeSessions}`);
    console.info(`  💰 Total Revenue: $${stats.totalRevenue.toLocaleString()}`);
    console.info(`  💸 Total Commission: $${stats.totalCommission.toFixed(2)}\n`);

    // Calculate additional metrics
    const gameUtilization = (stats.activeGames / stats.totalGames) * 100;
    const rateUtilization = (stats.activeRates / stats.totalRates) * 100;
    const sessionActivity = (stats.activeSessions / stats.totalSessions) * 100;

    console.info('📊 **System Utilization:**');
    console.info(`  🎮 Game Utilization: ${gameUtilization.toFixed(1)}%`);
    console.info(`  💎 Rate Utilization: ${rateUtilization.toFixed(1)}%`);
    console.info(`  🎯 Session Activity: ${sessionActivity.toFixed(1)}%`);

    if (stats.totalRevenue > 0) {
      const commissionRatio = (stats.totalCommission / stats.totalRevenue) * 100;
      console.info(`  💸 Commission Ratio: ${commissionRatio.toFixed(2)}%`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const demo = new LiveCasinoDemo();

  try {
    switch (command) {
      case 'games':
        await demo.runGamesDemo();
        break;

      case 'rates':
        await demo.runRatesDemo();
        break;

      case 'sessions':
        await demo.runSessionsDemo();
        break;

      case 'revenue':
        await demo.runRevenueDemo();
        break;

      case 'performance':
        await demo.runPerformanceDemo();
        break;

      case 'stats':
        await demo.runSystemStatsDemo();
        break;

      case 'demo':
      default:
        await demo.runCompleteDemo();
        break;
    }
  } catch (error) {
    console.error('❌ Live casino demo error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
