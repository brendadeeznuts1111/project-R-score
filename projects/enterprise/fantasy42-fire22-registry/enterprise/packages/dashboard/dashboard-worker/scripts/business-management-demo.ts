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
    console.log('👑 **VIP Management Demo**\n');

    // Show all VIP tiers
    const tiers = this.businessSystem.getAllVIPTiers();
    console.log('📊 **Available VIP Tiers:**');
    tiers.forEach(tier => {
      console.log(`\n${tier.name} (Level ${tier.level})`);
      console.log(`  💰 Min Balance: $${tier.minBalance.toLocaleString()}`);
      console.log(`  📊 Min Volume: $${tier.minVolume.toLocaleString()}`);
      console.log(`  🎯 Commission Rate: ${(tier.commissionRate * 100).toFixed(1)}%`);
      console.log(`  🚀 Bonus Multiplier: ${tier.bonusMultiplier}x`);
      console.log(`  ✨ Benefits: ${tier.benefits.join(', ')}`);
      console.log(`  🔥 Exclusive: ${tier.exclusiveFeatures.join(', ') || 'None'}`);
    });

    // Demonstrate VIP tier calculation
    console.log('\n🎯 **VIP Tier Calculation Examples:**');
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
      console.log(`\n${testCase.name}:`);
      console.log(`  💰 Balance: $${testCase.balance.toLocaleString()}`);
      console.log(`  📊 Volume: $${testCase.volume.toLocaleString()}`);
      console.log(`  👑 VIP Tier: ${tierName}`);
    });
  }

  /**
   * Run group management demo
   */
  async runGroupDemo() {
    console.log('\n👥 **Group Management Demo**\n');

    // Show existing groups
    const groups = Array.from(this.businessSystem['groups'].values());
    console.log('📋 **Existing Groups:**');
    groups.forEach(group => {
      console.log(`\n${group.name} (${group.type})`);
      console.log(`  👤 Members: ${group.members.length}/${group.settings.maxMembers}`);
      console.log(`  🔐 Admins: ${group.admins.join(', ')}`);
      console.log(`  ⚙️ Settings:`);
      console.log(`    • Allow Invites: ${group.settings.allowInvites ? 'Yes' : 'No'}`);
      console.log(`    • Require Approval: ${group.settings.requireApproval ? 'Yes' : 'No'}`);
      console.log(`    • Auto Archive: ${group.settings.autoArchive ? 'Yes' : 'No'}`);
      console.log(`    • Notifications: ${group.settings.notifications ? 'Yes' : 'No'}`);
    });

    // Demonstrate group operations
    console.log('\n🔄 **Group Operations Demo:**');

    // Create new group
    const newGroup = this.businessSystem.createGroup('Demo Group', 'agent', 'demo_admin');
    console.log(`\n✅ Created new group: ${newGroup.name}`);

    // Add members
    const members = ['user1', 'user2', 'user3'];
    members.forEach(member => {
      const added = this.businessSystem.addMemberToGroup(newGroup.id, member, 'demo_admin');
      console.log(`  ${added ? '✅' : '❌'} Added ${member} to group`);
    });

    // Show updated group
    const updatedGroup = this.businessSystem['groups'].get(newGroup.id);
    if (updatedGroup) {
      console.log(`\n📊 **Updated Group Status:**`);
      console.log(`  👤 Total Members: ${updatedGroup.members.length}`);
      console.log(`  📅 Last Activity: ${updatedGroup.lastActivity.toLocaleString()}`);
    }

    // Remove a member
    const removed = this.businessSystem.removeMemberFromGroup(newGroup.id, 'user2', 'demo_admin');
    console.log(`\n${removed ? '✅' : '❌'} Removed user2 from group`);

    // Show final group status
    const finalGroup = this.businessSystem['groups'].get(newGroup.id);
    if (finalGroup) {
      console.log(`\n📊 **Final Group Status:**`);
      console.log(`  👤 Total Members: ${finalGroup.members.length}`);
      console.log(`  📋 Members: ${finalGroup.members.join(', ')}`);
    }
  }

  /**
   * Run affiliate program demo
   */
  async runAffiliateDemo() {
    console.log('\n🤝 **Affiliate Program Demo**\n');

    const program = this.businessSystem['affiliatePrograms'].get('fire22-affiliate');
    if (!program) {
      console.log('❌ Affiliate program not found');
      return;
    }

    console.log(`📊 **${program.name}**\n`);

    // Show commission structure
    console.log('💰 **Commission Structure:**');
    console.log(`  Base Rate: ${(program.commissionStructure.baseRate * 100).toFixed(1)}%\n`);

    console.log('📈 **Volume Tiers:**');
    program.commissionStructure.volumeTiers.forEach(tier => {
      const maxVol = tier.maxVolume === Infinity ? '∞' : tier.maxVolume.toLocaleString();
      console.log(
        `  $${tier.minVolume.toLocaleString()} - $${maxVol}: ${(tier.commissionRate * 100).toFixed(1)}% (${tier.bonusMultiplier}x)`
      );
    });

    console.log('\n🚀 **Performance Bonuses:**');
    program.commissionStructure.performanceBonuses.forEach(bonus => {
      console.log(`  ${bonus.description}: +${(bonus.bonus * 100).toFixed(1)}%`);
    });

    console.log('\n⚠️ **Risk Adjustments:**');
    program.commissionStructure.riskAdjustments.forEach(risk => {
      console.log(
        `  ${risk.riskLevel.toUpperCase()}: ${(risk.adjustment * 100).toFixed(0)}% (${risk.description})`
      );
    });

    console.log('\n✅ **Compliance Multipliers:**');
    program.commissionStructure.complianceMultipliers.forEach(compliance => {
      console.log(
        `  ${compliance.score}%: ${(compliance.multiplier * 100).toFixed(0)}% (${compliance.description})`
      );
    });

    console.log('\n🎯 **Referral Rewards:**');
    program.referralRewards.forEach(reward => {
      console.log(
        `  Level ${reward.level}: ${(reward.commission * 100).toFixed(1)}% + ${(reward.bonus * 100).toFixed(1)}% bonus`
      );
      console.log(`    Requirements: ${reward.requirements.join(', ')}`);
    });

    console.log('\n🏆 **Performance Tiers:**');
    program.performanceTiers.forEach(tier => {
      console.log(
        `  ${tier.tier}: ${tier.minReferrals} referrals, $${tier.minVolume.toLocaleString()} volume`
      );
      console.log(`    Commission: ${(tier.commissionRate * 100).toFixed(1)}%`);
      console.log(`    Benefits: ${tier.exclusiveBenefits.join(', ')}`);
    });

    console.log('\n📅 **Payout Schedule:**');
    console.log(`  Frequency: ${program.payoutSchedule.frequency}`);
    console.log(`  Day of Month: ${program.payoutSchedule.dayOfMonth}`);
    console.log(`  Minimum Payout: $${program.payoutSchedule.minimumPayout}`);
    console.log(`  Processing Time: ${program.payoutSchedule.processingTime} days`);
  }

  /**
   * Run commission calculation demo
   */
  async runCommissionDemo() {
    console.log('\n💰 **Commission Calculation Demo**\n');

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
      console.log(`📊 **Test Case ${index + 1}: ${testCase.name}**\n`);

      try {
        const commission = this.businessSystem.calculateCommission(
          `agent_${index + 1}`,
          testCase.handle,
          testCase.volume,
          testCase.riskScore,
          testCase.complianceScore,
          testCase.performanceMetrics
        );

        console.log(`  📅 Period: ${commission.period}`);
        console.log(`  💰 Handle: $${commission.handle.toLocaleString()}`);
        console.log(`  📈 Volume: $${testCase.volume.toLocaleString()}`);
        console.log(`  ⚠️ Risk Score: ${(testCase.riskScore * 100).toFixed(0)}%`);
        console.log(`  ✅ Compliance: ${testCase.complianceScore}%`);
        console.log(`  👥 New Customers: ${testCase.performanceMetrics.newCustomers}\n`);

        console.log(`  **Commission Breakdown:**`);
        console.log(`    💵 Base Commission: $${commission.commission.toFixed(2)}`);
        console.log(`    🚀 Performance Bonuses: $${commission.bonuses.toFixed(2)}`);
        console.log(`    ⚖️ Risk Adjustments: $${commission.adjustments.toFixed(2)}`);
        console.log(`    💸 **Total Payout: $${commission.totalPayout.toFixed(2)}**\n`);

        console.log(`  **Status:** ${commission.status.toUpperCase()}`);
        console.log(`  📅 Calculated: ${commission.calculatedAt.toLocaleDateString()}\n`);
      } catch (error) {
        console.log(`  ❌ Error calculating commission: ${error}\n`);
      }
    });
  }

  /**
   * Run linking system demo
   */
  async runLinkingDemo() {
    console.log('\n🔗 **Linking System Demo**\n');

    const users = ['user1', 'user2', 'user3'];
    const linkTypes: Array<'referral' | 'affiliate' | 'vip'> = ['referral', 'affiliate', 'vip'];

    users.forEach(user => {
      console.log(`👤 **User: ${user}**\n`);

      linkTypes.forEach(linkType => {
        const link = this.businessSystem.createUserLink(user, linkType);
        console.log(`  🔗 ${linkType.charAt(0).toUpperCase() + linkType.slice(1)} Link:`);
        console.log(`    ${link}\n`);
      });

      // Validate a link
      const referralLink = this.businessSystem.createUserLink(user, 'referral');
      const linkId = referralLink.split('/').pop() || '';
      const validation = this.businessSystem.validateUserLink(linkId);

      if (validation) {
        console.log(`  ✅ Link Validation:`);
        console.log(`    Type: ${validation.type}`);
        console.log(`    User: ${validation.userId}`);
        console.log(`    Valid: ${validation.valid}\n`);
      }
    });
  }

  /**
   * Run system statistics demo
   */
  async runStatsDemo() {
    console.log('\n📊 **System Statistics Demo**\n');

    const stats = this.businessSystem.getSystemStats();

    console.log('📈 **Overall System Status:**');
    console.log(`  👑 VIP Tiers: ${stats.vipTiers}`);
    console.log(`  👥 Groups: ${stats.groups}`);
    console.log(`  👤 Total Group Members: ${stats.totalGroupMembers}`);
    console.log(`  🤝 Affiliate Programs: ${stats.affiliatePrograms}`);
    console.log(`  💰 Commission Records: ${stats.commissionRecords}`);
    console.log(`  💵 Total Commissions: $${stats.totalCommissions.toLocaleString()}\n`);

    // Show commission history for a sample agent
    console.log('📋 **Sample Commission History:**');
    const sampleAgent = 'agent_2';
    const commissionHistory = this.businessSystem.getAgentCommissionHistory(sampleAgent);

    if (commissionHistory.length > 0) {
      commissionHistory.forEach((record, index) => {
        console.log(`\n  **Record ${index + 1}:**`);
        console.log(`    📅 Period: ${record.period}`);
        console.log(`    💰 Handle: $${record.handle.toLocaleString()}`);
        console.log(`    💵 Commission: $${record.commission.toFixed(2)}`);
        console.log(`    🚀 Bonuses: $${record.bonuses.toFixed(2)}`);
        console.log(`    💸 Total: $${record.totalPayout.toFixed(2)}`);
        console.log(`    📊 Status: ${record.status.toUpperCase()}`);
      });
    } else {
      console.log(`  No commission history found for ${sampleAgent}`);
    }
  }

  /**
   * Run complete demo
   */
  async runCompleteDemo() {
    console.log('🚀 **Fire22 Business Management System Demo**\n');
    console.log('This demo showcases the complete business management capabilities:\n');

    await this.runVIPDemo();
    await this.runGroupDemo();
    await this.runAffiliateDemo();
    await this.runCommissionDemo();
    await this.runLinkingDemo();
    await this.runStatsDemo();

    console.log('🎉 **Demo Complete!**\n');
    console.log('✅ VIP Management: Tier system with benefits and requirements');
    console.log('✅ Group Management: Member management with settings and permissions');
    console.log('✅ Affiliate Program: Commission structure with bonuses and tiers');
    console.log('✅ Commission Calculation: Real-time calculation with risk adjustments');
    console.log('✅ Linking System: Referral link creation and validation');
    console.log('✅ System Statistics: Comprehensive overview and reporting\n');

    console.log('🚀 **Your Fire22 Business Management System is ready for production!**');
    console.log('💡 **Next Steps:**');
    console.log('  • Integrate with your database for real user data');
    console.log('  • Connect with payment processing systems');
    console.log('  • Implement automated commission payouts');
    console.log('  • Add advanced analytics and reporting');
    console.log('  • Create admin dashboard for management');
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
