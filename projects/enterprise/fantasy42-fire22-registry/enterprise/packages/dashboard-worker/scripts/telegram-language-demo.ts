#!/usr/bin/env bun

/**
 * 🤖🌐 Fire22 Telegram Language Integration Demo
 *
 * Interactive demonstration of multilingual Telegram bot functionality
 * with real-time language switching and message generation
 */

import {
  Fire22TelegramIntegration,
  type Fire22TelegramConfig,
} from '../src/telegram/fire22-telegram-integration';
import {
  MultilingualTelegramBot,
  type TelegramUser,
  type NotificationData,
} from '../src/telegram/multilingual-telegram-bot';

// Mock Telegram Bot API for demonstration
class MockTelegramBotAPI {
  async sendMessage(chatId: number, text: string, options?: any): Promise<void> {
    console.log(`📱 Message to ${chatId}:`);
    console.log(`   ${text}`);
    if (options?.reply_markup?.inline_keyboard) {
      console.log('   Keyboard:');
      options.reply_markup.inline_keyboard.forEach((row: any[], i: number) => {
        console.log(`   Row ${i + 1}:`, row.map(btn => btn.text).join(' | '));
      });
    }
    console.log();
  }

  onText(regexp: RegExp, callback: Function): void {
    // Mock implementation
  }

  on(event: string, callback: Function): void {
    // Mock implementation
  }
}

export class TelegramLanguageDemo {
  private telegramBot: MultilingualTelegramBot;
  private integration: Fire22TelegramIntegration;

  constructor() {
    this.telegramBot = new MultilingualTelegramBot();

    const config: Fire22TelegramConfig = {
      botToken: 'demo_token',
      cashierGroupId: '-1001234567890',
      p2pQueueGroupId: '-1001987654321',
      transactionChannelId: '@fire22_transactions',
      supportGroupId: '-1001555666777',
    };

    this.integration = new Fire22TelegramIntegration(config, new MockTelegramBotAPI() as any);
  }

  /**
   * Run interactive demonstration
   */
  async runDemo(): Promise<void> {
    this.printHeader();

    console.log('🚀 Starting Fire22 Telegram Language Integration Demo...\n');

    // Demo different user scenarios
    await this.demoWelcomeMessages();
    await this.demoTransactionNotifications();
    await this.demoP2PMatchNotifications();
    await this.demoSupportTickets();
    await this.demoDepositNotifications();
    await this.demoLanguageSwitching();
    await this.demoSystemStats();

    this.printSummary();
  }

  /**
   * Demo welcome messages in different languages
   */
  private async demoWelcomeMessages(): Promise<void> {
    console.log('🎉 === WELCOME MESSAGES DEMO ===\n');

    const users: TelegramUser[] = [
      { id: 123456789, first_name: 'John', last_name: 'Doe', language_code: 'en' },
      { id: 987654321, first_name: 'María', last_name: 'García', language_code: 'es' },
      { id: 555666777, first_name: 'João', last_name: 'Silva', language_code: 'pt' },
      { id: 111222333, first_name: 'Pierre', last_name: 'Dubois', language_code: 'fr' },
    ];

    for (const user of users) {
      console.log(`👤 Welcome message for ${user.first_name} (${user.language_code}):`);
      const welcomeMsg = this.telegramBot.generateWelcomeMessage(user);
      console.log(`   ${welcomeMsg.text}\n`);
    }
  }

  /**
   * Demo transaction notifications
   */
  private async demoTransactionNotifications(): Promise<void> {
    console.log('💰 === TRANSACTION NOTIFICATIONS DEMO ===\n');

    const users: TelegramUser[] = [
      { id: 123456789, first_name: 'John', language_code: 'en' },
      { id: 987654321, first_name: 'María', language_code: 'es' },
      { id: 555666777, first_name: 'João', language_code: 'pt' },
      { id: 111222333, first_name: 'Pierre', language_code: 'fr' },
    ];

    const transactionData: NotificationData = {
      userId: 123456789,
      amount: 500.0,
      type: 'Deposit',
      timestamp: new Date(),
      reference: 'TXN_20240827_001',
    };

    for (const user of users) {
      console.log(`📊 Transaction notification for ${user.first_name} (${user.language_code}):`);
      const notification = this.telegramBot.generateTransactionNotification(user, transactionData);
      console.log(`   ${notification.text}\n`);
    }
  }

  /**
   * Demo P2P match notifications
   */
  private async demoP2PMatchNotifications(): Promise<void> {
    console.log('🎯 === P2P MATCH NOTIFICATIONS DEMO ===\n');

    const user: TelegramUser = { id: 123456789, first_name: 'John', language_code: 'en' };
    const matchData = {
      queueId: 'QUEUE_12345',
      matches: [
        { id: 'MATCH_001', amount: 1000, paymentType: 'Bank Transfer', matchScore: 95 },
        { id: 'MATCH_002', amount: 1000, paymentType: 'PayPal', matchScore: 88 },
        { id: 'MATCH_003', amount: 950, paymentType: 'Crypto', matchScore: 82 },
      ],
    };

    // Demo in different languages
    const languages = ['en', 'es', 'pt', 'fr'];

    for (const lang of languages) {
      const testUser = { ...user, language_code: lang };
      this.telegramBot.setUserLanguage(testUser.id, lang);

      console.log(`🎯 P2P Match notification (${lang}):`);
      const notification = this.telegramBot.generateP2PMatchNotification(testUser, matchData);
      console.log(`   ${notification.text}\n`);
    }
  }

  /**
   * Demo support ticket notifications
   */
  private async demoSupportTickets(): Promise<void> {
    console.log('🎫 === SUPPORT TICKET NOTIFICATIONS DEMO ===\n');

    const user: TelegramUser = { id: 123456789, first_name: 'John', language_code: 'en' };
    const ticketData = {
      id: 12345,
      subject: 'Transaction Issue',
      priority: 'high' as const,
      serviceLevel: 'premium' as const,
    };

    const languages = ['en', 'es', 'pt', 'fr'];

    for (const lang of languages) {
      const testUser = { ...user, language_code: lang };
      this.telegramBot.setUserLanguage(testUser.id, lang);

      console.log(`🎫 Support ticket notification (${lang}):`);
      const notification = this.telegramBot.generateSupportTicketNotification(testUser, ticketData);
      console.log(`   ${notification.text}\n`);
    }
  }

  /**
   * Demo deposit notifications
   */
  private async demoDepositNotifications(): Promise<void> {
    console.log('💸 === DEPOSIT NOTIFICATIONS DEMO ===\n');

    const user: TelegramUser = { id: 123456789, first_name: 'John', language_code: 'en' };
    const depositData = {
      operationId: 67890,
      amount: 750.0,
      paymentMethod: 'Credit Card',
      transactionId: 'DEP_20240827_002',
    };

    const languages = ['en', 'es', 'pt', 'fr'];

    for (const lang of languages) {
      const testUser = { ...user, language_code: lang };
      this.telegramBot.setUserLanguage(testUser.id, lang);

      console.log(`💸 Deposit notification (${lang}):`);
      const notification = this.telegramBot.generateDepositNotification(testUser, depositData);
      console.log(`   ${notification.text}\n`);
    }
  }

  /**
   * Demo language switching functionality
   */
  private async demoLanguageSwitching(): Promise<void> {
    console.log('🌐 === LANGUAGE SWITCHING DEMO ===\n');

    const user: TelegramUser = { id: 123456789, first_name: 'John', language_code: 'en' };

    console.log('🔄 Language Selection Keyboard:');
    const keyboard = this.telegramBot.generateLanguageSelectionKeyboard();
    console.log('   Available Languages:');
    keyboard.inline_keyboard.forEach((row: any[], i: number) => {
      console.log(`   Row ${i + 1}:`, row.map(btn => btn.text).join(' | '));
    });

    console.log('\n🔄 Language Change Confirmations:');
    const languages = ['en', 'es', 'pt', 'fr'];

    for (const lang of languages) {
      const confirmation = this.telegramBot.generateLanguageChangeMessage(user.id, lang);
      console.log(`   ${lang.toUpperCase()}: ${confirmation}`);
    }
    console.log();
  }

  /**
   * Demo system statistics
   */
  private async demoSystemStats(): Promise<void> {
    console.log('📊 === SYSTEM STATISTICS DEMO ===\n');

    const stats = this.telegramBot.getLanguageSystemStats();

    console.log('📊 Fire22 Telegram Language System Statistics:');
    console.log(`   🌐 Total Language Codes: ${stats.totalCodes}`);
    console.log(`   🤖 Telegram-specific Codes: ${stats.telegramCodes}`);
    console.log(`   🗣️  Supported Languages: ${stats.supportedLanguages.join(', ')}`);
    console.log(`   👥 Active Bot Users: ${stats.activeUsers}`);
    console.log();

    // Demo language code usage
    console.log('🔤 Sample Language Code Translations:');
    const sampleCodes = ['L-1500', 'L-1502', 'L-1510', 'L-1514', 'L-1520'];

    for (const code of sampleCodes) {
      console.log(`\n   ${code}:`);
      stats.supportedLanguages.forEach(lang => {
        const text = this.telegramBot.languageManager.getText(code, lang);
        console.log(`     ${lang.toUpperCase()}: ${text}`);
      });
    }
    console.log();
  }

  /**
   * Demo advanced error handling
   */
  private async demoErrorHandling(): Promise<void> {
    console.log('❌ === ERROR HANDLING DEMO ===\n');

    const user: TelegramUser = { id: 123456789, first_name: 'John', language_code: 'en' };
    const errorTypes: ('registration' | 'linking' | 'general')[] = [
      'registration',
      'linking',
      'general',
    ];

    for (const errorType of errorTypes) {
      console.log(`❌ ${errorType} error messages:`);

      ['en', 'es', 'pt', 'fr'].forEach(lang => {
        const testUser = { ...user, language_code: lang };
        this.telegramBot.setUserLanguage(testUser.id, lang);

        const errorMsg = this.telegramBot.generateErrorMessage(testUser, errorType);
        console.log(`   ${lang.toUpperCase()}: ${errorMsg}`);
      });
      console.log();
    }
  }

  /**
   * Interactive demo menu
   */
  async runInteractiveDemo(): Promise<void> {
    this.printHeader();

    while (true) {
      console.log('\n🤖 Fire22 Telegram Language Demo - Interactive Mode');
      console.log('═'.repeat(50));
      console.log('1. 🎉 Welcome Messages');
      console.log('2. 💰 Transaction Notifications');
      console.log('3. 🎯 P2P Match Notifications');
      console.log('4. 🎫 Support Tickets');
      console.log('5. 💸 Deposit Notifications');
      console.log('6. 🌐 Language Switching');
      console.log('7. 📊 System Statistics');
      console.log('8. ❌ Error Handling');
      console.log('9. 🚀 Full Demo');
      console.log('0. 🔚 Exit');
      console.log('═'.repeat(50));

      const choice = await this.getUserInput('Select an option (0-9): ');

      switch (choice.trim()) {
        case '1':
          await this.demoWelcomeMessages();
          break;
        case '2':
          await this.demoTransactionNotifications();
          break;
        case '3':
          await this.demoP2PMatchNotifications();
          break;
        case '4':
          await this.demoSupportTickets();
          break;
        case '5':
          await this.demoDepositNotifications();
          break;
        case '6':
          await this.demoLanguageSwitching();
          break;
        case '7':
          await this.demoSystemStats();
          break;
        case '8':
          await this.demoErrorHandling();
          break;
        case '9':
          await this.runDemo();
          break;
        case '0':
          console.log('\n👋 Thank you for using Fire22 Telegram Language Demo!');
          return;
        default:
          console.log('\n❌ Invalid option. Please select 0-9.');
      }

      await this.getUserInput('\nPress Enter to continue...');
    }
  }

  private async getUserInput(prompt: string): Promise<string> {
    // Mock implementation for demo - in real usage would use readline or similar
    console.log(prompt);
    return '9'; // Auto-select full demo for this example
  }

  private printHeader(): void {
    console.clear();
    console.log('🔥🤖 Fire22 Telegram Language Integration Demo');
    console.log('═'.repeat(70));
    console.log('🌐 Multilingual Telegram Bot with Real-time Language Switching');
    console.log('🚀 Supporting 4 Languages: English, Spanish, Portuguese, French');
    console.log('📊 Complete integration with Fire22 Dashboard ecosystem');
    console.log('═'.repeat(70));
  }

  private printSummary(): void {
    console.log('═'.repeat(70));
    console.log('🎉 Demo Complete!');
    console.log('═'.repeat(70));
    console.log('✅ Demonstrated Features:');
    console.log('   🎉 Multilingual welcome messages');
    console.log('   💰 Transaction notifications');
    console.log('   🎯 P2P match notifications');
    console.log('   🎫 Support ticket management');
    console.log('   💸 Deposit processing workflows');
    console.log('   🌐 Real-time language switching');
    console.log('   📊 System statistics and monitoring');
    console.log();
    console.log('🚀 Fire22 Telegram Integration is ready for production!');
    console.log('🌍 Full multilingual support across all Telegram bot features');
    console.log('═'.repeat(70));
  }
}

// CLI Interface
if (import.meta.main) {
  const demo = new TelegramLanguageDemo();

  const args = process.argv.slice(2);
  if (args.includes('--interactive')) {
    demo.runInteractiveDemo().catch(console.error);
  } else {
    demo.runDemo().catch(console.error);
  }
}

export default TelegramLanguageDemo;
