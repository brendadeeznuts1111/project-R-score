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
    console.log('🎰 **Fire22 Live Casino Management System Demo**\n');
    console.log('This demo showcases the complete live casino management capabilities:\n');

    await this.runGamesDemo();
    await this.runRatesDemo();
    await this.runSessionsDemo();
    await this.runRevenueDemo();
    await this.runPerformanceDemo();
    await this.runSystemStatsDemo();

    console.log('🎉 **Live Casino Demo Complete!**\n');
    console.log('✅ Game Management: 6 live casino games with full details');
    console.log('✅ Rate Management: Agent-specific rates with adjustments');
    console.log('✅ Session Management: Real-time session tracking');
    console.log('✅ Revenue Management: Monthly revenue calculations');
    console.log('✅ Performance Analysis: Game and agent performance metrics');
    console.log('✅ System Statistics: Comprehensive overview and reporting\n');

    console.log('🚀 **Your Fire22 Live Casino Management System is ready for production!**');
    console.log('💡 **Next Steps:**');
    console.log('  • Integrate with your existing live_casino_rate database field');
    console.log('  • Connect with real-time casino game providers');
    console.log('  • Implement automated rate adjustments');
    console.log('  • Add advanced analytics and reporting');
    console.log('  • Create admin dashboard for casino management');
  }

  /**
   * Run games demo
   */
  async runGamesDemo() {
    console.log('🎮 **Live Casino Games Demo**\n');

    // Show all games
    const games = this.casinoSystem.getAllGames();
    console.log('📊 **Available Live Casino Games:**');
    games.forEach(game => {
      console.log(`\n${game.name} (${game.category})`);
      console.log(`  🏢 Provider: ${game.provider}`);
      console.log(`  💰 Bet Range: $${game.minBet} - $${game.maxBet.toLocaleString()}`);
      console.log(`  🎯 House Edge: ${(game.houseEdge * 100).toFixed(2)}%`);
      console.log(`  📊 Default Rate: ${(game.defaultRate * 100).toFixed(1)}%`);
      console.log(`  🔥 Popularity: ${game.popularity}%`);
      console.log(`  📅 Last Updated: ${game.lastUpdated.toLocaleDateString()}`);
      console.log(`  ✅ Status: ${game.isActive ? 'Active' : 'Inactive'}`);
    });

    // Show games by category
    console.log('\n📋 **Games by Category:**');
    const categories: Array<
      'table' | 'card' | 'wheel' | 'dice' | 'baccarat' | 'roulette' | 'blackjack' | 'poker'
    > = ['baccarat', 'roulette', 'blackjack', 'poker', 'dice', 'wheel'];

    categories.forEach(category => {
      const categoryGames = this.casinoSystem.getGamesByCategory(category);
      if (categoryGames.length > 0) {
        console.log(`\n${category.charAt(0).toUpperCase() + category.slice(1)} Games:`);
        categoryGames.forEach(game => {
          console.log(`  • ${game.name} (${(game.defaultRate * 100).toFixed(1)}% rate)`);
        });
      }
    });

    // Demonstrate game popularity update
    console.log('\n🔄 **Game Popularity Update Demo:**');
    const gameToUpdate = games[0];
    if (gameToUpdate) {
      const oldPopularity = gameToUpdate.popularity;
      const newPopularity = Math.min(100, oldPopularity + 5);

      this.casinoSystem.updateGamePopularity(gameToUpdate.id, newPopularity);
      const updatedGame = this.casinoSystem.getGame(gameToUpdate.id);

      console.log(`  ${gameToUpdate.name}:`);
      console.log(`    Old Popularity: ${oldPopularity}%`);
      console.log(`    New Popularity: ${updatedGame?.popularity}%`);
      console.log(`    Updated: ${updatedGame?.lastUpdated.toLocaleString()}`);
    }
  }

  /**
   * Run rates demo
   */
  async runRatesDemo() {
    console.log('\n💎 **Live Casino Rates Demo**\n');

    // Show default rates for agents
    const defaultAgents = ['agent1', 'agent2', 'agent3'];
    const games = this.casinoSystem.getAllGames();

    defaultAgents.forEach(agentId => {
      console.log(`👤 **Agent: ${agentId}**\n`);

      games.slice(0, 3).forEach(game => {
        const rate = this.casinoSystem.getRate(agentId, game.id);
        if (rate) {
          console.log(`  ${game.name}:`);
          console.log(`    💰 Base Rate: ${(rate.baseRate * 100).toFixed(1)}%`);
          console.log(`    📊 Adjusted Rate: ${(rate.adjustedRate * 100).toFixed(1)}%`);
          console.log(`    ⚖️ Adjustment Factor: ${(rate.adjustmentFactor * 100).toFixed(0)}%`);
          console.log(`    📅 Effective From: ${rate.effectiveFrom.toLocaleDateString()}`);
          console.log(`    📝 Reason: ${rate.reason}`);
          console.log(`    ✅ Status: ${rate.isActive ? 'Active' : 'Inactive'}\n`);
        }
      });
    });

    // Demonstrate rate update
    console.log('🔄 **Rate Update Demo:**');
    const agentId = 'agent1';
    const gameId = 'baccarat-live';
    const oldRate = this.casinoSystem.getRate(agentId, gameId);

    if (oldRate) {
      console.log(`\nUpdating rate for ${agentId} on Baccarat:`);
      console.log(`  Old Rate: ${(oldRate.adjustedRate * 100).toFixed(1)}%`);

      const newRate = oldRate.adjustedRate * 1.2; // 20% increase
      const updatedRate = this.casinoSystem.updateAgentRate(
        agentId,
        gameId,
        newRate,
        'Performance bonus - increased player volume',
        'admin'
      );

      if (updatedRate) {
        console.log(`  New Rate: ${(updatedRate.adjustedRate * 100).toFixed(1)}%`);
        console.log(`  Adjustment: ${(updatedRate.adjustmentFactor * 100).toFixed(0)}%`);
        console.log(`  Reason: ${updatedRate.reason}`);
        console.log(`  Effective From: ${updatedRate.effectiveFrom.toLocaleDateString()}`);
      }
    }

    // Show rate history
    console.log('\n📋 **Rate History Demo:**');
    const agentRates = this.casinoSystem.getAgentRates(agentId);
    console.log(`Rate history for ${agentId}:`);
    agentRates.forEach(rate => {
      const game = this.casinoSystem.getGame(rate.gameId);
      console.log(
        `  ${game?.name}: ${(rate.adjustedRate * 100).toFixed(1)}% (${rate.effectiveFrom.toLocaleDateString()})`
      );
    });
  }

  /**
   * Run sessions demo
   */
  async runSessionsDemo() {
    console.log('\n🎯 **Live Casino Sessions Demo**\n');

    // Create sample sessions
    console.log('🆕 **Creating Sample Sessions:**');

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

      console.log(`  ✅ Started session ${sessionId}:`);
      console.log(`    Player: ${playerId}`);
      console.log(`    Agent: ${agentId}`);
      console.log(`    Game: ${games[i % games.length].name}`);
      console.log(`    Rate: ${(session.rateUsed * 100).toFixed(1)}%`);
    }

    // End some sessions with results
    console.log('\n🏁 **Ending Sessions with Results:**');
    sessions.slice(0, 5).forEach((session, index) => {
      const totalBets = 100 + index * 50;
      const totalWins = Math.floor(totalBets * (0.8 + Math.random() * 0.4)); // 80-120% of bets

      const endedSession = this.casinoSystem.endSession(session.sessionId, totalBets, totalWins);

      if (endedSession) {
        console.log(`  ✅ Ended session ${session.sessionId}:`);
        console.log(`    💰 Total Bets: $${endedSession.totalBets.toLocaleString()}`);
        console.log(`    🏆 Total Wins: $${endedSession.totalWins.toLocaleString()}`);
        console.log(`    📊 Net Result: $${endedSession.netResult.toLocaleString()}`);
        console.log(`    💸 Commission: $${endedSession.commissionEarned.toFixed(2)}`);
        console.log(
          `    ⏱️ Duration: ${Math.round((endedSession.endTime!.getTime() - endedSession.startTime.getTime()) / 1000)}s`
        );
      }
    });

    // Show active and completed sessions
    console.log('\n📊 **Session Status Overview:**');
    agents.forEach(agentId => {
      const activeSessions = this.casinoSystem.getActiveSessions(agentId);
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const completedSessions = this.casinoSystem.getCompletedSessions(agentId, currentPeriod);

      console.log(`\n${agentId}:`);
      console.log(`  🎯 Active Sessions: ${activeSessions.length}`);
      console.log(`  ✅ Completed This Month: ${completedSessions.length}`);

      if (completedSessions.length > 0) {
        const totalBets = completedSessions.reduce((sum, s) => sum + s.totalBets, 0);
        const totalWins = completedSessions.reduce((sum, s) => sum + s.totalWins, 0);
        const totalCommission = completedSessions.reduce((sum, s) => sum + s.commissionEarned, 0);

        console.log(`  💰 Total Bets: $${totalBets.toLocaleString()}`);
        console.log(`  🏆 Total Wins: $${totalWins.toLocaleString()}`);
        console.log(`  💸 Commission Earned: $${totalCommission.toFixed(2)}`);
      }
    });
  }

  /**
   * Run revenue demo
   */
  async runRevenueDemo() {
    console.log('\n💰 **Live Casino Revenue Demo**\n');

    // Calculate monthly revenue for all agents
    const agents = ['agent1', 'agent2', 'agent3'];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    console.log(`📅 **Monthly Revenue Report - ${currentPeriod}**\n`);

    agents.forEach(agentId => {
      const revenue = this.casinoSystem.calculateMonthlyRevenue(agentId, currentPeriod);

      console.log(`👤 **${agentId}**`);
      console.log(`  💰 Total Bets: $${revenue.totalBets.toLocaleString()}`);
      console.log(`  🏆 Total Wins: $${revenue.totalWins.toLocaleString()}`);
      console.log(`  📊 Net Revenue: $${revenue.netRevenue.toLocaleString()}`);
      console.log(`  💸 Commission Paid: $${revenue.commissionPaid.toFixed(2)}`);
      console.log(`  📈 Average Rate: ${(revenue.averageRate * 100).toFixed(1)}%`);
      console.log(`  👥 Players: ${revenue.playerCount}`);
      console.log(`  🎯 Sessions: ${revenue.sessionCount}`);
      console.log(`  📅 Calculated: ${revenue.calculatedAt.toLocaleDateString()}\n`);
    });

    // Show revenue history
    console.log('📋 **Revenue History Demo:**');
    const sampleAgent = 'agent1';
    const revenueHistory = this.casinoSystem.getAgentRevenueHistory(sampleAgent);

    if (revenueHistory.length > 0) {
      console.log(`Revenue history for ${sampleAgent}:`);
      revenueHistory.forEach(revenue => {
        console.log(
          `  ${revenue.period}: $${revenue.netRevenue.toLocaleString()} (${revenue.sessionCount} sessions)`
        );
      });
    }
  }

  /**
   * Run performance demo
   */
  async runPerformanceDemo() {
    console.log('\n📊 **Live Casino Performance Demo**\n');

    const currentPeriod = new Date().toISOString().slice(0, 7);

    // Game performance analysis
    console.log('🎮 **Game Performance Analysis:**');
    const gamePerformance = this.casinoSystem.getGamePerformance(currentPeriod);

    if (gamePerformance.length > 0) {
      gamePerformance.forEach(performance => {
        console.log(`\n${performance.gameName}:`);
        console.log(`  🎯 Sessions: ${performance.totalSessions}`);
        console.log(`  💰 Total Bets: $${performance.totalBets.toLocaleString()}`);
        console.log(`  🏆 Total Wins: $${performance.totalWins.toLocaleString()}`);
        console.log(`  📊 Net Revenue: $${performance.netRevenue.toLocaleString()}`);
        console.log(`  💸 Commission Paid: $${performance.commissionPaid.toFixed(2)}`);
        console.log(`  📈 Average Rate: ${(performance.averageRate * 100).toFixed(1)}%`);
        console.log(`  👥 Players: ${performance.playerCount}`);
        console.log(`  🎯 Win Rate: ${performance.winRate.toFixed(1)}%`);
        console.log(`  🏠 House Edge: ${(performance.houseEdge * 100).toFixed(2)}%`);
        console.log(`  🔥 Popularity: ${performance.popularity}%`);
      });
    } else {
      console.log('  No performance data available for this period.');
    }

    // Agent performance ranking
    console.log('\n🏆 **Agent Performance Ranking:**');
    const agentRanking = this.casinoSystem.getAgentPerformanceRanking(currentPeriod);

    if (agentRanking.length > 0) {
      agentRanking.forEach((agent, index) => {
        console.log(`\n${index + 1}. **${agent.agentId}**`);
        console.log(`  💰 Total Revenue: $${agent.totalRevenue.toLocaleString()}`);
        console.log(`  💸 Total Commission: $${agent.totalCommission.toFixed(2)}`);
        console.log(`  🎯 Sessions: ${agent.sessionCount}`);
        console.log(`  👥 Players: ${agent.playerCount}`);
        console.log(`  📈 Average Rate: ${(agent.averageRate * 100).toFixed(1)}%`);
      });
    } else {
      console.log('  No agent performance data available for this period.');
    }
  }

  /**
   * Run system statistics demo
   */
  async runSystemStatsDemo() {
    console.log('\n📈 **Live Casino System Statistics Demo**\n');

    const stats = this.casinoSystem.getSystemStats();

    console.log('🎰 **Overall System Status:**');
    console.log(`  🎮 Total Games: ${stats.totalGames}`);
    console.log(`  ✅ Active Games: ${stats.activeGames}`);
    console.log(`  💎 Total Rates: ${stats.totalRates}`);
    console.log(`  ✅ Active Rates: ${stats.activeRates}`);
    console.log(`  🎯 Total Sessions: ${stats.totalSessions}`);
    console.log(`  🎬 Active Sessions: ${stats.activeSessions}`);
    console.log(`  💰 Total Revenue: $${stats.totalRevenue.toLocaleString()}`);
    console.log(`  💸 Total Commission: $${stats.totalCommission.toFixed(2)}\n`);

    // Calculate additional metrics
    const gameUtilization = (stats.activeGames / stats.totalGames) * 100;
    const rateUtilization = (stats.activeRates / stats.totalRates) * 100;
    const sessionActivity = (stats.activeSessions / stats.totalSessions) * 100;

    console.log('📊 **System Utilization:**');
    console.log(`  🎮 Game Utilization: ${gameUtilization.toFixed(1)}%`);
    console.log(`  💎 Rate Utilization: ${rateUtilization.toFixed(1)}%`);
    console.log(`  🎯 Session Activity: ${sessionActivity.toFixed(1)}%`);

    if (stats.totalRevenue > 0) {
      const commissionRatio = (stats.totalCommission / stats.totalRevenue) * 100;
      console.log(`  💸 Commission Ratio: ${commissionRatio.toFixed(2)}%`);
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
