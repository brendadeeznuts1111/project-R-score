/**
 * FactoryWager Registry System
 *
 * Centralized configuration and module registry using:
 * - R2 for storage
 * - Bun.semver for versioning
 * - Real-time updates via WebSocket
 */

import { unifiedCloudflare } from './unified-client';
import { versionManager } from './unified-versioning';

export interface RegistryEntry {
  name: string;
  version: string;
  type: 'module' | 'theme' | 'config' | 'worker' | 'secret';
  content: string | Record<string, unknown>;
  metadata: {
    author: string;
    timestamp: string;
    checksum: string;
    dependencies?: string[];
    tags?: string[];
  };
}

export interface RegistryQuery {
  name?: string;
  type?: RegistryEntry['type'];
  version?: string;
  tags?: string[];
}

export interface PlaygroundConfig {
  id: string;
  name: string;
  type: 'client' | 'admin' | 'payment' | 'barber';
  layout: DashboardLayout;
  widgets: WidgetConfig[];
  permissions: PermissionConfig;
  [key: string]: any;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  theme: 'light' | 'dark' | 'professional';
}

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'table' | 'pipeline' | 'stats' | 'approval' | 'hierarchy';
  position: { x: number; y: number; w: number; h: number };
  dataSource: string;
  refreshInterval?: number;
}

export interface PermissionConfig {
  roles: string[];
  actions: ('view' | 'edit' | 'approve' | 'delete')[];
  scope: 'own' | 'team' | 'all';
}

// ==================== Payment Types & Providers ====================

export type PaymentType =
  | 'service' // Regular service payment
  | 'tip' // Client tip to barber
  | 'p2p' // Peer-to-peer transfer
  | 'refund' // Refund to client
  | 'commission' // Commission payout to barber
  | 'deposit' // Booking deposit
  | 'subscription' // Monthly/weekly subscription
  | 'product' // Product purchase
  | 'penalty' // Late cancellation/no-show fee
  | 'bonus'; // Performance bonus

export type PaymentProvider =
  | 'stripe'
  | 'square'
  | 'cashapp'
  | 'venmo'
  | 'zelle'
  | 'paypal'
  | 'crypto'
  | 'cash'
  | 'giftcard'
  | 'store_credit';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'on_hold'
  | 'insufficient_funds'
  | 'requires_action';

export type CancellationReason =
  | 'client_request'
  | 'barber_unavailable'
  | 'no_show'
  | 'emergency'
  | 'system_error'
  | 'fraud_detected'
  | 'duplicate'
  | 'insufficient_funds'
  | 'payment_expired'
  | 'user_initiated';

export type TipType = 'percentage' | 'fixed' | 'round_up' | 'custom';

// ==================== Payment Pipeline ====================

export interface PaymentPipeline {
  id: string;
  status: 'pending' | 'review' | 'approved' | 'rejected' | 'processing' | 'completed';
  amount: number;
  currency: string;
  client: string;
  barber: string;
  type: PaymentType;
  provider: PaymentProvider;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;

  // Cancellation tracking
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: CancellationReason;
  cancellationFee?: number;

  // Retry logic for insufficient funds
  retryCount: number;
  maxRetries: number;
  retryScheduledAt?: string;

  // Financial breakdown
  subtotal: number;
  tax: number;
  tipAmount?: number;
  discount?: number;
  fee: number;
  total: number;
  [key: string]: any;
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  assignee?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

// ==================== Payment Transaction ====================

export interface PaymentTransaction {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: PaymentProvider;

  // Participants
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;

  // Service details
  serviceId?: string;
  serviceName?: string;
  serviceDate?: string;

  // Tip details
  tipAmount?: number;
  tipType?: TipType;
  tipMessage?: string;

  // Financial breakdown
  subtotal: number;
  tax: number;
  discount?: number;
  fee: number;
  total: number;

  // Commission (for barber payout)
  commissionRate: number;
  commissionAmount: number;
  barberPayout: number;

  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: CancellationReason;
  cancellationFee?: number;
  refundAmount?: number;

  // Retry logic
  retryScheduledAt?: string;
  retryCount: number;
  maxRetries: number;

  // Timeline
  createdAt: string;
  authorizedAt?: string;
  capturedAt?: string;
  completedAt?: string;
  failedAt?: string;

  // Receipt
  receiptUrl?: string;
  invoiceId?: string;
  [key: string]: any;
}

// ==================== P2P Transfer ====================

export interface P2PTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserType: 'client' | 'barber' | 'admin';
  toUserType: 'client' | 'barber' | 'admin';
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: 'tip' | 'payment' | 'refund' | 'split' | 'advance';
  message?: string;
  serviceId?: string;
  createdAt: string;
  completedAt?: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
  fee: number;
  [key: string]: any;
}

// ==================== Tip Configuration ====================

export interface TipConfig {
  enabled: boolean;
  type: TipType;
  defaultAmount?: number;
  percentages?: number[]; // [15, 18, 20, 25] for percentage tips
  maxAmount?: number;
  minAmount?: number;
  allowCustom: boolean;
  promptAtCheckout: boolean;
  splitBetweenBarbers?: boolean;
}

// ==================== Barber Hierarchy ====================

export interface BarberHierarchy {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'senior' | 'junior' | 'trainee';
  parentId?: string;
  team?: string[];
  commission: number;
  permissions: string[];
  metrics: {
    totalCuts: number;
    rating: number;
    revenue: number;
    tipsReceived: number;
  };
  tipConfig?: TipConfig;
  preferredProviders?: PaymentProvider[];
  [key: string]: any;
}

// ==================== Payment Approval ====================

export interface PaymentApproval {
  id: string;
  paymentId: string;
  requestedBy: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvers: string[];
  approvedBy?: string;
  approvedAt?: string;
  comments: ApprovalComment[];

  // Payout details for approved
  payoutMethod?: 'direct_deposit' | 'cashapp' | 'venmo' | 'zelle' | 'check';
  payoutAccount?: string;
  processedAt?: string;
  [key: string]: any;
}

export interface ApprovalComment {
  author: string;
  text: string;
  timestamp: string;
}

// ==================== Barber Payout ====================

export interface BarberPayout {
  id: string;
  barberId: string;
  barberName: string;
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Earnings breakdown
  serviceRevenue: number;
  tipRevenue: number;
  bonusRevenue: number;
  totalRevenue: number;

  // Deductions
  commissionDeducted: number;
  feesDeducted: number;
  advancesDeducted: number;
  cancellationFees: number;
  totalDeductions: number;

  // Final payout
  netPayout: number;

  // Payment details
  payoutMethod: 'direct_deposit' | 'check' | 'cashapp' | 'venmo' | 'zelle';
  payoutAccount?: string;
  processedAt?: string;
  providerTransactionId?: string;

  // Transactions included
  transactionIds: string[];
  [key: string]: any;
}

// ==================== Barber Advance ====================

export interface BarberAdvance {
  id: string;
  barberId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'deducted';
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  reason: string;
  approvedBy?: string;
  deductionSchedule?: {
    amount: number;
    fromPayoutId: string;
    deductedAt: string;
  }[];
  [key: string]: any;
}

// ==================== Insufficient Funds Handler ====================

export interface InsufficientFundsConfig {
  maxRetries: number;
  retryDelayMinutes: number;
  applyLateFee: boolean;
  lateFeeAmount: number;
  notifyClient: boolean;
  alternativeProviders: PaymentProvider[];
}

// ==================== Payment Notification ====================

export interface PaymentNotification {
  id: string;
  userId: string;
  userType: 'client' | 'barber';
  type:
    | 'payment_received'
    | 'payment_failed'
    | 'tip_received'
    | 'payout_sent'
    | 'advance_approved'
    | 'insufficient_funds';
  title: string;
  message: string;
  amount?: number;
  transactionId?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  [key: string]: any;
}

/**
 * FactoryWager Registry
 *
 * Centralized module and configuration management
 */
export class FactoryWagerRegistry {
  private cache: Map<string, RegistryEntry> = new Map();
  private subscribers: Map<string, Set<(entry: RegistryEntry) => void>> = new Map();
  private _bucketName = 'factory-wager-registry';

  /**
   * Publish entry to registry
   */
  async publish(
    entry: Omit<RegistryEntry, 'metadata'> & { metadata?: Partial<RegistryEntry['metadata']> }
  ): Promise<void> {
    const fullEntry: RegistryEntry = {
      ...entry,
      metadata: {
        author: entry.metadata?.author || 'system',
        timestamp: new Date().toISOString(),
        checksum: await this.generateChecksum(entry.content),
        dependencies: entry.metadata?.dependencies || [],
        tags: entry.metadata?.tags || [],
        ...entry.metadata,
      },
    };

    // Store in R2
    const key = `${entry.type}/${entry.name}@${entry.version}`;
    await unifiedCloudflare.uploadToR2(key, JSON.stringify(fullEntry), {
      contentType: 'application/json',
      metadata: {
        name: entry.name,
        version: entry.version,
        type: entry.type,
      },
    });

    // Update cache
    this.cache.set(`${entry.name}@${entry.version}`, fullEntry);

    // Notify subscribers
    this.notifySubscribers(entry.name, fullEntry);

    // Register version
    await versionManager.registerResource(`registry:${entry.name}`, entry.version, {
      type: entry.type,
      checksum: fullEntry.metadata.checksum,
    });
  }

  /**
   * Fetch entry from registry
   */
  async fetch(name: string, version?: string): Promise<RegistryEntry | null> {
    const cacheKey = version ? `${name}@${version}` : name;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Fetch from R2
    const key = version ? `*/${name}@${version}` : `*/${name}@latest`;

    try {
      const response = await unifiedCloudflare.downloadFromR2(key);
      if (!response) return null;

      const entry: RegistryEntry = await response.json();
      this.cache.set(cacheKey, entry);
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Query registry
   */
  async query(query: RegistryQuery): Promise<RegistryEntry[]> {
    // List all entries
    const result = await unifiedCloudflare.listR2Objects({
      prefix: query.type || '',
    });

    const entries: RegistryEntry[] = [];

    for (const obj of result.objects) {
      try {
        const response = await unifiedCloudflare.downloadFromR2(obj.key);
        if (!response) continue;

        const entry: RegistryEntry = await response.json();

        // Apply filters
        if (query.name && entry.name !== query.name) continue;
        if (query.type && entry.type !== query.type) continue;
        if (query.version && entry.version !== query.version) continue;
        if (query.tags && !query.tags.some(t => entry.metadata.tags?.includes(t))) continue;

        entries.push(entry);
      } catch {
        continue;
      }
    }

    return entries;
  }

  /**
   * Subscribe to entry updates
   */
  subscribe(name: string, callback: (entry: RegistryEntry) => void): () => void {
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    this.subscribers.get(name)!.add(callback);

    return () => {
      this.subscribers.get(name)?.delete(callback);
    };
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(name: string, entry: RegistryEntry): void {
    this.subscribers.get(name)?.forEach(cb => cb(entry));
  }

  /**
   * Generate content checksum
   */
  private async generateChecksum(content: string | Record<string, unknown>): Promise<string> {
    const data = typeof content === 'string' ? content : JSON.stringify(content);
    const hash = Bun.hash(data);
    return hash.toString(16);
  }

  // ==================== Playground/Dashboard ====================

  /**
   * Create playground configuration
   */
  async createPlayground(config: Omit<PlaygroundConfig, 'id'>): Promise<PlaygroundConfig> {
    const fullConfig: PlaygroundConfig = {
      ...config,
      id: `pg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    await this.publish({
      name: fullConfig.id,
      version: '1.0.0',
      type: 'config',
      content: fullConfig,
      metadata: {
        author: 'system',
        tags: ['playground', config.type],
      },
    });

    return fullConfig;
  }

  /**
   * Get playground by ID
   */
  async getPlayground(id: string): Promise<PlaygroundConfig | null> {
    const entry = await this.fetch(id);
    if (!entry || entry.type !== 'config') return null;
    return entry.content as PlaygroundConfig;
  }

  // ==================== Payment Pipeline ====================

  /**
   * Create payment pipeline
   */
  async createPaymentPipeline(
    payment: Omit<PaymentPipeline, 'id' | 'stages' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentPipeline> {
    const pipeline: PaymentPipeline = {
      ...payment,
      id: `pay-${Date.now()}`,
      stages: [
        {
          name: 'submission',
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        { name: 'review', status: 'active', startedAt: new Date().toISOString() },
        { name: 'approval', status: 'pending' },
        { name: 'processing', status: 'pending' },
        { name: 'completion', status: 'pending' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.publish({
      name: `payment-${pipeline.id}`,
      version: '1.0.0',
      type: 'config',
      content: pipeline,
      metadata: {
        author: payment.client,
        tags: ['payment', 'pipeline', payment.status],
      },
    });

    return pipeline;
  }

  /**
   * Update pipeline stage
   */
  async updatePipelineStage(
    pipelineId: string,
    stageName: string,
    updates: Partial<PipelineStage>
  ): Promise<PaymentPipeline | null> {
    const entry = await this.fetch(`payment-${pipelineId}`);
    if (!entry) return null;

    const pipeline = entry.content as PaymentPipeline;
    const stage = pipeline.stages.find(s => s.name === stageName);
    if (!stage) return null;

    Object.assign(stage, updates);
    if (updates.status === 'completed') {
      stage.completedAt = new Date().toISOString();
    }

    pipeline.updatedAt = new Date().toISOString();

    // Update overall status
    const allCompleted = pipeline.stages.every(s => s.status === 'completed');
    const anyFailed = pipeline.stages.some(s => s.status === 'failed');

    if (allCompleted) {
      pipeline.status = 'completed';
    } else if (anyFailed) {
      pipeline.status = 'rejected';
    }

    await this.publish({
      name: `payment-${pipelineId}`,
      version: entry.version,
      type: 'config',
      content: pipeline,
      metadata: entry.metadata,
    });

    return pipeline;
  }

  // ==================== Barber Hierarchy ====================

  /**
   * Create barber hierarchy entry
   */
  async createBarber(barber: Omit<BarberHierarchy, 'id'>): Promise<BarberHierarchy> {
    const fullBarber: BarberHierarchy = {
      ...barber,
      id: `barber-${Date.now()}`,
    };

    await this.publish({
      name: fullBarber.id,
      version: '1.0.0',
      type: 'config',
      content: fullBarber,
      metadata: {
        author: fullBarber.name,
        tags: ['barber', 'hierarchy', fullBarber.role],
      },
    });

    return fullBarber;
  }

  /**
   * Get barber team hierarchy
   */
  async getBarberHierarchy(barberId: string): Promise<BarberHierarchy[]> {
    const entries = await this.query({
      type: 'config',
      tags: ['barber', 'hierarchy'],
    });

    const barbers = entries
      .map(e => e.content as BarberHierarchy)
      .filter(b => b.parentId === barberId || b.id === barberId);

    return barbers;
  }

  // ==================== Payment Approvals ====================

  /**
   * Create approval request
   */
  async createApproval(approval: Omit<PaymentApproval, 'id'>): Promise<PaymentApproval> {
    const fullApproval: PaymentApproval = {
      ...approval,
      id: `apr-${Date.now()}`,
    };

    await this.publish({
      name: fullApproval.id,
      version: '1.0.0',
      type: 'config',
      content: fullApproval,
      metadata: {
        author: approval.requestedBy,
        tags: ['approval', 'payment', approval.status],
      },
    });

    return fullApproval;
  }

  /**
   * Approve/reject payment
   */
  async processApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    approver: string,
    comment?: string
  ): Promise<PaymentApproval | null> {
    const entry = await this.fetch(approvalId);
    if (!entry) return null;

    const approval = entry.content as PaymentApproval;

    approval.status = decision;
    approval.approvedBy = approver;
    approval.approvedAt = new Date().toISOString();

    if (comment) {
      approval.comments.push({
        author: approver,
        text: comment,
        timestamp: new Date().toISOString(),
      });
    }

    await this.publish({
      name: approvalId,
      version: entry.version,
      type: 'config',
      content: approval,
      metadata: entry.metadata,
    });

    // Update payment pipeline if approved
    if (decision === 'approved') {
      await this.updatePipelineStage(approval.paymentId, 'approval', {
        status: 'completed',
        assignee: approver,
      });
    }

    return approval;
  }

  // ==================== Payment Types & P2P ====================

  /**
   * Create P2P transfer
   */
  async createP2PTransfer(transfer: Omit<P2PTransfer, 'id' | 'createdAt'>): Promise<P2PTransfer> {
    const fullTransfer: P2PTransfer = {
      ...transfer,
      id: `p2p-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    await this.publish({
      name: fullTransfer.id,
      version: '1.0.0',
      type: 'config',
      content: fullTransfer,
      metadata: {
        author: transfer.fromUserId,
        tags: ['p2p', 'transfer', transfer.type],
      },
    });

    return fullTransfer;
  }

  /**
   * Create tip payment
   */
  async createTip(
    clientId: string,
    barberId: string,
    amount: number,
    type: TipType,
    message?: string,
    provider: PaymentProvider = 'cashapp'
  ): Promise<PaymentTransaction> {
    const tip: PaymentTransaction = {
      id: `tip-${Date.now()}`,
      type: 'tip',
      status: 'pending',
      amount,
      currency: 'USD',
      provider,
      clientId,
      clientName: 'Client',
      barberId,
      barberName: 'Barber',
      tipAmount: amount,
      tipType: type,
      tipMessage: message,
      subtotal: 0,
      tax: 0,
      fee: amount * 0.025,
      total: amount,
      commissionRate: 0,
      commissionAmount: 0,
      barberPayout: amount * 0.975, // Barber gets 97.5% of tip
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    await this.publish({
      name: tip.id,
      version: '1.0.0',
      type: 'config',
      content: tip,
      metadata: {
        author: clientId,
        tags: ['payment', 'tip', barberId],
      },
    });

    return tip;
  }

  /**
   * Cancel payment with reason
   */
  async cancelPayment(
    pipelineId: string,
    reason: CancellationReason,
    cancelledBy: string,
    applyFee: boolean = false
  ): Promise<PaymentPipeline | null> {
    const entry = await this.fetch(`payment-${pipelineId}`);
    if (!entry) return null;

    const pipeline = entry.content as PaymentPipeline;

    if (pipeline.status === 'completed') {
      throw new Error('Cannot cancel completed payment. Use refund instead.');
    }

    pipeline.status = 'cancelled';
    pipeline.cancelledAt = new Date().toISOString();
    pipeline.cancelledBy = cancelledBy;
    pipeline.cancellationReason = reason;
    pipeline.updatedAt = new Date().toISOString();

    // Calculate cancellation fee
    if (applyFee) {
      const feePercent = reason === 'no_show' ? 0.5 : 0.25;
      pipeline.cancellationFee = pipeline.subtotal * feePercent;
    }

    await this.publish({
      name: `payment-${pipelineId}`,
      version: entry.version,
      type: 'config',
      content: pipeline,
      metadata: {
        ...entry.metadata,
        tags: [...entry.metadata.tags, 'cancelled', reason],
      },
    });

    return pipeline;
  }

  /**
   * Handle insufficient funds
   */
  async handleInsufficientFunds(
    pipelineId: string,
    config: InsufficientFundsConfig
  ): Promise<PaymentPipeline | null> {
    const entry = await this.fetch(`payment-${pipelineId}`);
    if (!entry) return null;

    const pipeline = entry.content as PaymentPipeline;

    if (pipeline.retryCount >= config.maxRetries) {
      pipeline.status = 'failed';
      await this.publish({
        name: `payment-${pipelineId}`,
        version: entry.version,
        type: 'config',
        content: pipeline,
        metadata: entry.metadata,
      });
      return pipeline;
    }

    pipeline.status = 'insufficient_funds';
    pipeline.retryCount++;
    pipeline.retryScheduledAt = new Date(
      Date.now() + config.retryDelayMinutes * 60 * 1000
    ).toISOString();
    pipeline.updatedAt = new Date().toISOString();

    if (config.applyLateFee) {
      pipeline.cancellationFee = (pipeline.cancellationFee || 0) + config.lateFeeAmount;
      pipeline.total += config.lateFeeAmount;
    }

    await this.publish({
      name: `payment-${pipelineId}`,
      version: entry.version,
      type: 'config',
      content: pipeline,
      metadata: entry.metadata,
    });

    return pipeline;
  }

  /**
   * Create barber payout
   */
  async createBarberPayout(payout: Omit<BarberPayout, 'id'>): Promise<BarberPayout> {
    const fullPayout: BarberPayout = {
      ...payout,
      id: `payout-${Date.now()}`,
    };

    await this.publish({
      name: fullPayout.id,
      version: '1.0.0',
      type: 'config',
      content: fullPayout,
      metadata: {
        author: payout.barberId,
        tags: ['payout', 'barber', payout.status],
      },
    });

    return fullPayout;
  }

  /**
   * Request barber advance
   */
  async requestBarberAdvance(
    advance: Omit<BarberAdvance, 'id' | 'requestedAt'>
  ): Promise<BarberAdvance> {
    const fullAdvance: BarberAdvance = {
      ...advance,
      id: `advance-${Date.now()}`,
      requestedAt: new Date().toISOString(),
    };

    await this.publish({
      name: fullAdvance.id,
      version: '1.0.0',
      type: 'config',
      content: fullAdvance,
      metadata: {
        author: advance.barberId,
        tags: ['advance', 'barber', 'pending'],
      },
    });

    return fullAdvance;
  }

  /**
   * Create payment notification
   */
  async createNotification(
    notification: Omit<PaymentNotification, 'id' | 'createdAt'>
  ): Promise<PaymentNotification> {
    const fullNotification: PaymentNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    await this.publish({
      name: fullNotification.id,
      version: '1.0.0',
      type: 'config',
      content: fullNotification,
      metadata: {
        author: 'payment-system',
        tags: ['notification', notification.type],
      },
    });

    return fullNotification;
  }

  /**
   * Calculate tip suggestions
   */
  calculateTipSuggestions(
    subtotal: number,
    config?: TipConfig
  ): { percentage: number; amount: number }[] {
    const percentages = config?.percentages || [15, 18, 20, 25];
    return percentages.map(pct => ({
      percentage: pct,
      amount: Math.round(((subtotal * pct) / 100) * 100) / 100,
    }));
  }
}

// Singleton instance
export const registry = new FactoryWagerRegistry();
export default registry;

// Re-export types
export type {
  RegistryEntry,
  RegistryQuery,
  PlaygroundConfig,
  DashboardLayout,
  WidgetConfig,
  PermissionConfig,
  PaymentPipeline,
  PipelineStage,
  BarberHierarchy,
  PaymentApproval,
  ApprovalComment,
  PaymentType,
  PaymentProvider,
  PaymentStatus,
  CancellationReason,
  TipType,
  TipConfig,
  PaymentTransaction,
  P2PTransfer,
  BarberPayout,
  BarberAdvance,
  InsufficientFundsConfig,
  PaymentNotification,
};
