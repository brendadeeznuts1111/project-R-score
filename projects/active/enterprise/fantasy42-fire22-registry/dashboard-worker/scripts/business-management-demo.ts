#!/usr/bin/env bun

/**
 * 🔥 Fire22 Business Management System Demo
 * Demonstrates VIP, Group, Affiliate, and Commission Management
 */

import {
  createBusinessManagementSystem,
  BusinessManagementSystem,
} from '../src/business-management';

class BusinessManagementDemo {
  private businessSystem: BusinessManagementSystem;

  constructor() {
    this.businessSystem = createBusinessManagementSystem();
  }

  /**
   * Run VIP management demo
   */
  async runVIPDemo() {
    console.info('👑 **VIP Management Demo**\n');

    // Show all VIP tiers
    const tiers = this.businessSystem.getAllVIPTiers();
    console.info('📊 **Available VIP Tiers:**');
    tiers.forEach(tier => {
      console.info(`\n${tier.name} (Level ${tier.level})`);
      console.info(`  💰 Min Balance: $${tier.minBalance.toLocaleString()}`);
      console.info(`  📊 Min Volume: $${tier.minVolume.toLocaleString()}`);
      console.info(`  🎯 Commission Rate: ${(tier.commissionRate * 100).toFixed(1)}%`);
      console.info(`  🚀 Bonus Multiplier: ${tier.bonusMultiplier}x`);
      console.info(`  ✨ Benefits: ${tier.benefits.join(', ')}`);
      console.info(`  🔥 Exclusive: ${tier.exclusiveFeatures.join(', ') || 'None'}`);
    });

    // Demonstrate VIP tier calculation
    console.info('\n🎯 **VIP Tier Calculation Examples:**');
    const testCases = [
      { balance: 500, volume: 2000, name: 'New User' },
      { balance: 2000, volume: 8000, name: 'Bronze Eligible' },
      { balance: 8000, volume: 30000, name: 'Silver Eligible' },
      { balance: 20000, volume: 120000, name: 'Gold Eligible' },
      { balance: 75000, volume: 600000, name: 'Platinum Eligible' },
    ];

    testCases.forEach(testCase => {
      const tier = this.businessSystem.getVIPTier(testCase.balance, testCase.volume);
      const tierName = tier ? tier.name : 'No Tier';
      console.info(`\n${testCase.name}:`);
      console.info(`  💰 Balance: $${testCase.balance.toLocaleString()}`);
      console.info(`  📊 Volume: $${testCase.volume.toLocaleString()}`);
      console.info(`  👑 VIP Tier: ${tierName}`);
    });
  }

  /**
   * Run group management demo
   */
  async runGroupDemo() {
    console.info('\n👥 **Group Management Demo**\n');

    // Show existing groups
    const groups = Array.from(this.businessSystem['groups'].values());
    console.info('📋 **Existing Groups:**');
    groups.forEach(group => {
      console.info(`\n${group.name} (${group.type})`);
      console.info(`  👤 Members: ${group.members.length}/${group.settings.maxMembers}`);
      console.info(`  🔐 Admins: ${group.admins.join(', ')}`);
      console.info(`  ⚙️ Settings:`);
      console.info(`    • Allow Invites: ${group.settings.allowInvites ? 'Yes' : 'No'}`);
      console.info(`    • Require Approval: ${group.settings.requireApproval ? 'Yes' : 'No'}`);
      console.info(`    • Auto Archive: ${group.settings.autoArchive ? 'Yes' : 'No'}`);
      console.info(`    • Notifications: ${group.settings.notifications ? 'Yes' : 'No'}`);
    });

    // Demonstrate group operations
    console.info('\n🔄 **Group Operations Demo:**');

    // Create new group
    const newGroup = this.businessSystem.createGroup('Demo Group', 'agent', 'demo_admin');
    console.info(`\n✅ Created new group: ${newGroup.name}`);

    // Add members
    const members = ['user1', 'user2', 'user3'];
    members.forEach(member => {
      const added = this.businessSystem.addMemberToGroup(newGroup.id, member, 'demo_admin');
      console.info(`  ${added ? '✅' : '❌'} Added ${member} to group`);
    });

    // Show updated group
    const updatedGroup = this.businessSystem['groups'].get(newGroup.id);
    if (updatedGroup) {
      console.info(`\n📊 **Updated Group Status:**`);
      console.info(`  👤 Total Members: ${updatedGroup.members.length}`);
      console.info(`  📅 Last Activity: ${updatedGroup.lastActivity.toLocaleString()}`);
    }

    // Remove a member
    const removed = this.businessSystem.removeMemberFromGroup(newGroup.id, 'user2', 'demo_admin');
    console.info(`\n${removed ? '✅' : '❌'} Removed user2 from group`);

    // Show final group status
    const finalGroup = this.businessSystem['groups'].get(newGroup.id);
    if (finalGroup) {
      console.info(`\n📊 **Final Group Status:**`);
      console.info(`  👤 Total Members: ${finalGroup.members.length}`);
      console.info(`  📋 Members: ${finalGroup.members.join(', ')}`);
    }
  }

  /**
   * Run affiliate program demo
   */
  async runAffiliateDemo() {
    console.info('\n🤝 **Affiliate Program Demo**\n');

    const program = this.businessSystem['affiliatePrograms'].get('fire22-affiliate');
    if (!program) {
      console.info('❌ Affiliate program not found');
      return;
    }

    console.info(`📊 **${program.name}**\n`);

    // Show commission structure
    console.info('💰 **Commission Structure:**');
    console.info(`  Base Rate: ${(program.commissionStructure.baseRate * 100).toFixed(1)}%\n`);

    console.info('📈 **Volume Tiers:**');
    program.commissionStructure.volumeTiers.forEach(tier => {
      const maxVol = tier.maxVolume === Infinity ? '∞' : tier.maxVolume.toLocaleString();
      console.info(
        `  $${tier.minVolume.toLocaleString()} - $${maxVol}: ${(tier.commissionRate * 100).toFixed(1)}% (${tier.bonusMultiplier}x)`
      );
    });

    console.info('\n🚀 **Performance Bonuses:**');
    program.commissionStructure.performanceBonuses.forEach(bonus => {
      console.info(`  ${bonus.description}: +${(bonus.bonus * 100).toFixed(1)}%`);
    });

    console.info('\n⚠️ **Risk Adjustments:**');
    program.commissionStructure.riskAdjustments.forEach(risk => {
      console.info(
        `  ${risk.riskLevel.toUpperCase()}: ${(risk.adjustment * 100).toFixed(0)}% (${risk.description})`
      );
    });

    console.info('\n✅ **Compliance Multipliers:**');
    program.commissionStructure.complianceMultipliers.forEach(compliance => {
      console.info(
        `  ${compliance.score}%: ${(compliance.multiplier * 100).toFixed(0)}% (${compliance.description})`
      );
    });

    console.info('\n🎯 **Referral Rewards:**');
    program.referralRewards.forEach(reward => {
      console.info(
        `  Level ${reward.level}: ${(reward.commission * 100).toFixed(1)}% + ${(reward.bonus * 100).toFixed(1)}% bonus`
      );
      console.info(`    Requirements: ${reward.requirements.join(', ')}`);
    });

    console.info('\n🏆 **Performance Tiers:**');
    program.performanceTiers.forEach(tier => {
      console.info(
        `  ${tier.tier}: ${tier.minReferrals} referrals, $${tier.minVolume.toLocaleString()} volume`
      );
      console.info(`    Commission: ${(tier.commissionRate * 100).toFixed(1)}%`);
      console.info(`    Benefits: ${tier.exclusiveBenefits.join(', ')}`);
    });

    console.info('\n📅 **Payout Schedule:**');
    console.info(`  Frequency: ${program.payoutSchedule.frequency}`);
    console.info(`  Day of Month: ${program.payoutSchedule.dayOfMonth}`);
    console.info(`  Minimum Payout: $${program.payoutSchedule.minimumPayout}`);
    console.info(`  Processing Time: ${program.payoutSchedule.processingTime} days`);
  }

  /**
   * Run commission calculation demo
   */
  async runCommissionDemo() {
    console.info('\n💰 **Commission Calculation Demo**\n');

    // Test cases with different scenarios
    const testCases = [
      {
        name: 'New Agent (Low Volume)',
        handle: 15000,
        volume: 8000,
        riskScore: 0.75,
        complianceScore: 85,
        performanceMetrics: { newCustomers: 3 },
      },
      {
        name: 'Established Agent (Medium Volume)',
        handle: 50000,
        volume: 150000,
        riskScore: 0.92,
        complianceScore: 98,
        performanceMetrics: { newCustomers: 15 },
      },
      {
        name: 'Top Agent (High Volume)',
        handle: 200000,
        volume: 800000,
        riskScore: 0.98,
        complianceScore: 100,
        performanceMetrics: { newCustomers: 45 },
      },
      {
        name: 'Risk Agent (High Risk)',
        handle: 75000,
        volume: 200000,
        riskScore: 0.65,
        complianceScore: 70,
        performanceMetrics: { newCustomers: 8 },
      },
    ];

    testCases.forEach((testCase, index) => {
      console.info(`📊 **Test Case ${index + 1}: ${testCase.name}**\n`);

      try {
        const commission = this.businessSystem.calculateCommission(
          `agent_${index + 1}`,
          testCase.handle,
          testCase.volume,
          testCase.riskScore,
          testCase.complianceScore,
          testCase.performanceMetrics
        );

        console.info(`  📅 Period: ${commission.period}`);
        console.info(`  💰 Handle: $${commission.handle.toLocaleString()}`);
        console.info(`  📈 Volume: $${testCase.volume.toLocaleString()}`);
        console.info(`  ⚠️ Risk Score: ${(testCase.riskScore * 100).toFixed(0)}%`);
        console.info(`  ✅ Compliance: ${testCase.complianceScore}%`);
        console.info(`  👥 New Customers: ${testCase.performanceMetrics.newCustomers}\n`);

        console.info(`  **Commission Breakdown:**`);
        console.info(`    💵 Base Commission: $${commission.commission.toFixed(2)}`);
        console.info(`    🚀 Performance Bonuses: $${commission.bonuses.toFixed(2)}`);
        console.info(`    ⚖️ Risk Adjustments: $${commission.adjustments.toFixed(2)}`);
        console.info(`    💸 **Total Payout: $${commission.totalPayout.toFixed(2)}**\n`);

        console.info(`  **Status:** ${commission.status.toUpperCase()}`);
        console.info(`  📅 Calculated: ${commission.calculatedAt.toLocaleDateString()}\n`);
      } catch (error) {
        console.info(`  ❌ Error calculating commission: ${error}\n`);
      }
    });
  }

  /**
   * Run linking system demo
   */
  async runLinkingDemo() {
    console.info('\n🔗 **Linking System Demo**\n');

    const users = ['user1', 'user2', 'user3'];
    const linkTypes: Array<'referral' | 'affiliate' | 'vip'> = ['referral', 'affiliate', 'vip'];

    users.forEach(user => {
      console.info(`👤 **User: ${user}**\n`);

      linkTypes.forEach(linkType => {
        const link = this.businessSystem.createUserLink(user, linkType);
        console.info(`  🔗 ${linkType.charAt(0).toUpperCase() + linkType.slice(1)} Link:`);
        console.info(`    ${link}\n`);
      });

      // Validate a link
      const referralLink = this.businessSystem.createUserLink(user, 'referral');
      const linkId = referralLink.split('/').pop() || '';
      const validation = this.businessSystem.validateUserLink(linkId);

      if (validation) {
        console.info(`  ✅ Link Validation:`);
        console.info(`    Type: ${validation.type}`);
        console.info(`    User: ${validation.userId}`);
        console.info(`    Valid: ${validation.valid}\n`);
      }
    });
  }

  /**
   * Run system statistics demo
   */
  async runStatsDemo() {
    console.info('\n📊 **System Statistics Demo**\n');

    const stats = this.businessSystem.getSystemStats();

    console.info('📈 **Overall System Status:**');
    console.info(`  👑 VIP Tiers: ${stats.vipTiers}`);
    console.info(`  👥 Groups: ${stats.groups}`);
    console.info(`  👤 Total Group Members: ${stats.totalGroupMembers}`);
    console.info(`  🤝 Affiliate Programs: ${stats.affiliatePrograms}`);
    console.info(`  💰 Commission Records: ${stats.commissionRecords}`);
    console.info(`  💵 Total Commissions: $${stats.totalCommissions.toLocaleString()}\n`);

    // Show commission history for a sample agent
    console.info('📋 **Sample Commission History:**');
    const sampleAgent = 'agent_2';
    const commissionHistory = this.businessSystem.getAgentCommissionHistory(sampleAgent);

    if (commissionHistory.length > 0) {
      commissionHistory.forEach((record, index) => {
        console.info(`\n  **Record ${index + 1}:**`);
        console.info(`    📅 Period: ${record.period}`);
        console.info(`    💰 Handle: $${record.handle.toLocaleString()}`);
        console.info(`    💵 Commission: $${record.commission.toFixed(2)}`);
        console.info(`    🚀 Bonuses: $${record.bonuses.toFixed(2)}`);
        console.info(`    💸 Total: $${record.totalPayout.toFixed(2)}`);
        console.info(`    📊 Status: ${record.status.toUpperCase()}`);
      });
    } else {
      console.info(`  No commission history found for ${sampleAgent}`);
    }
  }

  /**
   * Run complete demo
   */
  async runCompleteDemo() {
    console.info('🚀 **Fire22 Business Management System Demo**\n');
    console.info('This demo showcases the complete business management capabilities:\n');

    await this.runVIPDemo();
    await this.runGroupDemo();
    await this.runAffiliateDemo();
    await this.runCommissionDemo();
    await this.runLinkingDemo();
    await this.runStatsDemo();

    console.info('🎉 **Demo Complete!**\n');
    console.info('✅ VIP Management: Tier system with benefits and requirements');
    console.info('✅ Group Management: Member management with settings and permissions');
    console.info('✅ Affiliate Program: Commission structure with bonuses and tiers');
    console.info('✅ Commission Calculation: Real-time calculation with risk adjustments');
    console.info('✅ Linking System: Referral link creation and validation');
    console.info('✅ System Statistics: Comprehensive overview and reporting\n');

    console.info('🚀 **Your Fire22 Business Management System is ready for production!**');
    console.info('💡 **Next Steps:**');
    console.info('  • Integrate with your database for real user data');
    console.info('  • Connect with payment processing systems');
    console.info('  • Implement automated commission payouts');
    console.info('  • Add advanced analytics and reporting');
    console.info('  • Create admin dashboard for management');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const demo = new BusinessManagementDemo();

  try {
    switch (command) {
      case 'vip':
        await demo.runVIPDemo();
        break;

      case 'groups':
        await demo.runGroupDemo();
        break;

      case 'affiliate':
        await demo.runAffiliateDemo();
        break;

      case 'commission':
        await demo.runCommissionDemo();
        break;

      case 'linking':
        await demo.runLinkingDemo();
        break;

      case 'stats':
        await demo.runStatsDemo();
        break;

      case 'demo':
      default:
        await demo.runCompleteDemo();
        break;
    }
  } catch (error) {
    console.error('❌ Demo error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
