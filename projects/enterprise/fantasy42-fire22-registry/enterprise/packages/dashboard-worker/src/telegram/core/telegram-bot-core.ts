/**
 * Telegram Bot Core
 * Core functionality for Telegram bot initialization, connection, and message routing
 */

import type {
  TelegramUser,
  TelegramMessage,
  TelegramBotConfig,
  TelegramSession,
  TelegramAnalytics,
  CommandContext,
  CommandResult,
  TelegramCommand,
  TelegramCommandHandler,
} from './telegram-types';

export class TelegramBotCore {
  private config: TelegramBotConfig;
  private sessions: Map<number, TelegramSession> = new Map();
  private commandHandlers: Map<string, TelegramCommandHandler> = new Map();
  private commands: Map<string, TelegramCommand> = new Map();
  private analytics: TelegramAnalytics;
  private isRunning: boolean = false;
  private pollingInterval?: NodeJS.Timeout;

  constructor(config: TelegramBotConfig) {
    this.config = config;
    this.analytics = {
      totalUsers: 0,
      activeUsers: 0,
      totalMessages: 0,
      totalCommands: 0,
      popularCommands: [],
      errorRate: 0,
      averageResponseTime: 0,
      uptime: 0,
    };
  }

  /**
   * Initialize the bot
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 Initializing Telegram Bot Core...');

      // Validate configuration
      if (!this.config.token) {
        throw new Error('Bot token is required');
      }

      // Initialize command handlers
      this.initializeCommandHandlers();

      // Start analytics tracking
      this.startAnalyticsTracking();

      console.log('✅ Telegram Bot Core initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram Bot Core:', error);
      return false;
    }
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Bot is already running');
      return;
    }

    try {
      console.log('🚀 Starting Telegram Bot...');

      this.isRunning = true;

      if (this.config.webhookUrl) {
        await this.startWebhook();
      } else {
        await this.startPolling();
      }

      console.log('✅ Telegram Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Telegram Bot:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Telegram Bot...');

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Clean up sessions
    this.sessions.clear();

    console.log('✅ Telegram Bot stopped');
  }

  /**
   * Start polling for messages
   */
  private async startPolling(): Promise<void> {
    console.log('📡 Starting message polling...');

    const interval = this.config.pollingInterval || 1000;

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMessages();
      } catch (error) {
        console.error('❌ Polling error:', error);
        this.analytics.errorRate += 1;
      }
    }, interval);
  }

  /**
   * Start webhook mode
   */
  private async startWebhook(): Promise<void> {
    console.log('🔗 Starting webhook mode...');

    // Webhook implementation would go here
    // This would set up HTTP endpoints to receive messages from Telegram
    console.log(`📡 Webhook configured for: ${this.config.webhookUrl}`);
  }

  /**
   * Poll for new messages (simplified for demonstration)
   */
  private async pollMessages(): Promise<void> {
    // This would normally fetch messages from Telegram API
    // For demonstration, we'll simulate message processing

    // Update analytics
    this.analytics.uptime += 1; // 1 second intervals
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: TelegramMessage): Promise<void> {
    const startTime = Date.now();

    try {
      this.analytics.totalMessages += 1;

      // Update or create session
      this.updateSession(message);

      // Check if it's a command
      if (message.text?.startsWith('/')) {
        await this.handleCommand(message);
      } else {
        await this.handleRegularMessage(message);
      }

      // Update response time
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
    } catch (error) {
      console.error('❌ Error handling message:', error);
      this.analytics.errorRate += 1;
    }
  }

  /**
   * Handle bot commands
   */
  private async handleCommand(message: TelegramMessage): Promise<void> {
    if (!message.text) return;

    const parts = message.text.trim().split(/\s+/);
    const commandName = parts[0].substring(1).toLowerCase(); // Remove /
    const args = parts.slice(1);

    // Find command handler
    const handler = this.commandHandlers.get(commandName);
    if (!handler) {
      console.log(`⚠️ Unknown command: ${commandName}`);
      return;
    }

    // Check permissions
    const command = this.commands.get(commandName);
    if (command?.adminOnly && !this.isAdmin(message.from)) {
      console.log(`🚫 Unauthorized admin command: ${commandName}`);
      return;
    }

    // Create command context
    const context: CommandContext = {
      message,
      args,
      user: message.from,
      chat: message.chat,
      isAdmin: this.isAdmin(message.from),
      isAuthenticated: this.isAuthenticated(message.from),
    };

    // Execute command
    try {
      this.analytics.totalCommands += 1;
      const result = await handler(context);

      if (!result.success && result.error) {
        console.error(`❌ Command failed: ${commandName} - ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Command error: ${commandName}`, error);
      this.analytics.errorRate += 1;
    }
  }

  /**
   * Handle regular messages
   */
  private async handleRegularMessage(message: TelegramMessage): Promise<void> {
    // Regular message handling logic
    console.log(`💬 Regular message from ${message.from.username || message.from.id}`);
  }

  /**
   * Register a command handler
   */
  registerCommand(command: TelegramCommand, handler: TelegramCommandHandler): void {
    this.commands.set(command.name, command);
    this.commandHandlers.set(command.name, handler);

    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commandHandlers.set(alias, handler);
      });
    }

    console.log(`📝 Registered command: /${command.name}`);
  }

  /**
   * Initialize command handlers (to be called by specific command modules)
   */
  private initializeCommandHandlers(): void {
    // This will be populated by command modules
    console.log('📋 Command handlers initialized');
  }

  /**
   * Update user session
   */
  private updateSession(message: TelegramMessage): void {
    const userId = message.from.id;
    const chatId = message.chat.id;

    let session = this.sessions.get(userId);
    if (!session) {
      session = {
        userId,
        chatId,
        startedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        commandCount: 0,
        errors: 0,
        isActive: true,
      };
      this.sessions.set(userId, session);
      this.analytics.totalUsers += 1;
    }

    session.lastActivity = new Date();
    session.messageCount += 1;
    this.analytics.activeUsers = this.sessions.size;
  }

  /**
   * Update response time analytics
   */
  private updateResponseTime(responseTime: number): void {
    // Simple moving average calculation
    const alpha = 0.1; // Smoothing factor
    this.analytics.averageResponseTime =
      this.analytics.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  /**
   * Start analytics tracking
   */
  private startAnalyticsTracking(): void {
    // Update popular commands every hour
    setInterval(
      () => {
        this.updatePopularCommands();
      },
      60 * 60 * 1000
    ); // 1 hour
  }

  /**
   * Update popular commands analytics
   */
  private updatePopularCommands(): void {
    // This would track command usage statistics
    // For now, just log that analytics are being updated
    console.log('📊 Analytics updated');
  }

  /**
   * Check if user is admin
   */
  private isAdmin(user: TelegramUser): boolean {
    if (!this.config.adminUsers) return false;
    return this.config.adminUsers.includes(user.username || user.id.toString());
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(user: TelegramUser): boolean {
    // This would check if the user is linked to a customer account
    // For now, return true for demonstration
    return true;
  }

  /**
   * Get bot analytics
   */
  getAnalytics(): TelegramAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): TelegramSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Get bot configuration
   */
  getConfig(): TelegramBotConfig {
    return { ...this.config };
  }

  /**
   * Check if bot is running
   */
  get isBotRunning(): boolean {
    return this.isRunning;
  }
}
