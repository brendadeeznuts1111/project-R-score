#!/usr/bin/env bun

/**
 * Queue System for Withdrawals and Peer-to-Peer Matching
 *
 * This system manages withdrawal requests in a queue and matches them
 * with available deposits for peer-to-peer transactions.
 */

export interface QueueItem {
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
}

export interface MatchResult {
  withdrawalId: string;
  depositId: string;
  amount: number;
  matchScore: number;
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface QueueStats {
  totalItems: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  matchedPairs: number;
  averageWaitTime: number;
  processingRate: number;
  lastUpdated: Date;
}

export class WithdrawalQueueSystem {
  private queue: Map<string, QueueItem> = new Map();
  private matches: Map<string, MatchResult> = new Map();
  private processingQueue: QueueItem[] = [];
  private maxRetries = 3;
  private matchTimeout = 300000; // 5 minutes

  constructor(private env: any) {}

  /**
   * Add item to queue
   */
  async addItemToQueue(item: Omit<QueueItem, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();
    const queueItem: QueueItem = {
      ...item,
      id,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.set(id, queueItem);

    // Log to database
    await this.logQueueItem(queueItem);

    // Try to find immediate match
    await this.attemptMatch(queueItem);

    return id;
  }

  /**
   * Attempt to match withdrawal with available deposits
   */
  private async attemptMatch(item: QueueItem): Promise<MatchResult | null> {
    if (item.type === 'withdrawal') {
      return await this.matchWithdrawalToDeposit(item);
    } else {
      return await this.matchDepositToWithdrawal(item);
    }
  }

  /**
   * Match withdrawal with best available deposit
   */
  private async matchWithdrawalToDeposit(withdrawal: QueueItem): Promise<MatchResult | null> {
    const availableDeposits = Array.from(this.queue.values())
      .filter(
        item =>
          item.type === 'deposit' &&
          item.status === 'pending' &&
          item.amount >= withdrawal.amount &&
          item.paymentType === withdrawal.paymentType
      )
      .sort((a, b) => {
        // Prioritize by amount match, then by wait time
        const amountDiffA = Math.abs(a.amount - withdrawal.amount);
        const amountDiffB = Math.abs(b.amount - withdrawal.amount);

        if (amountDiffA !== amountDiffB) {
          return amountDiffA - amountDiffB;
        }

        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (availableDeposits.length === 0) {
      return null;
    }

    const bestMatch = availableDeposits[0];
    const matchResult = await this.createMatch(withdrawal, bestMatch);

    return matchResult;
  }

  /**
   * Match deposit with best available withdrawal
   */
  private async matchDepositToWithdrawal(deposit: QueueItem): Promise<MatchResult | null> {
    const availableWithdrawals = Array.from(this.queue.values())
      .filter(
        item =>
          item.type === 'withdrawal' &&
          item.status === 'pending' &&
          item.amount <= deposit.amount &&
          item.paymentType === deposit.paymentType
      )
      .sort((a, b) => {
        // Prioritize by amount match, then by wait time
        const amountDiffA = Math.abs(a.amount - deposit.amount);
        const amountDiffB = Math.abs(b.amount - deposit.amount);

        if (amountDiffA !== amountDiffB) {
          return amountDiffA - amountDiffB;
        }

        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (availableWithdrawals.length === 0) {
      return null;
    }

    const bestMatch = availableWithdrawals[0];
    const matchResult = await this.createMatch(bestMatch, deposit);

    return matchResult;
  }

  /**
   * Create a match between withdrawal and deposit
   */
  private async createMatch(withdrawal: QueueItem, deposit: QueueItem): Promise<MatchResult> {
    const matchId = crypto.randomUUID();
    const matchAmount = Math.min(withdrawal.amount, deposit.amount);

    const matchResult: MatchResult = {
      withdrawalId: withdrawal.id,
      depositId: deposit.id,
      amount: matchAmount,
      matchScore: this.calculateMatchScore(withdrawal, deposit),
      processingTime: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    // Update queue items
    withdrawal.status = 'matched';
    withdrawal.matchedWith = deposit.id;
    deposit.status = 'matched';
    deposit.matchedWith = withdrawal.id;

    // Update queue
    this.queue.set(withdrawal.id, withdrawal);
    this.queue.set(deposit.id, deposit);

    // Store match
    this.matches.set(matchId, matchResult);

    // Log match to database
    await this.logMatch(matchResult);

    // Add to processing queue
    this.processingQueue.push(withdrawal, deposit);

    return matchResult;
  }

  /**
   * Calculate match score based on various factors
   */
  private calculateMatchScore(withdrawal: QueueItem, deposit: QueueItem): number {
    let score = 100;

    // Amount match (closer amounts get higher scores)
    const amountDiff = Math.abs(withdrawal.amount - deposit.amount);
    const amountScore = Math.max(0, 100 - (amountDiff / withdrawal.amount) * 100);
    score = (score + amountScore) / 2;

    // Payment type match
    if (withdrawal.paymentType === deposit.paymentType) {
      score += 20;
    }

    // Wait time priority (longer waits get higher scores)
    const withdrawalWait = Date.now() - withdrawal.createdAt.getTime();
    const depositWait = Date.now() - deposit.createdAt.getTime();
    const waitScore = Math.min(20, (withdrawalWait + depositWait) / 60000); // 1 point per minute, max 20
    score += waitScore;

    return Math.round(score);
  }

  /**
   * Process matched items
   */
  async processMatchedItems(): Promise<void> {
    const itemsToProcess = this.processingQueue.filter(item => item.status === 'matched');

    for (const item of itemsToProcess) {
      try {
        await this.processItem(item);
        item.status = 'processing';
        this.queue.set(item.id, item);
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        item.status = 'failed';
        this.queue.set(item.id, item);
      }
    }
  }

  /**
   * Process individual matched item
   */
  private async processItem(item: QueueItem): Promise<void> {
    if (item.type === 'withdrawal') {
      await this.processWithdrawal(item);
    } else {
      await this.processDeposit(item);
    }
  }

  /**
   * Process withdrawal item
   */
  private async processWithdrawal(withdrawal: QueueItem): Promise<void> {
    const match = Array.from(this.matches.values()).find(m => m.withdrawalId === withdrawal.id);

    if (!match) {
      throw new Error('No match found for withdrawal');
    }

    // Update withdrawal status in database
    if (this.env.DB.run) {
      this.env.DB.run(
        `
        UPDATE withdrawals 
        SET status = 'processing', approval_notes = ?
        WHERE id = ?
      `,
        [`Matched with deposit ${match.depositId}`, withdrawal.id]
      );
    } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
      await this.env.DB.prepare(
        `
        UPDATE withdrawals 
        SET status = 'processing', approval_notes = ?
        WHERE id = ?
      `
      )
        .bind(`Matched with deposit ${match.depositId}`, withdrawal.id)
        .run();
    }

    // Create transaction record
    if (this.env.DB.run) {
      this.env.DB.run(
        `
        INSERT INTO transactions (customer_id, amount, transaction_type, notes, reference_id, created_at)
        VALUES (?, ?, 'withdrawal_matched', ?, ?, datetime('now'))
      `,
        [withdrawal.customerId, -withdrawal.amount, `P2P matched withdrawal`, withdrawal.id]
      );
    } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
      await this.env.DB.prepare(
        `
        INSERT INTO transactions (customer_id, amount, transaction_type, notes, reference_id, created_at)
        VALUES (?, ?, 'withdrawal_matched', ?, ?, datetime('now'))
      `
      )
        .bind(withdrawal.customerId, -withdrawal.amount, `P2P matched withdrawal`, withdrawal.id)
        .run();
    }
  }

  /**
   * Process deposit item
   */
  private async processDeposit(deposit: QueueItem): Promise<void> {
    const match = Array.from(this.matches.values()).find(m => m.depositId === deposit.id);

    if (!match) {
      throw new Error('No match found for deposit');
    }

    // Update customer balance
    if (this.env.DB.prepare) {
      await this.env.DB.prepare(
        `
        UPDATE players 
        SET balance = balance + ? 
        WHERE customer_id = ?
      `
      )
        .bind(deposit.amount, deposit.customerId)
        .run();
    } else if (this.env.DB.run) {
      this.env.DB.run(
        `
        UPDATE players 
        SET balance = balance + ? 
        WHERE customer_id = ?
      `,
        [deposit.amount, deposit.customerId]
      );
    }

    // Create transaction record
    if (this.env.DB.prepare) {
      await this.env.DB.prepare(
        `
        INSERT INTO transactions (customer_id, amount, transaction_type, notes, reference_id, created_at)
        VALUES (?, ?, 'deposit_matched', ?, ?, datetime('now'))
      `
      )
        .bind(deposit.customerId, deposit.amount, `P2P matched deposit`, deposit.id)
        .run();
    } else if (this.env.DB.run) {
      this.env.DB.run(
        `
        INSERT INTO transactions (customer_id, amount, transaction_type, notes, reference_id, created_at)
        VALUES (?, ?, 'deposit_matched', ?, ?, datetime('now'))
      `,
        [deposit.customerId, deposit.amount, `P2P matched deposit`, deposit.id]
      );
    }
  }

  /**
   * Complete a matched transaction
   */
  async completeMatch(matchId: string, notes?: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const withdrawal = this.queue.get(match.withdrawalId);
    const deposit = this.queue.get(match.depositId);

    if (!withdrawal || !deposit) {
      throw new Error('Queue items not found');
    }

    // Update statuses
    withdrawal.status = 'completed';
    deposit.status = 'completed';
    match.status = 'completed';
    match.completedAt = new Date();

    // Update queue
    this.queue.set(withdrawal.id, withdrawal);
    this.queue.set(deposit.id, deposit);
    this.matches.set(matchId, match);

    // Update database
    await this.completeMatchInDatabase(match, notes);

    // Remove from processing queue
    this.processingQueue = this.processingQueue.filter(
      item => item.id !== withdrawal.id && item.id !== deposit.id
    );

    return true;
  }

  /**
   * Complete match in database
   */
  private async completeMatchInDatabase(match: MatchResult, notes?: string): Promise<void> {
    // Update withdrawal status
    if (this.env.DB.run) {
      this.env.DB.run(
        `
        UPDATE withdrawals
        SET status = 'completed', completed_at = datetime('now'), approval_notes = ?
        WHERE id = ?
      `,
        [`P2P completed: ${notes || ''}`, match.withdrawalId]
      );
    } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
      await this.env.DB.prepare(
        `
        UPDATE withdrawals
        SET status = 'completed', completed_at = datetime('now'), approval_notes = ?
        WHERE id = ?
      `
      )
        .bind(`P2P completed: ${notes || ''}`, match.withdrawalId)
        .run();
    }

    // Update match status
    if (this.env.DB.run) {
      this.env.DB.run(
        `
        UPDATE queue_matches 
        SET status = 'completed', completed_at = datetime('now'), notes = ?
        WHERE id = ?
      `,
        [notes || '', match.withdrawalId]
      );
    } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
      await this.env.DB.prepare(
        `
        UPDATE queue_matches 
        SET status = 'completed', completed_at = datetime('now'), notes = ?
        WHERE id = ?
      `
      )
        .bind(notes || '', match.withdrawalId)
        .run();
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const now = new Date();
    const totalItems = this.queue.size;
    const pendingWithdrawals = Array.from(this.queue.values()).filter(
      item => item.type === 'withdrawal' && item.status === 'pending'
    ).length;
    const pendingDeposits = Array.from(this.queue.values()).filter(
      item => item.type === 'deposit' && item.status === 'pending'
    ).length;
    const matchedPairs = this.matches.size;

    // Calculate average wait time
    const pendingItems = Array.from(this.queue.values()).filter(item => item.status === 'pending');
    const totalWaitTime = pendingItems.reduce(
      (sum, item) => sum + (now.getTime() - item.createdAt.getTime()),
      0
    );
    const averageWaitTime = pendingItems.length > 0 ? totalWaitTime / pendingItems.length : 0;

    // Calculate processing rate (items per hour)
    const completedItems = Array.from(this.queue.values()).filter(
      item => item.status === 'completed'
    );
    const processingRate = completedItems.length / 24; // Assuming 24-hour period

    return {
      totalItems,
      pendingWithdrawals,
      pendingDeposits,
      matchedPairs,
      averageWaitTime,
      processingRate,
      lastUpdated: now,
    };
  }

  /**
   * Get queue items by status
   */
  getQueueItems(status?: string, type?: string): QueueItem[] {
    let items = Array.from(this.queue.values());

    if (status) {
      items = items.filter(item => item.status === status);
    }

    if (type) {
      items = items.filter(item => item.type === type);
    }

    return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get match details
   */
  getMatch(matchId: string): MatchResult | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Get all matches
   */
  getAllMatches(): MatchResult[] {
    return Array.from(this.matches.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  /**
   * Log queue item to database
   */
  private async logQueueItem(item: QueueItem): Promise<void> {
    try {
      // Check if DB has run method (SQLite) or prepare method (Cloudflare D1)
      if (this.env.DB.run) {
        // SQLite database
        this.env.DB.run(
          `
          INSERT INTO queue_items (id, type, customer_id, amount, payment_type, payment_details, 
                                  priority, status, created_at, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `,
          [
            item.id,
            item.type,
            item.customerId,
            item.amount,
            item.paymentType,
            item.paymentDetails,
            item.priority,
            item.status,
            item.notes || '',
          ]
        );
      } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
        // Cloudflare D1 database
        await this.env.DB.prepare(
          `
          INSERT INTO queue_items (id, type, customer_id, amount, payment_type, payment_details, 
                                  priority, status, created_at, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `
        )
          .bind(
            item.id,
            item.type,
            item.customerId,
            item.amount,
            item.paymentType,
            item.paymentDetails,
            item.priority,
            item.status,
            item.notes || ''
          )
          .run();
      }
    } catch (error) {
      console.error('Error logging queue item:', error);
    }
  }

  /**
   * Log match to database
   */
  private async logMatch(match: MatchResult): Promise<void> {
    try {
      // Check if DB has run method (SQLite) or prepare method (Cloudflare D1)
      if (this.env.DB.run) {
        // SQLite database
        this.env.DB.run(
          `
          INSERT INTO queue_matches (id, withdrawal_id, deposit_id, amount, match_score, 
                                    processing_time, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
          [
            match.withdrawalId,
            match.withdrawalId,
            match.depositId,
            match.amount,
            match.matchScore,
            match.processingTime,
            match.status,
          ]
        );
      } else if (this.env.DB.prepare && this.env.DB.prepare().bind) {
        // Cloudflare D1 database
        await this.env.DB.prepare(
          `
          INSERT INTO queue_matches (id, withdrawal_id, deposit_id, amount, match_score, 
                                    processing_time, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `
        )
          .bind(
            match.withdrawalId,
            match.withdrawalId,
            match.depositId,
            match.amount,
            match.matchScore,
            match.processingTime,
            match.status
          )
          .run();
      }
    } catch (error) {
      console.error('Error logging match:', error);
    }
  }

  /**
   * Clean up old completed items
   */
  async cleanupOldItems(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;

    // Remove old completed items from memory
    for (const [id, item] of this.queue.entries()) {
      if (item.status === 'completed' && item.createdAt.getTime() < cutoff) {
        this.queue.delete(id);
      }
    }

    // Remove old completed matches from memory
    for (const [id, match] of this.matches.entries()) {
      if (match.status === 'completed' && match.createdAt.getTime() < cutoff) {
        this.matches.delete(id);
      }
    }
  }
}
