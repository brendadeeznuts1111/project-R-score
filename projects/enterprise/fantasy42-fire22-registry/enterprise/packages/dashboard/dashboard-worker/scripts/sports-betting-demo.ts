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
    console.log('🏈 **Fire22 Sports Betting Management System Demo**\n');
    console.log('This demo showcases the complete sports betting management capabilities:\n');

    await this.runEventsDemo();
    await this.runBettingDemo();
    await this.runRatesDemo();
    await this.runRiskManagementDemo();
    await this.runVIPManagementDemo();
    await this.runWinningCalculationsDemo();
    await this.runSystemStatsDemo();

    console.log('🎉 **Sports Betting Demo Complete!**\n');
    console.log('✅ Event Management: 3 sports events with full details');
    console.log('✅ Betting System: Complete bet placement and management');
    console.log('✅ Rate Management: Sport and bet type specific rates');
    console.log('✅ Risk Assessment: Player risk profiling and management');
    console.log('✅ VIP Management: Tier-based benefits and requirements');
    console.log('✅ Winning Calculations: Advanced win amount calculations');
    console.log('✅ System Statistics: Comprehensive overview and reporting\n');

    console.log('🚀 **Your Fire22 Sports Betting Management System is ready for production!**');
    console.log('💡 **Next Steps:**');
    console.log('  • Integrate with your existing sports_rate database field');
    console.log('  • Connect with real-time sports data providers');
    console.log('  • Implement automated risk assessment updates');
    console.log('  • Add advanced analytics and reporting');
    console.log('  • Create admin dashboard for sports management');
  }

  /**
   * Run events demo
   */
  async runEventsDemo() {
    console.log('🏆 **Sports Events Demo**\n');

    // Show all events
    const events = this.sportsSystem.getAllEvents();
    console.log('📊 **Available Sports Events:**');
    events.forEach(event => {
      console.log(`\n${event.name} (${event.sport})`);
      console.log(`  🏆 League: ${event.league}`);
      console.log(`  🏠 ${event.homeTeam} vs 🚌 ${event.awayTeam}`);
      console.log(`  ⏰ Start: ${event.startTime.toLocaleString()}`);
      console.log(`  📊 Status: ${event.status}`);
      console.log(`  ⚠️ Risk Level: ${event.riskLevel}`);
      console.log(`  👑 VIP Access: ${event.vipAccess.join(', ')}`);
      console.log(`  💰 Odds: ${event.odds.homeWin} / ${event.odds.awayWin}`);
      if (event.odds.overUnder) console.log(`  📊 Over/Under: ${event.odds.overUnder}`);
      if (event.odds.handicap) console.log(`  ⚖️ Handicap: ${event.odds.handicap}`);
      if (event.odds.specialBets.length > 0) {
        console.log(`  🎯 Special Bets: ${event.odds.specialBets.length} available`);
      }
    });

    // Show events by sport
    console.log('\n📋 **Events by Sport:**');
    const sports = ['football', 'basketball', 'soccer'];

    sports.forEach(sport => {
      const sportEvents = this.sportsSystem.getEventsBySport(sport as any);
      if (sportEvents.length > 0) {
        console.log(`\n${sport.charAt(0).toUpperCase() + sport.slice(1)} Events:`);
        sportEvents.forEach(event => {
          console.log(`  • ${event.name} - ${event.league} (${event.status})`);
        });
      }
    });

    // Show events by VIP tier
    console.log('\n👑 **Events by VIP Tier:**');
    const vipTiers = ['bronze', 'silver', 'gold', 'platinum'];

    vipTiers.forEach(tier => {
      const tierEvents = this.sportsSystem.getEventsByVIP(tier as any);
      if (tierEvents.length > 0) {
        console.log(`\n${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Events:`);
        tierEvents.forEach(event => {
          console.log(`  • ${event.name} - ${event.sport}`);
        });
      }
    });
  }

  /**
   * Run betting demo
   */
  async runBettingDemo() {
    console.log('\n🎯 **Sports Betting Demo**\n');

    // Place sample bets
    console.log('🆕 **Placing Sample Bets:**');

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
        console.log(`  ✅ Placed bet ${bet.id}:`);
        console.log(`    Event: ${event.name}`);
        console.log(`    Player: ${playerId}`);
        console.log(`    Type: ${betType.replace('_', ' ')}`);
        console.log(`    Selection: ${selection}`);
        console.log(`    Stake: $${stake.toLocaleString()}`);
        console.log(`    Odds: ${odds.toFixed(2)}`);
        console.log(`    Potential Win: $${bet.potentialWin.toLocaleString()}`);
        console.log(`    Risk Level: ${bet.riskLevel}`);
        console.log(`    VIP Tier: ${bet.vipTier}\n`);
      }
    }

    // Settle some bets
    console.log('🏁 **Settling Bets:**');
    bets.slice(0, 4).forEach((bet, index) => {
      const won = Math.random() > 0.4; // 60% win rate
      const actualOdds = won ? bet.odds * (0.9 + Math.random() * 0.2) : bet.odds;

      const settledBet = this.sportsSystem.settleBet(bet.id, won, actualOdds);

      if (settledBet) {
        console.log(`  ${won ? '🏆' : '❌'} Settled bet ${bet.id}:`);
        console.log(`    Result: ${won ? 'WON' : 'LOST'}`);
        console.log(`    Stake: $${settledBet.stake.toLocaleString()}`);
        console.log(`    Original Odds: ${settledBet.odds.toFixed(2)}`);
        console.log(`    Potential Win: $${settledBet.potentialWin.toLocaleString()}`);
        if (won) {
          console.log(`    Actual Win: $${settledBet.actualWin?.toLocaleString()}`);
        }
        console.log(`    Status: ${settledBet.status.toUpperCase()}\n`);
      }
    });

    // Show betting history
    console.log('📋 **Betting History Demo:**');
    const samplePlayer = 'player1';
    const bettingHistory = this.sportsSystem.getPlayerBettingHistory(samplePlayer);

    if (bettingHistory.length > 0) {
      console.log(`Betting history for ${samplePlayer}:`);
      bettingHistory.forEach(bet => {
        const event = events.find(e => e.id === bet.eventId);
        console.log(
          `  ${bet.id}: ${event?.name || 'Unknown Event'} - ${bet.betType.replace('_', ' ')} - $${bet.stake} - ${bet.status.toUpperCase()}`
        );
      });
    }
  }

  /**
   * Run rates demo
   */
  async runRatesDemo() {
    console.log('\n💎 **Sports Betting Rates Demo**\n');

    // Show default rates for agents
    const agents = ['agent1', 'agent2', 'agent3'];
    const sports = ['football', 'basketball', 'soccer'];
    const betTypes = ['moneyline', 'spread', 'over_under'];

    agents.forEach(agentId => {
      console.log(`👤 **Agent: ${agentId}**\n`);

      sports.forEach(sport => {
        console.log(`  ${sport.charAt(0).toUpperCase() + sport.slice(1)}:`);
        betTypes.forEach(betType => {
          const rate = this.sportsSystem.getRate(agentId, sport, betType as any);
          if (rate) {
            console.log(
              `    ${betType.replace('_', ' ')}: ${(rate.adjustedRate * 100).toFixed(1)}%`
            );
          }
        });
        console.log('');
      });
    });

    // Demonstrate rate update
    console.log('🔄 **Rate Update Demo:**');
    const agentId = 'agent1';
    const sport = 'football';
    const betType = 'moneyline';
    const oldRate = this.sportsSystem.getRate(agentId, sport, betType as any);

    if (oldRate) {
      console.log(`\nUpdating rate for ${agentId} on ${sport} ${betType}:`);
      console.log(`  Old Rate: ${(oldRate.adjustedRate * 100).toFixed(1)}%`);

      const newRate = oldRate.adjustedRate * 1.15; // 15% increase
      const updatedRate = this.sportsSystem.updateAgentRate(
        agentId,
        sport,
        betType as any,
        newRate,
        'admin'
      );

      if (updatedRate) {
        console.log(`  New Rate: ${(updatedRate.adjustedRate * 100).toFixed(1)}%`);
        console.log(`  Adjustment: ${(updatedRate.adjustmentFactor * 100).toFixed(0)}%`);
        console.log(`  Effective From: ${updatedRate.effectiveFrom.toLocaleDateString()}`);
      }
    }
  }

  /**
   * Run risk management demo
   */
  async runRiskManagementDemo() {
    console.log('\n⚠️ **Risk Management Demo**\n');

    // Show risk assessments
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach(playerId => {
      const assessment = this.sportsSystem.getRiskAssessment(playerId);
      if (assessment) {
        console.log(`👤 **${playerId} Risk Assessment:**`);
        console.log(`  Overall Risk: ${assessment.overallRisk.toUpperCase()}`);
        console.log(`  Risk Score: ${assessment.riskScore}/100`);
        console.log(`  Last Assessed: ${assessment.lastAssessed.toLocaleDateString()}`);
        console.log(`  Next Assessment: ${assessment.nextAssessment.toLocaleDateString()}`);

        console.log(`  Risk Factors:`);
        assessment.factors.forEach(factor => {
          const emoji =
            factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : '⚖️';
          console.log(`    ${emoji} ${factor.factor}: ${factor.score}/100 (${factor.description})`);
        });

        console.log(`  Recommendations:`);
        assessment.recommendations.forEach(rec => {
          console.log(`    • ${rec}`);
        });
        console.log('');
      }
    });

    // Demonstrate risk assessment update
    console.log('🔄 **Risk Assessment Update Demo:**');
    const playerToUpdate = 'player1';
    const currentAssessment = this.sportsSystem.getRiskAssessment(playerToUpdate);

    if (currentAssessment) {
      console.log(`\nUpdating risk assessment for ${playerToUpdate}:`);
      console.log(`  Current Risk Level: ${currentAssessment.overallRisk.toUpperCase()}`);
      console.log(`  Current Risk Score: ${currentAssessment.riskScore}/100`);

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
        console.log(`  New Risk Level: ${updatedAssessment.overallRisk.toUpperCase()}`);
        console.log(`  New Risk Score: ${updatedAssessment.riskScore}/100`);
        console.log(`  Updated: ${updatedAssessment.lastAssessed.toLocaleDateString()}`);
      }
    }
  }

  /**
   * Run VIP management demo
   */
  async runVIPManagementDemo() {
    console.log('\n👑 **VIP Management Demo**\n');

    // Show VIP profiles
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach(playerId => {
      const profile = this.sportsSystem.getVIPProfile(playerId);
      if (profile) {
        console.log(`👤 **${playerId} VIP Profile:**`);
        console.log(`  Current Tier: ${profile.currentTier.toUpperCase()}`);
        console.log(`  Points: ${profile.points.toLocaleString()}`);
        console.log(`  Joined: ${profile.joinedAt.toLocaleDateString()}`);
        console.log(`  Status: ${profile.status}`);

        console.log(`  Requirements:`);
        console.log(`    Min Balance: $${profile.requirements.minBalance.toLocaleString()}`);
        console.log(`    Min Volume: $${profile.requirements.minVolume.toLocaleString()}`);
        console.log(`    Min Bets: ${profile.requirements.minBets}`);
        console.log(`    Min Win Rate: ${profile.requirements.minWinRate}%`);
        console.log(`    Risk Threshold: ${profile.requirements.riskThreshold}%`);

        console.log(`  Benefits:`);
        console.log(`    Max Bet Increase: ${profile.benefits.maxBetIncrease}x`);
        console.log(`    Rate Discount: ${(profile.benefits.rateDiscount * 100).toFixed(1)}%`);
        console.log(`    Cashback: ${profile.benefits.cashbackPercentage}%`);
        console.log(
          `    Exclusive Events: ${profile.benefits.exclusiveEvents.join(', ') || 'None'}`
        );
        console.log(`    Priority Support: ${profile.benefits.prioritySupport ? 'Yes' : 'No'}`);
        console.log(`    Personal Manager: ${profile.benefits.personalManager ? 'Yes' : 'No'}\n`);
      }
    });

    // Demonstrate VIP tier upgrade
    console.log('🔄 **VIP Tier Upgrade Demo:**');
    const playerToUpgrade = 'player2';
    const currentProfile = this.sportsSystem.getVIPProfile(playerToUpgrade);

    if (currentProfile) {
      console.log(`\nUpgrading VIP tier for ${playerToUpgrade}:`);
      console.log(`  Current Tier: ${currentProfile.currentTier.toUpperCase()}`);

      const nextTier = this.getNextTier(currentProfile.currentTier);
      if (nextTier) {
        const updatedProfile = this.sportsSystem.updateVIPTier(playerToUpgrade, nextTier);

        if (updatedProfile) {
          console.log(`  New Tier: ${updatedProfile.currentTier.toUpperCase()}`);
          console.log(`  Updated: ${updatedProfile.lastUpdated.toLocaleDateString()}`);
          console.log(`  New Benefits:`);
          console.log(`    Max Bet Increase: ${updatedProfile.benefits.maxBetIncrease}x`);
          console.log(
            `    Rate Discount: ${(updatedProfile.benefits.rateDiscount * 100).toFixed(1)}%`
          );
          console.log(`    Cashback: ${updatedProfile.benefits.cashbackPercentage}%`);
        }
      }
    }

    // Demonstrate adding VIP points
    console.log('\n🔄 **VIP Points Addition Demo:**');
    const playerToAddPoints = 'player3';
    const profileToUpdate = this.sportsSystem.getVIPProfile(playerToAddPoints);

    if (profileToUpdate) {
      console.log(`\nAdding VIP points for ${playerToAddPoints}:`);
      console.log(`  Current Points: ${profileToUpdate.points.toLocaleString()}`);
      console.log(`  Current Tier: ${profileToUpdate.currentTier.toUpperCase()}`);

      const pointsToAdd = 5000;
      const updatedProfile = this.sportsSystem.addVIPPoints(playerToAddPoints, pointsToAdd);

      if (updatedProfile) {
        console.log(`  Points Added: ${pointsToAdd.toLocaleString()}`);
        console.log(`  New Points: ${updatedProfile.points.toLocaleString()}`);
        console.log(`  Tier Status: ${updatedProfile.status}`);
        console.log(`  Updated: ${updatedProfile.lastUpdated.toLocaleDateString()}`);
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
    console.log('\n💰 **Winning Calculations Demo**\n');

    // Show winning calculations for won bets
    const players = ['player1', 'player2', 'player3'];

    players.forEach(playerId => {
      const bettingHistory = this.sportsSystem.getPlayerBettingHistory(playerId);
      const wonBets = bettingHistory.filter(bet => bet.status === 'won');

      if (wonBets.length > 0) {
        console.log(`👤 **${playerId} Winning Calculations:**`);

        wonBets.forEach(bet => {
          console.log(`\n  Bet ${bet.id}:`);
          console.log(`    Stake: $${bet.stake.toLocaleString()}`);
          console.log(`    Odds: ${bet.odds.toFixed(2)}`);
          console.log(`    Potential Win: $${bet.potentialWin.toLocaleString()}`);
          console.log(`    Actual Win: $${bet.actualWin?.toLocaleString()}`);
          console.log(`    Risk Level: ${bet.riskLevel}`);
          console.log(`    VIP Tier: ${bet.vipTier}`);
        });
      }
    });

    // Demonstrate potential win calculation
    console.log('\n🔄 **Potential Win Calculation Demo:**');
    const stake = 100;
    const odds = 2.5;
    const vipTier = 'gold';
    const riskLevel = 'medium';

    console.log(`\nCalculating potential win for:`);
    console.log(`  Stake: $${stake.toLocaleString()}`);
    console.log(`  Odds: ${odds}`);
    console.log(`  VIP Tier: ${vipTier}`);
    console.log(`  Risk Level: ${riskLevel}`);

    const potentialWin = this.sportsSystem.calculatePotentialWin(
      stake,
      odds,
      vipTier as any,
      riskLevel as any
    );
    console.log(`  Potential Win: $${potentialWin.toLocaleString()}`);

    const baseWin = stake * odds;
    const vipProfile = this.sportsSystem.getVIPProfile('player1');
    const vipBonus = vipProfile ? vipProfile.benefits.rateDiscount * stake : 0;
    const riskAdjustment = riskLevel === 'medium' ? 0.95 : 1.0;

    console.log(`  Calculation Breakdown:`);
    console.log(`    Base Win: $${stake} × ${odds} = $${baseWin.toLocaleString()}`);
    console.log(
      `    VIP Bonus: ${vipProfile ? (vipProfile.benefits.rateDiscount * 100).toFixed(1) : 0}% = $${vipBonus.toFixed(2)}`
    );
    console.log(
      `    Risk Adjustment: ${riskAdjustment} = ${((riskAdjustment - 1) * 100).toFixed(0)}%`
    );
    console.log(`    Final Win: $${potentialWin.toLocaleString()}`);
  }

  /**
   * Run system statistics demo
   */
  async runSystemStatsDemo() {
    console.log('\n📈 **Sports Betting System Statistics Demo**\n');

    const stats = this.sportsSystem.getSystemStats();

    console.log('🏈 **Overall System Status:**');
    console.log(`  🏆 Total Events: ${stats.totalEvents}`);
    console.log(`  ✅ Active Events: ${stats.activeEvents}`);
    console.log(`  🎯 Total Bets: ${stats.totalBets}`);
    console.log(`  🎬 Active Bets: ${stats.activeBets}`);
    console.log(`  💎 Total Rates: ${stats.totalRates}`);
    console.log(`  ✅ Active Rates: ${stats.activeRates}`);
    console.log(`  👑 Total VIP Profiles: ${stats.totalVIPProfiles}`);
    console.log(`  ⚠️ Total Risk Assessments: ${stats.totalRiskAssessments}\n`);

    // Calculate additional metrics
    const eventUtilization = (stats.activeEvents / stats.totalEvents) * 100;
    const betUtilization = (stats.activeBets / stats.totalBets) * 100;
    const rateUtilization = (stats.activeRates / stats.totalRates) * 100;

    console.log('📊 **System Utilization:**');
    console.log(`  🏆 Event Utilization: ${eventUtilization.toFixed(1)}%`);
    console.log(`  🎯 Bet Utilization: ${betUtilization.toFixed(1)}%`);
    console.log(`  💎 Rate Utilization: ${rateUtilization.toFixed(1)}%`);

    // Show agent performance
    console.log('\n👤 **Agent Performance Demo:**');
    const agents = ['agent1', 'agent2', 'agent3'];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    agents.forEach(agentId => {
      const performance = this.sportsSystem.getAgentPerformance(agentId, currentPeriod);

      console.log(`\n${agentId}:`);
      console.log(`  🎯 Total Bets: ${performance.totalBets}`);
      console.log(`  💰 Total Stake: $${performance.totalStake.toLocaleString()}`);
      console.log(`  🏆 Total Wins: $${performance.totalWins.toLocaleString()}`);
      console.log(`  📊 Win Rate: ${performance.winRate.toFixed(1)}%`);
      console.log(`  📈 Average Odds: ${performance.averageOdds.toFixed(2)}`);

      console.log(`  Risk Distribution:`);
      Object.entries(performance.riskDistribution).forEach(([risk, count]) => {
        if (count > 0) {
          console.log(`    ${risk}: ${count}`);
        }
      });

      console.log(`  VIP Distribution:`);
      Object.entries(performance.vipDistribution).forEach(([vip, count]) => {
        if (count > 0) {
          console.log(`    ${vip}: ${count}`);
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
