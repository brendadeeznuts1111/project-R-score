/**
 * 🔄 Fire22 Dashboard - System Coordinator Service
 * Coordinates data synchronization between Fire22, Telegram, and Internal systems
 */

import type { DatabaseConnection } from '../types/database/base';
import { CustomerEntity } from '../entities/customer';
import { databaseService } from './database/connection';
import { BUSINESS, DATABASE, API } from '../constants';

export interface SystemCoordinatorConfig {
  fire22ApiUrl: string;
  fire22Token: string;
  telegramBotToken: string;
  syncIntervalMinutes: number;
  enableAutoSync: boolean;
}

export interface SyncResult {
  system: 'fire22' | 'telegram' | 'internal';
  table: string;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export interface CoordinationRule {
  id: string;
  name: string;
  trigger: 'fire22_update' | 'telegram_message' | 'ticket_created' | 'transaction_processed';
  conditions: Record<string, any>;
  actions: CoordinationAction[];
  active: boolean;
}

export interface CoordinationAction {
  type:
    | 'update_user'
    | 'create_ticket'
    | 'send_notification'
    | 'route_department'
    | 'update_permissions';
  target: string;
  parameters: Record<string, any>;
}

/**
 * Main coordinator service for managing cross-system data flow
 */
export class SystemCoordinator {
  private config: SystemCoordinatorConfig;
  private db: DatabaseConnection;
  private syncInProgress: Set<string> = new Set();
  private coordinationRules: CoordinationRule[] = [];
  private lastSyncTimes: Map<string, Date> = new Map();

  constructor(config: SystemCoordinatorConfig, database?: DatabaseConnection) {
    this.config = config;
    this.db = database || databaseService.getDatabase();
    this.initializeCoordinationRules();
  }

  // !== CORE SYNCHRONIZATION METHODS !==

  /**
   * Synchronize all systems
   */
  public async syncAllSystems(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    try {
      // 1. Sync Fire22 data first (customers, agents, transactions)
      results.push(...(await this.syncFire22Data()));

      // 2. Sync Telegram users and link to Fire22 customers
      results.push(...(await this.syncTelegramData()));

      // 3. Process coordination rules
      await this.processCoordinationRules();

      // 4. Update sync status
      await this.updateSyncStatus('all_systems', 'completed', results.length);
    } catch (error) {
      console.error('❌ System synchronization failed:', error);
      await this.updateSyncStatus('all_systems', 'failed', 0, [error.message]);
      throw error;
    }

    return results;
  }

  /**
   * Sync Fire22 platform data
   */
  public async syncFire22Data(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const startTime = Date.now();

    if (this.syncInProgress.has('fire22')) {
      throw new Error('Fire22 sync already in progress');
    }

    this.syncInProgress.add('fire22');

    try {
      // Sync customers
      const customerResult = await this.syncFire22Customers();
      results.push(customerResult);

      // Sync agents
      const agentResult = await this.syncFire22Agents();
      results.push(agentResult);

      // Sync recent transactions
      const transactionResult = await this.syncFire22Transactions();
      results.push(transactionResult);

      this.lastSyncTimes.set('fire22', new Date());
    } finally {
      this.syncInProgress.delete('fire22');
    }

    return results;
  }

  /**
   * Sync Fire22 customers and coordinate with internal users
   */
  private async syncFire22Customers(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      system: 'fire22',
      table: 'customers',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // Fetch customers from Fire22 API
      const fire22Customers = await this.fetchFire22Customers();
      result.recordsProcessed = fire22Customers.length;

      for (const customerData of fire22Customers) {
        try {
          // Check if unified user exists
          let user = await this.findUserByFire22Id(customerData.customer_id);

          if (!user) {
            // Create unified user record
            user = await this.createUnifiedUser({
              fire22_customer_id: customerData.customer_id,
              username: customerData.username || customerData.login,
              first_name: customerData.first_name,
              last_name: customerData.last_name,
              email: customerData.email,
              role: 'customer',
              status: customerData.status || 'active',
            });
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }

          // Update or create Fire22 customer record
          await this.upsertFire22Customer(user.id, customerData);

          // Apply coordination rules for customer updates
          await this.applyCoordinationRules('fire22_update', {
            user_id: user.id,
            customer_data: customerData,
            is_new: result.recordsCreated > result.recordsUpdated,
          });
        } catch (error) {
          result.errors.push(`Customer ${customerData.customer_id}: ${error.message}`);
        }
      }
    } catch (error) {
      result.errors.push(`Fire22 API error: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Sync Telegram users and link to Fire22 customers
   */
  public async syncTelegramData(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const startTime = Date.now();

    if (this.syncInProgress.has('telegram')) {
      throw new Error('Telegram sync already in progress');
    }

    this.syncInProgress.add('telegram');

    try {
      // Sync telegram users and messages
      const telegramResult = await this.syncTelegramUsers();
      results.push(telegramResult);

      // Process recent messages for department routing
      const messageResult = await this.processTelegramMessages();
      results.push(messageResult);

      this.lastSyncTimes.set('telegram', new Date());
    } finally {
      this.syncInProgress.delete('telegram');
    }

    return results;
  }

  // !== COORDINATION RULE ENGINE !==

  /**
   * Initialize default coordination rules
   */
  private initializeCoordinationRules(): void {
    this.coordinationRules = [
      {
        id: 'vip_customer_upgrade',
        name: 'VIP Customer Upgrade Coordination',
        trigger: 'fire22_update',
        conditions: {
          field: 'vip_status',
          changed_to: true,
        },
        actions: [
          {
            type: 'update_user',
            target: 'users',
            parameters: { role: 'vip_customer' },
          },
          {
            type: 'update_permissions',
            target: 'team_permissions',
            parameters: { service_level: 'vip' },
          },
          {
            type: 'send_notification',
            target: 'telegram',
            parameters: {
              message: 'Congratulations! You have been upgraded to VIP status.',
              priority: 'high',
            },
          },
        ],
        active: true,
      },

      {
        id: 'high_value_transaction_alert',
        name: 'High Value Transaction Department Alert',
        trigger: 'transaction_processed',
        conditions: {
          field: 'amount',
          operator: 'greater_than',
          value: 10000,
        },
        actions: [
          {
            type: 'create_ticket',
            target: 'support_tickets',
            parameters: {
              department: 'finance',
              priority: 'high',
              category: 'high_value_transaction',
              auto_assign: true,
            },
          },
          {
            type: 'send_notification',
            target: 'telegram',
            parameters: {
              channel: 'finance_alerts',
              message: 'High value transaction requires review: {{amount}} for {{customer}}',
            },
          },
        ],
        active: true,
      },

      {
        id: 'telegram_support_routing',
        name: 'Telegram Message Department Routing',
        trigger: 'telegram_message',
        conditions: {
          field: 'message_type',
          value: 'support_request',
        },
        actions: [
          {
            type: 'route_department',
            target: 'telegram_messages',
            parameters: {
              routing_rules: {
                'withdrawal|deposit|financial': 'finance',
                'vip|premium|exclusive': 'vip',
                'technical|bug|error': 'technical',
                default: 'support',
              },
            },
          },
          {
            type: 'create_ticket',
            target: 'support_tickets',
            parameters: {
              auto_assign: true,
              sla_based_on_customer_tier: true,
            },
          },
        ],
        active: true,
      },
    ];
  }

  /**
   * Apply coordination rules based on trigger
   */
  private async applyCoordinationRules(trigger: string, context: any): Promise<void> {
    const applicableRules = this.coordinationRules.filter(
      rule => rule.active && rule.trigger === trigger
    );

    for (const rule of applicableRules) {
      try {
        if (this.evaluateConditions(rule.conditions, context)) {
          await this.executeActions(rule.actions, context);
        }
      } catch (error) {
        console.error(`❌ Failed to apply rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: Record<string, any>, context: any): boolean {
    // Simple condition evaluation - can be enhanced for complex logic
    if (conditions.field && conditions.changed_to !== undefined) {
      const currentValue = this.getNestedValue(context, conditions.field);
      return currentValue === conditions.changed_to;
    }

    if (conditions.field && conditions.operator && conditions.value !== undefined) {
      const currentValue = this.getNestedValue(context, conditions.field);

      switch (conditions.operator) {
        case 'greater_than':
          return currentValue > conditions.value;
        case 'less_than':
          return currentValue < conditions.value;
        case 'equals':
          return currentValue === conditions.value;
        case 'contains':
          return String(currentValue)
            .toLowerCase()
            .includes(String(conditions.value).toLowerCase());
        default:
          return false;
      }
    }

    return true; // No conditions = always apply
  }

  /**
   * Execute coordination actions
   */
  private async executeActions(actions: CoordinationAction[], context: any): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'update_user':
            await this.executeUpdateUser(action, context);
            break;

          case 'create_ticket':
            await this.executeCreateTicket(action, context);
            break;

          case 'send_notification':
            await this.executeSendNotification(action, context);
            break;

          case 'route_department':
            await this.executeRouteDepartment(action, context);
            break;

          case 'update_permissions':
            await this.executeUpdatePermissions(action, context);
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  // !== DATABASE OPERATIONS !==

  /**
   * Create unified user record
   */
  private async createUnifiedUser(userData: any): Promise<any> {
    const query = `
      INSERT INTO users (
        uuid, username, first_name, last_name, email, 
        fire22_customer_id, role, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const uuid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const params = [
      uuid,
      userData.username,
      userData.first_name,
      userData.last_name,
      userData.email,
      userData.fire22_customer_id,
      userData.role,
      userData.status,
      new Date().toISOString(),
    ];

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .first();
    return result;
  }

  /**
   * Find user by Fire22 customer ID
   */
  private async findUserByFire22Id(fire22CustomerId: string): Promise<any> {
    const query = `SELECT * FROM users WHERE fire22_customer_id = ?`;
    return await this.db.prepare(query).bind(fire22CustomerId).first();
  }

  /**
   * Update sync status in database
   */
  private async updateSyncStatus(
    systemName: string,
    status: string,
    recordsCount: number,
    errors: string[] = []
  ): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO sync_status (
        system_name, table_name, last_sync_at, sync_status, 
        records_synced, sync_errors, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      systemName,
      'all_tables',
      new Date().toISOString(),
      status,
      recordsCount,
      JSON.stringify(errors),
      new Date().toISOString(),
    ];

    await this.db
      .prepare(query)
      .bind(...params)
      .run();
  }

  // !== UTILITY METHODS !==

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Replace template variables in string
   */
  private replaceTemplateVars(template: string, context: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.getNestedValue(context, key) || match;
    });
  }

  // !== ACTION EXECUTORS (to be implemented) !==

  private async executeUpdateUser(action: CoordinationAction, context: any): Promise<void> {
    // Implementation for updating user records
  }

  private async executeCreateTicket(action: CoordinationAction, context: any): Promise<void> {
    // Implementation for creating support tickets
  }

  private async executeSendNotification(action: CoordinationAction, context: any): Promise<void> {
    // Implementation for sending notifications
  }

  private async executeRouteDepartment(action: CoordinationAction, context: any): Promise<void> {
    // Implementation for department routing
  }

  private async executeUpdatePermissions(action: CoordinationAction, context: any): Promise<void> {
    // Implementation for updating permissions
  }

  // !== EXTERNAL API METHODS (to be implemented) !==

  private async fetchFire22Customers(): Promise<any[]> {
    // Mock data for now - replace with actual Fire22 API call
    return [
      {
        customer_id: 'CUST_001',
        username: 'player1',
        first_name: 'John',
        last_name: 'Doe',
        login: 'johndoe',
        status: 'active',
        vip_status: false,
        balance: 1500.0,
      },
    ];
  }

  private async syncFire22Agents(): Promise<SyncResult> {
    // Implementation for syncing agents
    return {
      system: 'fire22',
      table: 'agents',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private async syncFire22Transactions(): Promise<SyncResult> {
    // Implementation for syncing transactions
    return {
      system: 'fire22',
      table: 'transactions',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private async syncTelegramUsers(): Promise<SyncResult> {
    // Implementation for syncing Telegram users
    return {
      system: 'telegram',
      table: 'telegram_users',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private async processTelegramMessages(): Promise<SyncResult> {
    // Implementation for processing Telegram messages
    return {
      system: 'telegram',
      table: 'telegram_messages',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private async upsertFire22Customer(userId: number, customerData: any): Promise<void> {
    // Implementation for upserting Fire22 customer data
  }

  private async processCoordinationRules(): Promise<void> {
    // Process any pending coordination rules
  }

  // !== PUBLIC API METHODS !==

  /**
   * Get system sync status
   */
  public async getSyncStatus(): Promise<any[]> {
    const query = `
      SELECT * FROM sync_status 
      ORDER BY system_name, table_name, created_at DESC
    `;
    return await this.db.prepare(query).all();
  }

  /**
   * Add coordination rule
   */
  public addCoordinationRule(rule: CoordinationRule): void {
    this.coordinationRules.push(rule);
  }

  /**
   * Get coordination rules
   */
  public getCoordinationRules(): CoordinationRule[] {
    return [...this.coordinationRules];
  }

  /**
   * Check if sync is in progress
   */
  public isSyncInProgress(system?: string): boolean {
    if (system) {
      return this.syncInProgress.has(system);
    }
    return this.syncInProgress.size > 0;
  }
}

// Export singleton instance
export const systemCoordinator = new SystemCoordinator({
  fire22ApiUrl: process.env.FIRE22_API_URL || 'https://api.fire22.com',
  fire22Token: process.env.FIRE22_TOKEN || '',
  telegramBotToken: process.env.BOT_TOKEN || '',
  syncIntervalMinutes: 15,
  enableAutoSync: true,
});

export default SystemCoordinator;
