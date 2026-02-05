/**
 * Enhanced P2P Transaction System
 * Advanced peer-to-peer financial transactions with escrow, arbitration, and dispute resolution
 */

import { CustomerDatabaseManagement } from '../customers/customer-database-management';
import { DepositWithdrawalSystem } from './deposit-withdrawal-system';

export interface P2PTransaction {
  transactionId: string;
  transactionType:
    | 'direct_transfer'
    | 'escrow_deal'
    | 'marketplace_sale'
    | 'service_payment'
    | 'loan_repayment';
  senderCustomerId: string;
  receiverCustomerId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'disputed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  expiryDate?: string;

  // Enhanced fields
  escrowDetails?: {
    escrowAgentId: string;
    releaseConditions: string[];
    autoReleaseDate?: string;
    manualReleaseRequired: boolean;
    disputeWindowDays: number;
  };

  marketplaceDetails?: {
    itemId: string;
    itemName: string;
    category: string;
    shippingRequired: boolean;
    shippingAddress?: string;
    trackingNumber?: string;
  };

  serviceDetails?: {
    serviceType: 'consultation' | 'development' | 'design' | 'marketing' | 'other';
    serviceDescription: string;
    deliveryDate?: string;
    acceptanceRequired: boolean;
  };

  loanDetails?: {
    loanId: string;
    installmentNumber?: number;
    totalInstallments?: number;
    interestRate?: number;
  };

  // Risk and compliance
  riskAssessment: {
    senderRiskScore: number;
    receiverRiskScore: number;
    transactionRiskScore: number;
    flagged: boolean;
    flags: string[];
  };

  // Dispute resolution
  disputeDetails?: {
    disputeId: string;
    initiatedBy: string;
    reason: string;
    description: string;
    status: 'open' | 'investigating' | 'resolved' | 'escalated';
    resolution?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    refundAmount?: number;
    refundReason?: string;
  };

  // Communication and tracking
  messages: Array<{
    messageId: string;
    senderId: string;
    message: string;
    timestamp: string;
    attachments?: string[];
    systemGenerated: boolean;
  }>;

  // Audit trail
  auditTrail: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
    metadata?: Record<string, any>;
  }>;

  // External integrations
  externalReferences: {
    stripePaymentId?: string;
    paypalTransactionId?: string;
    bankTransactionId?: string;
    cryptoTxHash?: string;
    thirdPartyId?: string;
  };

  // Notifications
  notifications: Array<{
    notificationId: string;
    recipientId: string;
    type:
      | 'transaction_created'
      | 'payment_received'
      | 'dispute_opened'
      | 'item_shipped'
      | 'service_delivered';
    message: string;
    sentAt: string;
    readAt?: string;
    method: 'email' | 'sms' | 'push' | 'in_app';
  }>;
}

export interface P2PDispute {
  disputeId: string;
  transactionId: string;
  initiatedBy: string;
  respondentId: string;
  reason:
    | 'item_not_received'
    | 'item_not_as_described'
    | 'service_not_delivered'
    | 'payment_not_received'
    | 'unauthorized_charge'
    | 'other';
  description: string;
  evidence: Array<{
    evidenceId: string;
    type: 'text' | 'image' | 'document' | 'video';
    description: string;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  status: 'open' | 'under_review' | 'escalated' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgent?: string;
  resolution?: {
    decision: 'refund_full' | 'refund_partial' | 'no_refund' | 'replacement' | 'service_redelivery';
    refundAmount?: number;
    reasoning: string;
    decidedBy: string;
    decidedAt: string;
  };
  messages: Array<{
    messageId: string;
    senderId: string;
    message: string;
    timestamp: string;
    isInternal: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface P2PMarketplaceItem {
  itemId: string;
  sellerId: string;
  title: string;
  description: string;
  category:
    | 'electronics'
    | 'clothing'
    | 'books'
    | 'sports'
    | 'gaming'
    | 'collectibles'
    | 'services'
    | 'other';
  price: number;
  currency: string;
  images: string[];
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  location: string;
  shippingOptions: {
    freeShipping: boolean;
    shippingCost?: number;
    estimatedDelivery: string;
  };
  status: 'active' | 'sold' | 'inactive' | 'flagged';
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  buyerId?: string;
}

export class P2PTransactionSystem {
  private transactions: Map<string, P2PTransaction> = new Map();
  private disputes: Map<string, P2PDispute> = new Map();
  private marketplaceItems: Map<string, P2PMarketplaceItem> = new Map();
  private customerManager: CustomerDatabaseManagement;
  private financialSystem: DepositWithdrawalSystem;
  private transactionCounter = 1000000;
  private disputeCounter = 1000;

  constructor(
    customerManager: CustomerDatabaseManagement,
    financialSystem: DepositWithdrawalSystem
  ) {
    this.customerManager = customerManager;
    this.financialSystem = financialSystem;
  }

  /**
   * Create a P2P transaction
   */
  async createTransaction(
    transactionData: Omit<
      P2PTransaction,
      | 'transactionId'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
      | 'messages'
      | 'auditTrail'
      | 'notifications'
    >
  ): Promise<P2PTransaction> {
    // Validate participants
    const sender = this.customerManager.getCustomerProfile(transactionData.senderCustomerId);
    const receiver = this.customerManager.getCustomerProfile(transactionData.receiverCustomerId);

    if (!sender || !receiver) {
      throw new Error('Invalid sender or receiver');
    }

    if (
      sender.accountInfo.accountStatus !== 'active' ||
      receiver.accountInfo.accountStatus !== 'active'
    ) {
      throw new Error('Sender or receiver account is not active');
    }

    // Check sender balance
    const senderBalance = await this.financialSystem.getCustomerBalance(
      transactionData.senderCustomerId
    );
    if (senderBalance.availableBalance < transactionData.amount) {
      throw new Error('Insufficient funds');
    }

    // Assess risk
    const riskAssessment = await this.assessTransactionRisk(transactionData, sender, receiver);

    // Create transaction
    const transaction: P2PTransaction = {
      ...transactionData,
      transactionId: this.generateTransactionId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskAssessment,
      messages: [],
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'transaction_created',
          performedBy: transactionData.senderCustomerId,
          details: 'P2P transaction created',
          metadata: { transactionType: transactionData.transactionType },
        },
      ],
      notifications: [],
      externalReferences: {},
    };

    // Handle escrow for certain transaction types
    if (
      transactionData.transactionType === 'escrow_deal' ||
      transactionData.transactionType === 'marketplace_sale'
    ) {
      transaction.escrowDetails = {
        escrowAgentId: 'system',
        releaseConditions: this.getReleaseConditions(transactionData.transactionType),
        autoReleaseDate: this.calculateAutoReleaseDate(),
        manualReleaseRequired: transactionData.transactionType === 'marketplace_sale',
        disputeWindowDays: 7,
      };
    }

    this.transactions.set(transaction.transactionId, transaction);

    // Send notifications
    await this.sendTransactionNotifications(transaction, 'transaction_created');

    return transaction;
  }

  /**
   * Process marketplace purchase
   */
  async processMarketplacePurchase(itemId: string, buyerId: string): Promise<P2PTransaction> {
    const item = this.marketplaceItems.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.status !== 'active' || item.sellerId === buyerId) {
      throw new Error('Item not available for purchase');
    }

    // Create marketplace transaction
    const transaction = await this.createTransaction({
      transactionType: 'marketplace_sale',
      senderCustomerId: buyerId,
      receiverCustomerId: item.sellerId,
      amount: item.price,
      currency: item.currency,
      fee: this.calculateMarketplaceFee(item.price),
      netAmount: item.price - this.calculateMarketplaceFee(item.price),
      description: `Purchase: ${item.title}`,
      marketplaceDetails: {
        itemId: item.itemId,
        itemName: item.title,
        category: item.category,
        shippingRequired:
          item.shippingOptions.shippingCost !== undefined && item.shippingOptions.shippingCost > 0,
        shippingAddress: undefined, // To be provided by buyer
      },
    });

    // Update item status
    item.status = 'sold';
    item.soldAt = new Date().toISOString();
    item.buyerId = buyerId;
    item.updatedAt = new Date().toISOString();

    return transaction;
  }

  /**
   * Release escrow funds
   */
  async releaseEscrowFunds(
    transactionId: string,
    releasedBy: string,
    reason?: string
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (!transaction.escrowDetails) {
      throw new Error('Transaction is not in escrow');
    }

    if (transaction.status !== 'processing') {
      throw new Error('Transaction is not in processing status');
    }

    // Transfer funds from escrow to receiver
    const senderBalance = await this.financialSystem.getCustomerBalance(
      transaction.senderCustomerId
    );
    const receiverBalance = await this.financialSystem.getCustomerBalance(
      transaction.receiverCustomerId
    );

    // Update balances (this would integrate with actual payment processing)
    transaction.status = 'completed';
    transaction.completedAt = new Date().toISOString();
    transaction.updatedAt = new Date().toISOString();

    // Add audit trail
    transaction.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'escrow_released',
      performedBy: releasedBy,
      details: reason || 'Escrow funds released',
      metadata: { escrowAgentId: transaction.escrowDetails.escrowAgentId },
    });

    // Send notifications
    await this.sendTransactionNotifications(transaction, 'payment_received');

    return true;
  }

  /**
   * Create a dispute for a transaction
   */
  async createDispute(
    transactionId: string,
    initiatedBy: string,
    reason: P2PDispute['reason'],
    description: string
  ): Promise<P2PDispute> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only dispute completed transactions');
    }

    if (
      initiatedBy !== transaction.senderCustomerId &&
      initiatedBy !== transaction.receiverCustomerId
    ) {
      throw new Error('Only transaction participants can create disputes');
    }

    const respondentId =
      initiatedBy === transaction.senderCustomerId
        ? transaction.receiverCustomerId
        : transaction.senderCustomerId;

    // Update transaction status
    transaction.status = 'disputed';
    transaction.updatedAt = new Date().toISOString();

    // Create dispute
    const dispute: P2PDispute = {
      disputeId: this.generateDisputeId(),
      transactionId,
      initiatedBy,
      respondentId,
      reason,
      description,
      evidence: [],
      status: 'open',
      priority: this.calculateDisputePriority(transaction, reason),
      messages: [
        {
          messageId: this.generateMessageId(),
          senderId: initiatedBy,
          message: description,
          timestamp: new Date().toISOString(),
          isInternal: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.disputes.set(dispute.disputeId, dispute);

    // Update transaction with dispute details
    transaction.disputeDetails = {
      disputeId: dispute.disputeId,
      initiatedBy,
      reason,
      description,
      status: 'open',
    };

    // Send notifications
    await this.sendDisputeNotifications(dispute);

    return dispute;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    resolution: P2PDispute['resolution'],
    resolvedBy: string
  ): Promise<boolean> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status !== 'open' && dispute.status !== 'under_review') {
      throw new Error('Dispute is not in a resolvable state');
    }

    // Update dispute
    dispute.resolution = resolution;
    dispute.status = 'resolved';
    dispute.resolvedBy = resolvedBy;
    dispute.resolvedAt = new Date().toISOString();
    dispute.updatedAt = new Date().toISOString();

    // Update transaction
    const transaction = this.transactions.get(dispute.transactionId);
    if (transaction) {
      transaction.disputeDetails!.status = 'resolved';
      transaction.disputeDetails!.resolution = resolution.decision;
      transaction.disputeDetails!.resolvedBy = resolvedBy;
      transaction.disputeDetails!.resolvedAt = new Date().toISOString();

      // Process refund if applicable
      if (resolution.decision === 'refund_full' || resolution.decision === 'refund_partial') {
        transaction.status = 'refunded';
        transaction.disputeDetails!.refundAmount = resolution.refundAmount;
        transaction.disputeDetails!.refundReason = resolution.reasoning;
      }

      transaction.updatedAt = new Date().toISOString();
    }

    // Send resolution notifications
    await this.sendDisputeResolutionNotifications(dispute);

    return true;
  }

  /**
   * Add evidence to a dispute
   */
  async addDisputeEvidence(
    disputeId: string,
    evidence: Omit<P2PDispute['evidence'][0], 'evidenceId' | 'uploadedAt'>
  ): Promise<boolean> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status !== 'open' && dispute.status !== 'under_review') {
      throw new Error('Cannot add evidence to resolved dispute');
    }

    const newEvidence = {
      ...evidence,
      evidenceId: this.generateEvidenceId(),
      uploadedAt: new Date().toISOString(),
    };

    dispute.evidence.push(newEvidence);
    dispute.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Send message in transaction
   */
  async sendTransactionMessage(
    transactionId: string,
    senderId: string,
    message: string,
    attachments?: string[]
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (senderId !== transaction.senderCustomerId && senderId !== transaction.receiverCustomerId) {
      throw new Error('Only transaction participants can send messages');
    }

    const messageObj = {
      messageId: this.generateMessageId(),
      senderId,
      message,
      timestamp: new Date().toISOString(),
      attachments,
      systemGenerated: false,
    };

    transaction.messages.push(messageObj);
    transaction.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * List marketplace items
   */
  getMarketplaceItems(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    location?: string;
    sellerId?: string;
  }): P2PMarketplaceItem[] {
    let items = Array.from(this.marketplaceItems.values()).filter(item => item.status === 'active');

    if (filters) {
      if (filters.category) {
        items = items.filter(item => item.category === filters.category);
      }
      if (filters.minPrice) {
        items = items.filter(item => item.price >= filters.minPrice);
      }
      if (filters.maxPrice) {
        items = items.filter(item => item.price <= filters.maxPrice);
      }
      if (filters.condition) {
        items = items.filter(item => item.condition === filters.condition);
      }
      if (filters.location) {
        items = items.filter(item => item.location.includes(filters.location));
      }
      if (filters.sellerId) {
        items = items.filter(item => item.sellerId === filters.sellerId);
      }
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create marketplace item
   */
  async createMarketplaceItem(
    itemData: Omit<P2PMarketplaceItem, 'itemId' | 'createdAt' | 'updatedAt'>
  ): Promise<P2PMarketplaceItem> {
    // Validate seller
    const seller = this.customerManager.getCustomerProfile(itemData.sellerId);
    if (!seller || seller.accountInfo.accountStatus !== 'active') {
      throw new Error('Invalid or inactive seller');
    }

    const item: P2PMarketplaceItem = {
      ...itemData,
      itemId: this.generateItemId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.marketplaceItems.set(item.itemId, item);
    return item;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): P2PTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get customer transactions
   */
  getCustomerTransactions(customerId: string): P2PTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.senderCustomerId === customerId || t.receiverCustomerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get dispute by ID
   */
  getDispute(disputeId: string): P2PDispute | undefined {
    return this.disputes.get(disputeId);
  }

  /**
   * Get customer disputes
   */
  getCustomerDisputes(customerId: string): P2PDispute[] {
    return Array.from(this.disputes.values())
      .filter(d => d.initiatedBy === customerId || d.respondentId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Private helper methods
  private generateTransactionId(): string {
    return `P2P_${this.transactionCounter++}`;
  }

  private generateDisputeId(): string {
    return `DSP_${this.disputeCounter++}`;
  }

  private generateMessageId(): string {
    return `MSG_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEvidenceId(): string {
    return `EVD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateItemId(): string {
    return `ITEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async assessTransactionRisk(
    transaction: Omit<
      P2PTransaction,
      | 'transactionId'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
      | 'messages'
      | 'auditTrail'
      | 'notifications'
    >,
    sender: any,
    receiver: any
  ): Promise<P2PTransaction['riskAssessment']> {
    let senderRisk = sender.financialProfile?.riskScore || 50;
    let receiverRisk = receiver.financialProfile?.riskScore || 50;
    let transactionRisk = 0;
    const flags: string[] = [];

    // Amount-based risk
    if (transaction.amount > 5000) {
      transactionRisk += 20;
      flags.push('large_amount');
    }

    // New user risk
    const senderAge = this.calculateAccountAge(sender.accountInfo?.registrationDate);
    const receiverAge = this.calculateAccountAge(receiver.accountInfo?.registrationDate);

    if (senderAge < 30) {
      senderRisk += 15;
      flags.push('new_sender');
    }

    if (receiverAge < 30) {
      receiverRisk += 15;
      flags.push('new_receiver');
    }

    // Transaction type risk
    if (transaction.transactionType === 'escrow_deal') {
      transactionRisk += 10;
      flags.push('escrow_transaction');
    }

    const overallRisk = Math.min((senderRisk + receiverRisk + transactionRisk) / 3, 100);

    return {
      senderRiskScore: senderRisk,
      receiverRiskScore: receiverRisk,
      transactionRiskScore: overallRisk,
      flagged: overallRisk > 70,
      flags,
    };
  }

  private getReleaseConditions(transactionType: string): string[] {
    switch (transactionType) {
      case 'escrow_deal':
        return [
          'Both parties confirm satisfaction',
          'No disputes raised within 7 days',
          'All deliverables received',
        ];
      case 'marketplace_sale':
        return [
          'Buyer confirms item received',
          'Item matches description',
          'No disputes raised within 7 days',
        ];
      default:
        return ['Transaction completed successfully'];
    }
  }

  private calculateAutoReleaseDate(): string {
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + 7); // 7 days from now
    return releaseDate.toISOString();
  }

  private calculateMarketplaceFee(amount: number): number {
    return Math.max(amount * 0.05, 2.99); // 5% fee, minimum $2.99
  }

  private calculateDisputePriority(
    transaction: P2PTransaction,
    reason: P2PDispute['reason']
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (reason === 'payment_not_received' && transaction.amount > 1000) {
      return 'urgent';
    }

    if (transaction.amount > 500) {
      return 'high';
    }

    if (transaction.amount > 100) {
      return 'medium';
    }

    return 'low';
  }

  private calculateAccountAge(registrationDate?: string): number {
    if (!registrationDate) return 0;
    const now = new Date();
    const regDate = new Date(registrationDate);
    return Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async sendTransactionNotifications(
    transaction: P2PTransaction,
    type: string
  ): Promise<void> {
    const notifications = [
      {
        notificationId: this.generateMessageId(),
        recipientId: transaction.senderCustomerId,
        type: type as any,
        message: `Transaction ${transaction.transactionId} ${type.replace('_', ' ')}`,
        sentAt: new Date().toISOString(),
        method: 'email' as const,
      },
      {
        notificationId: this.generateMessageId(),
        recipientId: transaction.receiverCustomerId,
        type: type as any,
        message: `Transaction ${transaction.transactionId} ${type.replace('_', ' ')}`,
        sentAt: new Date().toISOString(),
        method: 'email' as const,
      },
    ];

    transaction.notifications.push(...notifications);
  }

  private async sendDisputeNotifications(dispute: P2PDispute): Promise<void> {
    // Implementation would send actual notifications
    console.log(`Dispute notifications sent for dispute ${dispute.disputeId}`);
  }

  private async sendDisputeResolutionNotifications(dispute: P2PDispute): Promise<void> {
    // Implementation would send resolution notifications
    console.log(`Dispute resolution notifications sent for dispute ${dispute.disputeId}`);
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalTransactions: number;
    pendingTransactions: number;
    completedTransactions: number;
    disputedTransactions: number;
    totalVolume: number;
    activeDisputes: number;
    marketplaceItems: number;
    averageTransactionSize: number;
    disputeResolutionRate: number;
  } {
    const transactions = Array.from(this.transactions.values());
    const disputes = Array.from(this.disputes.values());

    const totalTransactions = transactions.length;
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
    const completedTransactions = transactions.filter(t => t.status === 'completed').length;
    const disputedTransactions = transactions.filter(t => t.status === 'disputed').length;
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const activeDisputes = disputes.filter(
      d => d.status === 'open' || d.status === 'under_review'
    ).length;
    const marketplaceItems = this.marketplaceItems.size;
    const averageTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
    const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length;
    const disputeResolutionRate = disputes.length > 0 ? resolvedDisputes / disputes.length : 0;

    return {
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      disputedTransactions,
      totalVolume,
      activeDisputes,
      marketplaceItems,
      averageTransactionSize,
      disputeResolutionRate,
    };
  }
}
