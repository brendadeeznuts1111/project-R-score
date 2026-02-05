/**
 * 🔥 Fire22 System Integration Controller
 * Central hub that wires together all system components
 */

// import { createFire22TelegramBot, Fire22TelegramBot } from '../telegram-bot'; // Disabled for Cloudflare Workers compatibility
import { Env } from '../env';

export interface SystemConfig {
  enableTelegram: boolean;
  enableRealTimeUpdates: boolean;
  enableNotifications: boolean;
  adminUsers: string[];
  environment: 'development' | 'production';
}

export interface SystemStatus {
  dashboard: 'online' | 'offline' | 'error';
  telegramBot: 'online' | 'offline' | 'error';
  database: 'connected' | 'disconnected' | 'error';
  notifications: 'active' | 'inactive' | 'error';
  realTimeUpdates: 'active' | 'inactive' | 'error';
}

export class Fire22SystemController {
  private telegramBot: any | null = null;
  private config: SystemConfig;
  private env: Env;
  private status: SystemStatus;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(env: Env, config: Partial<SystemConfig> = {}) {
    this.env = env;
    this.config = {
      enableTelegram: config.enableTelegram ?? true,
      enableRealTimeUpdates: config.enableRealTimeUpdates ?? true,
      enableNotifications: config.enableNotifications ?? true,
      adminUsers: config.adminUsers ?? ['admin'],
      environment: (env.NODE_ENV as any) ?? 'development',
    };

    this.status = {
      dashboard: 'offline',
      telegramBot: 'offline',
      database: 'disconnected',
      notifications: 'inactive',
      realTimeUpdates: 'inactive',
    };
  }

  /**
   * Initialize the complete system
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Initialize Telegram bot if enabled
      if (this.config.enableTelegram && this.env.BOT_TOKEN) {
        await this.initializeTelegramBot();
      }

      // Initialize notification system
      if (this.config.enableNotifications) {
        await this.initializeNotifications();
      }

      // Initialize real-time updates
      if (this.config.enableRealTimeUpdates) {
        await this.initializeRealTimeUpdates();
      }

      // Mark dashboard as online
      this.status.dashboard = 'online';

      await this.broadcastSystemEvent('system:initialized', { status: this.status });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fire22 System:', error);
      return false;
    }
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      if (this.env.DB) {
        // Test database connection
        await this.env.DB.prepare('SELECT 1').first();
        this.status.database = 'connected';
      } else {
        this.status.database = 'disconnected';
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.status.database = 'error';
    }
  }

  /**
   * Initialize Telegram bot
   */
  private async initializeTelegramBot(): Promise<void> {
    try {
      if (!this.env.BOT_TOKEN) {
        return;
      }

      // Telegram bot disabled for Cloudflare Workers compatibility
      this.status.telegramBot = 'disabled';

      // using fetch API instead of Deno imports
    } catch (error) {
      console.error('❌ Telegram bot initialization failed:', error);
      this.status.telegramBot = 'error';
    }
  }

  /**
   * Initialize notification system
   */
  private async initializeNotifications(): Promise<void> {
    try {
      // Set up notification channels
      this.addEventListener('user:login', this.handleUserLogin.bind(this));
      this.addEventListener('wager:placed', this.handleWagerPlaced.bind(this));
      this.addEventListener('balance:changed', this.handleBalanceChanged.bind(this));
      this.addEventListener('system:alert', this.handleSystemAlert.bind(this));

      this.status.notifications = 'active';
    } catch (error) {
      console.error('❌ Notification system initialization failed:', error);
      this.status.notifications = 'error';
    }
  }

  /**
   * Initialize real-time updates
   */
  private async initializeRealTimeUpdates(): Promise<void> {
    try {
      // Set up real-time event broadcasting
      this.addEventListener('data:updated', this.broadcastDataUpdate.bind(this));
      this.addEventListener('agent:performance', this.broadcastAgentUpdate.bind(this));

      this.status.realTimeUpdates = 'active';
    } catch (error) {
      console.error('❌ Real-time updates initialization failed:', error);
      this.status.realTimeUpdates = 'error';
    }
  }

  /**
   * Wire Telegram bot events to system events
   */
  private wireTelegramBotEvents(): void {
    if (!this.telegramBot) return;

    // Set API handler for the bot
    const { createUnifiedAPIHandler } = require('../api/unified-endpoints');
    const apiHandler = createUnifiedAPIHandler(this.env);
    this.telegramBot.setAPIHandler(apiHandler, this.env);

    // Forward system events to Telegram bot
    this.addEventListener('system:alert', async data => {
      await this.telegramBot?.notifyAdmins(`🚨 System Alert: ${data.message}`);
    });

    this.addEventListener('user:login', async data => {
      if (data.isAdmin) {
        await this.telegramBot?.notifyAdmins(`👤 Admin login: ${data.username}`);
      }
    });
  }

  /**
   * Event system for inter-component communication
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Broadcast system event
   */
  async broadcastSystemEvent(event: string, data: any): Promise<void> {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        await listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Handle user login events
   */
  private async handleUserLogin(data: any): Promise<void> {
    // Send notification if Telegram bot is available
    if (this.telegramBot && data.telegramId) {
      await this.telegramBot.sendNotificationById(
        data.telegramId,
        `✅ Successfully logged into Fire22 Dashboard`
      );
    }
  }

  /**
   * Handle wager placed events
   */
  private async handleWagerPlaced(data: any): Promise<void> {
    // Broadcast to dashboard
    await this.broadcastDataUpdate({
      type: 'wager',
      data: data,
    });

    // Send Telegram notification
    if (this.telegramBot && data.telegramId) {
      await this.telegramBot.sendNotificationById(
        data.telegramId,
        `🎯 Wager placed: $${data.amount} on ${data.selection}`
      );
    }
  }

  /**
   * Handle balance changed events
   */
  private async handleBalanceChanged(data: any): Promise<void> {
    // Send Telegram notification for significant changes
    if (this.telegramBot && data.telegramId && Math.abs(data.change) > 100) {
      await this.telegramBot.sendNotificationById(
        data.telegramId,
        `💰 Balance update: ${data.change > 0 ? '+' : ''}$${data.change}`
      );
    }
  }

  /**
   * Handle system alerts
   */
  private async handleSystemAlert(data: any): Promise<void> {
    // Broadcast to all admin channels
    if (this.telegramBot) {
      await this.telegramBot.notifyAdmins(`🚨 ${data.message}`);
    }
  }

  /**
   * Broadcast data updates to dashboard
   */
  private async broadcastDataUpdate(data: any): Promise<void> {
    // This would integrate with WebSocket/SSE for real-time dashboard updates
  }

  /**
   * Broadcast agent update event
   */
  private async broadcastAgentUpdate(data: any): Promise<void> {
    // This would integrate with WebSocket/SSE for real-time agent performance updates
  }

  /**
   * Get system status
   */
  getSystemStatus(): SystemStatus {
    return { ...this.status };
  }

  /**
   * Get Telegram bot instance
   */
  getTelegramBot(): any | null {
    return this.telegramBot;
  }

  /**
   * Shutdown system gracefully
   */
  async shutdown(): Promise<void> {
    if (this.telegramBot) {
      await this.telegramBot.stop();
    }

    this.status = {
      dashboard: 'offline',
      telegramBot: 'offline',
      database: 'disconnected',
      notifications: 'inactive',
      realTimeUpdates: 'inactive',
    };
  }
}

/**
 * Create and initialize the system controller
 */
export async function createSystemController(
  env: Env,
  config?: Partial<SystemConfig>
): Promise<Fire22SystemController> {
  const controller = new Fire22SystemController(env, config);
  await controller.initialize();
  return controller;
}
