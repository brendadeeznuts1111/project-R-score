/**
 * 📱 Offline Queue System - FactoryWager Visual Payment Flows
 * Production-ready offline-first payment queue with conflict resolution
 */

import * as crypto from 'crypto';

/**
 * 📤 Queue Item Status
 */
export enum QueueItemStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  CONFLICT = 'conflict',
  FAILED = 'failed',
  RETRY = 'retry'
}

/**
 * 📤 Queue Item Type
 */
export enum QueueItemType {
  PAYMENT = 'payment',
  REQUEST = 'request',
  CONFIRMATION = 'confirmation',
  FAMILY_UPDATE = 'family_update'
}

/**
 * 📤 Queue Item Interface
 */
export interface QueueItem {
  id: string;
  type: QueueItemType;
  status: QueueItemStatus;
  data: any;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  conflictResolution?: 'client_wins' | 'server_wins' | 'merge';
  localVersion: number;
  serverVersion?: number;
}

/**
 * 📤 Sync Result Interface
 */
export interface SyncResult {
  itemId: string;
  success: boolean;
  status: QueueItemStatus;
  error?: string;
  serverData?: any;
  conflictData?: {
    local: any;
    server: any;
  };
}

/**
 * 📤 Offline Queue Manager
 */
export class OfflineQueueManager {
  private queue: Map<string, QueueItem>;
  private isOnline: boolean;
  private syncInProgress: boolean;
  private syncInterval: NodeJS.Timeout | null;
  private conflictResolver: ConflictResolver;

  constructor() {
    this.queue = new Map();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    this.conflictResolver = new ConflictResolver();
    
    // Load queue from storage
    this.loadQueueFromStorage();
    
    // Setup network listeners
    this.setupNetworkListeners();
    
    // Start periodic sync
    this.startPeriodicSync();
  }

  /**
   * 📤 Add item to queue
   */
  async addItem(type: QueueItemType, data: any): Promise<string> {
    const item: QueueItem = {
      id: this.generateId(),
      type,
      status: QueueItemStatus.PENDING,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      localVersion: this.generateVersion()
    };

    this.queue.set(item.id, item);
    await this.saveQueueToStorage();
    
    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      await this.syncItem(item.id);
    }
    
    return item.id;
  }

  /**
   * 📤 Add payment to queue
   */
  async addPayment(paymentData: {
    recipient: string;
    amount: number;
    method: 'venmo' | 'cashapp' | 'crypto';
    note?: string;
    participants?: string[];
  }): Promise<string> {
    return await this.addItem(QueueItemType.PAYMENT, paymentData);
  }

  /**
   * 📤 Add payment request to queue
   */
  async addPaymentRequest(requestData: {
    from: string;
    to: string;
    amount: number;
    note?: string;
  }): Promise<string> {
    return await this.addItem(QueueItemType.REQUEST, requestData);
  }

  /**
   * 📤 Add confirmation to queue
   */
  async addConfirmation(confirmationData: {
    transactionId: string;
    method: string;
    confirmed: boolean;
  }): Promise<string> {
    return await this.addItem(QueueItemType.CONFIRMATION, confirmationData);
  }

  /**
   * 🔄 Sync single item
   */
  async syncItem(itemId: string): Promise<SyncResult> {
    const item = this.queue.get(itemId);
    if (!item) {
      return { itemId, success: false, status: QueueItemStatus.FAILED, error: 'Item not found' };
    }

    if (item.status === QueueItemStatus.SUCCESS || item.status === QueueItemStatus.SYNCING) {
      return { itemId, success: true, status: item.status };
    }

    // Update status to syncing
    item.status = QueueItemStatus.SYNCING;
    item.updatedAt = Date.now();
    await this.saveQueueToStorage();

    try {
      const result = await this.syncWithServer(item);
      
      if (result.success) {
        // Success - remove from queue
        item.status = QueueItemStatus.SUCCESS;
        this.queue.delete(itemId);
        await this.saveQueueToStorage();
        
        return { itemId, success: true, status: QueueItemStatus.SUCCESS, serverData: result.data };
      } else {
        // Handle different failure types
        return await this.handleSyncFailure(item, result);
      }
    } catch (error) {
      return await this.handleSyncError(item, error);
    }
  }

  /**
   * 🔄 Sync all pending items
   */
  async syncAll(): Promise<SyncResult[]> {
    if (!this.isOnline || this.syncInProgress) {
      return [];
    }

    this.syncInProgress = true;
    const results: SyncResult[] = [];

    try {
      const pendingItems = Array.from(this.queue.values())
        .filter(item => item.status === QueueItemStatus.PENDING || item.status === QueueItemStatus.RETRY);

      for (const item of pendingItems) {
        const result = await this.syncItem(item.id);
        results.push(result);
      }
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  /**
   * ⚔️ Handle conflict resolution
   */
  async resolveConflict(itemId: string, resolution: 'client_wins' | 'server_wins' | 'merge'): Promise<SyncResult> {
    const item = this.queue.get(itemId);
    if (!item) {
      return { itemId, success: false, status: QueueItemStatus.FAILED, error: 'Item not found' };
    }

    item.conflictResolution = resolution;
    item.status = QueueItemStatus.PENDING;
    item.updatedAt = Date.now();
    
    await this.saveQueueToStorage();
    
    return await this.syncItem(itemId);
  }

  /**
   * 📊 Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    syncing: number;
    success: number;
    conflict: number;
    failed: number;
    retry: number;
  } {
    const stats = {
      total: this.queue.size,
      pending: 0,
      syncing: 0,
      success: 0,
      conflict: 0,
      failed: 0,
      retry: 0
    };

    for (const item of this.queue.values()) {
      stats[item.status]++;
    }

    return stats;
  }

  /**
   * 📋 Get pending items
   */
  getPendingItems(): QueueItem[] {
    return Array.from(this.queue.values())
      .filter(item => item.status === QueueItemStatus.PENDING || item.status === QueueItemStatus.RETRY)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * 🗑️ Clear completed items
   */
  async clearCompleted(): Promise<void> {
    const itemsToDelete: string[] = [];
    
    for (const [id, item] of this.queue.entries()) {
      if (item.status === QueueItemStatus.SUCCESS) {
        itemsToDelete.push(id);
      }
    }
    
    itemsToDelete.forEach(id => this.queue.delete(id));
    await this.saveQueueToStorage();
  }

  /**
   * 🔄 Sync with server
   */
  private async syncWithServer(item: QueueItem): Promise<{ success: boolean; data?: any; conflict?: any }> {
    const endpoint = this.getEndpointForType(item.type);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': item.localVersion.toString()
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else if (response.status === 409) {
        // Conflict detected
        const serverData = await response.json();
        return { 
          success: false, 
          conflict: { local: item.data, server: serverData }
        };
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🔧 Get endpoint for item type
   */
  private getEndpointForType(type: QueueItemType): string {
    const baseUrl = 'https://api.factory-wager.com/v1';
    
    switch (type) {
      case QueueItemType.PAYMENT:
        return `${baseUrl}/payments`;
      case QueueItemType.REQUEST:
        return `${baseUrl}/payment-requests`;
      case QueueItemType.CONFIRMATION:
        return `${baseUrl}/confirmations`;
      case QueueItemType.FAMILY_UPDATE:
        return `${baseUrl}/family-updates`;
      default:
        throw new Error(`Unknown item type: ${type}`);
    }
  }

  /**
   * ⚠️ Handle sync failure
   */
  private async handleSyncFailure(item: QueueItem, result: any): Promise<SyncResult> {
    if (result.conflict) {
      // Handle conflict
      item.status = QueueItemStatus.CONFLICT;
      item.serverVersion = this.generateVersion();
      await this.saveQueueToStorage();
      
      return {
        itemId: item.id,
        success: false,
        status: QueueItemStatus.CONFLICT,
        conflictData: result.conflict
      };
    } else {
      // Handle other failures
      return await this.handleSyncError(item, new Error(result.error || 'Sync failed'));
    }
  }

  /**
   * ❌ Handle sync error
   */
  private async handleSyncError(item: QueueItem, error: any): Promise<SyncResult> {
    item.retryCount++;
    
    if (item.retryCount >= item.maxRetries) {
      // Max retries reached
      item.status = QueueItemStatus.FAILED;
      await this.saveQueueToStorage();
      
      return {
        itemId: item.id,
        success: false,
        status: QueueItemStatus.FAILED,
        error: error instanceof Error ? error.message : String(error)
      };
    } else {
      // Schedule retry
      item.status = QueueItemStatus.RETRY;
      item.nextRetryAt = Date.now() + (Math.pow(2, item.retryCount) * 1000); // Exponential backoff
      await this.saveQueueToStorage();
      
      return {
        itemId: item.id,
        success: false,
        status: QueueItemStatus.RETRY,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 🌐 Setup network listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncAll(); // Try to sync when coming back online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * ⏰ Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        await this.syncAll();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * 🛑 Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 💾 Save queue to storage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      const queueData = JSON.stringify(Array.from(this.queue.entries()));
      await localStorage.setItem('factory-wager_queue', queueData);
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  /**
   * 📥 Load queue from storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueData = localStorage.getItem('factory-wager_queue');
      if (queueData) {
        const entries = JSON.parse(queueData);
        this.queue = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  }

  /**
   * 🔑 Generate unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 📊 Generate version number
   */
  private generateVersion(): number {
    return Date.now();
  }

  /**
   * 🗑️ Destroy queue manager
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.queue.clear();
  }
}

/**
 * ⚔️ Conflict Resolver
 */
export class ConflictResolver {
  /**
   * 🔄 Merge payment data
   */
  mergePaymentData(local: any, server: any): any {
    return {
      amount: Math.max(local.amount || 0, server.amount || 0),
      participants: [...new Set([...(local.participants || []), ...(server.participants || [])])],
      note: local.note || server.note,
      method: local.method || server.method,
      recipient: local.recipient || server.recipient,
      resolvedAt: new Date().toISOString(),
      conflictType: 'payment_merge'
    };
  }

  /**
   * 🔄 Merge request data
   */
  mergeRequestData(local: any, server: any): any {
    return {
      amount: Math.max(local.amount || 0, server.amount || 0),
      from: local.from || server.from,
      to: local.to || server.to,
      note: local.note || server.note,
      resolvedAt: new Date().toISOString(),
      conflictType: 'request_merge'
    };
  }

  /**
   * 🔄 Merge family update data
   */
  mergeFamilyUpdateData(local: any, server: any): any {
    return {
      ...local,
      ...server,
      resolvedAt: new Date().toISOString(),
      conflictType: 'family_update_merge'
    };
  }
}

/**
 * 📱 Queue UI Component Helper
 */
export class QueueUIHelper {
  /**
   * 📊 Format queue item for display
   */
  formatQueueItem(item: QueueItem): {
    id: string;
    type: string;
    status: string;
    description: string;
    timestamp: string;
    retryCount: number;
    canRetry: boolean;
    canResolve: boolean;
  } {
    const description = this.getItemDescription(item);
    const timestamp = new Date(item.createdAt).toLocaleString();
    const canRetry = item.status === QueueItemStatus.FAILED || item.status === QueueItemStatus.RETRY;
    const canResolve = item.status === QueueItemStatus.CONFLICT;

    return {
      id: item.id,
      type: item.type,
      status: item.status,
      description,
      timestamp,
      retryCount: item.retryCount,
      canRetry,
      canResolve
    };
  }

  /**
   * 📝 Get item description
   */
  private getItemDescription(item: QueueItem): string {
    switch (item.type) {
      case QueueItemType.PAYMENT:
        const payment = item.data;
        return `${payment.method} payment: $${payment.amount} to ${payment.recipient}`;
      case QueueItemType.REQUEST:
        const request = item.data;
        return `Request: $${request.amount} from ${request.from} to ${request.to}`;
      case QueueItemType.CONFIRMATION:
        const confirmation = item.data;
        return `Confirmation: ${confirmation.transactionId} (${confirmation.method})`;
      case QueueItemType.FAMILY_UPDATE:
        return 'Family update';
      default:
        return 'Unknown item';
    }
  }

  /**
   * 🎨 Get status color
   */
  getStatusColor(status: QueueItemStatus): string {
    switch (status) {
      case QueueItemStatus.PENDING:
        return '#FFA500'; // Orange
      case QueueItemStatus.SYNCING:
        return '#1E90FF'; // Blue
      case QueueItemStatus.SUCCESS:
        return '#32CD32'; // Green
      case QueueItemStatus.CONFLICT:
        return '#FF6347'; // Red
      case QueueItemStatus.FAILED:
        return '#DC143C'; // Dark Red
      case QueueItemStatus.RETRY:
        return '#FF8C00'; // Dark Orange
      default:
        return '#3b82f6'; // Gray
    }
  }

  /**
   * 🎨 Get status icon
   */
  getStatusIcon(status: QueueItemStatus): string {
    switch (status) {
      case QueueItemStatus.PENDING:
        return '⏳';
      case QueueItemStatus.SYNCING:
        return '🔄';
      case QueueItemStatus.SUCCESS:
        return '✅';
      case QueueItemStatus.CONFLICT:
        return '⚠️';
      case QueueItemStatus.FAILED:
        return '❌';
      case QueueItemStatus.RETRY:
        return '🔄';
      default:
        return '❓';
    }
  }
}

/**
 * 🚀 Usage Example
 */

// Initialize queue manager
/*
const queueManager = new OfflineQueueManager();

// Add payment when offline
const paymentId = await queueManager.addPayment({
  recipient: '@DadFamily',
  amount: 25.00,
  method: 'venmo',
  note: 'Dinner',
  participants: ['mom', 'dad', 'kids']
});

// Get queue statistics
const stats = queueManager.getQueueStats();
console.log('Queue stats:', stats);

// Get pending items for UI
const pendingItems = queueManager.getPendingItems();
const uiHelper = new QueueUIHelper();
const formattedItems = pendingItems.map(item => uiHelper.formatQueueItem(item));

// Handle conflict resolution
await queueManager.resolveConflict(paymentId, 'merge');

// Force sync
const results = await queueManager.syncAll();
console.log('Sync results:', results);
*/

// Example queue item in storage:
/*
{
  "id": "abc123def456",
  "type": "payment",
  "status": "pending",
  "data": {
    "recipient": "@DadFamily",
    "amount": 25.00,
    "method": "venmo",
    "note": "Dinner",
    "participants": ["mom", "dad", "kids"]
  },
  "createdAt": 1705323000000,
  "updatedAt": 1705323000000,
  "retryCount": 0,
  "maxRetries": 3,
  "localVersion": 1705323000000
}
*/
