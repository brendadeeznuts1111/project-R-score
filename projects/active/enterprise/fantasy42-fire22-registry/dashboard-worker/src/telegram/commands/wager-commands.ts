/**
 * Wager Commands Module
 * Handles betting-related commands and wager management
 */

import type { CommandContext, CommandResult, TelegramCommand } from '../core/telegram-types';

export class WagerCommands {
  private commands: TelegramCommand[] = [
    {
      name: 'wagers',
      description: 'View your recent wagers',
      usage: '/wagers [limit]',
      requiresAuth: true,
      examples: ['/wagers', '/wagers 10'],
    },
    {
      name: 'vip',
      description: 'Access VIP features and benefits',
      usage: '/vip',
      requiresAuth: true,
      examples: ['/vip'],
    },
    {
      name: 'groups',
      description: 'Join betting groups and communities',
      usage: '/groups',
      requiresAuth: true,
      examples: ['/groups'],
    },
    {
      name: 'affiliate',
      description: 'Access affiliate program',
      usage: '/affiliate',
      requiresAuth: true,
      examples: ['/affiliate'],
    },
    {
      name: 'commission',
      description: 'View commission earnings',
      usage: '/commission',
      requiresAuth: true,
      examples: ['/commission'],
    },
  ];

  /**
   * Get all wager commands
   */
  getCommands(): TelegramCommand[] {
    return this.commands;
  }

  /**
   * Handle /wagers command
   */
  async handleWagers(context: CommandContext): Promise<CommandResult> {
    try {
      if (!context.isAuthenticated) {
        return {
          success: false,
          error: 'Please register your account first using /register',
        };
      }

      const limit = Math.min(parseInt(context.args[0] || '5'), 20);
      const wagers = await this.getUserWagers(context.user.id, limit);

      if (wagers.length === 0) {
        return {
          success: true,
          response:
            '📭 No recent wagers found. Ready to place your first bet?\n\nUse /casino for casino games or check live sports odds!',
        };
      }

      const wagersList = wagers
        .map((wager, index) => {
          const statusEmoji =
            {
              won: '✅',
              lost: '❌',
              pending: '⏳',
              cancelled: '🚫',
            }[wager.status] || '❓';

          const profit =
            wager.status === 'won'
              ? `+$${wager.profit.toFixed(2)}`
              : wager.status === 'lost'
                ? `-$${wager.amount.toFixed(2)}`
                : 'Pending';

          return (
            `${index + 1}. ${statusEmoji} ${wager.event}\n` +
            `   💰 $${wager.amount.toFixed(2)} → ${profit}\n` +
            `   📅 ${new Date(wager.date).toLocaleDateString()}\n`
          );
        })
        .join('\n');

      const totalAmount = wagers.reduce((sum, w) => sum + w.amount, 0);
      const wonAmount = wagers
        .filter(w => w.status === 'won')
        .reduce((sum, w) => sum + w.profit, 0);

      const summaryMessage = `
🎯 Your Recent Wagers

${wagersList}

📊 Summary (Last ${wagers.length} wagers):
• Total Wagered: $${totalAmount.toFixed(2)}
• Total Won: $${wonAmount.toFixed(2)}
• Net Result: $${(wonAmount - totalAmount).toFixed(2)}
• Win Rate: ${((wagers.filter(w => w.status === 'won').length / wagers.length) * 100).toFixed(1)}%

💡 Pro Tips:
• View more wagers with: /wagers 10
• Check your balance: /balance
• Try casino games: /casino
      `.trim();

      return {
        success: true,
        response: summaryMessage,
      };
    } catch (error) {
      console.error('Error handling wagers command:', error);
      return {
        success: false,
        error: 'Failed to retrieve wager information',
      };
    }
  }

  /**
   * Handle /vip command
   */
  async handleVIP(context: CommandContext): Promise<CommandResult> {
    try {
      if (!context.isAuthenticated) {
        return {
          success: false,
          error: 'Please register your account first using /register',
        };
      }

      const vipInfo = await this.getVIPInfo(context.user.id);

      if (!vipInfo.isVIP) {
        const nonVipMessage = `
🌟 Fire22 VIP Program

You're not currently a VIP member, but you can join our exclusive program!

🎁 VIP Benefits:
• Higher bet limits (up to $10,000)
• Exclusive odds on premium events
• Priority customer support
• Monthly bonus rewards
• Private betting groups
• Early access to new features

📈 How to Become VIP:
• Place 50+ wagers with positive ROI
• Maintain $1,000+ average balance
• Win rate above 55%
• Or deposit $5,000+ in a month

💰 Current Progress:
• Wagers Placed: ${vipInfo.stats.wagersPlaced}/50
• Average Balance: $${vipInfo.stats.avgBalance.toLocaleString()}
• Win Rate: ${(vipInfo.stats.winRate * 100).toFixed(1)}%
• Monthly Deposits: $${vipInfo.stats.monthlyDeposits.toLocaleString()}

🚀 Ready to level up? Keep betting and you'll unlock VIP status automatically!

Questions? Contact our VIP concierge team.
        `.trim();

        return {
          success: true,
          response: nonVipMessage,
        };
      }

      // VIP member message
      const vipMessage = `
👑 VIP Member Dashboard

Welcome back, ${context.user.first_name || 'VIP Member'}!

🎖️ Your VIP Status: ${vipInfo.tier.toUpperCase()} Tier

📊 This Month's VIP Benefits:
• Exclusive Odds: ${vipInfo.exclusiveOddsCount} events
• Bonus Earnings: $${vipInfo.monthlyBonus.toFixed(2)}
• Priority Support: ✅ Active
• Bet Limits: Up to $${vipInfo.maxBetLimit.toLocaleString()}

🏆 VIP Achievements:
${vipInfo.achievements.map(a => `• ${a}`).join('\n')}

🎁 Available Promotions:
${vipInfo.promotions.map(p => `• ${p}`).join('\n')}

💬 Need assistance?
Contact your personal VIP concierge or use our 24/7 priority support line.

🎯 Keep dominating the books! 💪
      `.trim();

      return {
        success: true,
        response: vipMessage,
      };
    } catch (error) {
      console.error('Error handling VIP command:', error);
      return {
        success: false,
        error: 'Failed to retrieve VIP information',
      };
    }
  }

  /**
   * Handle /groups command
   */
  async handleGroups(context: CommandContext): Promise<CommandResult> {
    try {
      if (!context.isAuthenticated) {
        return {
          success: false,
          error: 'Please register your account first using /register',
        };
      }

      const groups = await this.getAvailableGroups(context.user.id);

      const groupsMessage = `
👥 Betting Groups & Communities

Join exclusive betting communities and connect with fellow bettors!

${groups
  .map(
    (group, index) => `
${index + 1}. ${group.emoji} ${group.name}
   ${group.description}
   👥 ${group.members} members
   📊 Win Rate: ${(group.avgWinRate * 100).toFixed(1)}%
   ${group.isJoined ? '✅ Joined' : `🔗 /join_group_${group.id}`}
`
  )
  .join('\n')}

🎯 Popular Groups:
• NFL Sunday Squad - Weekly NFL discussions
• NBA Night Owls - Late-night basketball bets
• Soccer Syndicate - International football
• Casino Kings - Table games enthusiasts
• VIP Elite - Exclusive high-roller group

💡 Group Benefits:
• Share betting strategies
• Get real-time game updates
• Access group-exclusive tips
• Network with experienced bettors
• Participate in group challenges

🚀 Ready to join? Use the links above or ask an admin to add you to groups!
      `.trim();

      return {
        success: true,
        response: groupsMessage,
      };
    } catch (error) {
      console.error('Error handling groups command:', error);
      return {
        success: false,
        error: 'Failed to retrieve groups information',
      };
    }
  }

  /**
   * Handle /affiliate command
   */
  async handleAffiliate(context: CommandContext): Promise<CommandResult> {
    try {
      if (!context.isAuthenticated) {
        return {
          success: false,
          error: 'Please register your account first using /register',
        };
      }

      const affiliateInfo = await this.getAffiliateInfo(context.user.id);

      const affiliateMessage = `
🤝 Fire22 Affiliate Program

Earn commission by referring friends and fellow bettors!

${
  affiliateInfo.isActive
    ? `
🎉 You're an active affiliate!

📊 Your Stats:
• Referral Code: ${affiliateInfo.referralCode}
• Total Referrals: ${affiliateInfo.totalReferrals}
• Active Referrals: ${affiliateInfo.activeReferrals}
• Commission Earned: $${affiliateInfo.totalCommission.toFixed(2)}
• This Month: $${affiliateInfo.monthlyCommission.toFixed(2)}

🏆 Commission Tiers:
• Bronze (0-5 referrals): 15% commission
• Silver (6-20 referrals): 20% commission
• Gold (21-50 referrals): 25% commission
• Platinum (51+ referrals): 30% commission

🎁 Current Tier: ${affiliateInfo.tier} (${affiliateInfo.commissionRate * 100}% commission)

📈 Recent Activity:
${affiliateInfo.recentActivity.map(activity => `• ${activity}`).join('\n')}
`
    : `
🚀 Join Our Affiliate Program!

Earn money by bringing friends to Fire22!

💰 Commission Rates:
• 15-30% on all referred bets
• Monthly bonuses for active referrers
• Performance-based tier upgrades

🎁 Getting Started:
1. Activate your affiliate account
2. Get your unique referral link/code
3. Share with friends and earn commission
4. Track earnings in real-time

📞 Ready to start earning?
Contact our affiliate team or use /register to get started!
`
}

🔗 Your Referral Link: https://fire22.com/ref/${affiliateInfo.referralCode || 'YOUR_CODE'}

📞 Need help? Our affiliate support team is here 24/7!
      `.trim();

      return {
        success: true,
        response: affiliateMessage,
      };
    } catch (error) {
      console.error('Error handling affiliate command:', error);
      return {
        success: false,
        error: 'Failed to retrieve affiliate information',
      };
    }
  }

  /**
   * Handle /commission command
   */
  async handleCommission(context: CommandContext): Promise<CommandResult> {
    try {
      if (!context.isAuthenticated) {
        return {
          success: false,
          error: 'Please register your account first using /register',
        };
      }

      const commissions = await this.getCommissionHistory(context.user.id, 10);

      if (commissions.length === 0) {
        return {
          success: true,
          response:
            '📊 Commission History\n\nNo commission earnings yet. Start referring friends to earn!\n\nUse /affiliate to learn more about our affiliate program.',
        };
      }

      const commissionList = commissions
        .map(
          (comm, index) =>
            `${index + 1}. 💰 $${comm.amount.toFixed(2)} - ${comm.description}\n   📅 ${new Date(comm.date).toLocaleDateString()}`
        )
        .join('\n');

      const totalCommission = commissions.reduce((sum, comm) => sum + comm.amount, 0);
      const thisMonth = commissions
        .filter(comm => new Date(comm.date).getMonth() === new Date().getMonth())
        .reduce((sum, comm) => sum + comm.amount, 0);

      const commissionMessage = `
💰 Commission Earnings

📊 Summary:
• Total Earned: $${totalCommission.toFixed(2)}
• This Month: $${thisMonth.toFixed(2)}
• Average per Referral: $${(totalCommission / Math.max(commissions.length, 1)).toFixed(2)}

📋 Recent Earnings:
${commissionList}

🎯 Commission Sources:
• Direct Referrals: Friend brings friend
• Sub-affiliates: Your referrals recruit others
• Performance Bonuses: High-performing referrers
• Seasonal Promotions: Holiday and event bonuses

💡 Maximize Earnings:
• Share on social media
• Join affiliate communities
• Participate in referral contests
• Help your referrals succeed

🔄 Next Payout: ${this.getNextPayoutDate()}

Questions? Contact affiliate support!
      `.trim();

      return {
        success: true,
        response: commissionMessage,
      };
    } catch (error) {
      console.error('Error handling commission command:', error);
      return {
        success: false,
        error: 'Failed to retrieve commission information',
      };
    }
  }

  // Private helper methods

  private async getUserWagers(
    userId: number,
    limit: number
  ): Promise<
    Array<{
      id: string;
      event: string;
      amount: number;
      profit: number;
      status: string;
      date: string;
    }>
  > {
    // Simulate wager history
    return [
      {
        id: 'WAG001',
        event: 'Chiefs vs Bills',
        amount: 100,
        profit: 167,
        status: 'won',
        date: '2024-01-25T13:30:00Z',
      },
      {
        id: 'WAG002',
        event: 'Lakers vs Warriors',
        amount: 50,
        profit: -50,
        status: 'lost',
        date: '2024-01-24T20:00:00Z',
      },
      {
        id: 'WAG003',
        event: 'Raiders vs Chargers',
        amount: 75,
        profit: 0,
        status: 'pending',
        date: '2024-01-26T16:25:00Z',
      },
    ].slice(0, limit);
  }

  private async getVIPInfo(userId: number): Promise<{
    isVIP: boolean;
    tier?: string;
    exclusiveOddsCount: number;
    monthlyBonus: number;
    maxBetLimit: number;
    achievements: string[];
    promotions: string[];
    stats: {
      wagersPlaced: number;
      avgBalance: number;
      winRate: number;
      monthlyDeposits: number;
    };
  }> {
    // Simulate VIP info
    const isVIP = Math.random() > 0.7;

    return {
      isVIP,
      tier: isVIP
        ? ['bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 4)]
        : undefined,
      exclusiveOddsCount: isVIP ? Math.floor(Math.random() * 20) + 5 : 0,
      monthlyBonus: isVIP ? Math.random() * 500 + 100 : 0,
      maxBetLimit: isVIP ? 10000 : 1000,
      achievements: isVIP
        ? ['First Win Streak', 'High Roller Status', 'Consistent Profit', 'Sports Expert']
        : [],
      promotions: isVIP
        ? ['VIP Weekend Bonus', 'Exclusive Tournament Access', 'Priority Support Line']
        : [],
      stats: {
        wagersPlaced: Math.floor(Math.random() * 200) + 20,
        avgBalance: Math.random() * 5000 + 1000,
        winRate: Math.random() * 0.3 + 0.5,
        monthlyDeposits: Math.random() * 10000 + 1000,
      },
    };
  }

  private async getAvailableGroups(userId: number): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      emoji: string;
      members: number;
      avgWinRate: number;
      isJoined: boolean;
    }>
  > {
    // Simulate available groups
    return [
      {
        id: 'nfl_sunday',
        name: 'NFL Sunday Squad',
        description: 'Weekly NFL discussions and picks',
        emoji: '🏈',
        members: 1247,
        avgWinRate: 0.58,
        isJoined: Math.random() > 0.5,
      },
      {
        id: 'nba_nights',
        name: 'NBA Night Owls',
        description: 'Late-night basketball betting',
        emoji: '🏀',
        members: 892,
        avgWinRate: 0.62,
        isJoined: Math.random() > 0.5,
      },
      {
        id: 'soccer_syndicate',
        name: 'Soccer Syndicate',
        description: 'International football betting',
        emoji: '⚽',
        members: 2156,
        avgWinRate: 0.55,
        isJoined: Math.random() > 0.5,
      },
    ];
  }

  private async getAffiliateInfo(userId: number): Promise<{
    isActive: boolean;
    referralCode: string;
    totalReferrals: number;
    activeReferrals: number;
    totalCommission: number;
    monthlyCommission: number;
    tier: string;
    commissionRate: number;
    recentActivity: string[];
  }> {
    // Simulate affiliate info
    const isActive = Math.random() > 0.3;

    return {
      isActive,
      referralCode: `FIRE22_${userId}`,
      totalReferrals: isActive ? Math.floor(Math.random() * 50) + 5 : 0,
      activeReferrals: isActive ? Math.floor(Math.random() * 30) + 2 : 0,
      totalCommission: isActive ? Math.random() * 2500 + 500 : 0,
      monthlyCommission: isActive ? Math.random() * 300 + 50 : 0,
      tier: isActive
        ? ['Bronze', 'Silver', 'Gold', 'Platinum'][Math.floor(Math.random() * 4)]
        : 'Inactive',
      commissionRate: isActive ? [0.15, 0.2, 0.25, 0.3][Math.floor(Math.random() * 4)] : 0,
      recentActivity: isActive
        ? [
            'Referral bonus: $25.00',
            'New signup: john_doe',
            'Commission payout: $150.00',
            'Tier upgrade bonus: $50.00',
          ]
        : [],
    };
  }

  private async getCommissionHistory(
    userId: number,
    limit: number
  ): Promise<
    Array<{
      amount: number;
      description: string;
      date: string;
    }>
  > {
    // Simulate commission history
    return [
      { amount: 25.5, description: 'Referral bonus - New signup', date: '2024-01-25T10:30:00Z' },
      { amount: 15.75, description: 'Commission - Sports bet', date: '2024-01-24T14:20:00Z' },
      { amount: 42.0, description: 'Tier upgrade bonus', date: '2024-01-20T09:15:00Z' },
      { amount: 8.25, description: 'Commission - Casino bet', date: '2024-01-18T16:45:00Z' },
    ].slice(0, limit);
  }

  private getNextPayoutDate(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString();
  }
}
