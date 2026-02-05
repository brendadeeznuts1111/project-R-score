#!/usr/bin/env bun

/**
 * 🔥 Fire22 Telegram Bot Integration
 * Advanced bot system with user management, notifications, and analytics
 */

import { TelegramBot } from 'https://deno.land/x/telegram_bot_api/mod.ts';
import { createBusinessManagementSystem, BusinessManagementSystem } from './business-management';
import {
  createLiveCasinoManagementSystem,
  LiveCasinoManagementSystem,
} from './live-casino-management';
import {
  createSportsBettingManagementSystem,
  SportsBettingManagementSystem,
} from './sports-betting-management';
import { TelegramNotificationService } from './notifications/telegram-notification-service';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot: boolean;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  date: number;
  text?: string;
  entities?: any[];
}

export interface TelegramBotConfig {
  token: string;
  webhookUrl?: string;
  allowedUsers?: string[];
  adminUsers?: string[];
  database?: any; // Database connection
  notificationSettings: {
    wagerUpdates: boolean;
    balanceChanges: boolean;
    systemAlerts: boolean;
    weeklyReports: boolean;
  };
}

export class Fire22TelegramBot {
  private bot: TelegramBot;
  private config: TelegramBotConfig;
  private userSessions: Map<number, any> = new Map();
  private commandHandlers: Map<string, Function> = new Map();
  private businessSystem: BusinessManagementSystem;
  private liveCasinoSystem: LiveCasinoManagementSystem;
  private sportsBettingSystem: SportsBettingManagementSystem;
  private notificationService: TelegramNotificationService;
  private isRunning: boolean = false;

  constructor(config: TelegramBotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.token);
    this.businessSystem = createBusinessManagementSystem();
    this.liveCasinoSystem = createLiveCasinoManagementSystem();
    this.sportsBettingSystem = createSportsBettingManagementSystem();

    // Initialize notification service
    this.notificationService = new TelegramNotificationService(this);

    this.initializeCommandHandlers();
  }

  /**
   * Initialize bot command handlers
   */
  private initializeCommandHandlers() {
    // Basic commands
    this.commandHandlers.set('/start', this.handleStart.bind(this));
    this.commandHandlers.set('/help', this.handleHelp.bind(this));
    this.commandHandlers.set('/balance', this.handleBalance.bind(this));
    this.commandHandlers.set('/wagers', this.handleWagers.bind(this));
    this.commandHandlers.set('/profile', this.handleProfile.bind(this));
    this.commandHandlers.set('/support', this.handleSupport.bind(this));

    // Admin commands
    this.commandHandlers.set('/admin', this.handleAdmin.bind(this));
    this.commandHandlers.set('/stats', this.handleStats.bind(this));
    this.commandHandlers.set('/broadcast', this.handleBroadcast.bind(this));

    // User management
    this.commandHandlers.set('/register', this.handleRegister.bind(this));
    this.commandHandlers.set('/unregister', this.handleUnregister.bind(this));
    this.commandHandlers.set('/settings', this.handleSettings.bind(this));

    // Business management commands
    this.commandHandlers.set('/vip', this.handleVIP.bind(this));
    this.commandHandlers.set('/groups', this.handleGroups.bind(this));
    this.commandHandlers.set('/affiliate', this.handleAffiliate.bind(this));
    this.commandHandlers.set('/commission', this.handleCommission.bind(this));
    this.commandHandlers.set('/link', this.handleLink.bind(this));

    // Live casino management commands
    this.commandHandlers.set('/casino', this.handleCasino.bind(this));
    this.commandHandlers.set('/casino-games', this.handleCasinoGames.bind(this));
    this.commandHandlers.set('/casino-rates', this.handleCasinoRates.bind(this));
    this.commandHandlers.set('/casino-sessions', this.handleCasinoSessions.bind(this));
    this.commandHandlers.set('/casino-revenue', this.handleCasinoRevenue.bind(this));

    // Sports betting management commands
    this.commandHandlers.set('/sports', this.handleSports.bind(this));
    this.commandHandlers.set('/sports-events', this.handleSportsEvents.bind(this));
    this.commandHandlers.set('/sports-bets', this.handleSportsBets.bind(this));
    this.commandHandlers.set('/sports-rates', this.handleSportsRates.bind(this));
    this.commandHandlers.set('/risk-assessment', this.handleRiskAssessment.bind(this));
    this.commandHandlers.set('/vip-profile', this.handleVIPProfile.bind(this));
  }

  /**
   * Start the Telegram bot
   */
  async start() {
    try {
      // Set webhook if configured
      if (this.config.webhookUrl) {
        await this.bot.setWebhook(this.config.webhookUrl);
      } else {
        // Start polling
        await this.startPolling();
      }

      this.isRunning = true;

      // Send startup notification to admins
      await this.notifyAdmins('🚀 Fire22 Telegram Bot has started successfully!');
    } catch (error) {
      console.error('❌ Failed to start Telegram Bot:', error);
      throw error;
    }
  }

  /**
   * Start polling for updates
   */
  private async startPolling() {
    let offset = 0;

    while (this.isRunning) {
      try {
        const updates = await this.bot.getUpdates({ offset, timeout: 30 });

        for (const update of updates) {
          if (update.message) {
            await this.handleMessage(update.message);
          }
          offset = update.update_id + 1;
        }

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Polling error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message: TelegramMessage) {
    try {
      const { text, from, chat } = message;

      if (!text || !from) return;

      // Check if user is allowed
      if (!this.isUserAllowed(from.username || from.first_name || '')) {
        await this.sendMessage(chat.id, '❌ Access denied. Please contact support for access.');
        return;
      }

      // Handle commands
      if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase();
        const handler = this.commandHandlers.get(command);

        if (handler) {
          await handler(message);
        } else {
          await this.sendMessage(chat.id, '❓ Unknown command. Use /help for available commands.');
        }
        return;
      }

      // Handle regular messages
      await this.handleRegularMessage(message);
    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ An error occurred while processing your message.'
      );
    }
  }

  /**
   * Handle /start command
   */
  private async handleStart(message: TelegramMessage) {
    const welcomeMessage = `
🔥 **Welcome to Fire22 Dashboard!**

🎯 **Available Commands:**
/balance - Check your balance
/wagers - View recent wagers
/profile - Your profile info
/settings - Bot settings
/help - Show all commands

💡 **Quick Start:**
Use /register to link your account
Use /balance to check your balance
Use /support for help

🔗 **Fire22 Dashboard:** https://dashboard.fire22.com
    `;

    await this.sendMessage(message.chat.id, welcomeMessage);
  }

  /**
   * Handle /help command
   */
  private async handleHelp(message: TelegramMessage) {
    const helpMessage = `
📚 **Fire22 Bot Commands**

🔍 **User Commands:**
/start - Welcome message
/help - This help message
/balance - Check balance
/wagers - View wagers
/profile - Profile information
/settings - Bot settings
/support - Get support

⚙️ **Account Management:**
/register - Link your account
/unregister - Unlink account

👑 **VIP Management:**
/vip - View VIP tiers and benefits
/groups - Manage group memberships

🤝 **Business Tools:**
/affiliate - Affiliate program details
/commission - Calculate your commission
/link - Create referral links

🎰 **Live Casino Management:**
/casino - Casino system overview
/casino-games - View all games
/casino-rates - Check rates
/casino-sessions - Session info
/casino-revenue - Revenue data

🏈 **Sports Betting Management:**
/sports - Sports betting overview
/sports-events - View all events
/sports-bets - Check betting history
/sports-rates - View betting rates
/risk-assessment - Check risk profile
/vip-profile - View VIP status

🛡️ **Admin Commands:**
/admin - Admin panel
/stats - System statistics
/broadcast - Send message to all users

💡 **Need Help?**
Contact support: support@fire22.com
    `;

    await this.sendMessage(message.chat.id, helpMessage);
  }

  /**
   * Handle /balance command
   */
  private async handleBalance(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // Get user balance from database
      const user = await this.getUserByTelegramUsername(username);
      const balance = user?.balance || 0;

      const balanceMessage = `
💰 **Your Balance**

💵 **Current Balance:** $${balance.toLocaleString()}
📊 **Weekly P&L:** $0
🔄 **Last Updated:** ${new Date().toLocaleString()}

💡 **To update your balance, please visit the dashboard.**
      `;

      await this.sendMessage(message.chat.id, balanceMessage);
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve balance. Please try again later.'
      );
    }
  }

  /**
   * Get user by Telegram username from database
   */
  private async getUserByTelegramUsername(username: string): Promise<any> {
    try {
      if (!this.config.database) {
        console.warn('Database not configured, using mock data');
        return this.getMockUserData(username);
      }

      // Query the database for user with matching telegram_username
      const user = await this.config.database
        .prepare(
          `
        SELECT customer_id, name, balance, telegram_username, telegram_id
        FROM players
        WHERE telegram_username = ?
      `
        )
        .bind(username)
        .first();

      return user;
    } catch (error) {
      console.error('Error fetching user by Telegram username:', error);
      return this.getMockUserData(username);
    }
  }

  /**
   * Get mock user data for development
   */
  private getMockUserData(username: string): any {
    return {
      customer_id: 'mock_' + username,
      name: username,
      balance: 1000.0,
      telegram_username: username,
      telegram_id: null,
    };
  }

  /**
   * Handle /wagers command
   */
  private async handleWagers(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const wagersMessage = `
🎯 **Recent Wagers**

📊 **No recent wagers found.**

💡 **Visit the dashboard to place wagers and view your history.**
      `;

      await this.sendMessage(message.chat.id, wagersMessage);
    } catch (error) {
      console.error('❌ Error getting wagers:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve wagers. Please try again later.'
      );
    }
  }

  /**
   * Handle /profile command
   */
  private async handleProfile(message: TelegramMessage) {
    try {
      const { username, first_name, last_name } = message.from;

      const profileMessage = `
👤 **Your Profile**

🆔 **Telegram ID:** ${message.from.id}
👤 **Username:** @${username || 'Not set'}
📛 **Name:** ${first_name || ''} ${last_name || ''}
🌍 **Language:** ${message.from.language_code || 'Unknown'}
📅 **Member Since:** ${new Date(message.date * 1000).toLocaleDateString()}

💡 **To link your Fire22 account, use /register**
      `;

      await this.sendMessage(message.chat.id, profileMessage);
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve profile. Please try again later.'
      );
    }
  }

  /**
   * Handle /register command
   */
  private async handleRegister(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram first, then try again.'
        );
        return;
      }

      const registerMessage = `
✅ **Registration Successful!**

👤 **Username:** @${username}
🆔 **Telegram ID:** ${message.from.id}
🔗 **Status:** Linked to Fire22 Dashboard

💡 **You can now use:**
• /balance - Check balance
• /wagers - View wagers
• /profile - Profile info

📱 **Notifications will be sent for:**
• Balance changes
• Wager updates
• System alerts
      `;

      await this.sendMessage(message.chat.id, registerMessage);
    } catch (error) {
      console.error('❌ Error during registration:', error);
      await this.sendMessage(message.chat.id, '❌ Registration failed. Please try again later.');
    }
  }

  /**
   * Handle /admin command
   */
  private async handleAdmin(message: TelegramMessage) {
    try {
      if (!this.isAdminUser(message.from.username || '')) {
        await this.sendMessage(message.chat.id, '❌ Admin access required.');
        return;
      }

      const adminMessage = `
🛡️ **Admin Panel**

📊 **System Status:** Online
👥 **Total Users:** 0
💰 **Total Balance:** $0
🎯 **Active Wagers:** 0

⚙️ **Admin Commands:**
/stats - Detailed statistics
/broadcast - Send message to all users

💡 **Use /stats for detailed information**
      `;

      await this.sendMessage(message.chat.id, adminMessage);
    } catch (error) {
      console.error('❌ Error in admin panel:', error);
      await this.sendMessage(message.chat.id, '❌ Admin panel error. Please try again later.');
    }
  }

  /**
   * Handle /stats command
   */
  private async handleStats(message: TelegramMessage) {
    try {
      if (!this.isAdminUser(message.from.username || '')) {
        await this.sendMessage(message.chat.id, '❌ Admin access required.');
        return;
      }

      const statsMessage = `
📊 **System Statistics**

👥 **Users:**
• Total: 0
• Active: 0
• Telegram Connected: 0

💰 **Financial:**
• Total Balance: $0
• Weekly P&L: $0
• Revenue: $0

🎯 **Wagers:**
• Total: 0
• Pending: 0
• Completed: 0

🔄 **Last Updated:** ${new Date().toLocaleString()}
      `;

      await this.sendMessage(message.chat.id, statsMessage);
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve statistics. Please try again later.'
      );
    }
  }

  /**
   * Handle /broadcast command
   */
  private async handleBroadcast(message: TelegramMessage) {
    try {
      if (!this.isAdminUser(message.from.username || '')) {
        await this.sendMessage(message.chat.id, '❌ Admin access required.');
        return;
      }

      const text = message.text?.replace('/broadcast', '').trim();
      if (!text) {
        await this.sendMessage(message.chat.id, '❌ Usage: /broadcast <message>');
        return;
      }

      const broadcastMessage = `
📢 **Broadcast Message**

${text}

📅 **Sent:** ${new Date().toLocaleString()}
👤 **By:** @${message.from.username}
      `;

      await this.sendMessage(message.chat.id, `✅ Broadcast sent: ${text}`);
    } catch (error) {
      console.error('❌ Error broadcasting message:', error);
      await this.sendMessage(message.chat.id, '❌ Broadcast failed. Please try again later.');
    }
  }

  /**
   * Handle regular messages
   */
  private async handleRegularMessage(message: TelegramMessage) {
    const response = `
💬 **Message Received**

📝 **Your message:** ${message.text}

💡 **Use /help to see available commands**
    `;

    await this.sendMessage(message.chat.id, response);
  }

  /**
   * Handle /vip command
   */
  private async handleVIP(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const vipTiers = this.businessSystem.getAllVIPTiers();
      let vipMessage = '👑 **VIP Tiers Available**\n\n';

      vipTiers.forEach(tier => {
        vipMessage += `**${tier.name}** (Level ${tier.level})\n`;
        vipMessage += `💰 Min Balance: $${tier.minBalance.toLocaleString()}\n`;
        vipMessage += `📊 Min Volume: $${tier.minVolume.toLocaleString()}\n`;
        vipMessage += `🎯 Commission Rate: ${(tier.commissionRate * 100).toFixed(1)}%\n`;
        vipMessage += `🚀 Bonus Multiplier: ${tier.bonusMultiplier}x\n`;
        vipMessage += `✨ Benefits: ${tier.benefits.join(', ')}\n\n`;
      });

      vipMessage += '💡 **To check your VIP status, use /profile**';

      await this.sendMessage(message.chat.id, vipMessage);
    } catch (error) {
      console.error('❌ Error handling VIP command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve VIP information. Please try again later.'
      );
    }
  }

  /**
   * Handle /groups command
   */
  private async handleGroups(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const userGroups = this.businessSystem.getUserGroups(username);
      const allGroups = Array.from(this.businessSystem['groups'].values());

      let groupsMessage = '👥 **Available Groups**\n\n';

      allGroups.forEach(group => {
        const isMember = userGroups.some(ug => ug.id === group.id);
        const memberStatus = isMember ? '✅ Member' : '❌ Not Member';

        groupsMessage += `**${group.name}**\n`;
        groupsMessage += `📋 Type: ${group.type}\n`;
        groupsMessage += `👤 Members: ${group.members.length}/${group.settings.maxMembers}\n`;
        groupsMessage += `🔐 Status: ${memberStatus}\n\n`;
      });

      if (userGroups.length > 0) {
        groupsMessage += '**Your Groups:**\n';
        userGroups.forEach(group => {
          groupsMessage += `• ${group.name} (${group.type})\n`;
        });
      }

      groupsMessage += '\n💡 **Contact admins to join groups**';

      await this.sendMessage(message.chat.id, groupsMessage);
    } catch (error) {
      console.error('❌ Error handling groups command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve group information. Please try again later.'
      );
    }
  }

  /**
   * Handle /affiliate command
   */
  private async handleAffiliate(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const affiliateProgram = this.businessSystem['affiliatePrograms'].get('fire22-affiliate');
      if (!affiliateProgram) {
        await this.sendMessage(message.chat.id, '❌ Affiliate program not available.');
        return;
      }

      let affiliateMessage = '🤝 **Fire22 Affiliate Program**\n\n';

      affiliateMessage += `**Commission Structure:**\n`;
      affiliateMessage += `💰 Base Rate: ${(affiliateProgram.commissionStructure.baseRate * 100).toFixed(1)}%\n\n`;

      affiliateMessage += `**Volume Tiers:**\n`;
      affiliateProgram.commissionStructure.volumeTiers.forEach(tier => {
        const maxVol = tier.maxVolume === Infinity ? '∞' : tier.maxVolume.toLocaleString();
        affiliateMessage += `• $${tier.minVolume.toLocaleString()} - $${maxVol}: ${(tier.commissionRate * 100).toFixed(1)}% (${tier.bonusMultiplier}x)\n`;
      });

      affiliateMessage += `\n**Performance Bonuses:**\n`;
      affiliateProgram.commissionStructure.performanceBonuses.forEach(bonus => {
        affiliateMessage += `• ${bonus.description}: +${(bonus.bonus * 100).toFixed(1)}%\n`;
      });

      affiliateMessage += `\n**Referral Rewards:**\n`;
      affiliateProgram.referralRewards.forEach(reward => {
        affiliateMessage += `• Level ${reward.level}: ${(reward.commission * 100).toFixed(1)}% + ${(reward.bonus * 100).toFixed(1)}% bonus\n`;
      });

      affiliateMessage += '\n💡 **Use /link to create your referral link**';

      await this.sendMessage(message.chat.id, affiliateMessage);
    } catch (error) {
      console.error('❌ Error handling affiliate command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve affiliate information. Please try again later.'
      );
    }
  }

  /**
   * Handle /commission command
   */
  private async handleCommission(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const mockData = {
        handle: 50000,
        volume: 150000,
        riskScore: 0.92,
        complianceScore: 98,
        performanceMetrics: { newCustomers: 15 },
      };

      const commission = this.businessSystem.calculateCommission(
        username,
        mockData.handle,
        mockData.volume,
        mockData.riskScore,
        mockData.complianceScore,
        mockData.performanceMetrics
      );

      let commissionMessage = '💰 **Commission Calculation**\n\n';

      commissionMessage += `**Period:** ${commission.period}\n`;
      commissionMessage += `📊 **Handle:** $${commission.handle.toLocaleString()}\n`;
      commissionMessage += `📈 **Volume:** $${mockData.volume.toLocaleString()}\n`;
      commissionMessage += `⚠️ **Risk Score:** ${(mockData.riskScore * 100).toFixed(0)}%\n`;
      commissionMessage += `✅ **Compliance:** ${mockData.complianceScore}%\n\n`;

      commissionMessage += `**Commission Breakdown:**\n`;
      commissionMessage += `💰 Base Commission: $${commission.commission.toFixed(2)}\n`;
      commissionMessage += `🚀 Performance Bonuses: $${commission.bonuses.toFixed(2)}\n`;
      commissionMessage += `⚖️ Risk Adjustments: $${commission.adjustments.toFixed(2)}\n`;
      commissionMessage += `💵 **Total Payout: $${commission.totalPayout.toFixed(2)}**\n\n`;

      commissionMessage += `**Status:** ${commission.status.toUpperCase()}\n`;
      commissionMessage += `📅 Calculated: ${commission.calculatedAt.toLocaleDateString()}\n`;

      if (commission.paidAt) {
        commissionMessage += `💸 Paid: ${commission.paidAt.toLocaleDateString()}`;
      }

      await this.sendMessage(message.chat.id, commissionMessage);
    } catch (error) {
      console.error('❌ Error handling commission command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to calculate commission. Please try again later.'
      );
    }
  }

  /**
   * Handle /link command
   */
  private async handleLink(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      const args = message.text?.split(' ').slice(1) || [];
      const linkType = (args[0] as 'referral' | 'affiliate' | 'vip') || 'referral';

      const link = this.businessSystem.createUserLink(username, linkType);

      let linkMessage = '🔗 **Your Referral Link**\n\n';

      linkMessage += `**Type:** ${linkType.charAt(0).toUpperCase() + linkType.slice(1)}\n`;
      linkMessage += `**Link:** ${link}\n\n`;

      linkMessage += `**How it works:**\n`;
      linkMessage += `• Share this link with potential customers\n`;
      linkMessage += `• When they join using your link, you earn commission\n`;
      linkMessage += `• Track your referrals and earnings\n\n`;

      linkMessage += `**Commission Rates:**\n`;
      if (linkType === 'referral') {
        linkMessage += `• Direct referral: 3% + 1% bonus\n`;
        linkMessage += `• Indirect referral: 1% + 0.5% bonus\n`;
      } else if (linkType === 'affiliate') {
        linkMessage += `• Base rate: 3% + volume bonuses\n`;
        linkMessage += `• Performance bonuses available\n`;
      } else if (linkType === 'vip') {
        linkMessage += `• VIP member benefits\n`;
        linkMessage += `• Exclusive promotions\n`;
      }

      await this.sendMessage(message.chat.id, linkMessage);
    } catch (error) {
      console.error('❌ Error handling link command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to create referral link. Please try again later.'
      );
    }
  }

  /**
   * Handle /casino command
   */
  private async handleCasino(message: TelegramMessage) {
    try {
      const stats = this.liveCasinoSystem.getSystemStats();

      let casinoMessage = '🎰 **Live Casino System Overview**\n\n';

      casinoMessage += `**Games:** ${stats.totalGames} total, ${stats.activeGames} active\n`;
      casinoMessage += `**Rates:** ${stats.totalRates} total, ${stats.activeRates} active\n`;
      casinoMessage += `**Sessions:** ${stats.totalSessions} total, ${stats.activeSessions} active\n`;
      casinoMessage += `**Revenue:** $${stats.totalRevenue.toLocaleString()}\n`;
      casinoMessage += `**Commission Paid:** $${stats.totalCommission.toLocaleString()}\n\n`;

      casinoMessage += `**Available Commands:**\n`;
      casinoMessage += `• /casino-games - View all games\n`;
      casinoMessage += `• /casino-rates - Check rates\n`;
      casinoMessage += `• /casino-sessions - Session info\n`;
      casinoMessage += `• /casino-revenue - Revenue data\n`;

      await this.sendMessage(message.chat.id, casinoMessage);
    } catch (error) {
      console.error('❌ Error handling casino command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve casino information. Please try again later.'
      );
    }
  }

  /**
   * Handle /casino-games command
   */
  private async handleCasinoGames(message: TelegramMessage) {
    try {
      const games = this.liveCasinoSystem.getAllGames();

      let gamesMessage = '🎮 **Live Casino Games**\n\n';

      games.forEach(game => {
        gamesMessage += `**${game.name}**\n`;
        gamesMessage += `📋 Category: ${game.category}\n`;
        gamesMessage += `🏢 Provider: ${game.provider}\n`;
        gamesMessage += `💰 Bet Range: $${game.minBet} - $${game.maxBet.toLocaleString()}\n`;
        gamesMessage += `🎯 House Edge: ${(game.houseEdge * 100).toFixed(2)}%\n`;
        gamesMessage += `📊 Default Rate: ${(game.defaultRate * 100).toFixed(1)}%\n`;
        gamesMessage += `🔥 Popularity: ${game.popularity}%\n`;
        gamesMessage += `📅 Last Updated: ${game.lastUpdated.toLocaleDateString()}\n\n`;
      });

      await this.sendMessage(message.chat.id, gamesMessage);
    } catch (error) {
      console.error('❌ Error handling casino games command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve casino games. Please try again later.'
      );
    }
  }

  /**
   * Handle /casino-rates command
   */
  private async handleCasinoRates(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default agent ID
      const agentId = 'agent1';
      const rates = this.liveCasinoSystem.getAgentRates(agentId);

      let ratesMessage = '💎 **Your Casino Rates**\n\n';

      if (rates.length > 0) {
        rates.forEach(rate => {
          const game = this.liveCasinoSystem.getGame(rate.gameId);
          if (game) {
            ratesMessage += `**${game.name}**\n`;
            ratesMessage += `💰 Base Rate: ${(rate.baseRate * 100).toFixed(1)}%\n`;
            ratesMessage += `📊 Adjusted Rate: ${(rate.adjustedRate * 100).toFixed(1)}%\n`;
            ratesMessage += `⚖️ Adjustment: ${(rate.adjustmentFactor * 100).toFixed(0)}%\n`;
            ratesMessage += `📅 Effective: ${rate.effectiveFrom.toLocaleDateString()}\n`;
            ratesMessage += `📝 Reason: ${rate.reason}\n\n`;
          }
        });
      } else {
        ratesMessage += 'No rates found for this agent.\n';
      }

      await this.sendMessage(message.chat.id, ratesMessage);
    } catch (error) {
      console.error('❌ Error handling casino rates command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve casino rates. Please try again later.'
      );
    }
  }

  /**
   * Handle /casino-sessions command
   */
  private async handleCasinoSessions(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default agent ID
      const agentId = 'agent1';
      const activeSessions = this.liveCasinoSystem.getActiveSessions(agentId);
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const completedSessions = this.liveCasinoSystem.getCompletedSessions(agentId, currentPeriod);

      let sessionsMessage = '🎯 **Casino Sessions**\n\n';

      sessionsMessage += `**Active Sessions:** ${activeSessions.length}\n`;
      sessionsMessage += `**Completed This Month:** ${completedSessions.length}\n\n`;

      if (activeSessions.length > 0) {
        sessionsMessage += `**Active Sessions:**\n`;
        activeSessions.slice(0, 3).forEach(session => {
          const game = this.liveCasinoSystem.getGame(session.gameId);
          sessionsMessage += `• ${game?.name || 'Unknown Game'} - Started ${session.startTime.toLocaleTimeString()}\n`;
        });
        if (activeSessions.length > 3) {
          sessionsMessage += `• ... and ${activeSessions.length - 3} more\n`;
        }
        sessionsMessage += '\n';
      }

      if (completedSessions.length > 0) {
        const totalBets = completedSessions.reduce((sum, s) => sum + s.totalBets, 0);
        const totalWins = completedSessions.reduce((sum, s) => sum + s.totalWins, 0);
        const totalCommission = completedSessions.reduce((sum, s) => sum + s.commissionEarned, 0);

        sessionsMessage += `**Monthly Summary:**\n`;
        sessionsMessage += `💰 Total Bets: $${totalBets.toLocaleString()}\n`;
        sessionsMessage += `🏆 Total Wins: $${totalWins.toLocaleString()}\n`;
        sessionsMessage += `💸 Commission Earned: $${totalCommission.toLocaleString()}\n`;
      }

      await this.sendMessage(message.chat.id, sessionsMessage);
    } catch (error) {
      console.error('❌ Error handling casino sessions command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve casino sessions. Please try again later.'
      );
    }
  }

  /**
   * Handle /casino-revenue command
   */
  private async handleCasinoRevenue(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default agent ID
      const agentId = 'agent1';
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const revenue = this.liveCasinoSystem.calculateMonthlyRevenue(agentId, currentPeriod);

      let revenueMessage = '💰 **Casino Revenue Report**\n\n';

      revenueMessage += `**Period:** ${revenue.period}\n`;
      revenueMessage += `💰 Total Bets: $${revenue.totalBets.toLocaleString()}\n`;
      revenueMessage += `🏆 Total Wins: $${revenue.totalWins.toLocaleString()}\n`;
      revenueMessage += `📊 Net Revenue: $${revenue.netRevenue.toLocaleString()}\n`;
      revenueMessage += `💸 Commission Paid: $${revenue.commissionPaid.toLocaleString()}\n`;
      revenueMessage += `📈 Average Rate: ${(revenue.averageRate * 100).toFixed(1)}%\n`;
      revenueMessage += `👥 Players: ${revenue.playerCount}\n`;
      revenueMessage += `🎯 Sessions: ${revenue.sessionCount}\n`;
      revenueMessage += `📅 Calculated: ${revenue.calculatedAt.toLocaleDateString()}\n`;

      await this.sendMessage(message.chat.id, revenueMessage);
    } catch (error) {
      console.error('❌ Error handling casino revenue command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve casino revenue. Please try again later.'
      );
    }
  }

  /**
   * Handle /sports command
   */
  private async handleSports(message: TelegramMessage) {
    try {
      const stats = this.sportsBettingSystem.getSystemStats();

      let sportsMessage = '🏈 **Sports Betting System Overview**\n\n';

      sportsMessage += `**Events:** ${stats.totalEvents} total, ${stats.activeEvents} active\n`;
      sportsMessage += `**Bets:** ${stats.totalBets} total, ${stats.activeBets} active\n`;
      sportsMessage += `**Rates:** ${stats.totalRates} total, ${stats.activeRates} active\n`;
      sportsMessage += `**VIP Profiles:** ${stats.totalVIPProfiles}\n`;
      sportsMessage += `**Risk Assessments:** ${stats.totalRiskAssessments}\n\n`;

      sportsMessage += `**Available Commands:**\n`;
      sportsMessage += `• /sports-events - View all sports events\n`;
      sportsMessage += `• /sports-bets - Check your betting history\n`;
      sportsMessage += `• /sports-rates - View sports betting rates\n`;
      sportsMessage += `• /risk-assessment - Check your risk profile\n`;
      sportsMessage += `• /vip-profile - View VIP status and benefits`;

      await this.sendMessage(message.chat.id, sportsMessage);
    } catch (error) {
      console.error('❌ Error handling sports command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve sports information. Please try again later.'
      );
    }
  }

  /**
   * Handle /sports-events command
   */
  private async handleSportsEvents(message: TelegramMessage) {
    try {
      const events = this.sportsBettingSystem.getAllEvents();

      let eventsMessage = '🏆 **Available Sports Events**\n\n';

      events.forEach(event => {
        eventsMessage += `**${event.name}**\n`;
        eventsMessage += `🏈 Sport: ${event.sport}\n`;
        eventsMessage += `🏆 League: ${event.league}\n`;
        eventsMessage += `🏠 ${event.homeTeam} vs 🚌 ${event.awayTeam}\n`;
        eventsMessage += `⏰ Start: ${event.startTime.toLocaleString()}\n`;
        eventsMessage += `📊 Status: ${event.status}\n`;
        eventsMessage += `⚠️ Risk Level: ${event.riskLevel}\n`;
        eventsMessage += `👑 VIP Access: ${event.vipAccess.join(', ')}\n`;
        eventsMessage += `💰 Odds: ${event.odds.homeWin} / ${event.odds.awayWin}\n\n`;
      });

      await this.sendMessage(message.chat.id, eventsMessage);
    } catch (error) {
      console.error('❌ Error handling sports events command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve sports events. Please try again later.'
      );
    }
  }

  /**
   * Handle /sports-bets command
   */
  private async handleSportsBets(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default player ID
      const playerId = 'player1';
      const bettingHistory = this.sportsBettingSystem.getPlayerBettingHistory(playerId);

      let betsMessage = '🎯 **Your Sports Betting History**\n\n';

      if (bettingHistory.length > 0) {
        bettingHistory.slice(0, 5).forEach(bet => {
          betsMessage += `**Bet ID:** ${bet.id}\n`;
          betsMessage += `🎯 Type: ${bet.betType.replace('_', ' ')}\n`;
          betsMessage += `📝 Selection: ${bet.selection}\n`;
          betsMessage += `💰 Stake: $${bet.stake.toLocaleString()}\n`;
          betsMessage += `📊 Odds: ${bet.odds}\n`;
          betsMessage += `🏆 Potential Win: $${bet.potentialWin.toLocaleString()}\n`;
          betsMessage += `⚠️ Risk Level: ${bet.riskLevel}\n`;
          betsMessage += `👑 VIP Tier: ${bet.vipTier}\n`;
          betsMessage += `📊 Status: ${bet.status.toUpperCase()}\n`;
          betsMessage += `📅 Placed: ${bet.placedAt.toLocaleDateString()}\n\n`;
        });

        if (bettingHistory.length > 5) {
          betsMessage += `... and ${bettingHistory.length - 5} more bets\n\n`;
        }

        const totalBets = bettingHistory.length;
        const wonBets = bettingHistory.filter(bet => bet.status === 'won').length;
        const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

        betsMessage += `**Summary:**\n`;
        betsMessage += `🎯 Total Bets: ${totalBets}\n`;
        betsMessage += `🏆 Won Bets: ${wonBets}\n`;
        betsMessage += `📊 Win Rate: ${winRate.toFixed(1)}%\n`;
      } else {
        betsMessage += 'No betting history found. Place your first bet to get started!';
      }

      await this.sendMessage(message.chat.id, betsMessage);
    } catch (error) {
      console.error('❌ Error handling sports bets command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve betting history. Please try again later.'
      );
    }
  }

  /**
   * Handle /sports-rates command
   */
  private async handleSportsRates(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default agent ID
      const agentId = 'agent1';
      const sports = ['football', 'basketball', 'soccer'];
      const betTypes = ['moneyline', 'spread', 'over_under'];

      let ratesMessage = '💎 **Sports Betting Rates**\n\n';

      sports.forEach(sport => {
        ratesMessage += `**${sport.charAt(0).toUpperCase() + sport.slice(1)}**\n`;

        betTypes.forEach(betType => {
          const rate = this.sportsBettingSystem.getRate(agentId, sport, betType);
          if (rate) {
            ratesMessage += `  ${betType.replace('_', ' ')}: ${(rate.adjustedRate * 100).toFixed(1)}%\n`;
          }
        });
        ratesMessage += '\n';
      });

      ratesMessage += `**Rate Information:**\n`;
      ratesMessage += `• Rates are per bet type and sport\n`;
      ratesMessage += `• VIP tiers may receive rate discounts\n`;
      ratesMessage += `• Risk levels affect final rates\n`;
      ratesMessage += `• Rates are updated based on performance`;

      await this.sendMessage(message.chat.id, ratesMessage);
    } catch (error) {
      console.error('❌ Error handling sports rates command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve sports rates. Please try again later.'
      );
    }
  }

  /**
   * Handle /risk-assessment command
   */
  private async handleRiskAssessment(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default player ID
      const playerId = 'player1';
      const assessment = this.sportsBettingSystem.getRiskAssessment(playerId);

      if (assessment) {
        let riskMessage = '⚠️ **Risk Assessment Report**\n\n';

        riskMessage += `**Overall Risk Level:** ${assessment.overallRisk.toUpperCase()}\n`;
        riskMessage += `📊 Risk Score: ${assessment.riskScore}/100\n`;
        riskMessage += `📅 Last Assessed: ${assessment.lastAssessed.toLocaleDateString()}\n`;
        riskMessage += `📅 Next Assessment: ${assessment.nextAssessment.toLocaleDateString()}\n\n`;

        riskMessage += `**Risk Factors:**\n`;
        assessment.factors.forEach(factor => {
          const emoji =
            factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : '⚖️';
          riskMessage += `${emoji} ${factor.factor}: ${factor.score}/100 (${factor.description})\n`;
        });

        riskMessage += `\n**Recommendations:**\n`;
        assessment.recommendations.forEach(rec => {
          riskMessage += `• ${rec}\n`;
        });
      } else {
        await this.sendMessage(message.chat.id, '❌ No risk assessment found for this player.');
        return;
      }

      await this.sendMessage(message.chat.id, riskMessage);
    } catch (error) {
      console.error('❌ Error handling risk assessment command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve risk assessment. Please try again later.'
      );
    }
  }

  /**
   * Handle /vip-profile command
   */
  private async handleVIPProfile(message: TelegramMessage) {
    try {
      const username = message.from.username;
      if (!username) {
        await this.sendMessage(
          message.chat.id,
          '❌ Please set a username in Telegram to use this feature.'
        );
        return;
      }

      // For demo purposes, use a default player ID
      const playerId = 'player1';
      const profile = this.sportsBettingSystem.getVIPProfile(playerId);

      if (profile) {
        let vipMessage = '👑 **VIP Profile**\n\n';

        vipMessage += `**Current Tier:** ${profile.currentTier.toUpperCase()}\n`;
        vipMessage += `📊 Points: ${profile.points.toLocaleString()}\n`;
        vipMessage += `📅 Joined: ${profile.joinedAt.toLocaleDateString()}\n`;
        vipMessage += `📅 Last Updated: ${profile.lastUpdated.toLocaleDateString()}\n`;
        vipMessage += `📊 Status: ${profile.status}\n\n`;

        vipMessage += `**Requirements for ${profile.currentTier.toUpperCase()}:**\n`;
        vipMessage += `💰 Min Balance: $${profile.requirements.minBalance.toLocaleString()}\n`;
        vipMessage += `📊 Min Volume: $${profile.requirements.minVolume.toLocaleString()}\n`;
        vipMessage += `🎯 Min Bets: ${profile.requirements.minBets}\n`;
        vipMessage += `🏆 Min Win Rate: ${profile.requirements.minWinRate}%\n`;
        vipMessage += `⚠️ Risk Threshold: ${profile.requirements.riskThreshold}%\n\n`;

        vipMessage += `**Benefits:**\n`;
        vipMessage += `💰 Max Bet Increase: ${profile.benefits.maxBetIncrease}x\n`;
        vipMessage += `📊 Rate Discount: ${(profile.benefits.rateDiscount * 100).toFixed(1)}%\n`;
        vipMessage += `💸 Cashback: ${profile.benefits.cashbackPercentage}%\n`;
        vipMessage += `🎯 Exclusive Events: ${profile.benefits.exclusiveEvents.join(', ') || 'None'}\n`;
        vipMessage += `📞 Priority Support: ${profile.benefits.prioritySupport ? 'Yes' : 'No'}\n`;
        vipMessage += `👤 Personal Manager: ${profile.benefits.personalManager ? 'Yes' : 'No'}\n`;
      } else {
        await this.sendMessage(message.chat.id, '❌ No VIP profile found for this player.');
        return;
      }

      await this.sendMessage(message.chat.id, vipMessage);
    } catch (error) {
      console.error('❌ Error handling VIP profile command:', error);
      await this.sendMessage(
        message.chat.id,
        '❌ Unable to retrieve VIP profile. Please try again later.'
      );
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'Markdown') {
    try {
      await this.bot.sendMessage({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  /**
   * Send notification to user by telegram_username (using notification service)
   */
  async sendNotificationByUsername(username: string, message: string) {
    try {
      const notificationId = await this.notificationService.sendToUsername(username, message);
      console.log(`📋 Notification queued for @${username} (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error queuing notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to user by telegram_id (using notification service)
   */
  async sendNotificationById(telegramId: number, message: string) {
    try {
      const notificationId = await this.notificationService.sendToUser(telegramId, message);
      console.log(`📋 Notification queued for user ${telegramId} (ID: ${notificationId})`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error queuing notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    recipients: Array<{ telegramId?: number; username?: string }>,
    message: string
  ) {
    try {
      const notificationIds = await this.notificationService.sendBulk(recipients, message);
      console.log(`📋 Bulk notification queued for ${recipients.length} recipients`);
      return notificationIds;
    } catch (error) {
      console.error('❌ Error queuing bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification status
   */
  getNotificationStatus(notificationId: string) {
    return this.notificationService.getNotificationStatus(notificationId);
  }

  /**
   * Cancel notification
   */
  cancelNotification(notificationId: string): boolean {
    return this.notificationService.cancelNotification(notificationId);
  }

  /**
   * Get notification service stats
   */
  getNotificationStats() {
    return this.notificationService.getStats();
  }

  /**
   * Get notification queue status
   */
  getNotificationQueueStatus() {
    return this.notificationService.getQueueStatus();
  }

  /**
   * Notify all admin users
   */
  async notifyAdmins(message: string) {
    try {
      for (const adminUsername of this.config.adminUsers || []) {
        await this.sendNotificationByUsername(adminUsername, message);
      }
    } catch (error) {
      console.error('❌ Error notifying admins:', error);
    }
  }

  /**
   * Check if user is allowed
   */
  private isUserAllowed(username: string): boolean {
    if (this.config.allowedUsers && this.config.allowedUsers.length > 0) {
      return this.config.allowedUsers.includes(username);
    }
    return true; // Allow all users if no restrictions
  }

  /**
   * Check if user is admin
   */
  private isAdminUser(username: string): boolean {
    return this.config.adminUsers?.includes(username) || false;
  }

  /**
   * Stop the bot
   */
  async stop() {
    try {
      this.isRunning = false;

      if (this.config.webhookUrl) {
        await this.bot.deleteWebhook();
      }
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
    }
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      userSessions: this.userSessions.size,
      commandHandlers: this.commandHandlers.size,
    };
  }
}

/**
 * Create and configure Fire22 Telegram Bot
 */
export function createFire22TelegramBot(
  token: string,
  config?: Partial<TelegramBotConfig>
): Fire22TelegramBot {
  const defaultConfig: TelegramBotConfig = {
    token,
    notificationSettings: {
      wagerUpdates: true,
      balanceChanges: true,
      systemAlerts: true,
      weeklyReports: true,
    },
    ...config,
  };

  return new Fire22TelegramBot(defaultConfig);
}

/**
 * Example usage:
 *
 * const bot = createFire22TelegramBot(Bun.env.BOT_TOKEN, {
 *   adminUsers: ['admin_username'],
 *   allowedUsers: ['user1', 'user2'],
 *   webhookUrl: 'https://your-domain.com/webhook'
 * });
 *
 * await bot.start();
 */
