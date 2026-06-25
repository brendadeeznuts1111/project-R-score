#!/usr/bin/env bun

/**
 * 🔥 Fire22 Telegram Integration Script
 * Demonstrates the enhanced Telegram bot system integration
 */

import { createFire22TelegramBot, Fire22TelegramBot } from '../src/telegram-bot';

class TelegramIntegrationManager {
  private bot: Fire22TelegramBot | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.checkEnvironment();
  }

  /**
   * Check environment configuration
   */
  private checkEnvironment() {
    const botToken = Bun.env.BOT_TOKEN;
    const cashierBotToken = Bun.env.CASHIER_BOT_TOKEN;

    if (!botToken) {
      console.info('⚠️  BOT_TOKEN not found in environment variables');
      console.info('   Add BOT_TOKEN=your_telegram_bot_token to your .env file');
    } else {
      console.info('✅ BOT_TOKEN found in environment');
    }

    if (!cashierBotToken) {
      console.info('⚠️  CASHIER_BOT_TOKEN not found in environment variables');
      console.info('   Add CASHIER_BOT_TOKEN=your_cashier_bot_token to your .env file');
    } else {
      console.info('✅ CASHIER_BOT_TOKEN found in environment');
    }
  }

  /**
   * Initialize the Telegram bot
   */
  async initializeBot() {
    try {
      const botToken = Bun.env.BOT_TOKEN;
      if (!botToken) {
        throw new Error('BOT_TOKEN is required to initialize the bot');
      }

      console.info('🚀 Initializing Fire22 Telegram Bot...');

      // Create bot with configuration
      this.bot = createFire22TelegramBot(botToken, {
        adminUsers: ['nolarose', 'admin'], // Add your admin usernames
        allowedUsers: [], // Empty array means all users are allowed
        notificationSettings: {
          wagerUpdates: true,
          balanceChanges: true,
          systemAlerts: true,
          weeklyReports: true,
        },
      });

      console.info('✅ Bot initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      return false;
    }
  }

  /**
   * Start the Telegram bot
   */
  async startBot() {
    try {
      if (!this.bot) {
        console.info('❌ Bot not initialized. Run initializeBot() first.');
        return false;
      }

      console.info('🚀 Starting Fire22 Telegram Bot...');
      await this.bot.start();
      this.isRunning = true;

      console.info('✅ Bot started successfully!');
      console.info('📱 Users can now interact with your bot on Telegram');

      return true;
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      return false;
    }
  }

  /**
   * Stop the Telegram bot
   */
  async stopBot() {
    try {
      if (!this.bot) {
        console.info('❌ Bot not running');
        return false;
      }

      console.info('🛑 Stopping Fire22 Telegram Bot...');
      await this.bot.stop();
      this.isRunning = false;

      console.info('✅ Bot stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop bot:', error);
      return false;
    }
  }

  /**
   * Get bot status
   */
  getBotStatus() {
    if (!this.bot) {
      return { status: 'Not Initialized', isRunning: false };
    }

    const status = this.bot.getStatus();
    return {
      status: status.isRunning ? 'Running' : 'Stopped',
      isRunning: status.isRunning,
      config: status.config,
      userSessions: status.userSessions,
      commandHandlers: status.commandHandlers,
    };
  }

  /**
   * Send test notification
   */
  async sendTestNotification(username: string, message: string) {
    try {
      if (!this.bot) {
        console.info('❌ Bot not initialized');
        return false;
      }

      console.info(`📱 Sending test notification to @${username}...`);
      await this.bot.sendNotificationByUsername(username, message);

      console.info('✅ Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Send system alert
   */
  async sendSystemAlert(message: string) {
    try {
      if (!this.bot) {
        console.info('❌ Bot not initialized');
        return false;
      }

      console.info('🚨 Sending system alert...');
      await this.bot.notifyAdmins(`🚨 **System Alert**\n\n${message}`);

      console.info('✅ System alert sent to admins');
      return true;
    } catch (error) {
      console.error('❌ Failed to send system alert:', error);
      return false;
    }
  }

  /**
   * Demonstrate bot commands
   */
  async demonstrateCommands() {
    console.info('📚 **Fire22 Telegram Bot Commands**\n');

    console.info('🔍 **User Commands:**');
    console.info('  /start - Welcome message and quick start guide');
    console.info('  /help - Complete command reference');
    console.info('  /balance - Check your account balance');
    console.info('  /wagers - View recent wager history');
    console.info('  /profile - Your profile information');
    console.info('  /settings - Bot notification settings');
    console.info('  /support - Get help and support');

    console.info('\n⚙️ **Account Management:**');
    console.info('  /register - Link your Telegram account to Fire22');
    console.info('  /unregister - Unlink your account');

    console.info('\n🛡️ **Admin Commands:**');
    console.info('  /admin - Access admin panel');
    console.info('  /stats - View system statistics');
    console.info('  /broadcast - Send message to all users');

    console.info('\n💡 **Integration Features:**');
    console.info('  • Real-time balance updates');
    console.info('  • Wager notifications');
    console.info('  • System alerts');
    console.info('  • Weekly reports');
    console.info('  • User management');
  }

  /**
   * Show integration benefits
   */
  showIntegrationBenefits() {
    console.info('🎯 **Telegram Integration Benefits**\n');

    console.info('📱 **User Experience:**');
    console.info('  • Instant notifications on mobile');
    console.info('  • Easy access to account information');
    console.info('  • Quick support and help');
    console.info('  • Real-time updates');

    console.info('\n🔒 **Security & Control:**');
    console.info('  • User access control');
    console.info('  • Admin-only commands');
    console.info('  • Secure authentication');
    console.info('  • Audit logging');

    console.info('\n📊 **Business Intelligence:**');
    console.info('  • User engagement metrics');
    console.info('  • Notification delivery rates');
    console.info('  • User behavior analytics');
    console.info('  • Support ticket tracking');

    console.info('\n🔄 **System Integration:**');
    console.info('  • Seamless with existing telegram_username field');
    console.info('  • Database integration ready');
    console.info('  • Webhook support');
    console.info('  • Scalable architecture');
  }

  /**
   * Show setup instructions
   */
  showSetupInstructions() {
    console.info('🚀 **Setup Instructions**\n');

    console.info('1️⃣ **Environment Configuration:**');
    console.info('   Add to your .env file:');
    console.info('   BOT_TOKEN=your_telegram_bot_token');
    console.info('   CASHIER_BOT_TOKEN=your_cashier_bot_token');

    console.info('\n2️⃣ **Bot Creation:**');
    console.info('   • Message @BotFather on Telegram');
    console.info('   • Use /newbot command');
    console.info('   • Choose name: "Fire22 Dashboard Bot"');
    console.info('   • Choose username: "fire22_dashboard_bot"');
    console.info('   • Copy the token to BOT_TOKEN');

    console.info('\n3️⃣ **Database Integration:**');
    console.info('   • Your telegram_username field is ready');
    console.info('   • Link users via /register command');
    console.info('   • Store telegram_id for notifications');

    console.info('\n4️⃣ **Deployment:**');
    console.info('   • Use webhook for production');
    console.info('   • Use polling for development');
    console.info('   • Configure admin users');
    console.info('   • Test all commands');
  }

  /**
   * Run integration demo
   */
  async runDemo() {
    console.info('🎯 **Fire22 Telegram Integration Demo**\n');

    // Check environment
    this.checkEnvironment();
    console.info('');

    // Show benefits
    this.showIntegrationBenefits();
    console.info('');

    // Show commands
    await this.demonstrateCommands();
    console.info('');

    // Show setup
    this.showSetupInstructions();
    console.info('');

    // Try to initialize bot
    console.info('🔄 **Attempting Bot Initialization**\n');
    const initialized = await this.initializeBot();

    if (initialized) {
      console.info('✅ Bot ready for use!');
      console.info('📱 Users can start chatting with your bot');
      console.info('🔗 Bot commands are fully functional');
    } else {
      console.info('❌ Bot initialization failed');
      console.info('💡 Check your environment variables and try again');
    }

    console.info('\n🎉 **Demo Complete!**');
    console.info('🚀 Your Fire22 Telegram integration is ready to use!');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new TelegramIntegrationManager();

  try {
    switch (command) {
      case 'demo':
        await manager.runDemo();
        break;

      case 'init':
        const initialized = await manager.initializeBot();
        if (initialized) {
          console.info('✅ Bot initialized successfully');
        } else {
          console.info('❌ Bot initialization failed');
          process.exit(1);
        }
        break;

      case 'start':
        await manager.startBot();
        break;

      case 'stop':
        await manager.stopBot();
        break;

      case 'status':
        const status = manager.getBotStatus();
        console.info('📊 Bot Status:', status);
        break;

      case 'test':
        const username = args[1] || 'test_user';
        const message = args[2] || 'This is a test notification from Fire22!';
        await manager.sendTestNotification(username, message);
        break;

      case 'alert':
        const alertMessage = args[1] || 'System maintenance scheduled';
        await manager.sendSystemAlert(alertMessage);
        break;

      case 'commands':
        await manager.demonstrateCommands();
        break;

      case 'benefits':
        manager.showIntegrationBenefits();
        break;

      case 'setup':
        manager.showSetupInstructions();
        break;

      default:
        console.info('🚀 Fire22 Telegram Integration Manager\n');
        console.info('Usage:');
        console.info('  bun run telegram:integration demo       - Run full demo');
        console.info('  bun run telegram:integration init       - Initialize bot');
        console.info('  bun run telegram:integration start      - Start bot');
        console.info('  bun run telegram:integration stop       - Stop bot');
        console.info('  bun run telegram:integration status     - Show bot status');
        console.info('  bun run telegram:integration test       - Send test notification');
        console.info('  bun run telegram:integration alert      - Send system alert');
        console.info('  bun run telegram:integration commands   - Show available commands');
        console.info('  bun run telegram:integration benefits   - Show integration benefits');
        console.info('  bun run telegram:integration setup      - Show setup instructions');
        console.info('\nExamples:');
        console.info('  bun run telegram:integration demo');
        console.info('  bun run telegram:integration test username "Hello from Fire22!"');
        console.info('  bun run telegram:integration alert "System maintenance in 1 hour"');
        break;
    }
  } catch (error) {
    console.error('❌ Telegram integration error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
