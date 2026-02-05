#!/usr/bin/env bun

/**
 * 🔥 Fire22 P2P Queue System API
 * Handles peer-to-peer transaction queuing and matching
 */

import { WithdrawalQueueSystem } from './queue-system';
import { D1Database } from '@cloudflare/workers-types';

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
}

export class P2PQueueAPI {
  private queueSystem: WithdrawalQueueSystem;
  private env: { DB: D1Database };

  constructor(env: { DB: D1Database }) {
    this.env = env;
    this.queueSystem = new WithdrawalQueueSystem(env);
  }

  /**
   * Add withdrawal to P2P queue
   */
  async addWithdrawalToQueue(
    withdrawal: Omit<P2PQueueItem, 'id' | 'createdAt' | 'status'>
  ): Promise<string> {
    try {
      // Validate required fields
      if (!withdrawal.customerId || !withdrawal.amount || !withdrawal.paymentType) {
        throw new Error('Missing required fields: customerId, amount, paymentType');
      }

      // Add to queue system
      const queueItem = await this.queueSystem.addItemToQueue({
        type: 'withdrawal',
        customerId: withdrawal.customerId,
        amount: withdrawal.amount,
        paymentType: withdrawal.paymentType,
        paymentDetails: withdrawal.paymentDetails,
        priority: withdrawal.priority || 1,
        notes: withdrawal.notes,
      });

      // Store additional Telegram data in database
      if (withdrawal.telegramGroupId || withdrawal.telegramChatId || withdrawal.telegramChannel) {
        await this.storeTelegramData(queueItem, withdrawal);
      }

      // Send Telegram notification if configured
      if (withdrawal.telegramGroupId || withdrawal.telegramChatId) {
        await this.notifyTelegram('withdrawal_added', withdrawal);
      }

      return queueItem;
    } catch (error) {
      console.error('Failed to add withdrawal to queue:', error);
      throw error;
    }
  }

  /**
   * Add deposit to P2P queue
   */
  async addDepositToQueue(
    deposit: Omit<P2PQueueItem, 'id' | 'createdAt' | 'status' | 'type'>
  ): Promise<string> {
    try {
      // Validate required fields
      if (!deposit.customerId || !deposit.amount || !deposit.paymentType) {
        throw new Error('Missing required fields: customerId, amount, paymentType');
      }

      // Add to queue system
      const queueItem = await this.queueSystem.addItemToQueue({
        type: 'deposit',
        customerId: deposit.customerId,
        amount: deposit.amount,
        paymentType: deposit.paymentType,
        paymentDetails: deposit.paymentDetails,
        priority: deposit.priority || 1,
        notes: deposit.notes,
      });

      // Store additional Telegram data in database
      if (deposit.telegramGroupId || deposit.telegramChatId || deposit.telegramChannel) {
        await this.storeTelegramData(queueItem, deposit);
      }

      // Send Telegram notification if configured
      if (deposit.telegramGroupId || deposit.telegramChatId) {
        await this.notifyTelegram('deposit_added', deposit);
      }

      return queueItem;
    } catch (error) {
      console.error('Failed to add deposit to queue:', error);
      throw error;
    }
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
    } = {}
  ): Promise<P2PQueueItem[]> {
    try {
      let sql = `
        SELECT 
          qi.*,
          COALESCE(tg.telegram_group_id, '') as telegramGroupId,
          COALESCE(tg.telegram_chat_id, '') as telegramChatId,
          COALESCE(tg.telegram_channel, '') as telegramChannel,
          COALESCE(tg.telegram_username, '') as telegramUsername,
          COALESCE(tg.telegram_id, '') as telegramId
        FROM queue_items qi
        LEFT JOIN telegram_data tg ON qi.id = tg.queue_item_id
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
        id: row.id as string,
        type: row.type as 'withdrawal' | 'deposit',
        customerId: row.customer_id as string,
        amount: row.amount as number,
        paymentType: row.payment_type as string,
        paymentDetails: row.payment_details as string,
        priority: row.priority as number,
        status: row.status as 'pending' | 'matched' | 'processing' | 'completed' | 'failed',
        createdAt: new Date(row.created_at as string),
        matchedWith: (row.matched_with as string) || undefined,
        notes: (row.notes as string) || undefined,
        telegramGroupId: (row.telegramGroupId as string) || undefined,
        telegramChatId: (row.telegramChatId as string) || undefined,
        telegramChannel: (row.telegramChannel as string) || undefined,
        telegramUsername: (row.telegramUsername as string) || undefined,
        telegramId: (row.telegramId as string) || undefined,
      }));
    } catch (error) {
      console.error('Failed to get queue items:', error);
      throw error;
    }
  }

  /**
   * Get matching opportunities
   */
  async getMatchingOpportunities(): Promise<P2PMatchResult[]> {
    try {
      const sql = `
        SELECT 
          m.*,
          w.amount as withdrawal_amount,
          d.amount as deposit_amount,
          w.payment_type,
          w.created_at as withdrawal_created,
          d.created_at as deposit_created,
          COALESCE(tg.telegram_group_id, '') as telegramGroupId,
          COALESCE(tg.telegram_chat_id, '') as telegramChatId,
          COALESCE(tg.telegram_channel, '') as telegramChannel
        FROM queue_matches m
        JOIN queue_items w ON m.withdrawal_id = w.id
        JOIN queue_items d ON m.deposit_id = d.id
        LEFT JOIN telegram_data tg ON w.id = tg.queue_item_id
        WHERE m.status = 'pending'
        ORDER BY m.match_score DESC, m.created_at ASC
      `;

      const result = await this.env.DB.prepare(sql).all();

      return result.results.map(row => ({
        id: row.id as string,
        withdrawalId: row.withdrawal_id as string,
        depositId: row.deposit_id as string,
        amount: row.amount as number,
        matchScore: row.match_score as number,
        processingTime: row.processing_time as number,
        status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
        createdAt: new Date(row.created_at as string),
        completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
        notes: (row.notes as string) || undefined,
        telegramGroupId: (row.telegramGroupId as string) || undefined,
        telegramChatId: (row.telegramChatId as string) || undefined,
        telegramChannel: (row.telegramChannel as string) || undefined,
      }));
    } catch (error) {
      console.error('Failed to get matching opportunities:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<P2PQueueStats> {
    try {
      const statsSql = `
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN 1 ELSE 0 END) as pending_withdrawals,
          SUM(CASE WHEN type = 'deposit' AND status = 'pending' THEN 1 ELSE 0 END) as pending_deposits,
          SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched_pairs
        FROM queue_items
      `;

      const metricsSql = `
        SELECT 
          AVG(CASE WHEN status = 'completed' THEN 
            (julianday(updated_at) - julianday(created_at)) * 24 * 60 
          END) as avg_wait_time,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate
        FROM queue_items
        WHERE created_at >= datetime('now', '-24 hours')
      `;

      const [statsResult, metricsResult] = await Promise.all([
        this.env.DB.prepare(statsSql).first() as Promise<{
          total_items: number;
          pending_withdrawals: number;
          pending_deposits: number;
          matched_pairs: number;
        } | null>,
        this.env.DB.prepare(metricsSql).first() as Promise<{
          avg_wait_time: number;
          success_rate: number;
        } | null>,
      ]);

      return {
        totalItems: statsResult?.total_items || 0,
        pendingWithdrawals: statsResult?.pending_withdrawals || 0,
        pendingDeposits: statsResult?.pending_deposits || 0,
        matchedPairs: statsResult?.matched_pairs || 0,
        averageWaitTime: metricsResult?.avg_wait_time || 0,
        processingRate: 0, // Calculate based on your business logic
        successRate: Math.round(metricsResult?.success_rate || 0),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Approve a match
   */
  async approveMatch(matchId: string): Promise<boolean> {
    try {
      // Update match status
      await this.env.DB.prepare(
        `
        UPDATE queue_matches 
        SET status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(matchId)
        .run();

      // Get match details for notification
      const match = await this.env.DB.prepare(
        `
        SELECT * FROM queue_matches WHERE id = ?
      `
      )
        .bind(matchId)
        .first();

      if (match) {
        // Update related queue items
        await this.env.DB.prepare(
          `
          UPDATE queue_items 
          SET status = 'processing', updated_at = datetime('now')
          WHERE id IN (?, ?)
        `
        )
          .bind(match.withdrawal_id, match.deposit_id)
          .run();

        // Send Telegram notification
        await this.notifyMatchApproved(match);
      }

      return true;
    } catch (error) {
      console.error('Failed to approve match:', error);
      throw error;
    }
  }

  /**
   * Reject a match
   */
  async rejectMatch(matchId: string, reason?: string): Promise<boolean> {
    try {
      // Update match status
      await this.env.DB.prepare(
        `
        UPDATE queue_matches 
        SET status = 'failed', notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(reason || 'Rejected by admin', matchId)
        .run();

      // Reset related queue items to pending
      const match = await this.env.DB.prepare(
        `
        SELECT * FROM queue_matches WHERE id = ?
      `
      )
        .bind(matchId)
        .first();

      if (match) {
        await this.env.DB.prepare(
          `
          UPDATE queue_items 
          SET status = 'pending', matched_with = NULL, updated_at = datetime('now')
          WHERE id IN (?, ?)
        `
        )
          .bind(match.withdrawal_id, match.deposit_id)
          .run();
      }

      return true;
    } catch (error) {
      console.error('Failed to reject match:', error);
      throw error;
    }
  }

  /**
   * Update queue item
   */
  async updateQueueItem(itemId: string, updates: Partial<P2PQueueItem>): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        params.push(updates.notes);
      }

      if (updates.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        params.push(updates.priority);
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(updates.status);
      }

      if (updateFields.length === 0) {
        return true; // No updates
      }

      updateFields.push(`updated_at = datetime('now')`);
      params.push(itemId);

      const sql = `
        UPDATE queue_items 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await this.env.DB.prepare(sql)
        .bind(...params)
        .run();

      // Update Telegram data if provided
      if (updates.telegramGroupId || updates.telegramChatId || updates.telegramChannel) {
        await this.updateTelegramData(itemId, updates);
      }

      return true;
    } catch (error) {
      console.error('Failed to update queue item:', error);
      throw error;
    }
  }

  /**
   * Cancel queue item
   */
  async cancelQueueItem(itemId: string, reason?: string): Promise<boolean> {
    try {
      // Update item status
      await this.env.DB.prepare(
        `
        UPDATE queue_items 
        SET status = 'failed', notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      )
        .bind(reason || 'Cancelled by admin', itemId)
        .first();

      // Remove from any pending matches
      await this.env.DB.prepare(
        `
        UPDATE queue_matches 
        SET status = 'failed', notes = ?, updated_at = datetime('now')
        WHERE (withdrawal_id = ? OR deposit_id = ?) AND status = 'pending'
      `
      )
        .bind('Cancelled due to item cancellation', itemId, itemId)
        .run();

      return true;
    } catch (error) {
      console.error('Failed to cancel queue item:', error);
      throw error;
    }
  }

  /**
   * Store Telegram data for queue item
   */
  private async storeTelegramData(queueItemId: string, item: Partial<P2PQueueItem>): Promise<void> {
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
   * Update Telegram data for queue item
   */
  private async updateTelegramData(
    queueItemId: string,
    updates: Partial<P2PQueueItem>
  ): Promise<void> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.telegramGroupId !== undefined) {
        updateFields.push(`telegram_group_id = $${paramIndex++}`);
        params.push(updates.telegramGroupId);
      }

      if (updates.telegramChatId !== undefined) {
        updateFields.push(`telegram_chat_id = $${paramIndex++}`);
        params.push(updates.telegramChatId);
      }

      if (updates.telegramChannel !== undefined) {
        updateFields.push(`telegram_channel = $${paramIndex++}`);
        params.push(updates.telegramChannel);
      }

      if (updates.telegramUsername !== undefined) {
        updateFields.push(`telegram_username = $${paramIndex++}`);
        params.push(updates.telegramUsername);
      }

      if (updates.telegramId !== undefined) {
        updateFields.push(`telegram_id = $${paramIndex++}`);
        params.push(updates.telegramId);
      }

      if (updateFields.length === 0) return;

      updateFields.push(`updated_at = datetime('now')`);
      params.push(queueItemId);

      const sql = `
        UPDATE telegram_data 
        SET ${updateFields.join(', ')}
        WHERE queue_item_id = $${paramIndex}
      `;

      await this.env.DB.prepare(sql)
        .bind(...params)
        .run();
    } catch (error) {
      console.error('Failed to update Telegram data:', error);
    }
  }

  /**
   * Send Telegram notification
   */
  private async notifyTelegram(event: string, item: Partial<P2PQueueItem>): Promise<void> {
    try {
      // This would integrate with your existing Telegram bot system
      // Example implementation:
      // await this.env.TELEGRAM_BOT.sendMessage({
      //   chat_id: item.telegramGroupId || item.telegramChatId,
      //   text: `New ${item.type} added to P2P queue: $${item.amount} via ${item.paymentType}`
      // });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  /**
   * Notify when match is approved
   */
  private async notifyMatchApproved(match: any): Promise<void> {
    try {
      // This would integrate with your existing Telegram bot system
      // await this.env.TELEGRAM_BOT.sendMessage({
      //   chat_id: match.telegramGroupId || match.telegramChatId,
      //   text: `P2P match approved! Amount: $${match.amount}`
      // });
    } catch (error) {
      console.error('Failed to send match approval notification:', error);
    }
  }
}

/**
 * Create P2P Queue API instance
 */
export function createP2PQueueAPI(env: any): P2PQueueAPI {
  return new P2PQueueAPI(env);
}
