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
      console.log('⚠️  BOT_TOKEN not found in environment variables');
      console.log('   Add BOT_TOKEN=your_telegram_bot_token to your .env file');
    } else {
      console.log('✅ BOT_TOKEN found in environment');
    }

    if (!cashierBotToken) {
      console.log('⚠️  CASHIER_BOT_TOKEN not found in environment variables');
      console.log('   Add CASHIER_BOT_TOKEN=your_cashier_bot_token to your .env file');
    } else {
      console.log('✅ CASHIER_BOT_TOKEN found in environment');
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

      console.log('🚀 Initializing Fire22 Telegram Bot...');

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

      console.log('✅ Bot initialized successfully');
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
        console.log('❌ Bot not initialized. Run initializeBot() first.');
        return false;
      }

      console.log('🚀 Starting Fire22 Telegram Bot...');
      await this.bot.start();
      this.isRunning = true;

      console.log('✅ Bot started successfully!');
      console.log('📱 Users can now interact with your bot on Telegram');

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
        console.log('❌ Bot not running');
        return false;
      }

      console.log('🛑 Stopping Fire22 Telegram Bot...');
      await this.bot.stop();
      this.isRunning = false;

      console.log('✅ Bot stopped successfully');
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
        console.log('❌ Bot not initialized');
        return false;
      }

      console.log(`📱 Sending test notification to @${username}...`);
      await this.bot.sendNotificationByUsername(username, message);

      console.log('✅ Test notification sent successfully');
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
        console.log('❌ Bot not initialized');
        return false;
      }

      console.log('🚨 Sending system alert...');
      await this.bot.notifyAdmins(`🚨 **System Alert**\n\n${message}`);

      console.log('✅ System alert sent to admins');
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
    console.log('📚 **Fire22 Telegram Bot Commands**\n');

    console.log('🔍 **User Commands:**');
    console.log('  /start - Welcome message and quick start guide');
    console.log('  /help - Complete command reference');
    console.log('  /balance - Check your account balance');
    console.log('  /wagers - View recent wager history');
    console.log('  /profile - Your profile information');
    console.log('  /settings - Bot notification settings');
    console.log('  /support - Get help and support');

    console.log('\n⚙️ **Account Management:**');
    console.log('  /register - Link your Telegram account to Fire22');
    console.log('  /unregister - Unlink your account');

    console.log('\n🛡️ **Admin Commands:**');
    console.log('  /admin - Access admin panel');
    console.log('  /stats - View system statistics');
    console.log('  /broadcast - Send message to all users');

    console.log('\n💡 **Integration Features:**');
    console.log('  • Real-time balance updates');
    console.log('  • Wager notifications');
    console.log('  • System alerts');
    console.log('  • Weekly reports');
    console.log('  • User management');
  }

  /**
   * Show integration benefits
   */
  showIntegrationBenefits() {
    console.log('🎯 **Telegram Integration Benefits**\n');

    console.log('📱 **User Experience:**');
    console.log('  • Instant notifications on mobile');
    console.log('  • Easy access to account information');
    console.log('  • Quick support and help');
    console.log('  • Real-time updates');

    console.log('\n🔒 **Security & Control:**');
    console.log('  • User access control');
    console.log('  • Admin-only commands');
    console.log('  • Secure authentication');
    console.log('  • Audit logging');

    console.log('\n📊 **Business Intelligence:**');
    console.log('  • User engagement metrics');
    console.log('  • Notification delivery rates');
    console.log('  • User behavior analytics');
    console.log('  • Support ticket tracking');

    console.log('\n🔄 **System Integration:**');
    console.log('  • Seamless with existing telegram_username field');
    console.log('  • Database integration ready');
    console.log('  • Webhook support');
    console.log('  • Scalable architecture');
  }

  /**
   * Show setup instructions
   */
  showSetupInstructions() {
    console.log('🚀 **Setup Instructions**\n');

    console.log('1️⃣ **Environment Configuration:**');
    console.log('   Add to your .env file:');
    console.log('   BOT_TOKEN=your_telegram_bot_token');
    console.log('   CASHIER_BOT_TOKEN=your_cashier_bot_token');

    console.log('\n2️⃣ **Bot Creation:**');
    console.log('   • Message @BotFather on Telegram');
    console.log('   • Use /newbot command');
    console.log('   • Choose name: "Fire22 Dashboard Bot"');
    console.log('   • Choose username: "fire22_dashboard_bot"');
    console.log('   • Copy the token to BOT_TOKEN');

    console.log('\n3️⃣ **Database Integration:**');
    console.log('   • Your telegram_username field is ready');
    console.log('   • Link users via /register command');
    console.log('   • Store telegram_id for notifications');

    console.log('\n4️⃣ **Deployment:**');
    console.log('   • Use webhook for production');
    console.log('   • Use polling for development');
    console.log('   • Configure admin users');
    console.log('   • Test all commands');
  }

  /**
   * Run integration demo
   */
  async runDemo() {
    console.log('🎯 **Fire22 Telegram Integration Demo**\n');

    // Check environment
    this.checkEnvironment();
    console.log('');

    // Show benefits
    this.showIntegrationBenefits();
    console.log('');

    // Show commands
    await this.demonstrateCommands();
    console.log('');

    // Show setup
    this.showSetupInstructions();
    console.log('');

    // Try to initialize bot
    console.log('🔄 **Attempting Bot Initialization**\n');
    const initialized = await this.initializeBot();

    if (initialized) {
      console.log('✅ Bot ready for use!');
      console.log('📱 Users can start chatting with your bot');
      console.log('🔗 Bot commands are fully functional');
    } else {
      console.log('❌ Bot initialization failed');
      console.log('💡 Check your environment variables and try again');
    }

    console.log('\n🎉 **Demo Complete!**');
    console.log('🚀 Your Fire22 Telegram integration is ready to use!');
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
          console.log('✅ Bot initialized successfully');
        } else {
          console.log('❌ Bot initialization failed');
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
        console.log('📊 Bot Status:', status);
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
        console.log('🚀 Fire22 Telegram Integration Manager\n');
        console.log('Usage:');
        console.log('  bun run telegram:integration demo       - Run full demo');
        console.log('  bun run telegram:integration init       - Initialize bot');
        console.log('  bun run telegram:integration start      - Start bot');
        console.log('  bun run telegram:integration stop       - Stop bot');
        console.log('  bun run telegram:integration status     - Show bot status');
        console.log('  bun run telegram:integration test       - Send test notification');
        console.log('  bun run telegram:integration alert      - Send system alert');
        console.log('  bun run telegram:integration commands   - Show available commands');
        console.log('  bun run telegram:integration benefits   - Show integration benefits');
        console.log('  bun run telegram:integration setup      - Show setup instructions');
        console.log('\nExamples:');
        console.log('  bun run telegram:integration demo');
        console.log('  bun run telegram:integration test username "Hello from Fire22!"');
        console.log('  bun run telegram:integration alert "System maintenance in 1 hour"');
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
