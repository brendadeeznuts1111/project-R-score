#!/usr/bin/env bun

/**
 * 🔄 Telegram Notification Service
 *
 * Comprehensive notification service for Fire22 Telegram bot
 * Handles queuing, retry logic, batch processing, and error handling
 */

import { Fire22TelegramBot } from '../telegram-bot';

export interface NotificationMessage {
  id: string;
  type: 'wager_update' | 'balance_change' | 'system_alert' | 'weekly_report' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recipient: {
    telegramId?: number;
    username?: string;
  };
  content: {
    text: string;
    parseMode?: 'HTML' | 'Markdown';
    options?: any;
  };
  metadata: {
    createdAt: Date;
    scheduledFor?: Date;
    retryCount: number;
    maxRetries: number;
    lastAttempt?: Date;
    errorMessage?: string;
  };
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
}

export interface NotificationBatch {
  id: string;
  messages: NotificationMessage[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
}

export interface NotificationConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  rateLimit: {
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  queueSize: number;
}

export class TelegramNotificationService {
  private telegramBot: Fire22TelegramBot;
  private config: NotificationConfig;
  private notificationQueue: NotificationMessage[] = [];
  private processingBatch: NotificationBatch | null = null;
  private isProcessing: boolean = false;

  // Rate limiting
  private messageCount: { [key: string]: number } = {};
  private lastReset: { [key: string]: Date } = {};

  // Statistics
  private stats = {
    totalSent: 0,
    totalFailed: 0,
    totalQueued: 0,
    averageProcessingTime: 0,
    queueSize: 0,
  };

  constructor(telegramBot: Fire22TelegramBot, config?: Partial<NotificationConfig>) {
    this.telegramBot = telegramBot;
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      rateLimit: {
        messagesPerMinute: 30,
        messagesPerHour: 1000,
      },
      queueSize: 1000,
      ...config,
    };

    // Start processing queue
    this.startQueueProcessor();
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📤 SEND NOTIFICATIONS
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Send notification to user by telegram ID
   */
  async sendToUser(
    telegramId: number,
    message: string,
    type: NotificationMessage['type'] = 'custom',
    priority: NotificationMessage['priority'] = 'medium'
  ): Promise<string> {
    const notification: NotificationMessage = {
      id: this.generateId(),
      type,
      priority,
      recipient: { telegramId },
      content: { text: message },
      metadata: {
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
      },
      status: 'pending',
    };

    return this.queueNotification(notification);
  }

  /**
   * Send notification to user by username
   */
  async sendToUsername(
    username: string,
    message: string,
    type: NotificationMessage['type'] = 'custom',
    priority: NotificationMessage['priority'] = 'medium'
  ): Promise<string> {
    const notification: NotificationMessage = {
      id: this.generateId(),
      type,
      priority,
      recipient: { username },
      content: { text: message },
      metadata: {
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries,
      },
      status: 'pending',
    };

    return this.queueNotification(notification);
  }

  /**
   * Send scheduled notification
   */
  async sendScheduled(
    telegramId: number,
    message: string,
    scheduledFor: Date,
    type: NotificationMessage['type'] = 'custom'
  ): Promise<string> {
    const notification: NotificationMessage = {
      id: this.generateId(),
      type,
      priority: 'medium',
      recipient: { telegramId },
      content: { text: message },
      metadata: {
        createdAt: new Date(),
        scheduledFor,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
      },
      status: 'pending',
    };

    return this.queueNotification(notification);
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(
    recipients: Array<{ telegramId?: number; username?: string }>,
    message: string,
    type: NotificationMessage['type'] = 'custom'
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const recipient of recipients) {
      const notification: NotificationMessage = {
        id: this.generateId(),
        type,
        priority: 'low', // Bulk messages are lower priority
        recipient,
        content: { text: message },
        metadata: {
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: this.config.maxRetries,
        },
        status: 'pending',
      };

      notificationIds.push(await this.queueNotification(notification));
    }

    return notificationIds;
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🔄 QUEUE MANAGEMENT
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Add notification to queue
   */
  private async queueNotification(notification: NotificationMessage): Promise<string> {
    // Check queue size limit
    if (this.notificationQueue.length >= this.config.queueSize) {
      throw new Error(`Queue size limit reached (${this.config.queueSize})`);
    }

    // Add to queue
    this.notificationQueue.push(notification);
    this.stats.totalQueued++;

    console.log(`📋 Notification queued: ${notification.id} (${notification.type})`);

    return notification.id;
  }

  /**
   * Get notification status
   */
  getNotificationStatus(notificationId: string): NotificationMessage | null {
    const queued = this.notificationQueue.find(n => n.id === notificationId);
    if (queued) return queued;

    if (this.processingBatch) {
      const processing = this.processingBatch.messages.find(n => n.id === notificationId);
      if (processing) return processing;
    }

    return null;
  }

  /**
   * Cancel notification
   */
  cancelNotification(notificationId: string): boolean {
    const index = this.notificationQueue.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notificationQueue[index].status = 'cancelled';
      return true;
    }

    if (this.processingBatch) {
      const batchIndex = this.processingBatch.messages.findIndex(n => n.id === notificationId);
      if (batchIndex !== -1) {
        this.processingBatch.messages[batchIndex].status = 'cancelled';
        return true;
      }
    }

    return false;
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // ⚙️ QUEUE PROCESSOR
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Start queue processing
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.notificationQueue.length > 0) {
        await this.processQueue();
      }
    }, 1000); // Process every second
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Create batch
      const batchSize = Math.min(this.config.batchSize, this.notificationQueue.length);
      const batchMessages = this.notificationQueue.splice(0, batchSize);

      // Filter out cancelled messages
      const activeMessages = batchMessages.filter(msg => msg.status !== 'cancelled');

      if (activeMessages.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Create processing batch
      this.processingBatch = {
        id: this.generateId(),
        messages: activeMessages,
        status: 'processing',
        createdAt: new Date(),
      };

      console.log(
        `🔄 Processing batch ${this.processingBatch.id} with ${activeMessages.length} messages`
      );

      // Process batch
      await this.processBatch(this.processingBatch);

      // Mark batch as completed
      this.processingBatch.status = 'completed';
      this.processingBatch.processedAt = new Date();

      console.log(`✅ Batch ${this.processingBatch.id} completed`);
    } catch (error) {
      console.error('❌ Error processing queue:', error);

      if (this.processingBatch) {
        this.processingBatch.status = 'failed';
      }
    } finally {
      this.processingBatch = null;
      this.isProcessing = false;
    }
  }

  /**
   * Process notification batch
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    const startTime = Date.now();

    for (const notification of batch.messages) {
      if (notification.status === 'cancelled') continue;

      try {
        // Check rate limits
        if (!this.checkRateLimit()) {
          console.warn('⚠️ Rate limit reached, delaying notification');
          await this.delay(1000);
        }

        // Check if scheduled
        if (notification.metadata.scheduledFor && notification.metadata.scheduledFor > new Date()) {
          // Re-queue for later
          this.notificationQueue.push(notification);
          continue;
        }

        // Send notification
        await this.sendNotification(notification);

        // Update stats
        this.stats.totalSent++;
        notification.status = 'sent';

        console.log(`✅ Notification ${notification.id} sent successfully`);
      } catch (error) {
        await this.handleSendError(notification, error);
      }
    }

    // Update processing time
    const processingTime = Date.now() - startTime;
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime + processingTime) / 2;
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    notification.status = 'processing';
    notification.metadata.lastAttempt = new Date();

    try {
      if (notification.recipient.telegramId) {
        await this.telegramBot.sendNotificationById(
          notification.recipient.telegramId,
          notification.content.text
        );
      } else if (notification.recipient.username) {
        await this.telegramBot.sendNotificationByUsername(
          notification.recipient.username,
          notification.content.text
        );
      } else {
        throw new Error('No recipient specified');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle send error with retry logic
   */
  private async handleSendError(notification: NotificationMessage, error: any): Promise<void> {
    notification.metadata.retryCount++;
    notification.metadata.errorMessage = error.message;

    console.error(
      `❌ Notification ${notification.id} failed (attempt ${notification.metadata.retryCount}/${notification.metadata.maxRetries}):`,
      error.message
    );

    if (notification.metadata.retryCount < notification.metadata.maxRetries) {
      // Re-queue for retry
      notification.status = 'pending';
      setTimeout(() => {
        this.notificationQueue.push(notification);
      }, this.config.retryDelay * notification.metadata.retryCount); // Exponential backoff

      console.log(`🔄 Re-queuing notification ${notification.id} for retry`);
    } else {
      // Mark as failed
      notification.status = 'failed';
      this.stats.totalFailed++;

      console.error(
        `💀 Notification ${notification.id} permanently failed after ${notification.metadata.maxRetries} attempts`
      );
    }
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🛡️ RATE LIMITING
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Check rate limits
   */
  private checkRateLimit(): boolean {
    const now = new Date();

    // Reset counters if needed
    if (this.lastReset.minute && now.getTime() - this.lastReset.minute.getTime() > 60000) {
      this.messageCount.minute = 0;
      this.lastReset.minute = now;
    }

    if (this.lastReset.hour && now.getTime() - this.lastReset.hour.getTime() > 3600000) {
      this.messageCount.hour = 0;
      this.lastReset.hour = now;
    }

    // Check limits
    if (this.messageCount.minute >= this.config.rateLimit.messagesPerMinute) {
      return false;
    }

    if (this.messageCount.hour >= this.config.rateLimit.messagesPerHour) {
      return false;
    }

    // Increment counters
    this.messageCount.minute = (this.messageCount.minute || 0) + 1;
    this.messageCount.hour = (this.messageCount.hour || 0) + 1;

    return true;
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 STATISTICS & MONITORING
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.notificationQueue.length,
      isProcessing: this.isProcessing,
      currentBatch: this.processingBatch?.id || null,
      rateLimits: {
        minute: this.messageCount.minute || 0,
        hour: this.messageCount.hour || 0,
      },
      config: this.config,
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const pending = this.notificationQueue.filter(n => n.status === 'pending').length;
    const processing = this.notificationQueue.filter(n => n.status === 'processing').length;
    const failed = this.notificationQueue.filter(n => n.status === 'failed').length;
    const cancelled = this.notificationQueue.filter(n => n.status === 'cancelled').length;

    return {
      total: this.notificationQueue.length,
      pending,
      processing,
      failed,
      cancelled,
      priorityBreakdown: this.getPriorityBreakdown(),
      typeBreakdown: this.getTypeBreakdown(),
    };
  }

  private getPriorityBreakdown() {
    return this.notificationQueue.reduce(
      (acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private getTypeBreakdown() {
    return this.notificationQueue.reduce(
      (acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🛠️ UTILITIES
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old notifications
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    // 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    this.notificationQueue = this.notificationQueue.filter(
      n => n.metadata.createdAt > cutoff || n.status === 'processing'
    );
  }
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎯 PREDEFINED NOTIFICATION TEMPLATES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const NOTIFICATION_TEMPLATES = {
  wagerUpdate: (amount: number, game: string, status: string) => `
🎯 **Wager Update**

💰 **Amount:** $${amount.toLocaleString()}
🎮 **Game:** ${game}
📊 **Status:** ${status}

⏰ **Updated:** ${new Date().toLocaleString()}
  `,

  balanceChange: (oldBalance: number, newBalance: number, reason: string) => `
💰 **Balance Update**

📈 **Previous:** $${oldBalance.toLocaleString()}
📊 **Current:** $${newBalance.toLocaleString()}
${newBalance > oldBalance ? '📈' : '📉'} **Change:** $${Math.abs(newBalance - oldBalance).toLocaleString()}

💡 **Reason:** ${reason}
⏰ **Updated:** ${new Date().toLocaleString()}
  `,

  systemAlert: (
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    const emoji = { low: 'ℹ️', medium: '⚠️', high: '🚨', critical: '💀' }[severity];
    return `
${emoji} **${title}**

${message}

🚨 **Severity:** ${severity.toUpperCase()}
⏰ **Time:** ${new Date().toLocaleString()}
  `;
  },

  weeklyReport: (stats: any) => `
📊 **Weekly Report**

💰 **Total Wagers:** $${stats.totalWagers?.toLocaleString() || 0}
🏆 **Total Wins:** $${stats.totalWins?.toLocaleString() || 0}
📈 **Win Rate:** ${stats.winRate ? (stats.winRate * 100).toFixed(1) + '%' : '0%'}
💵 **Commission:** $${stats.commission?.toLocaleString() || 0}

📅 **Period:** Last 7 days
⏰ **Generated:** ${new Date().toLocaleString()}
  `,
};

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎯 EXPORT DEFAULT
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export default TelegramNotificationService;
