/**
 * Telegram Bot System
 * Consolidated modular Telegram bot with command handling
 */

import { TelegramBotCore } from './core/telegram-bot-core';
import { UserCommands } from './commands/user-commands';
import { WagerCommands } from './commands/wager-commands';

export * from './core/telegram-types';

export class Fire22TelegramBot {
  private core: TelegramBotCore;
  private userCommands: UserCommands;
  private wagerCommands: WagerCommands;

  constructor(config: any) {
    this.core = new TelegramBotCore(config);
    this.userCommands = new UserCommands();
    this.wagerCommands = new WagerCommands();

    this.registerCommands();
  }

  /**
   * Initialize the bot
   */
  async initialize(): Promise<boolean> {
    return await this.core.initialize();
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    await this.core.start();
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    await this.core.stop();
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message: any): Promise<void> {
    await this.core.handleMessage(message);
  }

  /**
   * Register all command handlers
   */
  private registerCommands(): void {
    // User Commands
    const userCmds = this.userCommands.getCommands();
    userCmds.forEach(cmd => {
      const handlerName = `handle${cmd.name.charAt(0).toUpperCase()}${cmd.name.slice(1)}`;
      const handler = (this.userCommands as any)[handlerName];

      if (handler && typeof handler === 'function') {
        this.core.registerCommand(cmd, handler.bind(this.userCommands));
      }
    });

    // Wager Commands
    const wagerCmds = this.wagerCommands.getCommands();
    wagerCmds.forEach(cmd => {
      const handlerName = `handle${cmd.name.charAt(0).toUpperCase()}${cmd.name.slice(1)}`;
      const handler = (this.wagerCommands as any)[handlerName];

      if (handler && typeof handler === 'function') {
        this.core.registerCommand(cmd, handler.bind(this.wagerCommands));
      }
    });
  }

  /**
   * Get bot analytics
   */
  getAnalytics() {
    return this.core.getAnalytics();
  }

  /**
   * Get active sessions
   */
  getActiveSessions() {
    return this.core.getActiveSessions();
  }

  /**
   * Check if bot is running
   */
  get isRunning(): boolean {
    return this.core.isBotRunning;
  }
}

// Export individual modules for advanced usage
export { TelegramBotCore } from './core/telegram-bot-core';
export { UserCommands } from './commands/user-commands';
export { WagerCommands } from './commands/wager-commands';

// Export default instance factory
export function createFire22TelegramBot(config: any): Fire22TelegramBot {
  return new Fire22TelegramBot(config);
}
