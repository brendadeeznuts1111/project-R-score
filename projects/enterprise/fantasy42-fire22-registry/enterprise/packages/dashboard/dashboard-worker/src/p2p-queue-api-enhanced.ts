#!/usr/bin/env bun

/**
 * 🔥 Fire22 P2P Queue System API - Enhanced with Pattern System
 * Handles peer-to-peer transaction queuing and matching with pattern-based processing
 */

import { WithdrawalQueueSystem } from './queue-system';

// Pattern System Integration
interface PatternSystem {
  applyPattern(patternName: string, context: any): Promise<any>;
  getPerformanceStats(): Promise<any>;
  getMetrics(): Promise<any>;
  getHealthStatus(): Promise<any>;
}

// Enhanced P2P Queue Item with pattern metadata
export interface P2PQueueItemEnhanced extends P2PQueueItem {
  // Pattern processing metadata
  patternMetadata?: {
    processingPatterns: string[];
    performanceMetrics: {
      patternExecutionTime: number;
      patternSuccessRate: number;
      patternCacheHits: number;
    };
    optimizationFlags: {
      useStreaming: boolean;
      useCaching: boolean;
      useParallelProcessing: boolean;
    };
  };
  // Enhanced matching criteria
  matchingCriteria?: {
    preferredPaymentTypes: string[];
    amountTolerance: number;
    timePreference: 'immediate' | 'flexible' | 'scheduled';
    riskProfile: 'low' | 'medium' | 'high';
  };
}

export interface P2PQueueItem {
  id: string;
  type: 'withdrawal' | 'deposit';
  customerId: string;
  amount: number;
  paymentType: string;
  paymentDetails: string;
  priority: number;
  status: 'pending' | 'matched' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  matchedWith?: string;
  notes?: string;
  // Telegram integration fields
  telegramGroupId?: string;
  telegramChatId?: string;
  telegramChannel?: string;
  telegramUsername?: string;
  telegramId?: string;
}

export interface P2PMatchResult {
  id: string;
  withdrawalId: string;
  depositId: string;
  amount: number;
  matchScore: number;
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
  // Telegram notification fields
  telegramGroupId?: string;
  telegramChatId?: string;
  telegramChannel?: string;
  // Enhanced matching metadata
  matchMetadata?: {
    patternScore: number;
    optimizationApplied: string[];
    processingEfficiency: number;
  };
}

export interface P2PQueueStats {
  totalItems: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  matchedPairs: number;
  averageWaitTime: number;
  processingRate: number;
  successRate: number;
  lastUpdated: Date;
  // Enhanced pattern-based metrics
  patternMetrics?: {
    totalPatternExecutions: number;
    averagePatternExecutionTime: number;
    patternSuccessRate: number;
    cacheHitRate: number;
    optimizationImpact: number;
  };
}

export interface P2POptimizationConfig {
  // Pattern processing configuration
  patterns: {
    useStreaming: boolean;
    useCaching: boolean;
    useParallelProcessing: boolean;
    usePredictiveMatching: boolean;
    useRiskAnalysis: boolean;
  };
  // Performance thresholds
  thresholds: {
    maxProcessingTime: number;
    minMatchScore: number;
    maxQueueSize: number;
    maxConcurrentMatches: number;
  };
  // Optimization strategies
  strategies: {
    matchOptimization: 'speed' | 'accuracy' | 'balanced';
    queueOptimization: 'fifo' | 'priority' | 'smart';
    riskOptimization: 'conservative' | 'moderate' | 'aggressive';
  };
}

export class P2PQueueAPIEnhanced {
  private queueSystem: WithdrawalQueueSystem;
  private env: any;
  private patternSystem: PatternSystem | null;
  private optimizationConfig: P2POptimizationConfig;
  private performanceMetrics: Map<string, any>;
  private patternCache: Map<string, any>;

  constructor(env: any, patternSystem?: PatternSystem) {
    this.env = env;
    this.queueSystem = new WithdrawalQueueSystem(env);
    this.patternSystem = patternSystem || null;
    this.performanceMetrics = new Map();
    this.patternCache = new Map();

    // Initialize optimization configuration
    this.optimizationConfig = {
      patterns: {
        useStreaming: true,
        useCaching: true,
        useParallelProcessing: true,
        usePredictiveMatching: true,
        useRiskAnalysis: true,
      },
      thresholds: {
        maxProcessingTime: 5000,
        minMatchScore: 75,
        maxQueueSize: 1000,
        maxConcurrentMatches: 50,
      },
      strategies: {
        matchOptimization: 'balanced',
        queueOptimization: 'smart',
        riskOptimization: 'moderate',
      },
    };
  }

  /**
   * Enhanced withdrawal addition with pattern processing
   */
  async addWithdrawalToQueue(
    withdrawal: Omit<P2PQueueItemEnhanced, 'id' | 'createdAt' | 'status'>
  ): Promise<string> {
    const startTime = performance.now();

    try {
      // Apply pattern-based validation
      if (this.patternSystem) {
        const validationResult = await this.patternSystem.applyPattern('SECURE', {
          operation: 'withdrawal_validation',
          data: withdrawal,
          riskProfile: withdrawal.matchingCriteria?.riskProfile || 'medium',
        });

        if (!validationResult.success) {
          throw new Error(`Pattern validation failed: ${validationResult.error}`);
        }
      }

      // Validate required fields
      if (!withdrawal.customerId || !withdrawal.amount || !withdrawal.paymentType) {
        throw new Error('Missing required fields: customerId, amount, paymentType');
      }

      // Apply pattern-based optimization
      const optimizedWithdrawal = await this.applyOptimizationPatterns(withdrawal, 'withdrawal');

      // Add to queue system
      const queueItem = await this.queueSystem.addToQueue({
        type: 'withdrawal',
        customerId: optimizedWithdrawal.customerId,
        amount: optimizedWithdrawal.amount,
        paymentType: optimizedWithdrawal.paymentType,
        paymentDetails: optimizedWithdrawal.paymentDetails,
        priority: optimizedWithdrawal.priority || 1,
        notes: optimizedWithdrawal.notes,
      });

      // Store enhanced metadata
      await this.storeEnhancedMetadata(queueItem, optimizedWithdrawal);

      // Store additional Telegram data in database
      if (withdrawal.telegramGroupId || withdrawal.telegramChatId || withdrawal.telegramChannel) {
        await this.storeTelegramData(queueItem, withdrawal);
      }

      // Send Telegram notification if configured
      if (withdrawal.telegramGroupId || withdrawal.telegramChatId) {
        await this.notifyTelegram('withdrawal_added', withdrawal);

        // Check for immediate match opportunities with pattern optimization
        await this.checkForImmediateMatchesOptimized(withdrawal);
      }

      // Record performance metrics
      const endTime = performance.now();
      this.recordPerformanceMetric('withdrawal_addition', endTime - startTime, true);

      return queueItem;
    } catch (error) {
      const endTime = performance.now();
      this.recordPerformanceMetric('withdrawal_addition', endTime - startTime, false);
      console.error('Failed to add withdrawal to queue:', error);
      throw error;
    }
  }

  /**
   * Enhanced deposit addition with pattern processing
   */
  async addDepositToQueue(
    deposit: Omit<P2PQueueItemEnhanced, 'id' | 'createdAt' | 'status' | 'type'>
  ): Promise<string> {
    const startTime = performance.now();

    try {
      // Apply pattern-based validation
      if (this.patternSystem) {
        const validationResult = await this.patternSystem.applyPattern('SECURE', {
          operation: 'deposit_validation',
          data: deposit,
          riskProfile: deposit.matchingCriteria?.riskProfile || 'medium',
        });

        if (!validationResult.success) {
          throw new Error(`Pattern validation failed: ${validationResult.error}`);
        }
      }

      // Validate required fields
      if (!deposit.customerId || !deposit.amount || !deposit.paymentType) {
        throw new Error('Missing required fields: customerId, amount, paymentType');
      }

      // Apply pattern-based optimization
      const optimizedDeposit = await this.applyOptimizationPatterns(deposit, 'deposit');

      // Add to queue system
      const queueItem = await this.queueSystem.addDepositToQueue({
        customerId: optimizedDeposit.customerId,
        amount: optimizedDeposit.amount,
        paymentType: optimizedDeposit.paymentType,
        paymentDetails: optimizedDeposit.paymentDetails,
        priority: optimizedDeposit.priority || 1,
        notes: optimizedDeposit.notes,
      });

      // Store enhanced metadata
      await this.storeEnhancedMetadata(queueItem, optimizedDeposit);

      // Store additional Telegram data in database
      if (deposit.telegramGroupId || deposit.telegramChatId || deposit.telegramChannel) {
        await this.storeTelegramData(queueItem, deposit);
      }

      // Send Telegram notification if configured
      if (deposit.telegramGroupId || deposit.telegramChatId) {
        await this.notifyTelegram('deposit_added', deposit);

        // Check for immediate match opportunities with pattern optimization
        await this.checkForImmediateMatchesOptimized(deposit);
      }

      // Record performance metrics
      const endTime = performance.now();
      this.recordPerformanceMetric('deposit_addition', endTime - startTime, true);

      return queueItem;
    } catch (error) {
      const endTime = performance.now();
      this.recordPerformanceMetric('deposit_addition', endTime - startTime, false);
      console.error('Failed to add deposit to queue:', error);
      throw error;
    }
  }

  /**
   * Apply pattern-based optimizations to queue items
   */
  private async applyOptimizationPatterns(
    item: Partial<P2PQueueItemEnhanced>,
    type: 'withdrawal' | 'deposit'
  ): Promise<Partial<P2PQueueItemEnhanced>> {
    const optimized = { ...item };

    if (this.patternSystem) {
      // Apply streaming pattern for large amounts
      if (this.optimizationConfig.patterns.useStreaming && item.amount && item.amount > 1000) {
        const streamResult = await this.patternSystem.applyPattern('STREAM', {
          operation: 'large_amount_processing',
          amount: item.amount,
          type: type,
        });

        if (streamResult.success) {
          optimized.patternMetadata = {
            ...optimized.patternMetadata,
            processingPatterns: [
              ...(optimized.patternMetadata?.processingPatterns || []),
              'STREAM',
            ],
            optimizationFlags: {
              ...optimized.patternMetadata?.optimizationFlags,
              useStreaming: true,
            },
          };
        }
      }

      // Apply caching pattern for repeated payment types
      if (this.optimizationConfig.patterns.useCaching && item.paymentType) {
        const cacheKey = `payment_type_${item.paymentType}`;
        const cachedResult = this.patternCache.get(cacheKey);

        if (cachedResult) {
          optimized.patternMetadata = {
            ...optimized.patternMetadata,
            processingPatterns: [...(optimized.patternMetadata?.processingPatterns || []), 'CACHE'],
            optimizationFlags: {
              ...optimized.patternMetadata?.optimizationFlags,
              useCaching: true,
            },
            performanceMetrics: {
              ...optimized.patternMetadata?.performanceMetrics,
              patternCacheHits:
                (optimized.patternMetadata?.performanceMetrics?.patternCacheHits || 0) + 1,
            },
          };
        }
      }

      // Apply risk analysis pattern
      if (this.optimizationConfig.patterns.useRiskAnalysis) {
        const riskResult = await this.patternSystem.applyPattern('SECURE', {
          operation: 'risk_assessment',
          amount: item.amount,
          paymentType: item.paymentType,
          customerId: item.customerId,
        });

        if (riskResult.success) {
          optimized.matchingCriteria = {
            ...optimized.matchingCriteria,
            riskProfile: riskResult.riskProfile || 'medium',
          };
        }
      }
    }

    return optimized;
  }

  /**
   * Enhanced immediate match checking with pattern optimization
   */
  private async checkForImmediateMatchesOptimized(
    item: Partial<P2PQueueItemEnhanced>
  ): Promise<void> {
    try {
      if (this.patternSystem) {
        // Apply timing pattern for performance measurement
        const timingResult = await this.patternSystem.applyPattern('TIMING', async () => {
          return await this.checkForImmediateMatches(item);
        });

        // Apply tabular pattern for match analysis
        if (timingResult.success) {
          const analysisResult = await this.patternSystem.applyPattern('TABULAR', {
            operation: 'match_analysis',
            data: timingResult.result,
            patterns: item.patternMetadata?.processingPatterns || [],
          });

          // Cache the analysis result
          if (analysisResult.success) {
            this.patternCache.set(`match_analysis_${item.customerId}`, analysisResult);
          }
        }
      } else {
        // Fallback to original method
        await this.checkForImmediateMatches(item);
      }
    } catch (error) {
      console.error('Failed to check for immediate matches with optimization:', error);
    }
  }

  /**
   * Store enhanced metadata for queue items
   */
  private async storeEnhancedMetadata(
    queueItemId: string,
    item: Partial<P2PQueueItemEnhanced>
  ): Promise<void> {
    try {
      if (item.patternMetadata || item.matchingCriteria) {
        await this.env.DB.prepare(
          `
          INSERT OR REPLACE INTO enhanced_metadata (
            queue_item_id, pattern_metadata, matching_criteria, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `
        )
          .bind(
            queueItemId,
            JSON.stringify(item.patternMetadata || {}),
            JSON.stringify(item.matchingCriteria || {})
          )
          .run();
      }
    } catch (error) {
      console.error('Failed to store enhanced metadata:', error);
    }
  }

  /**
   * Record performance metrics for pattern operations
   */
  private recordPerformanceMetric(operation: string, duration: number, success: boolean): void {
    const metric = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      patternSystem: this.patternSystem ? 'enabled' : 'disabled',
    };

    this.performanceMetrics.set(`${operation}_${Date.now()}`, metric);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.size > 1000) {
      const keys = Array.from(this.performanceMetrics.keys());
      keys.slice(0, keys.length - 1000).forEach(key => this.performanceMetrics.delete(key));
    }
  }

  /**
   * Get enhanced queue statistics with pattern metrics
   */
  async getEnhancedQueueStats(): Promise<P2PQueueStats> {
    try {
      const baseStats = await this.getQueueStats();

      // Calculate pattern-based metrics
      const patternMetrics = this.calculatePatternMetrics();

      // Get pattern system health if available
      let patternHealth = null;
      if (this.patternSystem) {
        try {
          patternHealth = await this.patternSystem.getHealthStatus();
        } catch (error) {
          console.error('Failed to get pattern system health:', error);
        }
      }

      return {
        ...baseStats,
        patternMetrics: {
          totalPatternExecutions: this.performanceMetrics.size,
          averagePatternExecutionTime: this.calculateAverageExecutionTime(),
          patternSuccessRate: this.calculateSuccessRate(),
          cacheHitRate: this.calculateCacheHitRate(),
          optimizationImpact: this.calculateOptimizationImpact(),
          patternSystemHealth: patternHealth,
        },
      };
    } catch (error) {
      console.error('Failed to get enhanced queue stats:', error);
      throw error;
    }
  }

  /**
   * Calculate pattern performance metrics
   */
  private calculatePatternMetrics(): any {
    const metrics = Array.from(this.performanceMetrics.values());

    if (metrics.length === 0) {
      return {
        totalExecutions: 0,
        averageExecutionTime: 0,
        successRate: 0,
      };
    }

    const successfulMetrics = metrics.filter(m => m.success);
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalExecutions: metrics.length,
      averageExecutionTime: totalTime / metrics.length,
      successRate: (successfulMetrics.length / metrics.length) * 100,
    };
  }

  /**
   * Calculate average execution time
   */
  private calculateAverageExecutionTime(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / metrics.length;
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 0;

    const successfulMetrics = metrics.filter(m => m.success);
    return (successfulMetrics.length / metrics.length) * 100;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 0;

    // This would need to be implemented based on actual cache usage
    return 0;
  }

  /**
   * Calculate optimization impact
   */
  private calculateOptimizationImpact(): number {
    const metrics = Array.from(this.performanceMetrics.values());
    if (metrics.length === 0) return 0;

    // Calculate improvement over baseline
    const baselineTime = 100; // Assume 100ms baseline
    const averageTime = this.calculateAverageExecutionTime();

    if (averageTime === 0) return 0;

    return ((baselineTime - averageTime) / baselineTime) * 100;
  }

  /**
   * Get optimization configuration
   */
  getOptimizationConfig(): P2POptimizationConfig {
    return { ...this.optimizationConfig };
  }

  /**
   * Update optimization configuration
   */
  updateOptimizationConfig(config: Partial<P2POptimizationConfig>): void {
    this.optimizationConfig = {
      ...this.optimizationConfig,
      ...config,
    };
  }

  /**
   * Get pattern system performance metrics
   */
  async getPatternSystemMetrics(): Promise<any> {
    if (!this.patternSystem) {
      return { error: 'Pattern system not available' };
    }

    try {
      const [performanceStats, metrics, health] = await Promise.all([
        this.patternSystem.getPerformanceStats(),
        this.patternSystem.getMetrics(),
        this.patternSystem.getHealthStatus(),
      ]);

      return {
        performanceStats,
        metrics,
        health,
        queueMetrics: this.calculatePatternMetrics(),
        optimizationConfig: this.optimizationConfig,
      };
    } catch (error) {
      console.error('Failed to get pattern system metrics:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ... existing methods from P2PQueueAPI ...
  // Note: The rest of the methods would be implemented similarly to the original P2PQueueAPI
  // but with pattern system integration where appropriate

  /**
   * Store Telegram data for queue item
   */
  private async storeTelegramData(
    queueItemId: string,
    item: Partial<P2PQueueItemEnhanced>
  ): Promise<void> {
    try {
      await this.env.DB.prepare(
        `
        INSERT OR REPLACE INTO telegram_data (
          queue_item_id, telegram_group_id, telegram_chat_id, 
          telegram_channel, telegram_username, telegram_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
      )
        .bind(
          queueItemId,
          item.telegramGroupId || null,
          item.telegramChatId || null,
          item.telegramChannel || null,
          item.telegramUsername || null,
          item.telegramId || null
        )
        .run();
    } catch (error) {
      console.error('Failed to store Telegram data:', error);
    }
  }

  /**
   * Send Telegram notification
   */
  private async notifyTelegram(event: string, item: Partial<P2PQueueItemEnhanced>): Promise<void> {
    try {
      // Get Telegram bot instance from environment
      const telegramBot = this.env.TELEGRAM_BOT;
      if (!telegramBot) {
        return;
      }

      const chatId = item.telegramGroupId || item.telegramChatId;
      if (!chatId) {
        return;
      }

      let message = '';
      let keyboard = null;

      switch (event) {
        case 'withdrawal_added':
          message =
            `🎯 **New Withdrawal Added to P2P Queue**\n\n` +
            `💰 **Amount:** $${item.amount}\n` +
            `💳 **Payment Type:** ${item.paymentType}\n` +
            `📝 **Details:** ${item.paymentDetails}\n` +
            `⏰ **Priority:** ${item.priority}\n` +
            `🆔 **Customer:** ${item.customerId}\n\n` +
            `_Waiting for deposit match..._`;

          keyboard = {
            inline_keyboard: [
              [
                { text: '🔍 View Match Opportunities', callback_data: 'p2p_matches' },
                { text: '📊 Queue Status', callback_data: 'p2p_status' },
              ],
            ],
          };
          break;

        case 'deposit_added':
          message =
            `💸 **New Deposit Added to P2P Queue**\n\n` +
            `💰 **Amount:** $${item.amount}\n` +
            `💳 **Payment Type:** ${item.paymentType}\n` +
            `📝 **Details:** ${item.paymentDetails}\n` +
            `⏰ **Priority:** ${item.priority}\n` +
            `🆔 **Customer:** ${item.customerId}\n\n` +
            `_Looking for withdrawal match..._`;

          keyboard = {
            inline_keyboard: [
              [
                { text: '🔍 View Match Opportunities', callback_data: 'p2p_matches' },
                { text: '📊 Queue Status', callback_data: 'p2p_status' },
              ],
            ],
          };
          break;

        default:
          message =
            `📢 **P2P Queue Update**\n\n` +
            `💰 **Amount:** $${item.amount}\n` +
            `💳 **Payment Type:** ${item.paymentType}\n` +
            `📝 **Event:** ${event}\n\n` +
            `_Check queue status for details_`;
      }

      // Send message with keyboard if available
      if (keyboard) {
        await telegramBot.sendMessage({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } else {
        await telegramBot.sendMessage({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      console.error(
        'Failed to send Telegram notification:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check for immediate matches (placeholder implementation)
   */
  private async checkForImmediateMatches(item: Partial<P2PQueueItemEnhanced>): Promise<void> {
    // This would implement the actual matching logic
    // For now, just log that we're checking
  }

  /**
   * Get basic queue statistics (placeholder implementation)
   */
  private async getQueueStats(): Promise<any> {
    // This would implement the actual stats logic
    // For now, return mock data
    return {
      totalItems: 0,
      pendingWithdrawals: 0,
      pendingDeposits: 0,
      matchedPairs: 0,
      averageWaitTime: 0,
      processingRate: 0,
      successRate: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get P2P queue items with filtering
   */
  async getQueueItems(
    filters: {
      type?: 'withdrawal' | 'deposit';
      paymentType?: string;
      minAmount?: number;
      maxAmount?: number;
      telegramGroupId?: string;
      telegramChatId?: string;
      telegramChannel?: string;
      status?: string;
      customerId?: string;
      usePatternOptimization?: boolean;
    } = {}
  ): Promise<P2PQueueItemEnhanced[]> {
    try {
      let sql = `
        SELECT 
          qi.*,
          COALESCE(tg.telegram_group_id, '') as telegramGroupId,
          COALESCE(tg.telegram_chat_id, '') as telegramChatId,
          COALESCE(tg.telegram_channel, '') as telegramChannel,
          COALESCE(tg.telegram_username, '') as telegramUsername,
          COALESCE(tg.telegram_id, '') as telegramId,
          COALESCE(em.pattern_metadata, '{}') as patternMetadata,
          COALESCE(em.matching_criteria, '{}') as matchingCriteria
        FROM queue_items qi
        LEFT JOIN telegram_data tg ON qi.id = tg.queue_item_id
        LEFT JOIN enhanced_metadata em ON qi.id = em.queue_item_id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (filters.type) {
        sql += ` AND qi.type = $${paramIndex++}`;
        params.push(filters.type);
      }

      if (filters.paymentType) {
        sql += ` AND qi.payment_type = $${paramIndex++}`;
        params.push(filters.paymentType);
      }

      if (filters.minAmount) {
        sql += ` AND qi.amount >= $${paramIndex++}`;
        params.push(filters.minAmount);
      }

      if (filters.maxAmount) {
        sql += ` AND qi.amount <= $${paramIndex++}`;
        params.push(filters.maxAmount);
      }

      if (filters.telegramGroupId) {
        sql += ` AND tg.telegram_group_id = $${paramIndex++}`;
        params.push(filters.telegramGroupId);
      }

      if (filters.telegramChatId) {
        sql += ` AND tg.telegram_chat_id = $${paramIndex++}`;
        params.push(filters.telegramChatId);
      }

      if (filters.telegramChannel) {
        sql += ` AND tg.telegram_channel = $${paramIndex++}`;
        params.push(filters.telegramChannel);
      }

      if (filters.status) {
        sql += ` AND qi.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.customerId) {
        sql += ` AND qi.customer_id = $${paramIndex++}`;
        params.push(filters.customerId);
      }

      sql += ` ORDER BY qi.created_at ASC`;

      const result = await this.env.DB.prepare(sql)
        .bind(...params)
        .all();

      return result.results.map(row => ({
        id: row.id,
        type: row.type,
        customerId: row.customer_id,
        amount: row.amount,
        paymentType: row.payment_type,
        paymentDetails: row.payment_details,
        priority: row.priority,
        status: row.status,
        createdAt: new Date(row.created_at),
        matchedWith: row.matched_with,
        notes: row.notes,
        telegramGroupId: row.telegramGroupId || undefined,
        telegramChatId: row.telegramChatId || undefined,
        telegramChannel: row.telegramChannel || undefined,
        telegramUsername: row.telegramUsername || undefined,
        telegramId: row.telegramId || undefined,
        patternMetadata: row.patternMetadata ? JSON.parse(row.patternMetadata) : undefined,
        matchingCriteria: row.matchingCriteria ? JSON.parse(row.matchingCriteria) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get queue items:', error);
      throw error;
    }
  }

  // ... other methods would be implemented similarly ...
}
