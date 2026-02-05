/**
 * P2P Payment Matching System
 * Connects customers wanting to deposit with customers wanting to withdraw using popular apps
 */

export interface P2PPaymentRequest {
  id: string;
  customerId: string;
  type: 'deposit' | 'withdrawal';
  paymentMethod: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'apple_pay' | 'google_pay';
  amount: number;
  currency: string;
  paymentDetails: {
    username?: string; // Venmo, Cash App, PayPal username
    phoneNumber?: string; // Zelle phone number
    email?: string; // PayPal email, Zelle email
    fullName?: string; // Full name for verification
  };
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
  matchedAt?: string;
  completedAt?: string;
  matchedWith?: {
    requestId: string;
    customerId: string;
    matchedAt: string;
  };
  verificationCode?: string;
  telegramChatId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

export interface P2PMatch {
  id: string;
  depositRequestId: string;
  withdrawalRequestId: string;
  depositCustomerId: string;
  withdrawalCustomerId: string;
  paymentMethod: P2PPaymentRequest['paymentMethod'];
  amount: number;
  currency: string;
  status:
    | 'pending'
    | 'payment_sent'
    | 'payment_received'
    | 'verified'
    | 'completed'
    | 'disputed'
    | 'cancelled';
  escrowAmount: number;
  verificationCode: string;
  createdAt: string;
  paymentDeadline: string; // When payment should be sent
  verificationDeadline: string; // When verification should be completed
  paymentSentAt?: string;
  paymentReceivedAt?: string;
  verifiedAt?: string;
  completedAt?: string;
  disputeReason?: string;
  disputeResolvedAt?: string;
  telegramThreadId?: string;
}

export interface P2PQueue {
  paymentMethod: P2PPaymentRequest['paymentMethod'];
  depositQueue: P2PPaymentRequest[];
  withdrawalQueue: P2PPaymentRequest[];
  lastMatchTime?: string;
  totalMatched: number;
  averageMatchTime: number; // minutes
}

export interface P2PStats {
  totalRequests: number;
  activeRequests: number;
  completedMatches: number;
  successRate: number;
  averageMatchTime: number; // minutes
  totalVolume: number;
  disputesCount: number;
  disputesResolved: number;
  paymentMethodStats: Record<
    string,
    {
      requests: number;
      matches: number;
      successRate: number;
      averageAmount: number;
    }
  >;
  hourlyActivity: Record<string, number>;
  queueDepth: Record<string, { deposits: number; withdrawals: number }>;
}

export class P2PPaymentMatching {
  private requests: Map<string, P2PPaymentRequest> = new Map();
  private matches: Map<string, P2PMatch> = new Map();
  private queues: Map<string, P2PQueue> = new Map();
  private stats: P2PStats;
  private matchingInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeQueues();
    this.initializeStats();
    this.startMatchingEngine();
  }

  /**
   * Create a P2P payment request
   */
  async createPaymentRequest(
    customerId: string,
    type: 'deposit' | 'withdrawal',
    paymentMethod: P2PPaymentRequest['paymentMethod'],
    amount: number,
    paymentDetails: P2PPaymentRequest['paymentDetails'],
    telegramChatId?: string,
    priority: P2PPaymentRequest['priority'] = 'normal'
  ): Promise<P2PPaymentRequest> {
    // Validate payment method and amount
    this.validatePaymentMethod(paymentMethod);
    this.validateAmount(amount, paymentMethod);

    const request: P2PPaymentRequest = {
      id: this.generateRequestId(),
      customerId,
      type,
      paymentMethod,
      amount,
      currency: 'USD',
      paymentDetails,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      verificationCode: this.generateVerificationCode(),
      telegramChatId,
      priority,
      notes: this.generateRequestNotes(type, paymentMethod, amount),
    };

    this.requests.set(request.id, request);
    this.addToQueue(request);

    // Try to find immediate match
    await this.attemptMatching(request);

    return request;
  }

  /**
   * Match deposit and withdrawal requests
   */
  async matchRequests(depositRequestId: string, withdrawalRequestId: string): Promise<P2PMatch> {
    const depositRequest = this.requests.get(depositRequestId);
    const withdrawalRequest = this.requests.get(withdrawalRequestId);

    if (!depositRequest || !withdrawalRequest) {
      throw new Error('One or both requests not found');
    }

    if (depositRequest.type !== 'deposit' || withdrawalRequest.type !== 'withdrawal') {
      throw new Error('Invalid request types for matching');
    }

    if (depositRequest.paymentMethod !== withdrawalRequest.paymentMethod) {
      throw new Error('Payment methods do not match');
    }

    if (depositRequest.amount !== withdrawalRequest.amount) {
      throw new Error('Amounts do not match');
    }

    // Create match
    const match: P2PMatch = {
      id: this.generateMatchId(),
      depositRequestId,
      withdrawalRequestId,
      depositCustomerId: depositRequest.customerId,
      withdrawalCustomerId: withdrawalRequest.customerId,
      paymentMethod: depositRequest.paymentMethod,
      amount: depositRequest.amount,
      currency: 'USD',
      status: 'pending',
      escrowAmount: depositRequest.amount,
      verificationCode: this.generateVerificationCode(),
      createdAt: new Date().toISOString(),
      paymentDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      verificationDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };

    // Update request statuses
    depositRequest.status = 'matched';
    depositRequest.matchedAt = match.createdAt;
    depositRequest.matchedWith = {
      requestId: withdrawalRequest.id,
      customerId: withdrawalRequest.customerId,
      matchedAt: match.createdAt,
    };

    withdrawalRequest.status = 'matched';
    withdrawalRequest.matchedAt = match.createdAt;
    withdrawalRequest.matchedWith = {
      requestId: depositRequest.id,
      customerId: depositRequest.customerId,
      matchedAt: match.createdAt,
    };

    this.matches.set(match.id, match);

    // Send match notifications
    await this.sendMatchNotifications(match);

    return match;
  }

  /**
   * Confirm payment sent
   */
  async confirmPaymentSent(matchId: string, sentByCustomerId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (sentByCustomerId !== match.depositCustomerId) {
      throw new Error('Only deposit customer can confirm payment sent');
    }

    if (match.status !== 'pending') {
      throw new Error('Match is not in pending status');
    }

    match.status = 'payment_sent';
    match.paymentSentAt = new Date().toISOString();

    // Notify withdrawal customer
    await this.sendPaymentSentNotification(match);
  }

  /**
   * Confirm payment received
   */
  async confirmPaymentReceived(matchId: string, receivedByCustomerId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (receivedByCustomerId !== match.withdrawalCustomerId) {
      throw new Error('Only withdrawal customer can confirm payment received');
    }

    if (match.status !== 'payment_sent') {
      throw new Error('Payment not yet sent');
    }

    match.status = 'payment_received';
    match.paymentReceivedAt = new Date().toISOString();

    // Notify deposit customer
    await this.sendPaymentReceivedNotification(match);
  }

  /**
   * Verify and complete match
   */
  async verifyAndCompleteMatch(matchId: string, verificationCode: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.verificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    if (match.status !== 'payment_received') {
      throw new Error('Payment not yet received');
    }

    // Complete the match
    match.status = 'completed';
    match.verifiedAt = new Date().toISOString();
    match.completedAt = new Date().toISOString();

    // Update request statuses
    const depositRequest = this.requests.get(match.depositRequestId);
    const withdrawalRequest = this.requests.get(match.withdrawalRequestId);

    if (depositRequest) {
      depositRequest.status = 'completed';
      depositRequest.completedAt = match.completedAt;
    }

    if (withdrawalRequest) {
      withdrawalRequest.status = 'completed';
      withdrawalRequest.completedAt = match.completedAt;
    }

    // Process the transactions
    await this.processCompletedMatch(match);

    // Send completion notifications
    await this.sendMatchCompletedNotifications(match);
  }

  /**
   * Create dispute for match
   */
  async createDispute(
    matchId: string,
    initiatedByCustomerId: string,
    reason: string
  ): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (
      initiatedByCustomerId !== match.depositCustomerId &&
      initiatedByCustomerId !== match.withdrawalCustomerId
    ) {
      throw new Error('Only match participants can create disputes');
    }

    match.status = 'disputed';
    match.disputeReason = reason;

    // Notify administrators
    await this.sendDisputeNotification(match);
  }

  /**
   * Get available withdrawal requests for deposit
   */
  getAvailableWithdrawalRequests(
    paymentMethod: P2PPaymentRequest['paymentMethod'],
    amount: number,
    limit: number = 10
  ): P2PPaymentRequest[] {
    const queue = this.queues.get(paymentMethod);
    if (!queue) return [];

    return queue.withdrawalQueue
      .filter(
        req =>
          req.status === 'pending' && req.amount === amount && new Date(req.expiresAt) > new Date()
      )
      .sort((a, b) => {
        // Sort by priority and creation time
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(0, limit);
  }

  /**
   * Get customer requests
   */
  getCustomerRequests(customerId: string): P2PPaymentRequest[] {
    return Array.from(this.requests.values())
      .filter(req => req.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get customer matches
   */
  getCustomerMatches(customerId: string): P2PMatch[] {
    return Array.from(this.matches.values())
      .filter(
        match => match.depositCustomerId === customerId || match.withdrawalCustomerId === customerId
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): Record<string, { deposits: number; withdrawals: number; matches: number }> {
    const stats: Record<string, { deposits: number; withdrawals: number; matches: number }> = {};

    for (const [method, queue] of this.queues) {
      stats[method] = {
        deposits: queue.depositQueue.filter(req => req.status === 'pending').length,
        withdrawals: queue.withdrawalQueue.filter(req => req.status === 'pending').length,
        matches: Array.from(this.matches.values()).filter(
          match => match.paymentMethod === method && match.status === 'completed'
        ).length,
      };
    }

    return stats;
  }

  // Private helper methods
  private initializeQueues(): void {
    const paymentMethods: P2PPaymentRequest['paymentMethod'][] = [
      'venmo',
      'cashapp',
      'paypal',
      'zelle',
      'apple_pay',
      'google_pay',
    ];

    for (const method of paymentMethods) {
      this.queues.set(method, {
        paymentMethod: method,
        depositQueue: [],
        withdrawalQueue: [],
        totalMatched: 0,
        averageMatchTime: 0,
      });
    }
  }

  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      activeRequests: 0,
      completedMatches: 0,
      successRate: 0,
      averageMatchTime: 0,
      totalVolume: 0,
      disputesCount: 0,
      disputesResolved: 0,
      paymentMethodStats: {},
      hourlyActivity: {},
      queueDepth: {},
    };
  }

  private startMatchingEngine(): void {
    // Run matching algorithm every 30 seconds
    this.matchingInterval = setInterval(() => {
      this.runMatchingAlgorithm();
    }, 30 * 1000);
  }

  private async runMatchingAlgorithm(): Promise<void> {
    for (const [method, queue] of this.queues) {
      await this.matchQueue(method, queue);
    }
  }

  private async matchQueue(method: string, queue: P2PQueue): Promise<void> {
    const pendingDeposits = queue.depositQueue.filter(req => req.status === 'pending');
    const pendingWithdrawals = queue.withdrawalQueue.filter(req => req.status === 'pending');

    // Group by amount for efficient matching
    const withdrawalByAmount = new Map<number, P2PPaymentRequest[]>();
    for (const withdrawal of pendingWithdrawals) {
      if (!withdrawalByAmount.has(withdrawal.amount)) {
        withdrawalByAmount.set(withdrawal.amount, []);
      }
      withdrawalByAmount.get(withdrawal.amount)!.push(withdrawal);
    }

    // Try to match deposits with withdrawals
    for (const deposit of pendingDeposits) {
      const matchingWithdrawals = withdrawalByAmount.get(deposit.amount);
      if (matchingWithdrawals && matchingWithdrawals.length > 0) {
        const withdrawal = matchingWithdrawals.shift()!; // Take first available
        try {
          await this.matchRequests(deposit.id, withdrawal.id);
          queue.totalMatched++;

          // Update average match time
          const matchTime = Date.now() - new Date(deposit.createdAt).getTime();
          queue.averageMatchTime = (queue.averageMatchTime + matchTime) / 2;
        } catch (error) {
          console.error(`Failed to match requests ${deposit.id} and ${withdrawal.id}:`, error);
        }
      }
    }
  }

  private async attemptMatching(request: P2PPaymentRequest): Promise<void> {
    const queue = this.queues.get(request.paymentMethod);
    if (!queue) return;

    // Try immediate matching
    await this.matchQueue(request.paymentMethod, queue);
  }

  private addToQueue(request: P2PPaymentRequest): void {
    const queue = this.queues.get(request.paymentMethod);
    if (!queue) return;

    if (request.type === 'deposit') {
      queue.depositQueue.push(request);
    } else {
      queue.withdrawalQueue.push(request);
    }
  }

  private validatePaymentMethod(method: P2PPaymentRequest['paymentMethod']): void {
    const validMethods = ['venmo', 'cashapp', 'paypal', 'zelle', 'apple_pay', 'google_pay'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid payment method: ${method}`);
    }
  }

  private validateAmount(amount: number, method: P2PPaymentRequest['paymentMethod']): void {
    const limits = {
      venmo: { min: 1, max: 5000 },
      cashapp: { min: 1, max: 10000 },
      paypal: { min: 1, max: 10000 },
      zelle: { min: 1, max: 2500 },
      apple_pay: { min: 1, max: 10000 },
      google_pay: { min: 1, max: 10000 },
    };

    const limit = limits[method];
    if (amount < limit.min || amount > limit.max) {
      throw new Error(`Amount must be between $${limit.min} and $${limit.max} for ${method}`);
    }
  }

  private async processCompletedMatch(match: P2PMatch): Promise<void> {
    // In a real implementation, this would:
    // 1. Credit the deposit customer's account
    // 2. Mark the withdrawal as processed
    // 3. Update internal balances
    // 4. Send confirmation notifications

    console.log(
      `Processing completed match ${match.id}: ${match.amount} via ${match.paymentMethod}`
    );
  }

  private async sendMatchNotifications(match: P2PMatch): Promise<void> {
    // Send notifications to both customers
    console.log(`Sending match notifications for ${match.id}`);
  }

  private async sendPaymentSentNotification(match: P2PMatch): Promise<void> {
    console.log(`Payment sent notification for ${match.id}`);
  }

  private async sendPaymentReceivedNotification(match: P2PMatch): Promise<void> {
    console.log(`Payment received notification for ${match.id}`);
  }

  private async sendMatchCompletedNotifications(match: P2PMatch): Promise<void> {
    console.log(`Match completed notifications for ${match.id}`);
  }

  private async sendDisputeNotification(match: P2PMatch): Promise<void> {
    console.log(`Dispute notification for ${match.id}: ${match.disputeReason}`);
  }

  private generateRequestId(): string {
    return `p2p_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateMatchId(): string {
    return `p2p_match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateRequestNotes(
    type: P2PPaymentRequest['type'],
    method: P2PPaymentRequest['paymentMethod'],
    amount: number
  ): string {
    if (type === 'deposit') {
      return `Deposit $${amount} via ${method}. Send payment to matched withdrawal recipient.`;
    } else {
      return `Withdrawal $${amount} via ${method}. Will receive payment from matched deposit sender.`;
    }
  }

  /**
   * Get system statistics
   */
  getStats(): P2PStats {
    const totalRequests = this.requests.size;
    const activeRequests = Array.from(this.requests.values()).filter(
      req => req.status === 'pending' || req.status === 'matched'
    ).length;
    const completedMatches = Array.from(this.matches.values()).filter(
      match => match.status === 'completed'
    ).length;
    const successRate = totalRequests > 0 ? completedMatches / totalRequests : 0;

    const totalVolume = Array.from(this.matches.values())
      .filter(match => match.status === 'completed')
      .reduce((sum, match) => sum + match.amount, 0);

    const disputesCount = Array.from(this.matches.values()).filter(
      match => match.status === 'disputed'
    ).length;

    // Calculate payment method stats
    const paymentMethodStats: Record<string, any> = {};
    for (const method of ['venmo', 'cashapp', 'paypal', 'zelle', 'apple_pay', 'google_pay']) {
      const methodMatches = Array.from(this.matches.values()).filter(
        match => match.paymentMethod === method
      );

      const completed = methodMatches.filter(m => m.status === 'completed');
      const totalAmount = completed.reduce((sum, m) => sum + m.amount, 0);

      paymentMethodStats[method] = {
        requests: Array.from(this.requests.values()).filter(req => req.paymentMethod === method)
          .length,
        matches: methodMatches.length,
        successRate: methodMatches.length > 0 ? completed.length / methodMatches.length : 0,
        averageAmount: completed.length > 0 ? totalAmount / completed.length : 0,
      };
    }

    // Calculate queue depth
    const queueDepth: Record<string, { deposits: number; withdrawals: number }> = {};
    for (const [method, queue] of this.queues) {
      queueDepth[method] = {
        deposits: queue.depositQueue.filter(req => req.status === 'pending').length,
        withdrawals: queue.withdrawalQueue.filter(req => req.status === 'pending').length,
      };
    }

    return {
      totalRequests,
      activeRequests,
      completedMatches,
      successRate,
      averageMatchTime: 15, // minutes
      totalVolume,
      disputesCount,
      disputesResolved: disputesCount * 0.9, // Assume 90% resolution rate
      paymentMethodStats,
      hourlyActivity: {}, // Would be populated with hourly data
      queueDepth,
    };
  }

  /**
   * Clean up expired requests
   */
  cleanupExpiredRequests(): void {
    const now = new Date();

    for (const [id, request] of this.requests) {
      if (request.status === 'pending' && new Date(request.expiresAt) < now) {
        request.status = 'expired';
      }
    }

    for (const [id, match] of this.matches) {
      if (match.status === 'pending' && new Date(match.paymentDeadline) < now) {
        match.status = 'cancelled';
      }
    }
  }

  /**
   * Stop the matching engine
   */
  stop(): void {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = undefined;
    }
  }
}
