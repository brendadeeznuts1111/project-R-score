#!/usr/bin/env bun

/**
 * 🏈 Fire22 Sports Betting Management System Demo
 * Demonstrates sports betting, risk management, VIP integration, and winning calculations
 */

import {
  createSportsBettingManagementSystem,
  SportsBettingManagementSystem,
} from '../src/sports-betting-management';

class SportsBettingDemo {
  private sportsSystem: SportsBettingManagementSystem;

  constructor() {
    this.sportsSystem = createSportsBettingManagementSystem();
  }

  /**
   * Run complete sports betting demo
   */
  async runCompleteDemo() {
    console.info('🏈 **Fire22 Sports Betting Management System Demo**\n');
    console.info('This demo showcases the complete sports betting management capabilities:\n');

    await this.runEventsDemo();
    await this.runBettingDemo();
    await this.runRatesDemo();
    await this.runRiskManagementDemo();
    await this.runVIPManagementDemo();
    await this.runWinningCalculationsDemo();
    await this.runSystemStatsDemo();

    console.info('🎉 **Sports Betting Demo Complete!**\n');
    console.info('✅ Event Management: 3 sports events with full details');
    console.info('✅ Betting System: Complete bet placement and management');
    console.info('✅ Rate Management: Sport and bet type specific rates');
    console.info('✅ Risk Assessment: Player risk profiling and management');
    console.info('✅ VIP Management: Tier-based benefits and requirements');
    console.info('✅ Winning Calculations: Advanced win amount calculations');
    console.info('✅ System Statistics: Comprehensive overview and reporting\n');

    console.info('🚀 **Your Fire22 Sports Betting Management System is ready for production!**');
    console.info('💡 **Next Steps:**');
    console.info('  • Integrate with your existing sports_rate database field');
    console.info('  • Connect with real-time sports data providers');
    console.info('  • Implement automated risk assessment updates');
    console.info('  • Add advanced analytics and reporting');
    console.info('  • Create admin dashboard for sports management');
  }

  /**
   * Run events demo
   */
  async runEventsDemo() {
    console.info('🏆 **Sports Events Demo**\n');

    // Show all events
    const events = this.sportsSystem.getAllEvents();
    console.info('📊 **Available Sports Events:**');
    events.forEach(event => {
      console.info(`\n${event.name} (${event.sport})`);
      console.info(`  🏆 League: ${event.league}`);
      console.info(`  🏠 ${event.homeTeam} vs 🚌 ${event.awayTeam}`);
      console.info(`  ⏰ Start: ${event.startTime.toLocaleString()}`);
      console.info(`  📊 Status: ${event.status}`);
      console.info(`  ⚠️ Risk Level: ${event.riskLevel}`);
      console.info(`  👑 VIP Access: ${event.vipAccess.join(', ')}`);
      console.info(`  💰 Odds: ${event.odds.homeWin} / ${event.odds.awayWin}`);
      if (event.odds.overUnder) console.info(`  📊 Over/Under: ${event.odds.overUnder}`);
      if (event.odds.handicap) console.info(`  ⚖️ Handicap: ${event.odds.handicap}`);
      if (event.odds.specialBets.length > 0) {
        console.info(`  🎯 Special Bets: ${event.odds.specialBets.length} available`);
      }
    });

    // Show events by sport
    console.info('\n📋 **Events by Sport:**');
    const sports = ['football', 'basketball', 'soccer'];

    sports.forEach(sport => {
      const sportEvents = this.sportsSystem.getEventsBySport(sport as any);
      if (sportEvents.length > 0) {
        console.info(`\n${sport.charAt(0).toUpperCase() + sport.slice(1)} Events:`);
        sportEvents.forEach(event => {
          console.info(`  • ${event.name} - ${event.league} (${event.status})`);
        });
      }
    });

    // Show events by VIP tier
    console.info('\n👑 **Events by VIP Tier:**');
    const vipTiers = ['bronze', 'silver', 'gold', 'platinum'];

    vipTiers.forEach(tier => {
      const tierEvents = this.sportsSystem.getEventsByVIP(tier as any);
      if (tierEvents.length > 0) {
        console.info(`\n${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Events:`);
        tierEvents.forEach(event => {
          console.info(`  • ${event.name} - ${event.sport}`);
        });
      }
    });
  }

  /**
   * Run betting demo
   */
  async runBettingDemo() {
    console.info('\n🎯 **Sports Betting Demo**\n');

    // Place sample bets
    console.info('🆕 **Placing Sample Bets:**');

    const events = this.sportsSystem.getAllEvents();
    const players = ['player1', 'player2', 'player3'];
    const betTypes = ['moneyline', 'spread', 'over_under', 'special'];
    const selections = [
      'Home Win',
      'Away Win',
      'Over',
      'Under',
      'First Touchdown',
      'Player Points',
    ];

    const bets = [];
    for (let i = 0; i < 6; i++) {
      const event = events[i % events.length];
      const playerId = players[i % players.length];
      const agentId = 'agent1';
      const betType = betTypes[i % betTypes.length] as any;
      const selection = selections[i % selections.length];
      const odds = 1.5 + Math.random() * 2;
      const stake = 50 + Math.floor(Math.random() * 10) * 50;

      const bet = this.sportsSystem.placeBet(
        event.id,
        playerId,
        agentId,
        betType,
        selection,
        odds,
        stake
      );

      if (bet) {
        bets.push(bet);
        console.info(`  ✅ Placed bet ${bet.id}:`);
        console.info(`    Event: ${event.name}`);
        console.info(`    Player: ${playerId}`);
        console.info(`    Type: ${betType.replace('_', ' ')}`);
        console.info(`    Selection: ${selection}`);
        console.info(`    Stake: $${stake.toLocaleString()}`);
        console.info(`    Odds: ${odds.toFixed(2)}`);
        console.info(`    Potential Win: $${bet.potentialWin.toLocaleString()}`);
        console.info(`    Risk Level: ${bet.riskLevel}`);
        console.info(`    VIP Tier: ${bet.vipTier}\n`);
      }
    }

    // Settle some bets
    console.info('🏁 **Settling Bets:**');
    bets.slice(0, 4).forEach((bet, index) => {
      const won = Math.random() > 0.4; // 60% win rate
      const actualOdds = won ? bet.odds * (0.9 + Math.random() * 0.2) : bet.odds;

      const settledBet = this.sportsSystem.settleBet(bet.id, won, actualOdds);

      if (settledBet) {
        console.info(`  ${won ? '🏆' : '❌'} Settled bet ${bet.id}:`);
        console.info(`    Result: ${won ? 'WON' : 'LOST'}`);
        console.info(`    Stake: $${settledBet.stake.toLocaleString()}`);
        console.info(`    Original Odds: ${settledBet.odds.toFixed(2)}`);
        console.info(`    Potential Win: $${settledBet.potentialWin.toLocaleString()}`);
        if (won) {
          console.info(`    Actual Win: $${settledBet.actualWin?.toLocaleString()}`);
        }
        console.info(`    Status: ${settledBet.status.toUpperCase()}\n`);
      }
    });

    // Show betting history
    console.info('📋 **Betting History Demo:**');
    const samplePlayer = 'player1';
    const bettingHistory = this.sportsSystem.getPlayerBettingHistory(samplePlayer);

    if (bettingHistory.length > 0) {
      console.info(`Betting history for ${samplePlayer}:`);
      bettingHistory.forEach(bet => {
        const event = events.find(e => e.id === bet.eventId);
        console.info(
          `  ${bet.id}: ${event?.name || 'Unknown Event'} - ${bet.betType.replace('_', ' ')} - $${bet.stake} - ${bet.status.toUpperCase()}`
        );
      });
    }
  }

  /**
   * Run rates demo
   */
  async runRatesDemo() {
    console.info('\n💎 **Sports Betting Rates Demo**\n');

    // Show default rates for agents
    const agents = ['agent1', 'agent2', 'agent3'];
    const sports = ['football', 'basketball', 'soccer'];
    const betTypes = ['moneyline', 'spread', 'over_under'];

    agents.forEach(agentId => {
      console.info(`👤 **Agent: ${agentId}**\n`);

      sports.forEach(sport => {
        console.info(`  ${sport.charAt(0).toUpperCase() + sport.slice(1)}:`);
        betTypes.forEach(betType => {
          const rate = this.sportsSystem.getRate(agentId, sport, betType as any);
          if (rate) {
            console.info(
              `    ${betType.replace('_', ' ')}: ${(rate.adjustedRate * 100).toFixed(1)}%`
            );
          }
        });
        console.info('');
      });
    });

    // Demonstrate rate update
    console.info('🔄 **Rate Update Demo:**');
    const agentId = 'agent1';
    const sport = 'football';
    const betType = 'moneyline';
    const oldRate = this.sportsSystem.getRate(agentId, sport, betType as any);

    if (oldRate) {
      console.info(`\nUpdating rate for ${agentId} on ${sport} ${betType}:`);
      console.info(`  Old Rate: ${(oldRate.adjustedRate * 100).toFixed(1)}%`);

      const newRate = oldRate.adjustedRate * 1.15; // 15% increase
      const updatedRate = this.sportsSystem.updateAgentRate(
        agentId,
        sport,
        betType as any,
        newRate,
        'admin'
      );

      if (updatedRate) {
        console.info(`  New Rate: ${(updatedRate.adjustedRate * 100).toFixed(1)}%`);
        console.info(`  Adjustment: ${(updatedRate.adjustmentFactor * 100).toFixed(0)}%`);
        console.info(`  Effective From: ${updatedRate.effectiveFrom.toLocaleDateString()}`);
      }
    }
  }

  /**
   * Run risk management demo
   */
  async runRiskManagementDemo() {
    console.info('\n⚠️ **Risk Management Demo**\n');

    // Show risk assessments
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach(playerId => {
      const assessment = this.sportsSystem.getRiskAssessment(playerId);
      if (assessment) {
        console.info(`👤 **${playerId} Risk Assessment:**`);
        console.info(`  Overall Risk: ${assessment.overallRisk.toUpperCase()}`);
        console.info(`  Risk Score: ${assessment.riskScore}/100`);
        console.info(`  Last Assessed: ${assessment.lastAssessed.toLocaleDateString()}`);
        console.info(`  Next Assessment: ${assessment.nextAssessment.toLocaleDateString()}`);

        console.info(`  Risk Factors:`);
        assessment.factors.forEach(factor => {
          const emoji =
            factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : '⚖️';
          console.info(`    ${emoji} ${factor.factor}: ${factor.score}/100 (${factor.description})`);
        });

        console.info(`  Recommendations:`);
        assessment.recommendations.forEach(rec => {
          console.info(`    • ${rec}`);
        });
        console.info('');
      }
    });

    // Demonstrate risk assessment update
    console.info('🔄 **Risk Assessment Update Demo:**');
    const playerToUpdate = 'player1';
    const currentAssessment = this.sportsSystem.getRiskAssessment(playerToUpdate);

    if (currentAssessment) {
      console.info(`\nUpdating risk assessment for ${playerToUpdate}:`);
      console.info(`  Current Risk Level: ${currentAssessment.overallRisk.toUpperCase()}`);
      console.info(`  Current Risk Score: ${currentAssessment.riskScore}/100`);

      const newRiskLevel = currentAssessment.overallRisk === 'low' ? 'medium' : 'low';
      const newRiskScore = Math.max(
        0,
        Math.min(100, currentAssessment.riskScore + (Math.random() > 0.5 ? 10 : -10))
      );

      const updatedAssessment = this.sportsSystem.updateRiskAssessment(
        playerToUpdate,
        newRiskLevel as any,
        newRiskScore,
        currentAssessment.factors
      );

      if (updatedAssessment) {
        console.info(`  New Risk Level: ${updatedAssessment.overallRisk.toUpperCase()}`);
        console.info(`  New Risk Score: ${updatedAssessment.riskScore}/100`);
        console.info(`  Updated: ${updatedAssessment.lastAssessed.toLocaleDateString()}`);
      }
    }
  }

  /**
   * Run VIP management demo
   */
  async runVIPManagementDemo() {
    console.info('\n👑 **VIP Management Demo**\n');

    // Show VIP profiles
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach(playerId => {
      const profile = this.sportsSystem.getVIPProfile(playerId);
      if (profile) {
        console.info(`👤 **${playerId} VIP Profile:**`);
        console.info(`  Current Tier: ${profile.currentTier.toUpperCase()}`);
        console.info(`  Points: ${profile.points.toLocaleString()}`);
        console.info(`  Joined: ${profile.joinedAt.toLocaleDateString()}`);
        console.info(`  Status: ${profile.status}`);

        console.info(`  Requirements:`);
        console.info(`    Min Balance: $${profile.requirements.minBalance.toLocaleString()}`);
        console.info(`    Min Volume: $${profile.requirements.minVolume.toLocaleString()}`);
        console.info(`    Min Bets: ${profile.requirements.minBets}`);
        console.info(`    Min Win Rate: ${profile.requirements.minWinRate}%`);
        console.info(`    Risk Threshold: ${profile.requirements.riskThreshold}%`);

        console.info(`  Benefits:`);
        console.info(`    Max Bet Increase: ${profile.benefits.maxBetIncrease}x`);
        console.info(`    Rate Discount: ${(profile.benefits.rateDiscount * 100).toFixed(1)}%`);
        console.info(`    Cashback: ${profile.benefits.cashbackPercentage}%`);
        console.info(
          `    Exclusive Events: ${profile.benefits.exclusiveEvents.join(', ') || 'None'}`
        );
        console.info(`    Priority Support: ${profile.benefits.prioritySupport ? 'Yes' : 'No'}`);
        console.info(`    Personal Manager: ${profile.benefits.personalManager ? 'Yes' : 'No'}\n`);
      }
    });

    // Demonstrate VIP tier upgrade
    console.info('🔄 **VIP Tier Upgrade Demo:**');
    const playerToUpgrade = 'player2';
    const currentProfile = this.sportsSystem.getVIPProfile(playerToUpgrade);

    if (currentProfile) {
      console.info(`\nUpgrading VIP tier for ${playerToUpgrade}:`);
      console.info(`  Current Tier: ${currentProfile.currentTier.toUpperCase()}`);

      const nextTier = this.getNextTier(currentProfile.currentTier);
      if (nextTier) {
        const updatedProfile = this.sportsSystem.updateVIPTier(playerToUpgrade, nextTier);

        if (updatedProfile) {
          console.info(`  New Tier: ${updatedProfile.currentTier.toUpperCase()}`);
          console.info(`  Updated: ${updatedProfile.lastUpdated.toLocaleDateString()}`);
          console.info(`  New Benefits:`);
          console.info(`    Max Bet Increase: ${updatedProfile.benefits.maxBetIncrease}x`);
          console.info(
            `    Rate Discount: ${(updatedProfile.benefits.rateDiscount * 100).toFixed(1)}%`
          );
          console.info(`    Cashback: ${updatedProfile.benefits.cashbackPercentage}%`);
        }
      }
    }

    // Demonstrate adding VIP points
    console.info('\n🔄 **VIP Points Addition Demo:**');
    const playerToAddPoints = 'player3';
    const profileToUpdate = this.sportsSystem.getVIPProfile(playerToAddPoints);

    if (profileToUpdate) {
      console.info(`\nAdding VIP points for ${playerToAddPoints}:`);
      console.info(`  Current Points: ${profileToUpdate.points.toLocaleString()}`);
      console.info(`  Current Tier: ${profileToUpdate.currentTier.toUpperCase()}`);

      const pointsToAdd = 5000;
      const updatedProfile = this.sportsSystem.addVIPPoints(playerToAddPoints, pointsToAdd);

      if (updatedProfile) {
        console.info(`  Points Added: ${pointsToAdd.toLocaleString()}`);
        console.info(`  New Points: ${updatedProfile.points.toLocaleString()}`);
        console.info(`  Tier Status: ${updatedProfile.status}`);
        console.info(`  Updated: ${updatedProfile.lastUpdated.toLocaleDateString()}`);
      }
    }
  }

  /**
   * Get next VIP tier
   */
  private getNextTier(tier: string): string | null {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(tier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  /**
   * Run winning calculations demo
   */
  async runWinningCalculationsDemo() {
    console.info('\n💰 **Winning Calculations Demo**\n');

    // Show winning calculations for won bets
    const players = ['player1', 'player2', 'player3'];

    players.forEach(playerId => {
      const bettingHistory = this.sportsSystem.getPlayerBettingHistory(playerId);
      const wonBets = bettingHistory.filter(bet => bet.status === 'won');

      if (wonBets.length > 0) {
        console.info(`👤 **${playerId} Winning Calculations:**`);

        wonBets.forEach(bet => {
          console.info(`\n  Bet ${bet.id}:`);
          console.info(`    Stake: $${bet.stake.toLocaleString()}`);
          console.info(`    Odds: ${bet.odds.toFixed(2)}`);
          console.info(`    Potential Win: $${bet.potentialWin.toLocaleString()}`);
          console.info(`    Actual Win: $${bet.actualWin?.toLocaleString()}`);
          console.info(`    Risk Level: ${bet.riskLevel}`);
          console.info(`    VIP Tier: ${bet.vipTier}`);
        });
      }
    });

    // Demonstrate potential win calculation
    console.info('\n🔄 **Potential Win Calculation Demo:**');
    const stake = 100;
    const odds = 2.5;
    const vipTier = 'gold';
    const riskLevel = 'medium';

    console.info(`\nCalculating potential win for:`);
    console.info(`  Stake: $${stake.toLocaleString()}`);
    console.info(`  Odds: ${odds}`);
    console.info(`  VIP Tier: ${vipTier}`);
    console.info(`  Risk Level: ${riskLevel}`);

    const potentialWin = this.sportsSystem.calculatePotentialWin(
      stake,
      odds,
      vipTier as any,
      riskLevel as any
    );
    console.info(`  Potential Win: $${potentialWin.toLocaleString()}`);

    const baseWin = stake * odds;
    const vipProfile = this.sportsSystem.getVIPProfile('player1');
    const vipBonus = vipProfile ? vipProfile.benefits.rateDiscount * stake : 0;
    const riskAdjustment = riskLevel === 'medium' ? 0.95 : 1.0;

    console.info(`  Calculation Breakdown:`);
    console.info(`    Base Win: $${stake} × ${odds} = $${baseWin.toLocaleString()}`);
    console.info(
      `    VIP Bonus: ${vipProfile ? (vipProfile.benefits.rateDiscount * 100).toFixed(1) : 0}% = $${vipBonus.toFixed(2)}`
    );
    console.info(
      `    Risk Adjustment: ${riskAdjustment} = ${((riskAdjustment - 1) * 100).toFixed(0)}%`
    );
    console.info(`    Final Win: $${potentialWin.toLocaleString()}`);
  }

  /**
   * Run system statistics demo
   */
  async runSystemStatsDemo() {
    console.info('\n📈 **Sports Betting System Statistics Demo**\n');

    const stats = this.sportsSystem.getSystemStats();

    console.info('🏈 **Overall System Status:**');
    console.info(`  🏆 Total Events: ${stats.totalEvents}`);
    console.info(`  ✅ Active Events: ${stats.activeEvents}`);
    console.info(`  🎯 Total Bets: ${stats.totalBets}`);
    console.info(`  🎬 Active Bets: ${stats.activeBets}`);
    console.info(`  💎 Total Rates: ${stats.totalRates}`);
    console.info(`  ✅ Active Rates: ${stats.activeRates}`);
    console.info(`  👑 Total VIP Profiles: ${stats.totalVIPProfiles}`);
    console.info(`  ⚠️ Total Risk Assessments: ${stats.totalRiskAssessments}\n`);

    // Calculate additional metrics
    const eventUtilization = (stats.activeEvents / stats.totalEvents) * 100;
    const betUtilization = (stats.activeBets / stats.totalBets) * 100;
    const rateUtilization = (stats.activeRates / stats.totalRates) * 100;

    console.info('📊 **System Utilization:**');
    console.info(`  🏆 Event Utilization: ${eventUtilization.toFixed(1)}%`);
    console.info(`  🎯 Bet Utilization: ${betUtilization.toFixed(1)}%`);
    console.info(`  💎 Rate Utilization: ${rateUtilization.toFixed(1)}%`);

    // Show agent performance
    console.info('\n👤 **Agent Performance Demo:**');
    const agents = ['agent1', 'agent2', 'agent3'];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    agents.forEach(agentId => {
      const performance = this.sportsSystem.getAgentPerformance(agentId, currentPeriod);

      console.info(`\n${agentId}:`);
      console.info(`  🎯 Total Bets: ${performance.totalBets}`);
      console.info(`  💰 Total Stake: $${performance.totalStake.toLocaleString()}`);
      console.info(`  🏆 Total Wins: $${performance.totalWins.toLocaleString()}`);
      console.info(`  📊 Win Rate: ${performance.winRate.toFixed(1)}%`);
      console.info(`  📈 Average Odds: ${performance.averageOdds.toFixed(2)}`);

      console.info(`  Risk Distribution:`);
      Object.entries(performance.riskDistribution).forEach(([risk, count]) => {
        if (count > 0) {
          console.info(`    ${risk}: ${count}`);
        }
      });

      console.info(`  VIP Distribution:`);
      Object.entries(performance.vipDistribution).forEach(([vip, count]) => {
        if (count > 0) {
          console.info(`    ${vip}: ${count}`);
        }
      });
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const demo = new SportsBettingDemo();

  try {
    switch (command) {
      case 'events':
        await demo.runEventsDemo();
        break;

      case 'betting':
        await demo.runBettingDemo();
        break;

      case 'rates':
        await demo.runRatesDemo();
        break;

      case 'risk':
        await demo.runRiskManagementDemo();
        break;

      case 'vip':
        await demo.runVIPManagementDemo();
        break;

      case 'winning':
        await demo.runWinningCalculationsDemo();
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
    console.error('❌ Sports betting demo error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
